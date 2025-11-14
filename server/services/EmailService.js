import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

class EmailService {
    constructor() {
        this.transporter = null;
        this.initialized = false;
        this.initializeTransport();
    }

    initializeTransport() {
        try {
            if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
                console.error('Missing email configuration - EMAIL_USER or EMAIL_PASSWORD not set');
                this.transporter = null;
                this.initialized = false;
                return;
            }

            console.log('Initializing email transporter with user:', process.env.EMAIL_USER);

            this.transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD
                },
                tls: {
                    rejectUnauthorized: false
                }
            });

            // Verify transporter configuration
            this.transporter.verify((error) => {
                if (error) {
                    console.error('Email transporter verification failed:', error);
                    this.initialized = false;
                } else {
                    this.initialized = true;
                    console.log('Email transporter initialized and verified successfully');
                }
            });
            
        } catch (error) {
            console.error('Failed to initialize email transporter:', error);
            this.transporter = null;
            this.initialized = false;
        }
    }

    async sendEmail(to, subject, html) {
        try {
            console.log(`Attempting to send email to: ${to}`);
            console.log(`Email subject: ${subject}`);
            console.log(`Email service initialized: ${this.initialized}`);

            if (!this.transporter || !this.initialized) {
                const error = 'Email transporter not initialized. Check EMAIL_USER and EMAIL_PASSWORD environment variables.';
                console.error(error);
                throw new Error(error);
            }

            if (!to || !subject || !html) {
                const error = 'Missing required email parameters: to, subject, or html content';
                console.error(error);
                throw new Error(error);
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(to)) {
                const error = `Invalid recipient email format: ${to}`;
                console.error(error);
                throw new Error(error);
            }

            const mailOptions = {
                from: {
                    name: process.env.COMPANY_NAME || 'Job Portal System',
                    address: process.env.EMAIL_USER
                },
                to,
                subject,
                html
            };

            console.log('Sending email with options:', {
                from: mailOptions.from,
                to: mailOptions.to,
                subject: mailOptions.subject
            });

            const result = await this.transporter.sendMail(mailOptions);
            console.log('Email sent successfully:', {
                messageId: result.messageId,
                response: result.response,
                to: to
            });
            
            return { 
                success: true, 
                messageId: result.messageId,
                response: result.response
            };
        } catch (error) {
            console.error('Email sending failed:', {
                error: error.message,
                code: error.code,
                to: to,
                subject: subject
            });
            
            let errorMessage = error.message;
            if (error.code === 'EAUTH') {
                errorMessage = 'Email authentication failed - check EMAIL_USER and EMAIL_PASSWORD';
            } else if (error.code === 'ECONNECTION') {
                errorMessage = 'Failed to connect to email server';
            } else if (error.code === 'ETIMEDOUT') {
                errorMessage = 'Email sending timed out';
            }
            
            return { 
                success: false, 
                error: errorMessage,
                code: error.code
            };
        }
    }

    // ACCEPTANCE EMAIL - polite and professional
    async sendAcceptanceEmail(candidateEmail, data) {
        try {
            console.log('Sending acceptance email to:', candidateEmail);
            const { candidateName, jobTitle, companyName, resumeScore, isAutomatic, interviewDetails } = data;
            
            const subject = `🎉 Congratulations! Application Accepted - ${jobTitle} at ${companyName}`;
            
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
                        .container { max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 30px; border-radius: 8px; }
                        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                        .content { padding: 20px; background: white; border-radius: 0 0 8px 8px; }
                        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                        .score-badge { background: #2196F3; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold; }
                        .interview-box { background: #e8f5e8; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #4CAF50; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Congratulations ${candidateName}!</h1>
                            <p>Your application has been accepted</p>
                        </div>
                        <div class="content">
                            <p>We are pleased to inform you that your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been <strong>ACCEPTED</strong>!</p>
                            
                            ${resumeScore ? `
                                <p><strong>Application Score:</strong> <span class="score-badge">${resumeScore}%</span></p>
                            ` : ''}
                            
                            ${interviewDetails ? `
                                <div class="interview-box">
                                    <h3>Interview Details:</h3>
                                    <p><strong>Date:</strong> ${interviewDetails.date}</p>
                                    <p><strong>Time:</strong> ${interviewDetails.time}</p>
                                    <p><strong>Mode:</strong> ${interviewDetails.mode}</p>
                                    <p><strong>Location/Link:</strong> ${interviewDetails.location}</p>
                                    ${interviewDetails.additionalInfo ? `<p><strong>Additional Info:</strong> ${interviewDetails.additionalInfo}</p>` : ''}
                                </div>
                            ` : `
                                <p><strong>Next Steps:</strong></p>
                                <p>Our HR team will contact you within 2-3 business days to schedule your interview and provide further details.</p>
                            `}
                            
                            <p>We look forward to discussing this opportunity with you further.</p>
                            
                            <p>Best regards,<br><strong>${companyName} Hiring Team</strong></p>
                        </div>
                        <div class="footer">
                            <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
                            ${isAutomatic ? '<p>This decision was made through our automated screening process.</p>' : ''}
                        </div>
                    </div>
                </body>
                </html>
            `;
            
            return await this.sendEmail(candidateEmail, subject, html);
        } catch (error) {
            console.error('Error in sendAcceptanceEmail:', error);
            return { success: false, error: error.message };
        }
    }

    // REJECTION EMAIL - polite, non-judgmental, and actionable
    async sendRejectionEmail(candidateEmail, data) {
        try {
            console.log('Sending rejection email to:', candidateEmail);
            const { candidateName, jobTitle, companyName, resumeScore, recommendations, missingSkills, isAutomatic, feedback } = data;
            
            const subject = `Application Update - ${jobTitle} at ${companyName}`;
            
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
                        .container { max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 30px; border-radius: 8px; }
                        .header { background: #f44336; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                        .content { padding: 20px; background: white; border-radius: 0 0 8px 8px; }
                        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                        .recommendation { background: #fff3cd; padding: 15px; margin: 10px 0; border-left: 4px solid #ffc107; border-radius: 4px; }
                        .skill-tag { background: #e3f2fd; color: #1976d2; padding: 3px 8px; margin: 2px; border-radius: 3px; display: inline-block; font-size: 12px; }
                        .feedback-box { background: #f0f8ff; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #2196F3; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Application Update</h1>
                            <p>${companyName}</p>
                        </div>
                        <div class="content">
                            <p>Dear ${candidateName},</p>
                            <p>Thank you for your interest in the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>.</p>
                            
                            <p>After careful review, we have decided to move forward with other candidates whose profiles more closely match our current requirements.</p>
                            
                            ${resumeScore ? `
                                <p><strong>Application Assessment Score:</strong> ${resumeScore}%</p>
                            ` : ''}
                            
                            ${feedback ? `
                                <div class="feedback-box">
                                    <h3>Feedback:</h3>
                                    <p>${feedback}</p>
                                </div>
                            ` : ''}
                            
                            ${recommendations && recommendations.length > 0 ? `
                                <div class="recommendation">
                                    <h3>Suggestions for Future Applications:</h3>
                                    <ul>
                                        ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
                                    </ul>
                                </div>
                            ` : ''}
                            
                            ${missingSkills && missingSkills.length > 0 ? `
                                <p><strong>Skills to Consider Developing:</strong></p>
                                <div>
                                    ${missingSkills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                                </div>
                            ` : ''}
                            
                            <p>We appreciate your interest in ${companyName} and wish you success in your career journey.</p>
                            
                            <p>Best regards,<br><strong>${companyName} Hiring Team</strong></p>
                        </div>
                        <div class="footer">
                            <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
                            ${isAutomatic ? '<p>This decision was made through our automated screening process.</p>' : ''}
                        </div>
                    </div>
                </body>
                </html>
            `;
            
            return await this.sendEmail(candidateEmail, subject, html);
        } catch (error) {
            console.error('Error in sendRejectionEmail:', error);
            return { success: false, error: error.message };
        }
    }

    // MANUAL REVIEW EMAIL - polite and informative
    async sendManualReviewEmail(candidateEmail, data) {
        try {
            console.log('Sending manual review email to:', candidateEmail);
            const { candidateName, jobTitle, companyName, resumeScore, recommendations } = data;
            
            const subject = `Application Under Review - ${jobTitle} at ${companyName}`;
            
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
                        .container { max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 30px; border-radius: 8px; }
                        .header { background: #ff9800; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                        .content { padding: 20px; background: white; border-radius: 0 0 8px 8px; }
                        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                        .recommendation { background: #fff3cd; padding: 15px; margin: 10px 0; border-left: 4px solid #ffc107; border-radius: 4px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Application Update</h1>
                            <p>Under Manual Review</p>
                        </div>
                        <div class="content">
                            <p>Dear ${candidateName},</p>
                            <p>Thank you for applying for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>.</p>
                            
                            <p>Your application is currently under manual review by our hiring team. This process ensures that we give each application the careful consideration it deserves.</p>
                            
                            ${resumeScore ? `
                                <p><strong>Preliminary Assessment Score:</strong> ${resumeScore}%</p>
                            ` : ''}
                            
                            ${recommendations && recommendations.length > 0 ? `
                                <div class="recommendation">
                                    <h3>While You Wait:</h3>
                                    <p>You might consider:</p>
                                    <ul>
                                        ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
                                    </ul>
                                </div>
                            ` : ''}
                            
                            <p>We will notify you as soon as our review is complete, which typically takes 3-5 business days.</p>
                            
                            <p>Thank you for your patience and interest in joining our team.</p>
                            
                            <p>Best regards,<br><strong>${companyName} Hiring Team</strong></p>
                        </div>
                        <div class="footer">
                            <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `;
            
            return await this.sendEmail(candidateEmail, subject, html);
        } catch (error) {
            console.error('Error in sendManualReviewEmail:', error);
            return { success: false, error: error.message };
        }
    }

    // COMPANY REMINDER EMAIL - professional and actionable
    async sendCompanyReminderEmail(companyEmail, data) {
        try {
            console.log('Sending company reminder email to:', companyEmail);
            const { companyName, pendingCount, oldestApplicationDays } = data;
            
            const subject = `Reminder: ${pendingCount} Pending Application Reviews - Action Required`;
            
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
                        .container { max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 30px; border-radius: 8px; }
                        .header { background: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                        .content { padding: 20px; background: white; border-radius: 0 0 8px 8px; }
                        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                        .urgent { background: #ffeb3b; padding: 15px; margin: 10px 0; border-radius: 4px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Application Review Reminder</h1>
                            <p>${companyName}</p>
                        </div>
                        <div class="content">
                            <p>Hello ${companyName} Team,</p>
                            
                            <div class="urgent">
                                <h3>Action Required: ${pendingCount} Pending Applications</h3>
                                <p><strong>Oldest Application:</strong> ${oldestApplicationDays} days ago</p>
                            </div>
                            
                            <p>Quick responses help maintain a positive candidate experience and ensure you don't miss qualified talent.</p>
                            
                            <p><strong>Available Actions:</strong></p>
                            <ul>
                                <li>Review applications individually in your dashboard</li>
                                <li>Use the auto-review feature for AI-assisted decisions</li>
                                <li>Bulk update application statuses</li>
                            </ul>
                            
                            <p><strong>Dashboard Link:</strong> <a href="${process.env.FRONTEND_URL || 'https://your-app.com'}/company/dashboard">Review Applications</a></p>
                            
                            <p>This is an automated reminder. You will receive at most one reminder per 24 hours.</p>
                            
                            <p>Best regards,<br><strong>Job Portal System</strong></p>
                        </div>
                        <div class="footer">
                            <p>&copy; ${new Date().getFullYear()} Job Portal System. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `;
            
            return await this.sendEmail(companyEmail, subject, html);
        } catch (error) {
            console.error('Error in sendCompanyReminderEmail:', error);
            return { success: false, error: error.message };
        }
    }

    // STATUS UPDATE EMAIL (generic fallback)
    async sendStatusUpdateEmail(candidateEmail, data) {
        try {
            console.log('Sending status update email to:', candidateEmail);
            const { candidateName, jobTitle, companyName, status, message } = data;
            
            const subject = `Application Status Update: ${jobTitle} at ${companyName}`;
            
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
                        .container { max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 30px; border-radius: 8px; }
                        .header { background: #666; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                        .content { padding: 20px; background: white; border-radius: 0 0 8px 8px; }
                        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Application Status Update</h1>
                            <p>${companyName}</p>
                        </div>
                        <div class="content">
                            <p>Dear ${candidateName},</p>
                            <p>Your application status for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been updated to: <strong>${status}</strong></p>
                            
                            ${message ? `<p>${message}</p>` : ''}
                            
                            <p>We will keep you informed of any further updates.</p>
                            
                            <p>Best regards,<br><strong>${companyName} Hiring Team</strong></p>
                        </div>
                        <div class="footer">
                            <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            return await this.sendEmail(candidateEmail, subject, html);
        } catch (error) {
            console.error('Error in sendStatusUpdateEmail:', error);
            return { success: false, error: error.message };
        }
    }

    // Get transporter status for debugging
    getStatus() {
        return {
            initialized: this.initialized,
            hasTransporter: !!this.transporter,
            emailConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD),
            emailUser: process.env.EMAIL_USER ? 'Set' : 'Not set',
            emailPassword: process.env.EMAIL_PASSWORD ? 'Set' : 'Not set'
        };
    }

    // Test email sending
    async testEmail(toEmail = process.env.EMAIL_USER) {
        try {
            const testResult = await this.sendEmail(
                toEmail,
                'Test Email from Job Portal',
                `<h1>Test Email</h1><p>This is a test email sent at ${new Date().toISOString()}</p>`
            );
            
            console.log('Test email result:', testResult);
            return testResult;
        } catch (error) {
            console.error('Test email failed:', error);
            return { success: false, error: error.message };
        }
    }
    // SCHEDULED REPORT EMAIL - professional notification with attachment
async sendScheduledReportEmail(recipientEmail, reportData, attachmentPath) {
    try {
        console.log('Sending scheduled report email to:', recipientEmail);
        const { reportName, companyName, frequency, generatedDate, format } = reportData;
        
        const subject = `Scheduled Report: ${reportName} - ${new Date().toLocaleDateString()}`;
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 30px; border-radius: 8px; }
                    .header { background: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { padding: 20px; background: white; border-radius: 0 0 8px 8px; }
                    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                    .report-info { background: #e3f2fd; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #2196F3; }
                    .button { display: inline-block; padding: 12px 24px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Scheduled Report Ready</h1>
                        <p>${reportName}</p>
                    </div>
                    <div class="content">
                        <p>Hello,</p>
                        <p>Your scheduled ${frequency} report for <strong>${companyName}</strong> is ready for review.</p>
                        
                        <div class="report-info">
                            <h3>Report Details:</h3>
                            <p><strong>Report Name:</strong> ${reportName}</p>
                            <p><strong>Generated:</strong> ${generatedDate || new Date().toLocaleString()}</p>
                            <p><strong>Format:</strong> ${format?.toUpperCase() || 'PDF'}</p>
                            <p><strong>Frequency:</strong> ${frequency}</p>
                        </div>
                        
                        <p>The report file is attached to this email. You can also download it from your dashboard.</p>
                        
                        <p>If you have any questions or need to modify this scheduled report, please log in to your dashboard.</p>
                        
                        <p>Best regards,<br><strong>HireConnect Reporting System</strong></p>
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} HireConnect. All rights reserved.</p>
                        <p>This is an automated scheduled report. Do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        // Prepare mail options with attachment
        const mailOptions = {
            from: {
                name: process.env.COMPANY_NAME || 'HireConnect Reporting',
                address: process.env.EMAIL_USER
            },
            to: recipientEmail,
            subject,
            html
        };

        // Add attachment if provided
        if (attachmentPath) {
            mailOptions.attachments = [{
                filename: reportData.fileName || `${reportName.replace(/\s+/g, '_')}.${format || 'pdf'}`,
                path: attachmentPath
            }];
        }

        const result = await this.transporter.sendMail(mailOptions);
        console.log('Scheduled report email sent successfully:', {
            messageId: result.messageId,
            to: recipientEmail
        });
        
        return { 
            success: true, 
            messageId: result.messageId,
            response: result.response
        };
    } catch (error) {
        console.error('Failed to send scheduled report email:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
}

// REPORT GENERATION NOTIFICATION - notify when on-demand report is ready
async sendReportReadyEmail(recipientEmail, reportData) {
    try {
        const { reportName, downloadUrl, companyName } = reportData;
        
        const subject = `Report Ready: ${reportName}`;
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 30px; border-radius: 8px; }
                    .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { padding: 20px; background: white; border-radius: 0 0 8px 8px; }
                    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                    .button { display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Your Report is Ready!</h1>
                    </div>
                    <div class="content">
                        <p>Hello,</p>
                        <p>Your custom report "<strong>${reportName}</strong>" has been generated successfully.</p>
                        
                        <p>You can download your report using the button below:</p>
                        
                        <div style="text-align: center;">
                            <a href="${downloadUrl}" class="button">Download Report</a>
                        </div>
                        
                        <p style="margin-top: 20px;">The report will be available for download for the next 30 days.</p>
                        
                        <p>Best regards,<br><strong>${companyName} Team</strong></p>
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} HireConnect. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        return await this.sendEmail(recipientEmail, subject, html);
    } catch (error) {
        console.error('Failed to send report ready email:', error);
        return { success: false, error: error.message };
    }
}
}



// Create and export a singleton instance
const emailService = new EmailService();
export default emailService;