import Company from "../models/Company.js";
import bcrypt from "bcrypt";
import { v2 as cloudinary } from "cloudinary";
import generateToken from "../utils/generateToken.js";
import Job from "../models/Job.js";
import JobApplication from "../models/jobApplication.js";
import EmailService from "../services/EmailService.js";
import AutoApplicationService from "../services/AutoApplicationService.js";

export const registerCompany = async (req, res) => {
  const { name, email, password } = req.body;
  const imageFile = req.file;

  if (!name || !email || !password || !imageFile) {
    return res.json({ success: false, message: "Missing Details" });
  }

  try {
    const companyExists = await Company.findOne({ email });

    if (companyExists) {
      return res.json({ success: false, message: "Company already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    const imageUpload = await cloudinary.uploader.upload(imageFile.path);

    const company = await Company.create({
      name,
      email,
      password: hashPassword,
      image: imageUpload.secure_url,
    });

    res.json({
      success: true,
      company: {
        _id: company._id,
        name: company.name,
        email: company.email,
        image: company.image,
      },
      token: generateToken(company._id),
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const loginCompany = async (req, res) => {
  const { email, password } = req.body;

  try {
    const company = await Company.findOne({ email });

    if (!company) {
      return res.json({ success: false, message: "Company not found" });
    }

    if (await bcrypt.compare(password, company.password)) {
      res.json({
        success: true,
        company: {
          _id: company._id,
          name: company.name,
          email: company.email,
          image: company.image,
        },
        token: generateToken(company._id),
      });
    } else {
      res.json({ success: false, message: "Invalid email or password" });
    }
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getCompanyData = async (req, res) => {
  const company = req.company;
  try {
    res.json({ success: true, company });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const postJob = async (req, res) => {
  const { title, description, location, salary, level, category } = req.body;
  const companyId = req.company._id;

  try {
    const newJob = new Job({
      title,
      description,
      location,
      salary,
      companyId,
      date: Date.now(),
      level,
      category,
      visible: true,
    });

    await newJob.save();
    
    console.log(`New job posted: ${title} by ${req.company.name}`);
    
    res.json({ success: true, newJob });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getCompanyJobApplicants = async (req, res) => {
  try {
    const companyId = req.company._id;

    const applications = await JobApplication.find({ companyId })
      .populate({ path: "userId", select: "name email image resume skills totalExperience" })
      .populate({ path: "jobId", select: "title location category level salary visible" })
      .sort({ submittedAt: -1 })
      .exec();

    const validApplications = applications.filter(app => app.userId && app.jobId);

    res.json({ 
      success: true, 
      applications: validApplications
    });
  } catch (error) {
    console.error('Get applicants error:', error);
    res.json({ success: false, message: error.message });
  }
};



export const getCompanyPostedJobs = async (req, res) => {
  try {
    const companyId = req.company._id;
    const jobs = await Job.find({ companyId }).sort({ date: -1 });

    const jobsData = await Promise.all(
      jobs.map(async job => {
        const applications = await JobApplication.find({ jobId: job._id });
        return { 
          ...job.toObject(), 
          applicants: applications.length
        };
      })
    );

    res.json({ success: true, jobsData });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const updateJob = async (req, res) => {
  try {
    const { id, title, description, location, salary, level, category } = req.body;
    const companyId = req.company._id;

    if (!id || !title || !description || !location || !salary || !level || !category) {
      return res.json({ success: false, message: "Missing required fields" });
    }

    const job = await Job.findOne({ _id: id, companyId: companyId });

    if (!job) {
      return res.json({ 
        success: false, 
        message: "Job not found or you don't have permission to update this job" 
      });
    }

    job.title = title;
    job.description = description;
    job.location = location;
    job.salary = salary;
    job.level = level;
    job.category = category;

    await job.save();

    console.log(`Job updated: ${title} by ${req.company.name}`);

    res.json({ 
      success: true, 
      message: "Job updated successfully",
      job 
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.json({ success: false, message: error.message });
  }
};

export const ChangeJobApplicationStatus = async (req, res) => {
  try {
    const { applicationId, status, feedback, interviewDetails } = req.body;
    const companyId = req.company._id;

    console.log('Manual status change request:', { applicationId, status });

    if (!["Pending", "Accepted", "Rejected"].includes(status)) {
      return res.json({ success: false, message: "Invalid status" });
    }

    const application = await JobApplication.findOne({
      _id: applicationId,
      companyId,
    })
      .populate("userId")
      .populate("jobId")
      .populate("companyId");

    if (!application) {
      return res.json({ success: false, message: "Application not found or unauthorized" });
    }

    if (!application.userId?.email || !application.userId.email.trim()) {
      return res.json({ 
        success: false, 
        message: `Cannot send email: User ${application.userId?.name || 'Unknown'} does not have a valid email address.`
      });
    }

    application.status = status;
    application.emailSent = false;
    application.emailSentDate = null;
    application.reviewedAt = new Date();
    
    if (status === "Accepted") {
      application.reviewStatus = "ACCEPT";
    } else if (status === "Rejected") {
      application.reviewStatus = "REJECT";
    } else {
      application.reviewStatus = "PENDING";
    }

    if (feedback) application.feedback = feedback;
    if (interviewDetails && status === "Accepted") {
      application.interviewDetails = interviewDetails;
    }

    await application.save();

    console.log(`Application ${applicationId} manually updated to ${status}, reviewStatus: ${application.reviewStatus}`);

    let emailResult = { success: false, error: 'No email sent' };

    try {
      const emailData = {
        candidateName: application.userId.name || 'Candidate',
        jobTitle: application.jobId.title || 'Position',
        companyName: application.companyId.name || 'Company',
        feedback: application.feedback || null,
        interviewDetails: application.interviewDetails || null,
        resumeScore: application.resumeScore?.displayScore || application.resumeScore?.totalScore || null,
        status,
        isAutomatic: false
      };

      console.log('Sending email for manual status change...');

      if (status === "Accepted") {
        emailResult = await EmailService.sendAcceptanceEmail(application.userId.email.trim(), emailData);
      } else if (status === "Rejected") {
        emailResult = await EmailService.sendRejectionEmail(application.userId.email.trim(), emailData);
      } else {
        emailResult = await EmailService.sendStatusUpdateEmail(application.userId.email.trim(), emailData);
      }

      if (emailResult && emailResult.success) {
        application.emailSent = true;
        application.emailSentDate = new Date();
        await application.save();
      }

    } catch (emailError) {
      console.error("Email notification error:", emailError.message);
      emailResult = { success: false, error: emailError.message };
    }

    const responseMessage = emailResult.success 
      ? `Application ${status.toLowerCase()} successfully and email sent to ${application.userId.email.trim()}`
      : `Application ${status.toLowerCase()} successfully but email failed: ${emailResult.error}`;

    res.json({
      success: true,
      message: responseMessage,
      emailSent: emailResult.success,
      emailError: !emailResult.success ? emailResult.error : null,
      emailSentDate: emailResult.success ? new Date() : null,
      application: {
        _id: application._id,
        status: application.status,
        reviewStatus: application.reviewStatus,
        userId: application.userId,
        jobId: application.jobId,
        companyId: application.companyId,
        emailSent: application.emailSent,
        emailSentDate: application.emailSentDate
      },
    });
  } catch (error) {
    console.error('Change status error:', error);
    res.json({ success: false, message: error.message });
  }
};

export const bulkUpdateApplicationStatus = async (req, res) => {
  try {
    const { applications, status, feedback } = req.body;
    const companyId = req.company._id;

    if (!applications || !Array.isArray(applications) || applications.length === 0) {
      return res.json({ success: false, message: "No applications provided" });
    }
    
    if (!["Pending", "Accepted", "Rejected"].includes(status)) {
      return res.json({ success: false, message: "Invalid status" });
    }

    console.log(`Starting bulk update for ${applications.length} applications to status: ${status}`);

    const results = [];
    let successfulUpdates = 0;
    let emailSuccessCount = 0;
    let emailFailures = [];

    for (const applicationId of applications) {
      try {
        const application = await JobApplication.findOne({
          _id: applicationId,
          companyId,
        })
          .populate("userId")
          .populate("jobId")
          .populate("companyId");

        if (application && application.status !== status) {
          if (!application.userId?.email || !application.userId.email.trim()) {
            console.log(`Skipping application ${applicationId} - user has no valid email`);
            results.push({
              applicationId,
              success: false,
              message: `User ${application.userId?.name || 'Unknown'} has no valid email address`
            });
            continue;
          }

          application.status = status;
          application.emailSent = false;
          application.emailSentDate = null;
          application.reviewedAt = new Date();
          
          if (status === "Accepted") {
            application.reviewStatus = "ACCEPT";
          } else if (status === "Rejected") {
            application.reviewStatus = "REJECT";
          } else {
            application.reviewStatus = "PENDING";
          }
          
          if (feedback) application.feedback = feedback;

          await application.save();
          successfulUpdates++;

          try {
            const emailData = {
              candidateName: application.userId.name || 'Candidate',
              jobTitle: application.jobId.title || 'Position',
              companyName: application.companyId.name || 'Company',
              feedback: feedback,
              resumeScore: application.resumeScore?.displayScore || application.resumeScore?.totalScore || null,
              status: status,
              isAutomatic: false
            };

            let emailResult;
            const candidateEmail = application.userId.email.trim();

            if (status === "Accepted") {
              emailResult = await EmailService.sendAcceptanceEmail(candidateEmail, emailData);
            } else if (status === "Rejected") {
              emailResult = await EmailService.sendRejectionEmail(candidateEmail, emailData);
            } else {
              emailResult = await EmailService.sendStatusUpdateEmail(candidateEmail, emailData);
            }

            if (emailResult && emailResult.success) {
              emailSuccessCount++;
              application.emailSent = true;
              application.emailSentDate = new Date();
              await application.save();
            } else {
              emailFailures.push({
                email: candidateEmail,
                error: emailResult?.error || 'Unknown error'
              });
            }

            results.push({
              applicationId,
              success: true,
              emailSent: emailResult ? emailResult.success : false
            });

            await new Promise(resolve => setTimeout(resolve, 1000));

          } catch (emailError) {
            console.error(`Email error for application ${applicationId}:`, emailError.message);
            emailFailures.push({
              email: application.userId.email,
              error: emailError.message
            });
            results.push({
              applicationId,
              success: true,
              emailSent: false,
              emailError: emailError.message
            });
          }
        } else {
          results.push({ 
            applicationId, 
            success: false, 
            message: application ? "Status already set" : "Application not found" 
          });
        }
      } catch (error) {
        console.error(`Error processing application ${applicationId}:`, error.message);
        results.push({ applicationId, success: false, error: error.message });
      }
    }

    console.log(`Bulk update completed: ${successfulUpdates}/${applications.length} updated, ${emailSuccessCount} emails sent`);

    res.json({
      success: true,
      message: `Bulk update completed: ${successfulUpdates}/${applications.length} updated, ${emailSuccessCount} emails sent`,
      results,
      emailFailures,
      summary: { 
        total: applications.length, 
        updated: successfulUpdates, 
        emailsSent: emailSuccessCount,
        emailsFailed: emailFailures.length
      },
    });
  } catch (error) {
    console.error("Bulk update error:", error);
    res.json({ success: false, message: error.message });
  }
};

export const triggerAutoReview = async (req, res) => {
  try {
    const { applicationId, forceReparse } = req.body;
    const companyId = req.company._id;

    console.log(`Auto-review triggered for application: ${applicationId}, forceReparse: ${forceReparse}`);

    if (!applicationId) {
      return res.json({ success: false, message: "Application ID is required" });
    }

    const application = await JobApplication.findOne({
      _id: applicationId,
      companyId: companyId
    }).populate('userId jobId companyId');

    if (!application) {
      return res.json({ success: false, message: "Application not found or unauthorized" });
    }

    if (!application.jobId) {
      return res.json({ success: false, message: "Associated job no longer exists" });
    }

    const resumeUrl = application.resumeUrl || application.userId?.resume;
    if (!resumeUrl || resumeUrl === 'NO_RESUME' || resumeUrl === 'ERROR') {
      return res.json({ 
        success: false, 
        message: "No valid resume found for this application. Please ask candidate to upload resume." 
      });
    }

    console.log('Current application state:', {
      id: application._id,
      status: application.status,
      reviewStatus: application.reviewStatus,
      hasScore: !!application.resumeScore?.totalScore,
      automatedAt: application.automatedAt,
      resumeUrl: !!resumeUrl
    });

    if (!forceReparse && application.resumeScore?.totalScore !== undefined && application.automatedAt) {
      return res.json({
        success: true,
        message: "Application already has existing score",
        existingScore: application.resumeScore.totalScore,
        displayScore: application.resumeScore.displayScore,
        decision: application.reviewStatus,
        skipReason: "Use forceReparse=true to recalculate"
      });
    }

    console.log('Calling AutoApplicationService.processSpecificApplication...');
    const result = await AutoApplicationService.processSpecificApplication(applicationId, forceReparse || false);
    
    console.log('Auto-review result:', result);

    if (result.success) {
      const updatedApplication = await JobApplication.findById(applicationId)
        .populate('userId jobId companyId');

      if (!updatedApplication) {
        return res.json({
          success: false,
          message: "Failed to fetch updated application data"
        });
      }

      res.json({
        success: true,
        message: `Auto-review completed: ${result.decision}`,
        result: {
          applicationId: result.applicationId,
          decision: result.decision,
          score: result.displayScore || result.score || result.totalScore,
          totalScore: result.totalScore || result.score,
          displayScore: result.displayScore || result.totalScore || result.score,
          matchedSkills: result.matchedSkills || [],
          missingSkills: result.missingSkills || [],
          recommendations: result.recommendations || [],
          breakdown: result.breakdown || {},
          emailSent: updatedApplication.emailSent || false,
          emailSentDate: updatedApplication.emailSentDate || null,
          status: updatedApplication.status,
          reviewStatus: updatedApplication.reviewStatus
        }
      });
    } else {
      res.json({
        success: false,
        message: result.error || result.reason || 'Auto-review failed',
        error: result.error || result.reason,
        details: result
      });
    }
    
  } catch (error) {
    console.error('Auto-review trigger error:', error);
    res.json({ 
      success: false, 
      message: `Auto-review failed: ${error.message}`,
      error: error.message 
    });
  }
};
export const sendCustomEmail = async (req, res) => {
  try {
    const { applicationId, subject, message } = req.body;
    const companyId = req.company._id;

    if (!applicationId || !subject || !message) {
      return res.json({ success: false, message: "Missing required fields" });
    }

    const application = await JobApplication.findOne({
      _id: applicationId,
      companyId,
    })
      .populate("userId")
      .populate("companyId");

    if (!application) {
      return res.json({ success: false, message: "Application not found" });
    }

    if (!application.userId.email || !application.userId.email.trim()) {
      return res.json({ 
        success: false, 
        message: `Cannot send email: User ${application.userId.name || 'Unknown'} does not have a valid email address.` 
      });
    }

    const emailResult = await EmailService.sendEmail(
      application.userId.email.trim(), 
      subject, 
      message
    );

    if (emailResult.success) {
      application.customEmails = application.customEmails || [];
      application.customEmails.push({ 
        subject, 
        message, 
        sentBy: req.company.name,
        sentDate: new Date()
      });
      await application.save();
    }

    res.json({
      success: emailResult.success,
      message: emailResult.success ? "Email sent successfully" : "Failed to send email",
      result: emailResult,
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const deleteJob = async (req, res) => {
    try {
        const { id } = req.body;
        const companyId = req.company._id; // CHANGED FROM req.companyId

        console.log('Delete job request received:', { id, companyId });

        // Find the job and verify it belongs to the company
        const job = await Job.findOne({ _id: id, companyId: companyId });
        
        if (!job) {
            return res.status(404).json({ 
                success: false, 
                message: "Job not found or you don't have permission to delete this job" 
            });
        }

        // Delete all applications associated with this job
        await JobApplication.deleteMany({ jobId: id }); // CHANGED FROM Application
        
        // Delete the job
        await Job.findByIdAndDelete(id);
        
        console.log('Job deleted successfully:', id);
        
        res.json({ 
            success: true, 
            message: "Job and all associated applications deleted successfully" 
        });
    } catch (error) {
        console.error('Delete job error:', error);
        res.status(500).json({ 
            success: false, 
            message: "Server error while deleting job" 
        });
    }
};
export const changeVisibility = async (req, res) => {
  try {
    const { id } = req.body;
    const companyId = req.company._id;

    const job = await Job.findById(id);

    if (!job) return res.json({ success: false, message: "Job not found" });

    if (companyId.toString() === job.companyId.toString()) {
      job.visible = !job.visible;
      await job.save();
      
      console.log(`Job ${job.title} visibility changed to ${job.visible ? 'visible' : 'hidden'}`);
      
      res.json({ success: true, job });
    } else {
      res.json({ success: false, message: "Unauthorized" });
    }
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};