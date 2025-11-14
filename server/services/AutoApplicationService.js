import JobApplication from '../models/jobApplication.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import ResumeAnalysisService from './ResumeAnalysisService.js';
import EmailService from './EmailService.js';
import cron from 'node-cron';

class AutoApplicationService {
    constructor() {
        this.reminderInterval = 24 * 60 * 60 * 1000;
        this.isProcessing = false;
        this.resumeAnalysisService = null;
        this.startReminderService();
        console.log('AutoApplicationService initialized');
    }

    initializeServices() {
        if (!this.resumeAnalysisService) {
            this.resumeAnalysisService = new ResumeAnalysisService();
            console.log('ResumeAnalysisService initialized');
        }
    }

    startReminderService() {
        console.log('Starting company reminder service...');
        
        cron.schedule('30 14 * * *', async () => {
            try {
                await this.sendCompanyReminders();
            } catch (error) {
                console.error('Reminder service error:', error);
            }
        });

        console.log('Company reminder service started - will run daily at 02:10 AM');
    }

    async processSpecificApplication(applicationId, forceReparse = false) {
        try {
            console.log(`Processing application: ${applicationId}, forceReparse: ${forceReparse}`);

            this.initializeServices();

            const application = await JobApplication.findById(applicationId)
                .populate({ path: 'userId', select: 'email name resume' })
                .populate({ path: 'jobId', select: 'title description requirements companyId skills experience category level requiredSkills experienceRequired' })
                .populate({ path: 'companyId', select: 'name email' });

            if (!application) {
                throw new Error(`Application ${applicationId} not found`);
            }

            console.log('Application found:', {
                id: application._id,
                userId: application.userId?._id,
                jobId: application.jobId?._id,
                hasResumeScore: !!application.resumeScore?.overallScore,
                hasAutomatedAt: !!application.automatedAt,
                currentResumeUrl: application.resumeUrl
            });

            if (!forceReparse && application.automatedAt && application.resumeScore?.overallScore !== undefined) {
                console.log(`Application ${applicationId} already processed`);
                return {
                    success: true,
                    alreadyProcessed: true,
                    applicationId: application._id,
                    score: application.resumeScore.overallScore,
                    decision: application.reviewStatus
                };
            }

            let resumeUrl = await this.getValidResumeUrl(application);
            if (!resumeUrl) {
                return await this.handleMissingResume(application);
            }

            const job = await Job.findById(application.jobId);
            if (!job) {
                throw new Error(`Job ${application.jobId} not found`);
            }

            const jobData = this.prepareJobData(job);

            console.log('Starting resume parsing...');
            const parseResult = await this.parseResumeWithRetry(resumeUrl);
            
            if (!parseResult.success) {
                return await this.handleParsingError(application, parseResult.error);
            }

            application.parsedResume = this.normalizeParsedResumeForModel(parseResult.data);
            await application.save();
            console.log('Parsed resume data saved to database');

            console.log('Starting application scoring...');
            const scoreResult = await this.scoreResumeWithRetry(parseResult.data, jobData);

            if (!scoreResult.success) {
                return await this.handleScoringError(application, scoreResult.error);
            }

            application.resumeScore = this.normalizeResumeScoreForModel(scoreResult.data);
            application.reviewStatus = this.determineDecisionEnhanced(scoreResult.data.overallScore);
            application.automatedAt = new Date();
            application.reviewedAt = new Date();
            application.processingError = null;
            
            this.updateApplicationStatus(application, application.reviewStatus);
            
            await application.save();
            console.log('Application scoring data saved to database');

            await this.sendCandidateEmailSafely(
                application, 
                application.reviewStatus, 
                scoreResult.data.recommendations
            );

            console.log(`Successfully processed application ${applicationId}: ${application.reviewStatus} (${scoreResult.data.overallScore})`);

            return {
                success: true,
                applicationId: application._id,
                score: scoreResult.data.overallScore,
                decision: application.reviewStatus,
                matchedSkills: scoreResult.data.matchedSkills,
                missingSkills: scoreResult.data.missingSkills,
                recommendations: scoreResult.data.recommendations,
                categoryScores: scoreResult.data.categoryScores
            };

        } catch (error) {
            console.error(`Error processing application ${applicationId}:`, error);
            await this.handleProcessingError(applicationId, error);
            throw new Error(`Failed to process application: ${error.message}`);
        }
    }

    async getValidResumeUrl(application) {
        let resumeUrl = application.resumeUrl;
        
        if (!resumeUrl && application.userId?.resume) {
            resumeUrl = application.userId.resume;
            application.resumeUrl = resumeUrl;
            await application.save();
            console.log('Resume URL updated from user profile');
        }

        if (!resumeUrl || !this.validateResumeUrl(resumeUrl)) {
            return null;
        }

        return resumeUrl;
    }

    async handleMissingResume(application) {
        console.log('No valid resume URL found');
        
        application.resumeUrl = application.resumeUrl || 'NO_RESUME';
        application.reviewStatus = 'PROCESSING_FAILED';
        application.processingError = 'No valid resume URL found';
        application.automatedAt = new Date();
        
        await application.save();
        
        return { 
            success: true, 
            decision: 'PROCESSING_FAILED', 
            reason: 'No resume available',
            applicationId: application._id
        };
    }

    prepareJobData(job) {
        return {
            title: job.title || '',
            description: job.description || '',
            requiredSkills: this.extractRequiredSkillsFromJob(job),
            preferredSkills: this.extractPreferredSkillsFromJob(job),
            minExperience: this.extractExperienceFromJob(job),
            preferredExperience: this.extractExperienceFromJob(job) + 2,
            requiredEducation: this.extractRequiredEducation(job),
            preferredCertifications: this.extractPreferredCertifications(job),
            category: job.category || '',
            level: job.level || '',
            requirements: this.normalizeRequirements(job.requirements)
        };
    }

    extractRequiredSkillsFromJob(job) {
        const skills = [];
        
        if (Array.isArray(job.requiredSkills)) {
            skills.push(...job.requiredSkills);
        } else if (Array.isArray(job.skills)) {
            skills.push(...job.skills.slice(0, 5));
        }
        
        if (job.description) {
            const techSkills = this.extractTechSkillsFromDescription(job.description);
            skills.push(...techSkills.slice(0, 10));
        }
        
        return [...new Set(skills.filter(skill => skill && skill.trim()))];
    }

    extractPreferredSkillsFromJob(job) {
        const skills = [];
        
        if (Array.isArray(job.skills)) {
            skills.push(...job.skills);
        }
        
        return [...new Set(skills.filter(skill => skill && skill.trim()))];
    }

    extractRequiredEducation(job) {
        const educationKeywords = ['10th', '12th', 'B.Tech', 'M.Tech', 'MBA', 'Bachelor', 'Master', 'PhD'];
        const required = [];
        
        const jobText = `${job.title} ${job.description} ${job.requirements}`.toLowerCase();
        
        educationKeywords.forEach(edu => {
            if (jobText.includes(edu.toLowerCase())) {
                required.push(edu);
            }
        });
        
        if (required.length === 0) {
            const title = (job.title || '').toLowerCase();
            if (title.includes('senior') || title.includes('lead')) {
                required.push('B.Tech');
            } else if (title.includes('junior') || title.includes('entry')) {
                required.push('12th');
            } else {
                required.push('B.Tech');
            }
        }
        
        return required;
    }

    extractPreferredCertifications(job) {
        const certKeywords = ['aws', 'azure', 'gcp', 'certified', 'cisco', 'oracle'];
        const certs = [];
        
        const jobText = `${job.description} ${job.requirements}`.toLowerCase();
        
        certKeywords.forEach(cert => {
            if (jobText.includes(cert)) {
                certs.push(cert);
            }
        });
        
        return certs;
    }

    extractExperienceFromJob(job) {
        const experienceFields = [
            job.experience,
            job.experienceRequired, 
            job.requiredExperience,
            job.minExperience
        ];
        
        for (const exp of experienceFields) {
            if (exp !== undefined && exp !== null) {
                if (typeof exp === 'number') return exp;
                if (typeof exp === 'string') {
                    const match = exp.match(/(\d+)/);
                    if (match) return parseInt(match[1]);
                }
            }
        }
        
        const title = (job.title || '').toLowerCase();
        if (title.includes('senior') || title.includes('lead')) return 5;
        if (title.includes('junior') || title.includes('entry')) return 1;
        if (title.includes('mid') || title.includes('intermediate')) return 3;
        if (title.includes('principal') || title.includes('architect')) return 8;
        
        return 2;
    }

    extractTechSkillsFromDescription(description) {
        const commonTechSkills = [
            'javascript', 'python', 'java', 'react', 'angular', 'vue', 'nodejs', 'node.js',
            'sql', 'mongodb', 'postgresql', 'mysql', 'aws', 'azure', 'gcp', 'docker',
            'kubernetes', 'git', 'html', 'css', 'typescript', 'spring', 'django',
            'flask', 'express', 'graphql', 'rest api', 'jenkins', 'ci/cd', 'agile',
            'scrum', 'machine learning', 'data science', 'tensorflow', 'pytorch',
            'pandas', 'numpy', 'redis', 'kafka', 'microservices', 'api', 'json',
            'xml', 'linux', 'ubuntu', 'centos', 'bash', 'shell', 'devops'
        ];
        
        const desc = description.toLowerCase();
        return commonTechSkills.filter(skill => desc.includes(skill));
    }

    async parseResumeWithRetry(resumeUrl, maxRetries = 2) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Resume parsing attempt ${attempt}/${maxRetries}`);
                const result = await this.resumeAnalysisService.parseResumeFromUrl(resumeUrl);
                
                if (result.parseStatus === 'SUCCESS') {
                    return { success: true, data: result };
                } else {
                    throw new Error(result.error || 'Parsing failed');
                }
            } catch (error) {
                console.error(`Parse attempt ${attempt} failed:`, error.message);
                lastError = error;
                
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
        
        return { success: false, error: lastError.message };
    }

    async scoreResumeWithRetry(parsedResume, jobData, maxRetries = 2) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Resume scoring attempt ${attempt}/${maxRetries}`);
                const result = await this.resumeAnalysisService.scoreResumeEnhanced(parsedResume, jobData);
                
                return { success: true, data: result };
            } catch (error) {
                console.error(`Score attempt ${attempt} failed:`, error.message);
                lastError = error;
                
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        
        return { success: false, error: lastError.message };
    }

    async handleParsingError(application, errorMessage) {
        console.log('Resume parsing failed, setting manual review');
        
        application.reviewStatus = 'MANUAL_REVIEW';
        application.automatedAt = new Date();
        application.reviewedAt = new Date();
        application.processingError = errorMessage;
        
        await application.save();
        
        await this.sendCandidateEmailSafely(application, 'MANUAL_REVIEW', 
            [{ priority: 'HIGH', category: 'Error', message: `Resume parsing failed: ${errorMessage}` }]);
        
        return { 
            success: true, 
            decision: 'MANUAL_REVIEW', 
            reason: 'Resume parsing failed',
            error: errorMessage,
            applicationId: application._id
        };
    }

    async handleScoringError(application, errorMessage) {
        console.log('Resume scoring failed, setting manual review');
        
        application.reviewStatus = 'MANUAL_REVIEW';
        application.automatedAt = new Date();
        application.reviewedAt = new Date();
        application.processingError = errorMessage;
        
        await application.save();
        
        await this.sendCandidateEmailSafely(application, 'MANUAL_REVIEW', 
            [{ priority: 'HIGH', category: 'Error', message: `Resume scoring failed: ${errorMessage}` }]);
        
        return { 
            success: true, 
            decision: 'MANUAL_REVIEW', 
            reason: 'Resume scoring failed',
            error: errorMessage,
            applicationId: application._id
        };
    }

    async handleProcessingError(applicationId, error) {
        try {
            const application = await JobApplication.findById(applicationId);
            if (application) {
                application.reviewStatus = 'PROCESSING_FAILED';
                application.status = 'Pending';
                application.automatedAt = new Date();
                application.processingError = error.message;
                
                if (!application.resumeUrl) {
                    application.resumeUrl = 'ERROR';
                }
                
                await application.save();
                console.log('Application updated with error status');
            }
        } catch (updateError) {
            console.error('Failed to update application with error:', updateError);
        }
    }

    determineDecisionEnhanced(overallScore) {
        if (overallScore >= 60) return 'ACCEPT';
        if (overallScore >= 45) return 'MANUAL_REVIEW';
        return 'REJECT';
    }

    updateApplicationStatus(application, decision) {
        if (decision === 'ACCEPT') {
            application.status = 'Accepted';
        } else if (decision === 'REJECT') {
            application.status = 'Rejected';
        } else {
            application.status = 'Pending';
        }
    }

    normalizeParsedResumeForModel(parsedResume) {
        return {
            name: parsedResume.name || '',
            email: parsedResume.email || '',
            phone: parsedResume.phone || '',
            workExperience: parsedResume.workExperience || 0,
            education: Array.isArray(parsedResume.education) ? parsedResume.education : [],
            cgpa: parsedResume.cgpa || '',
            skills: Array.isArray(parsedResume.skills) ? parsedResume.skills : [],
            certificationKeywords: Array.isArray(parsedResume.certificationKeywords) ? parsedResume.certificationKeywords : [],
            achievementKeywords: Array.isArray(parsedResume.achievementKeywords) ? parsedResume.achievementKeywords : [],
            projectKeywords: Array.isArray(parsedResume.projectKeywords) ? parsedResume.projectKeywords : [],
            internshipKeywords: Array.isArray(parsedResume.internshipKeywords) ? parsedResume.internshipKeywords : [],
            parseStatus: parsedResume.parseStatus || 'SUCCESS',
            error: parsedResume.error || null,
            parsedAt: parsedResume.parsedAt || new Date(),
            source: parsedResume.source || 'extracta.ai'
        };
    }

    normalizeResumeScoreForModel(scoreResult) {
        const formattedRecommendations = Array.isArray(scoreResult.recommendations) 
            ? scoreResult.recommendations.map(rec => {
                if (typeof rec === 'string') return rec;
                return `[${rec.priority}] ${rec.category}: ${rec.message}`;
            })
            : [];

        return {
            totalScore: scoreResult.overallScore || 0,
            displayScore: scoreResult.overallScore || 0,
            breakdown: {
                skills: scoreResult.categoryScores?.skills || 0,
                experience: scoreResult.categoryScores?.experience || 0,
                education: scoreResult.categoryScores?.education || 0,
                certifications: scoreResult.categoryScores?.certifications || 0,
                projects: scoreResult.categoryScores?.projects || 0,
                achievements: scoreResult.categoryScores?.achievements || 0,
                internships: scoreResult.categoryScores?.internships || 0
            },
            weights: scoreResult.weights || {
                skills: 30,
                experience: 25,
                education: 15,
                certifications: 10,
                projects: 10,
                achievements: 5,
                internships: 5
            },
            matchedSkills: Array.isArray(scoreResult.matchedSkills) ? scoreResult.matchedSkills : [],
            missingSkills: Array.isArray(scoreResult.missingSkills) ? scoreResult.missingSkills : [],
            recommendations: formattedRecommendations,
            decision: this.determineDecisionEnhanced(scoreResult.overallScore),
            scoredAt: scoreResult.scoredAt || new Date()
        };
    }

    normalizeRequirements(requirements) {
        if (Array.isArray(requirements)) {
            return requirements;
        } else if (typeof requirements === 'string') {
            return [requirements];
        }
        return [];
    }

    validateResumeUrl(resumeUrl) {
        try {
            if (!resumeUrl || typeof resumeUrl !== 'string') {
                return false;
            }

            if (['NO_RESUME', 'ERROR', ''].includes(resumeUrl)) {
                return false;
            }

            try {
                const url = new URL(resumeUrl);
                if (!['http:', 'https:'].includes(url.protocol)) {
                    return false;
                }
            } catch {
                return false;
            }

            const validDomains = [
                'cloudinary.com',
                'amazonaws.com',
                's3.amazonaws.com',
                'drive.google.com',
                'dropbox.com',
                'blob.core.windows.net',
                'storage.googleapis.com'
            ];

            const urlLower = resumeUrl.toLowerCase();
            const hasValidDomain = validDomains.some(domain => urlLower.includes(domain));

            const validExtensions = ['.pdf', '.doc', '.docx'];
            const hasValidExtension = validExtensions.some(ext => urlLower.includes(ext));

            return hasValidDomain || hasValidExtension;
            
        } catch (error) {
            console.error('Resume URL validation failed:', error);
            return false;
        }
    }

    async sendCandidateEmailSafely(application, decision, recommendations = []) {
        try {
            console.log(`=== SENDING EMAIL ===`);
            console.log(`Application ID: ${application._id}`);
            console.log(`Decision: ${decision}`);
            console.log(`Candidate Email: ${application.userId?.email}`);
            
            if (!application.userId?.email || !application.userId.email.trim()) {
                console.log('No candidate email available - skipping email');
                return { success: false, error: 'No email address' };
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(application.userId.email.trim())) {
                console.log('Invalid email format - skipping email');
                return { success: false, error: 'Invalid email format' };
            }

            const emailServiceStatus = EmailService.getStatus();
            console.log('Email service status:', emailServiceStatus);
            
            if (!emailServiceStatus.initialized) {
                console.log('Email service not initialized');
                return { success: false, error: 'Email service not initialized' };
            }

            const formattedRecommendations = Array.isArray(recommendations) 
                ? recommendations.map(rec => {
                    if (typeof rec === 'string') return rec;
                    return rec.message || String(rec);
                })
                : [];

            const emailData = {
                candidateName: application.userId.name || 'Candidate',
                jobTitle: application.jobId?.title || 'the position',
                companyName: application.companyId?.name || 'Company',
                resumeScore: application.resumeScore?.overallScore,
                recommendations: formattedRecommendations,
                missingSkills: application.resumeScore?.missingSkills || [],
                matchedSkills: application.resumeScore?.matchedSkills || [],
                feedback: application.feedback || null,
                status: decision,
                isAutomatic: true
            };

            console.log('Email data prepared:', {
                to: application.userId.email.trim(),
                decision,
                candidateName: emailData.candidateName,
                jobTitle: emailData.jobTitle,
                companyName: emailData.companyName,
                score: emailData.resumeScore
            });

            let emailResult;
            const candidateEmail = application.userId.email.trim();

            try {
                switch (decision) {
                    case 'ACCEPT':
                        console.log('Sending acceptance email...');
                        emailResult = await EmailService.sendAcceptanceEmail(candidateEmail, emailData);
                        break;
                    case 'REJECT':
                        console.log('Sending rejection email...');
                        emailResult = await EmailService.sendRejectionEmail(candidateEmail, emailData);
                        break;
                    case 'MANUAL_REVIEW':
                        console.log('Sending manual review email...');
                        emailResult = await EmailService.sendManualReviewEmail(candidateEmail, emailData);
                        break;
                    default:
                        console.log('Sending generic status update email...');
                        emailResult = await EmailService.sendStatusUpdateEmail(candidateEmail, emailData);
                        break;
                }
            } catch (error) {
                console.error('Error sending email:', error);
                emailResult = { success: false, error: error.message };
            }
            
            if (emailResult.success) {
                application.emailSent = true;
                application.emailSentAt = new Date();
                await application.save();
                console.log('Email sent successfully and application updated');
            } else {
                console.error('Email sending failed:', emailResult.error);
            }
            
            return emailResult;
            
        } catch (error) {
            console.error('Error in sendCandidateEmailSafely:', error);
            return { 
                success: false, 
                error: error.message,
                details: 'Failed to send candidate email'
            };
        }
    }

    async sendCompanyReminders() {
        try {
            console.log('Starting company reminder service...');
            
            const companies = await Company.find({})
                .select('name email _id')
                .lean();

            console.log(`Found ${companies.length} companies to check for reminders`);

            let totalRemindersSent = 0;

            for (const company of companies) {
                try {
                    const pendingApplications = await JobApplication.find({
                        companyId: company._id,
                        status: 'Pending',
                        reviewStatus: { $ne: 'PROCESSING_FAILED' }
                    })
                    .sort({ submittedAt: 1 })
                    .select('submittedAt')
                    .lean();

                    const pendingCount = pendingApplications.length;

                    if (pendingCount > 0) {
                        let oldestApplicationDays = 0;
                        if (pendingApplications.length > 0 && pendingApplications[0].submittedAt) {
                            const now = new Date();
                            const oldestDate = new Date(pendingApplications[0].submittedAt);
                            const diffTime = Math.abs(now - oldestDate);
                            oldestApplicationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        }

                        console.log(`Company ${company.name} has ${pendingCount} pending applications, oldest: ${oldestApplicationDays} days`);
                        
                        const emailResult = await this.sendCompanyReminderEmail(company, pendingCount);
                        
                        if (emailResult.success) {
                            totalRemindersSent++;
                            console.log(`Reminder sent to ${company.name}`);
                        } else {
                            console.error(`Failed to send reminder to ${company.name}:`, emailResult.error);
                        }
                    }
                } catch (companyError) {
                    console.error(`Error processing company ${company.name}:`, companyError);
                }
            }

            console.log(`Company reminder service completed. Sent ${totalRemindersSent} reminders.`);
            return { success: true, remindersSent: totalRemindersSent };

        } catch (error) {
            console.error('Error in company reminder service:', error);
            return { success: false, error: error.message };
        }
    }

    async sendCompanyReminderEmail(company, pendingCount) {
        try {
            if (!company.email) {
                return { success: false, error: 'No company email address' };
            }

            const oldestApplication = await JobApplication.findOne({
                companyId: company._id,
                status: 'Pending',
                reviewStatus: { $ne: 'PROCESSING_FAILED' }
            })
            .sort({ submittedAt: 1 })
            .select('submittedAt')
            .lean();

            let oldestApplicationDays = 0;
            if (oldestApplication && oldestApplication.submittedAt) {
                const now = new Date();
                const submittedDate = new Date(oldestApplication.submittedAt);
                
                now.setHours(0, 0, 0, 0);
                submittedDate.setHours(0, 0, 0, 0);
                
                const diffTime = now - submittedDate;
                oldestApplicationDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                if (oldestApplicationDays === 0 && submittedDate < now) {
                    oldestApplicationDays = 1;
                }
            }

            const emailData = {
                companyName: company.name,
                pendingCount: pendingCount,
                oldestApplicationDays: oldestApplicationDays,
                date: new Date().toLocaleDateString()
            };

            console.log(`Sending reminder to ${company.name}: ${pendingCount} pending apps, oldest: ${oldestApplicationDays} days`);
            
            const emailResult = await EmailService.sendCompanyReminderEmail(company.email, emailData);
            
            return emailResult;

        } catch (error) {
            console.error('Error sending company reminder email:', error);
            return { success: false, error: error.message };
        }
    }

    async batchProcessApplications(applicationIds, forceReparse = false) {
        try {
            console.log(`Starting batch processing for ${applicationIds.length} applications`);
            
            const results = {
                total: applicationIds.length,
                processed: 0,
                successful: 0,
                failed: 0,
                alreadyProcessed: 0,
                details: []
            };

            for (const applicationId of applicationIds) {
                try {
                    const result = await this.processSpecificApplication(applicationId, forceReparse);
                    
                    results.processed++;
                    
                    if (result.success) {
                        if (result.alreadyProcessed) {
                            results.alreadyProcessed++;
                        } else {
                            results.successful++;
                        }
                    } else {
                        results.failed++;
                    }
                    
                    results.details.push({
                        applicationId,
                        success: result.success,
                        decision: result.decision,
                        score: result.score,
                        error: result.error
                    });

                    console.log(`Processed ${results.processed}/${results.total}: ${applicationId} - ${result.decision}`);

                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                } catch (error) {
                    console.error(`Failed to process application ${applicationId}:`, error);
                    results.processed++;
                    results.failed++;
                    results.details.push({
                        applicationId,
                        success: false,
                        error: error.message
                    });
                }
            }

            console.log(`Batch processing completed: ${results.successful} successful, ${results.failed} failed, ${results.alreadyProcessed} already processed`);
            
            return results;

        } catch (error) {
            console.error('Error in batch processing:', error);
            throw new Error(`Batch processing failed: ${error.message}`);
        }
    }

    async getProcessingStatus(applicationId) {
        try {
            const application = await JobApplication.findById(applicationId)
                .select('reviewStatus automatedAt processingError resumeScore parsedResume')
                .lean();

            if (!application) {
                throw new Error(`Application ${applicationId} not found`);
            }

            return {
                applicationId,
                reviewStatus: application.reviewStatus,
                automatedAt: application.automatedAt,
                processingError: application.processingError,
                score: application.resumeScore?.overallScore,
                decision: application.reviewStatus,
                parseStatus: application.parsedResume?.parseStatus,
                hasParsedData: !!application.parsedResume?.name
            };

        } catch (error) {
            console.error(`Error getting status for application ${applicationId}:`, error);
            throw new Error(`Failed to get processing status: ${error.message}`);
        }
    }

    async reprocessFailedApplications() {
        try {
            console.log('Finding failed applications for reprocessing...');
            
            const failedApplications = await JobApplication.find({
                $or: [
                    { reviewStatus: 'PROCESSING_FAILED' },
                    { processingError: { $exists: true, $ne: null } },
                    { automatedAt: { $exists: false } },
                    { resumeScore: { $exists: false } }
                ]
            }).select('_id').lean();

            const applicationIds = failedApplications.map(app => app._id);
            
            console.log(`Found ${applicationIds.length} failed applications to reprocess`);
            
            if (applicationIds.length === 0) {
                return {
                    success: true,
                    message: 'No failed applications found for reprocessing',
                    total: 0,
                    processed: 0
                };
            }

            const results = await this.batchProcessApplications(applicationIds, true);
            
            return {
                success: true,
                message: `Reprocessed ${results.processed} applications`,
                ...results
            };

        } catch (error) {
            console.error('Error reprocessing failed applications:', error);
            return {
                success: false,
                error: error.message,
                total: 0,
                processed: 0
            };
        }
    }

    async getServiceStats() {
        try {
            const stats = await JobApplication.aggregate([
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        processed: {
                            $sum: {
                                $cond: [{ $ifNull: ['$automatedAt', false] }, 1, 0]
                            }
                        },
                        accepted: {
                            $sum: {
                                $cond: [{ $eq: ['$reviewStatus', 'ACCEPT'] }, 1, 0]
                            }
                        },
                        rejected: {
                            $sum: {
                                $cond: [{ $eq: ['$reviewStatus', 'REJECT'] }, 1, 0]
                            }
                        },
                        manualReview: {
                            $sum: {
                                $cond: [{ $eq: ['$reviewStatus', 'MANUAL_REVIEW'] }, 1, 0]
                            }
                        },
                        failed: {
                            $sum: {
                                $cond: [{ $eq: ['$reviewStatus', 'PROCESSING_FAILED'] }, 1, 0]
                            }
                        }
                    }
                }
            ]);

            const result = stats[0] || {
                total: 0,
                processed: 0,
                accepted: 0,
                rejected: 0,
                manualReview: 0,
                failed: 0
            };

            return {
                ...result,
                processingRate: result.total > 0 ? 
                    ((result.processed / result.total) * 100).toFixed(2) : 0
            };

        } catch (error) {
            console.error('Error getting service stats:', error);
            throw new Error(`Failed to get service statistics: ${error.message}`);
        }
    }

    async cleanupOldData(daysOld = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            const result = await JobApplication.updateMany(
                {
                    automatedAt: { $lt: cutoffDate },
                    reviewStatus: { $ne: 'PROCESSING_FAILED' }
                },
                {
                    $unset: {
                        'parsedResume.skills': 1,
                        'parsedResume.certificationKeywords': 1,
                        'parsedResume.projectKeywords': 1,
                        processingError: 1
                    }
                }
            );

            console.log(`Cleaned up processing data for ${result.modifiedCount} applications older than ${daysOld} days`);
            
            return {
                success: true,
                modifiedCount: result.modifiedCount,
                cutoffDate: cutoffDate
            };

        } catch (error) {
            console.error('Error cleaning up old data:', error);
            throw new Error(`Cleanup failed: ${error.message}`);
        }
    }

    getServiceStatus() {
        const resumeServiceStatus = this.resumeAnalysisService ? { ready: true } : { ready: false };
        
        return {
            service: 'AutoApplicationService',
            initialized: true,
            resumeAnalysisReady: resumeServiceStatus.ready,
            isProcessing: this.isProcessing,
            reminderServiceActive: true,
            lastCheck: new Date().toISOString()
        };
    }
}

const autoApplicationService = new AutoApplicationService();
export default autoApplicationService;