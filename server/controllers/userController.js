import mongoose from "mongoose"
import JobApplication from "../models/jobApplication.js"
import User from "../models/User.js"
import {v2 as cloudinary} from "cloudinary"
import Job from "../models/Job.js";
import Company from "../models/Company.js";
import ResumeAnalysisService from "../services/ResumeAnalysisService.js";
import EmailService from "../services/EmailService.js";

export const createUser = async (req, res) => {
    const userId = req.auth.userId;
    let { email, name, image } = req.body;

    try {
        const existingUser = await User.findById(userId);
        if (existingUser) {
            console.log('User already exists:', existingUser);
            return res.json({ success: true, user: existingUser });
        }

        if (!email || !email.trim()) {
            return res.json({ success: false, message: 'Email is required' });
        }

        if (!name || !name.trim() || name.trim() === 'User') {
            name = email.split('@')[0];
        }

        const userData = {
            _id: userId,
            email: email.trim(),
            name: name.trim(),
            image: image || '',
            resume: ''
        };

        console.log('Creating user via API with data:', userData);

        const user = await User.create(userData);
        console.log('User created via API:', user._id);
        
        res.json({ success: true, user });
    } catch (error) {
        console.error('Create user error:', error);
        
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.json({ success: false, message: `Validation failed: ${validationErrors.join(', ')}` });
        }
        
        res.json({ success: false, message: error.message });
    }
};

export const getUserData = async (req, res) => {
    const userId = req.auth.userId;
    console.log('Getting user data for userId:', userId);
    
    try {
        let user = await User.findById(userId);

        if (!user) {
            console.log('User not found in DB, attempting to create from Clerk token');
            
            try {
                const userData = {
                    _id: userId,
                    email: '',
                    name: 'New User',
                    image: '',
                    resume: ''
                }

                console.log('Creating user with fallback data:', userData);
                user = await User.create(userData);
                console.log('Fallback user created successfully:', user._id);
                
                return res.json({
                    success: true, 
                    user,
                    needsProfileCompletion: true,
                    message: 'Please complete your profile'
                });
                
            } catch (createError) {
                console.error('Failed to create fallback user:', createError);
                return res.json({
                    success: false, 
                    message: 'User not found and could not be created. Please try refreshing the page.'
                });
            }
        }
        
        const needsProfileCompletion = !user.email || !user.email.trim() || 
                                     !user.name || user.name === 'User' || user.name === 'New User';
        
        res.json({
            success: true, 
            user,
            needsProfileCompletion,
            message: needsProfileCompletion ? 'Please complete your profile' : undefined
        });
    } catch (error) {
        console.error('Get user data error:', error);
        res.json({ success: false, message: error.message });
    }
}

export const updateUserProfile = async (req, res) => {
    const userId = req.auth.userId;
    const { name, email } = req.body;

    try {
        if (!name || !name.trim()) {
            return res.json({ success: false, message: 'Name is required' });
        }
        if (!email || !email.trim()) {
            return res.json({ success: false, message: 'Email is required' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId, 
            { 
                name: name.trim(), 
                email: email.trim() 
            }, 
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.json({ success: false, message: 'User not found' });
        }

        console.log('User profile updated:', updatedUser);
        res.json({ success: true, user: updatedUser, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Update user profile error:', error);
        res.json({ success: false, message: error.message });
    }
}

export const applyforJob = async (req, res) => {
    const { jobId } = req.body;
    const userId = req.auth.userId;

    try {
        console.log(`User ${userId} applying for job ${jobId}`);

        if (!jobId || !mongoose.isValidObjectId(jobId)) {
            return res.json({ success: false, message: 'Invalid job ID' });
        }

        const isAlreadyApplied = await JobApplication.findOne({ jobId, userId });
        if (isAlreadyApplied) {
            return res.json({ success: false, message: 'Already applied for this job' });
        }

        const jobData = await Job.findById(jobId).populate('companyId');
        if (!jobData) {
            return res.json({ success: false, message: "Job not found" });
        }

        if (!jobData.visible) {
            return res.json({ success: false, message: "This job is no longer available" });
        }

        const userData = await User.findById(userId);
        if (!userData) {
            return res.json({ success: false, message: "User not found" });
        }

        if (!userData.email || !userData.email.trim()) {
            return res.json({ 
                success: false, 
                message: "Please complete your profile with a valid email before applying for jobs",
                needsProfileCompletion: true
            });
        }

        const applicationData = {
            companyId: jobData.companyId._id,
            userId,
            jobId,
            date: Date.now(),
            status: 'Pending',
            submittedAt: new Date(),
            reviewStatus: 'PENDING',
            emailSent: false,
            processingError: null,
            resumeUrl: userData.resume && userData.resume.trim() ? userData.resume : undefined,
            parsedResume: {
                personalInfo: { name: '', email: '', phone: '', location: '' },
                skills: [],
                experience: { totalYears: 0, jobs: [] },
                projects: [],
                certifications: [],
                achievements: [],
                internships: [],
                education: [],
                summary: '',
                languages: [],
                parseStatus: 'SUCCESS',
                error: null,
                parsedAt: new Date()
            },
            resumeScore: {
                totalScore: null,
                displayScore: null,
                breakdown: {},
                weights: {},
                matchedSkills: [],
                missingSkills: [],
                recommendations: [],
                decision: null,
                scoredAt: null
            }
        };

        const application = await JobApplication.create(applicationData);
        console.log('Application created:', application._id);

        try {
            const emailData = {
                candidateName: userData.name,
                jobTitle: jobData.title,
                companyName: jobData.companyId.name,
                applicationId: application._id,
                applyDate: new Date().toLocaleDateString()
            };

            const confirmationHtml = `
                <h2>Application Confirmation</h2>
                <p>Dear ${emailData.candidateName},</p>
                <p>Thank you for applying to <strong>${emailData.jobTitle}</strong> at <strong>${emailData.companyName}</strong>.</p>
                <p>Your application has been received and is under review.</p>
                <p>Application ID: ${emailData.applicationId}</p>
                <p>Applied on: ${emailData.applyDate}</p>
                <p>We will notify you of any updates.</p>
                <p>Best regards,<br>The Hiring Team</p>
            `;

            await EmailService.sendEmail(userData.email, 
                `Application Confirmation - ${emailData.jobTitle}`, 
                confirmationHtml);
            console.log('Application confirmation email sent to candidate');
        } catch (emailError) {
            console.error('Failed to send application confirmation email:', emailError);
        }

        res.json({ 
            success: true, 
            message: 'Application submitted successfully', 
            application: {
                _id: application._id,
                jobId: application.jobId,
                status: application.status,
                submittedAt: application.submittedAt,
                reviewStatus: application.reviewStatus
            }
        });
    } catch (error) {
        console.error('Apply for job error:', error);
        res.json({ success: false, message: error.message });
    }
}

export const deleteUserApplication = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { id } = req.body;

    if (!id || !mongoose.isValidObjectId(id)) {
      return res.json({ success: false, message: 'Invalid application ID' });
    }

    const application = await JobApplication.findOne({ _id: id, userId: userId });

    if (!application) {
      return res.json({ 
        success: false, 
        message: "Application not found or you don't have permission to delete this application" 
      });
    }

    await JobApplication.findByIdAndDelete(id);

    console.log(`Application ${id} deleted by user ${userId}`);

    res.json({ 
      success: true, 
      message: "Application withdrawn successfully" 
    });
  } catch (error) {
    console.error('Delete application error:', error);
    res.json({ success: false, message: error.message });
  }
};

export const getUserJobApplications = async (req, res) => {
    try {
        const userId = req.auth.userId;
        console.log('Fetching applications for userId:', userId);
        
        if (!userId) {
            return res.json({ success: false, message: 'User ID not provided' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }
        
        const applications = await JobApplication.find({ userId })
            .populate({
                path: 'companyId',
                select: 'name email image',
                model: 'Company'
            })
            .populate({
                path: 'jobId',
                select: 'title description location category level salary date visible',
                model: 'Job'
            })
            .sort({ submittedAt: -1 })
            .exec();

        console.log('Total applications found:', applications.length);
        
        const validApplications = applications.filter(app => {
            const isValid = app.jobId && app.companyId;
            if (!isValid) {
                console.log('Filtering out invalid application:', {
                    appId: app._id,
                    hasJob: !!app.jobId,
                    hasCompany: !!app.companyId
                });
            }
            return isValid;
        });

        console.log('Valid applications after filtering:', validApplications.length);

        const transformedApplications = validApplications.map(app => {
            const appObj = app.toObject();
            return {
                ...appObj,
                CompanyId: appObj.companyId,
                resumeMatch: appObj.resumeScore ? {
                    score: appObj.resumeScore.displayScore || appObj.resumeScore.totalScore,
                    qualified: appObj.resumeScore.decision === 'ACCEPT',
                    decision: appObj.resumeScore.decision,
                    analyzedWithAI: !!appObj.resumeScore.scoredAt
                } : null
            };
        });

        return res.json({
            success: true,
            applications: transformedApplications,
            count: transformedApplications.length
        });
    } catch (error) {
        console.error('Get user applications error:', error);
        res.json({ success: false, message: error.message });
    }
}

export const getUserApplicationInsights = async (req, res) => {
    try {
        const userId = req.auth.userId;
        console.log('Getting application insights for user:', userId);

        const userData = await User.findById(userId);
        if (!userData) {
            return res.json({ success: false, message: 'User not found' });
        }

        const applications = await JobApplication.find({ userId })
            .populate({
                path: 'jobId',
                select: 'title companyId location category level salary',
                model: 'Job'
            })
            .populate({
                path: 'companyId',
                select: 'name industry',
                model: 'Company'
            })
            .sort({ submittedAt: -1 })
            .exec();

        const totalApplications = applications.length;
        const acceptedApplications = applications.filter(app => app.status === 'Accepted').length;
        const pendingApplications = applications.filter(app => app.status === 'Pending').length;
        const rejectedApplications = applications.filter(app => app.status === 'Rejected').length;
        
        const acceptanceRate = totalApplications > 0 ? (acceptedApplications / totalApplications * 100).toFixed(1) : 0;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentApplications = applications.filter(app => new Date(app.submittedAt || app.date) >= thirtyDaysAgo);
        const applicationsThisWeek = applications.filter(app => {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            return new Date(app.submittedAt || app.date) >= oneWeekAgo;
        });

        const scoredApplications = applications.filter(app => app.resumeScore && app.resumeScore.totalScore);
        const averageScore = scoredApplications.length > 0 
            ? (scoredApplications.reduce((sum, app) => sum + (app.resumeScore.totalScore || 0), 0) / scoredApplications.length).toFixed(1)
            : 0;

        const applicationsByStatus = {
            accepted: applications.filter(app => app.status === 'Accepted').map(app => ({
                _id: app._id,
                jobTitle: app.jobId?.title,
                company: app.companyId?.name,
                score: app.resumeScore?.totalScore,
                date: app.submittedAt || app.date,
                reviewStatus: app.reviewStatus
            })),
            pending: applications.filter(app => app.status === 'Pending').map(app => ({
                _id: app._id,
                jobTitle: app.jobId?.title,
                company: app.companyId?.name,
                score: app.resumeScore?.totalScore,
                date: app.submittedAt || app.date,
                reviewStatus: app.reviewStatus
            })),
            rejected: applications.filter(app => app.status === 'Rejected').map(app => ({
                _id: app._id,
                jobTitle: app.jobId?.title,
                company: app.companyId?.name,
                score: app.resumeScore?.totalScore,
                date: app.submittedAt || app.date,
                feedback: app.feedback,
                reviewStatus: app.reviewStatus
            }))
        };

        const categoryStats = {};
        applications.forEach(app => {
            if (app.jobId?.category) {
                const category = app.jobId.category;
                categoryStats[category] = (categoryStats[category] || 0) + 1;
            }
        });

        const levelStats = {};
        applications.forEach(app => {
            if (app.jobId?.level) {
                const level = app.jobId.level;
                levelStats[level] = (levelStats[level] || 0) + 1;
            }
        });

        const recentActivity = applications.slice(0, 10).map(app => ({
            date: app.submittedAt || app.date,
            type: 'application',
            title: `Applied to ${app.jobId?.title} at ${app.companyId?.name}`,
            status: app.status,
            reviewStatus: app.reviewStatus,
            score: app.resumeScore?.totalScore
        }));

        res.json({
            success: true,
            insights: {
                summary: {
                    totalApplications,
                    acceptedApplications,
                    pendingApplications,
                    rejectedApplications,
                    acceptanceRate: parseFloat(acceptanceRate),
                    averageResumeScore: parseFloat(averageScore),
                    applicationsThisWeek: applicationsThisWeek.length,
                    recentApplications: recentApplications.length
                },
                trends: {
                    dailyApplications: getDailyApplicationCount(applications, 30),
                    weeklyApplications: getWeeklyApplicationCount(applications, 12)
                },
                distributions: {
                    byCategory: categoryStats,
                    byLevel: levelStats,
                    byStatus: {
                        accepted: acceptedApplications,
                        pending: pendingApplications,
                        rejected: rejectedApplications
                    }
                },
                applicationsByStatus,
                recentActivity,
                recommendations: generateRecommendations(applications, acceptanceRate, averageScore)
            }
        });

    } catch (error) {
        console.error('Get user application insights error:', error);
        res.json({ 
            success: false, 
            message: 'Failed to get application insights',
            error: error.message 
        });
    }
};

const getDailyApplicationCount = (applications, days = 30) => {
    const dailyCounts = {};
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        const count = applications.filter(app => {
            const appDate = new Date(app.submittedAt || app.date).toISOString().split('T')[0];
            return appDate === dateString;
        }).length;
        
        dailyCounts[dateString] = count;
    }
    
    return dailyCounts;
};

const getWeeklyApplicationCount = (applications, weeks = 12) => {
    const weeklyCounts = {};
    const today = new Date();
    
    for (let i = weeks - 1; i >= 0; i--) {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - (i * 7));
        const weekKey = `Week ${weeks - i}`;
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        const count = applications.filter(app => {
            const appDate = new Date(app.submittedAt || app.date);
            return appDate >= weekStart && appDate <= weekEnd;
        }).length;
        
        weeklyCounts[weekKey] = count;
    }
    
    return weeklyCounts;
};

const generateRecommendations = (applications, acceptanceRate, averageScore) => {
    const recommendations = [];
    
    if (applications.length === 0) {
        return [
            "Start applying to jobs that match your skills and experience",
            "Complete your profile and upload your resume to get better matches",
            "Set up job alerts for your preferred roles and companies"
        ];
    }
    
    if (acceptanceRate < 20) {
        recommendations.push(
            "Consider tailoring your resume more specifically to each job application",
            "Focus on quality over quantity - apply to jobs that closely match your skills",
            "Request feedback from companies when possible to understand areas for improvement"
        );
    }
    
    if (averageScore < 60) {
        recommendations.push(
            "Work on improving your resume to better match job requirements",
            "Highlight your key achievements and measurable results",
            "Consider adding more relevant skills and certifications to your profile"
        );
    }
    
    if (applications.length < 5) {
        recommendations.push(
            "Try applying to more positions to increase your chances",
            "Diversify your applications across different companies and industries",
            "Set a goal of applying to 3-5 relevant jobs per week"
        );
    }
    
    recommendations.push(
        "Network with professionals in your desired industry",
        "Prepare thoroughly for interviews by researching companies",
        "Follow up on applications after 1-2 weeks if you haven't heard back"
    );
    
    return recommendations.slice(0, 5);
};

export const updateUserResume = async (req, res) => {
    try {
        const userId = req.auth.userId;
        const resumeFile = req.file;

        console.log('Updating resume for user:', userId);

        if (!resumeFile) {
            return res.json({ success: false, message: 'No resume file provided' });
        }

        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(resumeFile.mimetype)) {
            return res.json({ success: false, message: 'Only PDF and Word documents are allowed' });
        }

        const maxSize = 10 * 1024 * 1024;
        if (resumeFile.size > maxSize) {
            return res.json({ success: false, message: 'File size must be less than 10MB' });
        }

        const userData = await User.findById(userId);
        if (!userData) {
            return res.json({ success: false, message: 'User not found' });
        }

        const resumeUpload = await cloudinary.uploader.upload(resumeFile.path, {
            resource_type: 'auto',
            folder: 'resumes',
            public_id: `resume_${userId}_${Date.now()}`,
            overwrite: true
        });
        
        userData.resume = resumeUpload.secure_url;
        userData.lastResumeParseDate = new Date();

        await userData.save();

        console.log('Resume updated successfully for user:', userId);

        return res.json({
            success: true,
            message: 'Resume updated successfully',
            resumeUrl: userData.resume,
            user: userData
        });
        
    } catch (error) {
        console.error('Update resume error:', error);
        res.json({ success: false, message: error.message });
    }
}

export const getResumeJobMatch = async (req, res) => {
    try {
        const userId = req.auth.userId;
        const { jobId } = req.params;

        if (!jobId || !mongoose.isValidObjectId(jobId)) {
            return res.json({ success: false, message: 'Invalid job ID' });
        }

        const userData = await User.findById(userId);
        if (!userData) {
            return res.json({ success: false, message: 'User not found' });
        }

        if (!userData.resume || !userData.resume.trim()) {
            return res.json({ 
                success: false, 
                message: 'Please upload your resume first to see job match analysis' 
            });
        }

        const jobData = await Job.findById(jobId).populate('companyId');
        if (!jobData) {
            return res.json({ success: false, message: 'Job not found' });
        }

        try {
            console.log('Performing resume analysis for job match...');
            
            const resumeAnalysisService = new ResumeAnalysisService();
            const parsedResume = await resumeAnalysisService.parseFromUrl(userData.resume);
            
            if (parsedResume.parseStatus === 'ERROR') {
                throw new Error(`Resume parsing failed: ${parsedResume.error}`);
            }

            const jobMatchData = {
                title: jobData.title,
                description: jobData.description,
                category: jobData.category,
                level: jobData.level
            };

            const matchResult = await resumeAnalysisService.scoreApplication(parsedResume, jobMatchData);

            res.json({
                success: true,
                jobTitle: jobData.title,
                companyName: jobData.companyId.name,
                matchAnalysis: {
                    totalScore: matchResult.displayScore,
                    decision: matchResult.decision,
                    breakdown: matchResult.breakdown,
                    matchedSkills: matchResult.matchedSkills || [],
                    missingSkills: matchResult.missingSkills || [],
                    recommendations: matchResult.recommendations || []
                },
                applicationGuidance: {
                    shouldApply: matchResult.decision === 'ACCEPT' || matchResult.displayScore >= 60,
                    expectedOutcome: matchResult.decision,
                    improvementAreas: matchResult.recommendations?.slice(0, 3) || []
                }
            });

        } catch (error) {
            console.error('Resume matching failed:', error);
            res.json({
                success: false,
                message: 'Failed to analyze resume match',
                error: error.message
            });
        }

    } catch (error) {
        console.error('Get resume job match error:', error);
        res.json({ success: false, message: error.message });
    }
}

export const deleteUserResume = async (req, res) => {
    try {
        const userId = req.auth.userId;

        const userData = await User.findById(userId);
        if (!userData) {
            return res.json({ success: false, message: 'User not found' });
        }

        if (!userData.resume) {
            return res.json({ success: false, message: 'No resume found to delete' });
        }

        const resumeUrl = userData.resume;
        const publicId = resumeUrl.split('/').pop().split('.')[0];
        
        try {
            await cloudinary.uploader.destroy(`resumes/${publicId}`);
            console.log('Resume deleted from Cloudinary');
        } catch (cloudinaryError) {
            console.error('Error deleting from Cloudinary:', cloudinaryError);
        }

        userData.resume = '';
        userData.skills = [];
        userData.totalExperience = 0;
        userData.summary = '';
        userData.lastResumeParseDate = null;
        userData.resumeParseSuccess = false;
        userData.resumeParseError = null;

        await userData.save();

        res.json({
            success: true,
            message: 'Resume deleted successfully',
            user: userData
        });

    } catch (error) {
        console.error('Delete resume error:', error);
        res.json({ success: false, message: error.message });
    }
}

export const getApplicationStatus = async (req, res) => {
    try {
        const userId = req.auth.userId;
        const { jobId } = req.params;

        if (!jobId || !mongoose.isValidObjectId(jobId)) {
            return res.json({ success: false, message: 'Invalid job ID' });
        }

        const application = await JobApplication.findOne({ userId, jobId })
            .populate('jobId', 'title companyId')
            .populate('companyId', 'name');

        if (!application) {
            return res.json({ 
                success: true, 
                hasApplied: false,
                message: 'No application found for this job'
            });
        }

        res.json({
            success: true,
            hasApplied: true,
            application: {
                _id: application._id,
                status: application.status,
                reviewStatus: application.reviewStatus,
                appliedDate: application.date,
                submittedAt: application.submittedAt,
                resumeScore: application.resumeScore,
                jobTitle: application.jobId?.title,
                companyName: application.companyId?.name
            }
        });

    } catch (error) {
        console.error('Get application status error:', error);
        res.json({ success: false, message: error.message });
    }
}