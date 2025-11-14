import mongoose from "mongoose";

const JobApplicationSchema = new mongoose.Schema({
    userId: { type: String, ref: 'User', required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    status: { type: String, default: 'Pending', enum: ['Pending', 'Accepted', 'Rejected'] },
    
    // Essential fields
    resumeUrl: { type: String, required: true },
    reviewStatus: { 
        type: String, 
        enum: ['PENDING', 'ACCEPT', 'REJECT', 'MANUAL_REVIEW', 'PROCESSING_FAILED'], 
        default: 'PENDING' 
    },
    
    // Email tracking
    date: { type: Date, default: Date.now },
    emailSent: { type: Boolean, default: false },
    emailSentDate: { type: Date },
    
    // Parsed resume data - Simplified structure matching Extracta fields
    parsedResume: {
        // Basic Info
        name: { type: String, default: '' },
        email: { type: String, default: '' },
        phone: { type: String, default: '' },
        
        // Experience (in years as number)
        workExperience: { type: Number, default: 0 },
        
        // Education (array for qualifications)
        education: [{ type: String }], // Will store ["10th", "12th", "B.Tech", etc.]
        cgpa: { type: String, default: '' }, // Store CGPA/grades separately
        
        // Skills array
        skills: [{ type: String }],
        
        // Keywords-based fields (arrays of keywords)
        certificationKeywords: [{ type: String }],
        achievementKeywords: [{ type: String }],
        projectKeywords: [{ type: String }],
        internshipKeywords: [{ type: String }],
        
        // Metadata
        parseStatus: { type: String, enum: ['SUCCESS', 'ERROR'], default: 'SUCCESS' },
        error: { type: String, default: null },
        parsedAt: { type: Date, default: Date.now },
        source: { type: String, default: 'extracta.ai' }
    },
    
    // Resume scoring (simplified)
    resumeScore: {
        totalScore: { type: Number, min: 0, max: 100, default: 0 },
        displayScore: { type: Number, min: 0, max: 100, default: 0 },
        breakdown: {
            skills: { type: Number, default: 0 },
            experience: { type: Number, default: 0 },
            education: { type: Number, default: 0 },
            certifications: { type: Number, default: 0 },
            projects: { type: Number, default: 0 },
            achievements: { type: Number, default: 0 },
            internships: { type: Number, default: 0 }
        },
        weights: {
            skills: { type: Number, default: 30 },
            experience: { type: Number, default: 25 },
            education: { type: Number, default: 15 },
            certifications: { type: Number, default: 10 },
            projects: { type: Number, default: 10 },
            achievements: { type: Number, default: 5 },
            internships: { type: Number, default: 5 }
        },
        matchedSkills: [{ type: String }],
        missingSkills: [{ type: String }],
        recommendations: [{ type: String }],
        decision: { type: String, enum: ['ACCEPT', 'REJECT', 'MANUAL_REVIEW'], default: 'MANUAL_REVIEW' },
        scoredAt: { type: Date, default: Date.now }
    },
    
    // Processing metadata
    automatedAt: { type: Date },
    reviewedAt: { type: Date },
    processingError: { type: String, default: null },
    submittedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Essential indexes
JobApplicationSchema.index({ companyId: 1, status: 1 });
JobApplicationSchema.index({ userId: 1, submittedAt: -1 });
JobApplicationSchema.index({ jobId: 1, reviewStatus: 1 });
JobApplicationSchema.index({ 'resumeScore.totalScore': -1 });

// Pre-save middleware
JobApplicationSchema.pre('save', function(next) {
    // Initialize parsedResume if not present
    if (!this.parsedResume) {
        this.parsedResume = {
            name: '',
            email: '',
            phone: '',
            workExperience: 0,
            education: [],
            cgpa: '',
            skills: [],
            certificationKeywords: [],
            achievementKeywords: [],
            projectKeywords: [],
            internshipKeywords: [],
            parseStatus: 'SUCCESS',
            error: null,
            parsedAt: new Date(),
            source: 'extracta.ai'
        };
    }
    
    // Initialize resumeScore if not present
    if (!this.resumeScore) {
        this.resumeScore = {
            totalScore: 0,
            displayScore: 0,
            breakdown: {
                skills: 0,
                experience: 0,
                education: 0,
                certifications: 0,
                projects: 0,
                achievements: 0,
                internships: 0
            },
            weights: {
                skills: 30,
                experience: 25,
                education: 15,
                certifications: 10,
                projects: 10,
                achievements: 5,
                internships: 5
            },
            matchedSkills: [],
            missingSkills: [],
            recommendations: [],
            decision: 'MANUAL_REVIEW',
            scoredAt: new Date()
        };
    }
    
    next();
});

// Methods
JobApplicationSchema.methods.hasExistingScore = function() {
    return !!(this.resumeScore && this.resumeScore.totalScore !== undefined && this.resumeScore.totalScore !== null);
};

JobApplicationSchema.methods.hasExistingParsedData = function() {
    return !!(this.parsedResume && this.parsedResume.parseStatus === 'SUCCESS');
};

JobApplicationSchema.methods.canBeAutoProcessed = function() {
    return this.reviewStatus === 'PENDING' && 
           !this.processingError && 
           !!this.resumeUrl &&
           this.resumeUrl !== 'NO_RESUME' &&
           this.resumeUrl !== 'ERROR' &&
           !this.automatedAt;
};

JobApplicationSchema.methods.getScoreLevel = function() {
    const score = this.resumeScore?.displayScore || this.resumeScore?.totalScore || 0;
    if (score >= 80) return 'High';
    if (score >= 60) return 'Medium';
    return 'Low';
};

// Static methods
JobApplicationSchema.statics.findPendingApplications = function() {
    return this.find({
        reviewStatus: 'PENDING',
        automatedAt: { $exists: false },
        resumeUrl: { $exists: true, $ne: '', $nin: ['NO_RESUME', 'ERROR'] }
    });
};

JobApplicationSchema.statics.findByCompany = function(companyId, status = null) {
    const query = { companyId };
    if (status) query.status = status;
    return this.find(query).populate('userId jobId');
};

JobApplicationSchema.statics.getProcessingStats = function() {
    return this.aggregate([
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                processed: { 
                    $sum: { 
                        $cond: [{ $ne: ["$automatedAt", null] }, 1, 0] 
                    }
                },
                accepted: { 
                    $sum: { 
                        $cond: [{ $eq: ["$reviewStatus", "ACCEPT"] }, 1, 0] 
                    }
                },
                rejected: { 
                    $sum: { 
                        $cond: [{ $eq: ["$reviewStatus", "REJECT"] }, 1, 0] 
                    }
                },
                manualReview: { 
                    $sum: { 
                        $cond: [{ $eq: ["$reviewStatus", "MANUAL_REVIEW"] }, 1, 0] 
                    }
                },
                failed: { 
                    $sum: { 
                        $cond: [{ $eq: ["$reviewStatus", "PROCESSING_FAILED"] }, 1, 0] 
                    }
                }
            }
        }
    ]);
};

const JobApplication = mongoose.model('JobApplication', JobApplicationSchema);

export default JobApplication;