import JobApplication from '../models/jobApplication.js';
import Job from '../models/Job.js';
import Company from '../models/Company.js';
import Report from '../models/Report.js';
import ScheduledReport from '../models/ScheduledReport.js';
import WhiteLabelSettings from '../models/WhiteLabelSettings.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import EmailService from '../services/EmailService.js';

export const generateReport = async (req, res) => {
  try {
    const { name, metrics, dateRange, format, whiteLabelSettings } = req.body;
    const companyId = req.company._id;

    console.log('Generating report:', { name, metrics, dateRange, format });

    if (!metrics || metrics.length === 0) {
      return res.json({ success: false, message: 'No metrics selected' });
    }

    const startDate = dateRange.start ? new Date(dateRange.start) : new Date(0);
    const endDate = dateRange.end ? new Date(dateRange.end) : new Date();

    const applications = await JobApplication.find({
      companyId,
      submittedAt: { $gte: startDate, $lte: endDate }
    })
      .populate('userId', 'name email')
      .populate('jobId', 'title location category level salary')
      .sort({ submittedAt: -1 });

    const jobs = await Job.find({ companyId });
    const company = await Company.findById(companyId);

    const reportData = await generateReportData(metrics, applications, jobs, company);

    let filePath;
    let fileName;
    const reportNameSafe = (name || `Report_${new Date().toISOString().split('T')[0]}`).replace(/\s+/g, '_');

    if (format === 'pdf') {
      fileName = `${reportNameSafe}_${Date.now()}.pdf`;
      filePath = await generatePDFReport(reportData, company, whiteLabelSettings, fileName);
    } else if (format === 'excel') {
      fileName = `${reportNameSafe}_${Date.now()}.xlsx`;
      filePath = await generateExcelReport(reportData, company, fileName);
    } else if (format === 'csv') {
      fileName = `${reportNameSafe}_${Date.now()}.csv`;
      filePath = await generateCSVReport(reportData, fileName);
    } else {
      return res.json({ success: false, message: 'Invalid format specified' });
    }

    let fileSize = 0;
    try {
      const stats = fs.statSync(filePath);
      fileSize = stats.size;
    } catch (err) {
      console.error('Error getting file size:', err);
    }

    console.log('Report file generated:', fileName, 'Size:', fileSize);

    const report = await Report.create({
      companyId,
      name: name || `Report_${new Date().toISOString().split('T')[0]}`,
      metrics,
      dateRange: { start: startDate, end: endDate },
      format,
      data: reportData,
      generatedAt: new Date(),
      fileUrl: `/api/reports/download/${fileName}`,
      fileSize: fileSize
    });

    console.log('Report saved to database:', report._id);

    res.json({
      success: true,
      message: 'Report generated successfully',
      report: {
        id: report._id,
        name: report.name,
        format: report.format,
        generatedAt: report.generatedAt,
        fileSize: fileSize
      },
      downloadUrl: `/api/reports/download/${fileName}`,
      filename: fileName
    });

  } catch (error) {
    console.error('Generate report error:', error);
    res.json({ success: false, message: error.message });
  }
};

const generateReportData = async (metrics, applications, jobs, company) => {
  const data = {
    summary: {},
    charts: {},
    tables: {}
  };

  if (metrics.includes('applications')) {
    data.summary.totalApplications = applications.length;
  }

  if (metrics.includes('accepted')) {
    data.summary.acceptedApplications = applications.filter(app => app.status === 'Accepted').length;
  }

  if (metrics.includes('rejected')) {
    data.summary.rejectedApplications = applications.filter(app => app.status === 'Rejected').length;
  }

  if (metrics.includes('pending')) {
    data.summary.pendingApplications = applications.filter(app => app.status === 'Pending').length;
  }

  if (metrics.includes('avgScore')) {
    const scoredApps = applications.filter(app => app.resumeScore?.totalScore || app.resumeScore?.displayScore);
    const avgScore = scoredApps.length > 0
      ? scoredApps.reduce((sum, app) => sum + (app.resumeScore.displayScore || app.resumeScore.totalScore || 0), 0) / scoredApps.length
      : 0;
    data.summary.averageScore = Math.round(avgScore);
  }

  if (metrics.includes('conversionRate')) {
    const accepted = applications.filter(app => app.status === 'Accepted').length;
    const rate = applications.length > 0 ? ((accepted / applications.length) * 100).toFixed(1) : 0;
    data.summary.conversionRate = `${rate}%`;
  }

  if (metrics.includes('topCandidates')) {
    data.tables.topCandidates = applications
      .filter(app => app.resumeScore?.totalScore || app.resumeScore?.displayScore)
      .sort((a, b) => (b.resumeScore.displayScore || b.resumeScore.totalScore || 0) - (a.resumeScore.displayScore || a.resumeScore.totalScore || 0))
      .slice(0, 10)
      .map(app => ({
        name: app.userId?.name || 'Unknown',
        email: app.userId?.email || 'N/A',
        score: app.resumeScore.displayScore || app.resumeScore.totalScore,
        status: app.status,
        jobTitle: app.jobId?.title || 'N/A'
      }));
  }

  if (metrics.includes('jobPerformance')) {
    const jobStats = {};
    applications.forEach(app => {
      const jobId = app.jobId?._id?.toString();
      if (jobId) {
        if (!jobStats[jobId]) {
          jobStats[jobId] = {
            title: app.jobId.title,
            total: 0,
            accepted: 0,
            rejected: 0,
            pending: 0
          };
        }
        jobStats[jobId].total++;
        if (app.status === 'Accepted') jobStats[jobId].accepted++;
        if (app.status === 'Rejected') jobStats[jobId].rejected++;
        if (app.status === 'Pending') jobStats[jobId].pending++;
      }
    });
    data.tables.jobPerformance = Object.values(jobStats);
  }

  if (metrics.includes('locationBreakdown')) {
    const locationStats = {};
    applications.forEach(app => {
      const location = app.jobId?.location || 'Unknown';
      locationStats[location] = (locationStats[location] || 0) + 1;
    });
    data.charts.locationBreakdown = Object.entries(locationStats).map(([location, count]) => ({
      location,
      count
    }));
  }

  if (metrics.includes('categoryStats')) {
    const categoryStats = {};
    applications.forEach(app => {
      const category = app.jobId?.category || 'Other';
      categoryStats[category] = (categoryStats[category] || 0) + 1;
    });
    data.charts.categoryStats = Object.entries(categoryStats).map(([category, count]) => ({
      category,
      count
    }));
  }

  if (metrics.includes('timeToHire')) {
    const hiredApps = applications.filter(app => app.status === 'Accepted' && app.submittedAt && app.reviewedAt);
    const avgDays = hiredApps.length > 0
      ? hiredApps.reduce((sum, app) => {
          const days = Math.floor((new Date(app.reviewedAt) - new Date(app.submittedAt)) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / hiredApps.length
      : 0;
    data.summary.avgTimeToHire = `${Math.round(avgDays)} days`;
  }

  if (metrics.includes('skillsAnalysis')) {
    const skillsMap = {};
    applications.forEach(app => {
      const skills = app.parsedResume?.skills || [];
      skills.forEach(skill => {
        skillsMap[skill] = (skillsMap[skill] || 0) + 1;
      });
    });
    data.charts.skillsAnalysis = Object.entries(skillsMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([skill, count]) => ({ skill, count }));
  }

  if (metrics.includes('experienceLevel')) {
    const levelStats = {};
    applications.forEach(app => {
      const level = app.jobId?.level || 'Unknown';
      levelStats[level] = (levelStats[level] || 0) + 1;
    });
    data.charts.experienceLevel = Object.entries(levelStats).map(([level, count]) => ({
      level,
      count
    }));
  }

  if (metrics.includes('applicationTrends')) {
    const last30Days = {};
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      last30Days[dateStr] = 0;
    }
    
    applications.forEach(app => {
      const appDate = new Date(app.submittedAt || app.date).toISOString().split('T')[0];
      if (last30Days.hasOwnProperty(appDate)) {
        last30Days[appDate]++;
      }
    });
    
    data.charts.applicationTrends = Object.entries(last30Days).map(([date, count]) => ({
      date,
      count
    }));
  }

  return data;
};

const generatePDFReport = async (reportData, company, whiteLabelSettings, fileName) => {
  return new Promise((resolve, reject) => {
    try {
      const reportsDir = path.join(process.cwd(), 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const filePath = path.join(reportsDir, fileName);
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4',
        bufferPages: true
      });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      const primaryColor = whiteLabelSettings?.primaryColor || '#2196F3';
      const secondaryColor = whiteLabelSettings?.secondaryColor || '#1976D2';
      const headerText = whiteLabelSettings?.headerText || 'Recruitment Analytics Report';
      const footerText = whiteLabelSettings?.footerText || 'Confidential - Internal Use Only';

      // Constants
      const PAGE_HEIGHT = 842;
      const PAGE_WIDTH = 595;
      const MARGIN_TOP = 50;
      const MARGIN_BOTTOM = 90;
      const MARGIN_LEFT = 50;
      const MARGIN_RIGHT = 50;
      const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
      const USABLE_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;

      // Helper function to check if we need a new page
      const needsNewPage = (requiredSpace) => {
        return (doc.y + requiredSpace) > (PAGE_HEIGHT - MARGIN_BOTTOM);
      };

      const addNewPage = () => {
        doc.addPage();
        doc.y = MARGIN_TOP;
      };

      // ===== HEADER SECTION =====
      doc.rect(0, 0, PAGE_WIDTH, 140)
        .fill(primaryColor);
      
      doc.fontSize(28)
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .text(headerText, MARGIN_LEFT, 40, { align: 'center', width: CONTENT_WIDTH });
      
      doc.fontSize(16)
        .fillColor('#E3F2FD')
        .font('Helvetica')
        .text(company.name, MARGIN_LEFT, 80, { align: 'center', width: CONTENT_WIDTH });
      
      if (whiteLabelSettings?.showGeneratedDate !== false) {
        doc.fontSize(10)
          .fillColor('#E3F2FD')
          .text(`Generated: ${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}`, MARGIN_LEFT, 110, { align: 'center', width: CONTENT_WIDTH });
      }

      // Start content after header
      doc.y = 170;

      // ===== EXECUTIVE SUMMARY SECTION =====
      if (reportData.summary && Object.keys(reportData.summary).length > 0) {
        if (needsNewPage(250)) addNewPage();
        
        doc.fontSize(20)
          .fillColor(primaryColor)
          .font('Helvetica-Bold')
          .text('Executive Summary', MARGIN_LEFT, doc.y);
        
        doc.moveTo(MARGIN_LEFT, doc.y + 8)
          .lineTo(MARGIN_LEFT + 200, doc.y + 8)
          .lineWidth(2.5)
          .stroke(primaryColor);
        
        doc.y += 25;

        const summaryEntries = Object.entries(reportData.summary);
        const cardsPerRow = 2;
        const cardWidth = (CONTENT_WIDTH - 15) / cardsPerRow;
        const cardHeight = 85;
        const cardGap = 15;
        
        let rowStartY = doc.y;

        summaryEntries.forEach((entry, i) => {
          const col = i % cardsPerRow;
          const row = Math.floor(i / cardsPerRow);
          
          // Check if we need new page for this row
          if (col === 0 && needsNewPage(cardHeight + 20)) {
            addNewPage();
            rowStartY = doc.y;
          }
          
          const [key, value] = entry;
          const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          const x = MARGIN_LEFT + (col * (cardWidth + cardGap));
          const y = rowStartY + (row * (cardHeight + cardGap));

          // Card background
          doc.roundedRect(x, y, cardWidth, cardHeight, 8)
            .lineWidth(1)
            .strokeOpacity(0.2)
            .stroke('#CCCCCC')
            .fillOpacity(0.03)
            .fill(primaryColor);

          // Value
          doc.fontSize(30)
            .fillColor(primaryColor)
            .fillOpacity(1)
            .font('Helvetica-Bold')
            .text(value.toString(), x + 15, y + 18, { width: cardWidth - 30, align: 'left' });
          
          // Label
          doc.fontSize(12)
            .fillColor('#555555')
            .font('Helvetica')
            .text(label, x + 15, y + 58, { width: cardWidth - 30, align: 'left' });
          
          // Update y position after completing a row
          if (col === cardsPerRow - 1 || i === summaryEntries.length - 1) {
            doc.y = y + cardHeight + cardGap;
          }
        });

        doc.y += 20;
      }

      // ===== LOCATION DISTRIBUTION =====
      if (reportData.charts?.locationBreakdown && reportData.charts.locationBreakdown.length > 0) {
        const itemCount = Math.min(reportData.charts.locationBreakdown.length, 10);
        const sectionHeight = 80 + (itemCount * 28);
        
        if (needsNewPage(sectionHeight)) addNewPage();
        
        doc.fontSize(20)
          .fillColor(primaryColor)
          .font('Helvetica-Bold')
          .text('Location Distribution', MARGIN_LEFT, doc.y);
        
        doc.y += 30;

        const maxCount = Math.max(...reportData.charts.locationBreakdown.map(i => i.count));
        const maxBarWidth = CONTENT_WIDTH - 160;

        reportData.charts.locationBreakdown.slice(0, 10).forEach((item, index) => {
          if (needsNewPage(35)) addNewPage();
          
          const barWidth = Math.max((item.count / maxCount) * maxBarWidth, 30);
          const yPos = doc.y;
          
          // Location name
          doc.fontSize(11)
            .fillColor('#333333')
            .font('Helvetica')
            .text(item.location, MARGIN_LEFT, yPos, { width: 140, align: 'left' });
          
          // Bar
          doc.roundedRect(MARGIN_LEFT + 150, yPos - 2, barWidth, 22, 5)
            .fill(secondaryColor);
          
          // Count
          doc.fontSize(11)
            .fillColor('#FFFFFF')
            .font('Helvetica-Bold')
            .text(item.count.toString(), MARGIN_LEFT + 158, yPos + 2, { width: barWidth - 16 });
          
          doc.y = yPos + 28;
        });

        doc.y += 15;
      }

      // ===== SKILLS ANALYSIS =====
      if (reportData.charts?.skillsAnalysis && reportData.charts.skillsAnalysis.length > 0) {
        const itemCount = Math.min(reportData.charts.skillsAnalysis.length, 10);
        const sectionHeight = 80 + (itemCount * 28);
        
        if (needsNewPage(sectionHeight)) addNewPage();
        
        doc.fontSize(20)
          .fillColor(primaryColor)
          .font('Helvetica-Bold')
          .text('Top Skills', MARGIN_LEFT, doc.y);
        
        doc.y += 30;

        const maxCount = Math.max(...reportData.charts.skillsAnalysis.map(i => i.count));
        const maxBarWidth = CONTENT_WIDTH - 160;

        reportData.charts.skillsAnalysis.slice(0, 10).forEach((item) => {
          if (needsNewPage(35)) addNewPage();
          
          const barWidth = Math.max((item.count / maxCount) * maxBarWidth, 30);
          const yPos = doc.y;
          
          doc.fontSize(11)
            .fillColor('#333333')
            .font('Helvetica')
            .text(item.skill, MARGIN_LEFT, yPos, { width: 140, align: 'left' });
          
          doc.roundedRect(MARGIN_LEFT + 150, yPos - 2, barWidth, 22, 5)
            .fill('#4CAF50');
          
          doc.fontSize(11)
            .fillColor('#FFFFFF')
            .font('Helvetica-Bold')
            .text(item.count.toString(), MARGIN_LEFT + 158, yPos + 2, { width: barWidth - 16 });
          
          doc.y = yPos + 28;
        });

        doc.y += 15;
      }

      // ===== TOP CANDIDATES TABLE =====
      if (reportData.tables?.topCandidates && reportData.tables.topCandidates.length > 0) {
        const rowCount = reportData.tables.topCandidates.length;
        const tableHeight = 80 + (rowCount * 35);
        
        if (needsNewPage(tableHeight)) addNewPage();
        
        doc.fontSize(20)
          .fillColor(primaryColor)
          .font('Helvetica-Bold')
          .text('Top Candidates', MARGIN_LEFT, doc.y);
        
        doc.y += 30;

        const tableTop = doc.y;
        const colWidths = [35, 115, 175, 60, 60];
        const colX = [
          MARGIN_LEFT, 
          MARGIN_LEFT + 40, 
          MARGIN_LEFT + 160, 
          MARGIN_LEFT + 340, 
          MARGIN_LEFT + 405
        ];
        const rowHeight = 30;
        
        // Header row
        doc.roundedRect(MARGIN_LEFT, tableTop, CONTENT_WIDTH, rowHeight, 6)
          .fill(primaryColor);
        
        doc.fontSize(11)
          .fillColor('#FFFFFF')
          .font('Helvetica-Bold');
        
        ['#', 'Name', 'Email', 'Score', 'Status'].forEach((header, i) => {
          doc.text(header, colX[i], tableTop + 9, { 
            width: colWidths[i], 
            align: i === 0 ? 'center' : 'left' 
          });
        });

        doc.y = tableTop + rowHeight + 3;

        reportData.tables.topCandidates.forEach((candidate, index) => {
          if (needsNewPage(rowHeight + 10)) {
            addNewPage();
            // Redraw header on new page
            const newTableTop = doc.y;
            doc.roundedRect(MARGIN_LEFT, newTableTop, CONTENT_WIDTH, rowHeight, 6)
              .fill(primaryColor);
            
            doc.fontSize(11)
              .fillColor('#FFFFFF')
              .font('Helvetica-Bold');
            
            ['#', 'Name', 'Email', 'Score', 'Status'].forEach((header, i) => {
              doc.text(header, colX[i], newTableTop + 9, { 
                width: colWidths[i], 
                align: i === 0 ? 'center' : 'left' 
              });
            });
            
            doc.y = newTableTop + rowHeight + 3;
          }
          
          const rowY = doc.y;
          const bgColor = index % 2 === 0 ? '#F8F9FA' : '#FFFFFF';
          
          doc.roundedRect(MARGIN_LEFT, rowY, CONTENT_WIDTH, rowHeight, 4)
            .fill(bgColor);
          
          doc.fontSize(10)
            .fillColor('#333333')
            .font('Helvetica');
          
          doc.text((index + 1).toString(), colX[0], rowY + 9, { 
            width: colWidths[0], 
            align: 'center' 
          });
          doc.text(candidate.name, colX[1], rowY + 9, { width: colWidths[1] });
          doc.text(candidate.email, colX[2], rowY + 9, { width: colWidths[2] });
          doc.text(`${candidate.score}%`, colX[3], rowY + 9, { 
            width: colWidths[3], 
            align: 'center' 
          });
          
          const statusColor = candidate.status === 'Accepted' ? '#4CAF50' : 
                             candidate.status === 'Rejected' ? '#F44336' : '#FF9800';
          doc.fillColor(statusColor)
            .font('Helvetica-Bold')
            .text(candidate.status, colX[4], rowY + 9, { 
              width: colWidths[4], 
              align: 'center' 
            });
          
          doc.y = rowY + rowHeight + 2;
        });

        doc.y += 15;
      }

      // ===== JOB PERFORMANCE TABLE =====
      if (reportData.tables?.jobPerformance && reportData.tables.jobPerformance.length > 0) {
        const rowCount = reportData.tables.jobPerformance.length;
        const tableHeight = 80 + (rowCount * 35);
        
        if (needsNewPage(tableHeight)) addNewPage();
        
        doc.fontSize(20)
          .fillColor(primaryColor)
          .font('Helvetica-Bold')
          .text('Job Performance', MARGIN_LEFT, doc.y);
        
        doc.y += 30;

        const tableTop = doc.y;
        const colWidths = [200, 70, 70, 70, 85];
        const colX = [
          MARGIN_LEFT, 
          MARGIN_LEFT + 205, 
          MARGIN_LEFT + 280, 
          MARGIN_LEFT + 355, 
          MARGIN_LEFT + 430
        ];
        const rowHeight = 30;
        
        doc.roundedRect(MARGIN_LEFT, tableTop, CONTENT_WIDTH, rowHeight, 6)
          .fill(primaryColor);
        
        doc.fontSize(11)
          .fillColor('#FFFFFF')
          .font('Helvetica-Bold');
        
        ['Job Title', 'Total', 'Accepted', 'Rejected', 'Pending'].forEach((header, i) => {
          doc.text(header, colX[i], tableTop + 9, { 
            width: colWidths[i], 
            align: i > 0 ? 'center' : 'left' 
          });
        });

        doc.y = tableTop + rowHeight + 3;

        reportData.tables.jobPerformance.forEach((job, index) => {
          if (needsNewPage(rowHeight + 10)) {
            addNewPage();
            const newTableTop = doc.y;
            doc.roundedRect(MARGIN_LEFT, newTableTop, CONTENT_WIDTH, rowHeight, 6)
              .fill(primaryColor);
            
            doc.fontSize(11)
              .fillColor('#FFFFFF')
              .font('Helvetica-Bold');
            
            ['Job Title', 'Total', 'Accepted', 'Rejected', 'Pending'].forEach((header, i) => {
              doc.text(header, colX[i], newTableTop + 9, { 
                width: colWidths[i], 
                align: i > 0 ? 'center' : 'left' 
              });
            });
            
            doc.y = newTableTop + rowHeight + 3;
          }
          
          const rowY = doc.y;
          const bgColor = index % 2 === 0 ? '#F8F9FA' : '#FFFFFF';
          
          doc.roundedRect(MARGIN_LEFT, rowY, CONTENT_WIDTH, rowHeight, 4)
            .fill(bgColor);
          
          doc.fontSize(10)
            .fillColor('#333333')
            .font('Helvetica');
          
          doc.text(job.title, colX[0], rowY + 9, { width: colWidths[0] });
          doc.text(job.total.toString(), colX[1], rowY + 9, { 
            width: colWidths[1], 
            align: 'center' 
          });
          doc.text(job.accepted.toString(), colX[2], rowY + 9, { 
            width: colWidths[2], 
            align: 'center' 
          });
          doc.text(job.rejected.toString(), colX[3], rowY + 9, { 
            width: colWidths[3], 
            align: 'center' 
          });
          doc.text(job.pending.toString(), colX[4], rowY + 9, { 
            width: colWidths[4], 
            align: 'center' 
          });
          
          doc.y = rowY + rowHeight + 2;
        });

        doc.y += 15;
      }

      // ===== APPLICATION TRENDS CHART =====
      if (reportData.charts?.applicationTrends && reportData.charts.applicationTrends.length > 0) {
        const chartHeight = 200;
        
        if (needsNewPage(chartHeight + 80)) addNewPage();
        
        doc.fontSize(20)
          .fillColor(primaryColor)
          .font('Helvetica-Bold')
          .text('Application Trends (Last 30 Days)', MARGIN_LEFT, doc.y);
        
        doc.y += 30;

        const chartData = reportData.charts.applicationTrends.slice(-15);
        const chartWidth = CONTENT_WIDTH;
        const maxCount = Math.max(...chartData.map(d => d.count), 1);
        const barWidth = Math.floor((chartWidth / chartData.length) - 8);
        const chartTop = doc.y;
        const chartBottom = chartTop + chartHeight;

        chartData.forEach((item, index) => {
          const barHeight = Math.max((item.count / maxCount) * (chartHeight - 40), 5);
          const x = MARGIN_LEFT + (index * (barWidth + 8));
          const y = chartBottom - barHeight - 25;
          
          doc.roundedRect(x, y, barWidth, barHeight, 3)
            .fill(secondaryColor);
          
          if (item.count > 0) {
            doc.fontSize(8)
              .fillColor('#FFFFFF')
              .font('Helvetica-Bold')
              .text(item.count.toString(), x, y + 4, { 
                width: barWidth, 
                align: 'center' 
              });
          }
          
          const dateLabel = new Date(item.date).getDate();
          doc.fontSize(8)
            .fillColor('#666666')
            .font('Helvetica')
            .text(dateLabel.toString(), x, chartBottom - 18, { 
              width: barWidth, 
              align: 'center' 
            });
        });

        doc.y = chartBottom + 10;
      }

      // ===== ADD FOOTERS TO ALL PAGES =====
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        
        // Footer line
        doc.strokeColor('#DDDDDD')
          .lineWidth(0.5)
          .moveTo(MARGIN_LEFT, PAGE_HEIGHT - 75)
          .lineTo(PAGE_WIDTH - MARGIN_RIGHT, PAGE_HEIGHT - 75)
          .stroke();
        
        // Footer text
        doc.fontSize(9)
          .fillColor('#999999')
          .font('Helvetica')
          .text(footerText, MARGIN_LEFT, PAGE_HEIGHT - 60, {
            width: CONTENT_WIDTH,
            align: 'center'
          });
        
        // Page number
        doc.fontSize(9)
          .fillColor('#666666')
          .text(`Page ${i + 1} of ${range.count}`, MARGIN_LEFT, PAGE_HEIGHT - 45, {
            width: CONTENT_WIDTH,
            align: 'center'
          });
      }

      doc.end();

      stream.on('finish', () => {
        console.log(`PDF generated successfully: ${fileName}`);
        resolve(filePath);
      });

      stream.on('error', (error) => {
        console.error('PDF stream error:', error);
        reject(error);
      });

    } catch (error) {
      console.error('PDF generation error:', error);
      reject(error);
    }
  });
};

const generateExcelReport = async (reportData, company, fileName) => {
  try {
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filePath = path.join(reportsDir, fileName);
    const workbook = new ExcelJS.Workbook();

    // Company Info Sheet
    const infoSheet = workbook.addWorksheet('Report Info');
    infoSheet.mergeCells('A1:B1');
    infoSheet.getCell('A1').value = `${company.name} - Recruitment Report`;
    infoSheet.getCell('A1').font = { bold: true, size: 16 };
    infoSheet.getCell('A1').alignment = { horizontal: 'center' };
    
    infoSheet.getCell('A3').value = 'Generated Date:';
    infoSheet.getCell('B3').value = new Date().toLocaleDateString();
    infoSheet.getCell('A4').value = 'Company:';
    infoSheet.getCell('B4').value = company.name;
    
    infoSheet.columns = [
      { width: 20 },
      { width: 30 }
    ];

    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 35 },
      { header: 'Value', key: 'value', width: 20 }
    ];

    // Style header row
    summarySheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2196F3' }
    };
    summarySheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(1).height = 25;

    // Add summary data
    if (reportData.summary && Object.keys(reportData.summary).length > 0) {
      Object.entries(reportData.summary).forEach(([key, value]) => {
        const label = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase())
          .trim();
        
        const row = summarySheet.addRow({ 
          metric: label, 
          value: value.toString() 
        });
        
        row.font = { size: 11 };
        row.alignment = { vertical: 'middle' };
      });
    } else {
      summarySheet.addRow({ metric: 'No summary data available', value: '-' });
    }

    // Auto-fit columns
    summarySheet.columns.forEach(column => {
      column.alignment = { vertical: 'middle' };
    });

    // Top Candidates Sheet
    if (reportData.tables?.topCandidates && reportData.tables.topCandidates.length > 0) {
      const candidatesSheet = workbook.addWorksheet('Top Candidates');
      candidatesSheet.columns = [
        { header: 'Rank', key: 'rank', width: 10 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 35 },
        { header: 'Score (%)', key: 'score', width: 12 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Job Title', key: 'jobTitle', width: 30 }
      ];

      // Style header row
      candidatesSheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      candidatesSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2196F3' }
      };
      candidatesSheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
      candidatesSheet.getRow(1).height = 25;

      // Add candidate data
      reportData.tables.topCandidates.forEach((candidate, index) => {
        const row = candidatesSheet.addRow({
          rank: index + 1,
          name: candidate.name || 'N/A',
          email: candidate.email || 'N/A',
          score: candidate.score || 0,
          status: candidate.status || 'N/A',
          jobTitle: candidate.jobTitle || 'N/A'
        });
        
        // Style row
        row.font = { size: 11 };
        row.alignment = { vertical: 'middle' };
        
        // Color code status
        const statusCell = row.getCell('status');
        if (candidate.status === 'Accepted') {
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFC8E6C9' }
          };
          statusCell.font = { color: { argb: 'FF2E7D32' }, bold: true };
        } else if (candidate.status === 'Rejected') {
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFCDD2' }
          };
          statusCell.font = { color: { argb: 'FFC62828' }, bold: true };
        } else if (candidate.status === 'Pending') {
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFF9C4' }
          };
          statusCell.font = { color: { argb: 'FFF57F17' }, bold: true };
        }
        
        // Color code score
        const scoreCell = row.getCell('score');
        scoreCell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (candidate.score >= 80) {
          scoreCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFC8E6C9' }
          };
          scoreCell.font = { color: { argb: 'FF2E7D32' }, bold: true };
        } else if (candidate.score >= 60) {
          scoreCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFF9C4' }
          };
          scoreCell.font = { color: { argb: 'FFF57F17' }, bold: true };
        } else {
          scoreCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFCDD2' }
          };
          scoreCell.font = { color: { argb: 'FFC62828' }, bold: true };
        }
      });

      // Center align rank column
      candidatesSheet.getColumn('rank').alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Job Performance Sheet
    if (reportData.tables?.jobPerformance && reportData.tables.jobPerformance.length > 0) {
      const jobSheet = workbook.addWorksheet('Job Performance');
      jobSheet.columns = [
        { header: 'Job Title', key: 'title', width: 35 },
        { header: 'Total Applications', key: 'total', width: 20 },
        { header: 'Accepted', key: 'accepted', width: 15 },
        { header: 'Rejected', key: 'rejected', width: 15 },
        { header: 'Pending', key: 'pending', width: 15 }
      ];

      // Style header row
      jobSheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      jobSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2196F3' }
      };
      jobSheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
      jobSheet.getRow(1).height = 25;

      // Add job data
      reportData.tables.jobPerformance.forEach(job => {
        const row = jobSheet.addRow({
          title: job.title || 'N/A',
          total: job.total || 0,
          accepted: job.accepted || 0,
          rejected: job.rejected || 0,
          pending: job.pending || 0
        });
        
        row.font = { size: 11 };
        row.alignment = { vertical: 'middle' };
      });

      // Center align numeric columns
      ['total', 'accepted', 'rejected', 'pending'].forEach(col => {
        jobSheet.getColumn(col).alignment = { horizontal: 'center', vertical: 'middle' };
      });
    }

    // Location Breakdown Sheet
    if (reportData.charts?.locationBreakdown && reportData.charts.locationBreakdown.length > 0) {
      const locationSheet = workbook.addWorksheet('Location Distribution');
      locationSheet.columns = [
        { header: 'Location', key: 'location', width: 30 },
        { header: 'Count', key: 'count', width: 15 }
      ];

      // Style header row
      locationSheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      locationSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2196F3' }
      };
      locationSheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
      locationSheet.getRow(1).height = 25;

      reportData.charts.locationBreakdown.forEach(item => {
        const row = locationSheet.addRow({
          location: item.location || 'Unknown',
          count: item.count || 0
        });
        row.font = { size: 11 };
        row.alignment = { vertical: 'middle' };
      });

      locationSheet.getColumn('count').alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Skills Analysis Sheet
    if (reportData.charts?.skillsAnalysis && reportData.charts.skillsAnalysis.length > 0) {
      const skillsSheet = workbook.addWorksheet('Skills Analysis');
      skillsSheet.columns = [
        { header: 'Skill', key: 'skill', width: 30 },
        { header: 'Count', key: 'count', width: 15 }
      ];

      // Style header row
      skillsSheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      skillsSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2196F3' }
      };
      skillsSheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
      skillsSheet.getRow(1).height = 25;

      reportData.charts.skillsAnalysis.forEach(item => {
        const row = skillsSheet.addRow({
          skill: item.skill || 'Unknown',
          count: item.count || 0
        });
        row.font = { size: 11 };
        row.alignment = { vertical: 'middle' };
      });

      skillsSheet.getColumn('count').alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Category Statistics Sheet
    if (reportData.charts?.categoryStats && reportData.charts.categoryStats.length > 0) {
      const categorySheet = workbook.addWorksheet('Category Statistics');
      categorySheet.columns = [
        { header: 'Category', key: 'category', width: 30 },
        { header: 'Count', key: 'count', width: 15 }
      ];

      // Style header row
      categorySheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      categorySheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2196F3' }
      };
      categorySheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
      categorySheet.getRow(1).height = 25;

      reportData.charts.categoryStats.forEach(item => {
        const row = categorySheet.addRow({
          category: item.category || 'Other',
          count: item.count || 0
        });
        row.font = { size: 11 };
        row.alignment = { vertical: 'middle' };
      });

      categorySheet.getColumn('count').alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Experience Level Sheet
    if (reportData.charts?.experienceLevel && reportData.charts.experienceLevel.length > 0) {
      const expSheet = workbook.addWorksheet('Experience Level');
      expSheet.columns = [
        { header: 'Level', key: 'level', width: 30 },
        { header: 'Count', key: 'count', width: 15 }
      ];

      // Style header row
      expSheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      expSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2196F3' }
      };
      expSheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
      expSheet.getRow(1).height = 25;

      reportData.charts.experienceLevel.forEach(item => {
        const row = expSheet.addRow({
          level: item.level || 'Unknown',
          count: item.count || 0
        });
        row.font = { size: 11 };
        row.alignment = { vertical: 'middle' };
      });

      expSheet.getColumn('count').alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Application Trends Sheet
    if (reportData.charts?.applicationTrends && reportData.charts.applicationTrends.length > 0) {
      const trendsSheet = workbook.addWorksheet('Application Trends');
      trendsSheet.columns = [
        { header: 'Date', key: 'date', width: 20 },
        { header: 'Applications', key: 'count', width: 15 }
      ];

      // Style header row
      trendsSheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      trendsSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2196F3' }
      };
      trendsSheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
      trendsSheet.getRow(1).height = 25;

      reportData.charts.applicationTrends.forEach(item => {
        const row = trendsSheet.addRow({
          date: new Date(item.date).toLocaleDateString(),
          count: item.count || 0
        });
        row.font = { size: 11 };
        row.alignment = { vertical: 'middle' };
      });

      trendsSheet.getColumn('count').alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Write file
    await workbook.xlsx.writeFile(filePath);
    console.log(`Excel report generated: ${fileName}`);
    return filePath;

  } catch (error) {
    console.error('Excel generation error:', error);
    throw error;
  }
};

const generateCSVReport = async (reportData, fileName) => {
  try {
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filePath = path.join(reportsDir, fileName);
    let csvContent = '';

    if (reportData.summary) {
      csvContent += 'SUMMARY\n';
      csvContent += 'Metric,Value\n';
      Object.entries(reportData.summary).forEach(([key, value]) => {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        csvContent += `${label},${value}\n`;
      });
      csvContent += '\n';
    }

    if (reportData.tables?.topCandidates) {
      csvContent += 'TOP CANDIDATES\n';
      csvContent += 'Rank,Name,Email,Score,Status,Job Title\n';
      reportData.tables.topCandidates.forEach((candidate, index) => {
        csvContent += `${index + 1},"${candidate.name}","${candidate.email}",${candidate.score},${candidate.status},"${candidate.jobTitle}"\n`;
      });
      csvContent += '\n';
    }

    if (reportData.tables?.jobPerformance) {
      csvContent += 'JOB PERFORMANCE\n';
      csvContent += 'Job Title,Total Applications,Accepted,Rejected,Pending\n';
      reportData.tables.jobPerformance.forEach(job => {
        csvContent += `"${job.title}",${job.total},${job.accepted},${job.rejected},${job.pending}\n`;
      });
    }

    fs.writeFileSync(filePath, csvContent);
    return filePath;

  } catch (error) {
    console.error('CSV generation error:', error);
    throw error;
  }
};

export const scheduleReport = async (req, res) => {
  try {
    const { name, metrics, dateRange, frequency, time, day, recipients, format } = req.body;
    const companyId = req.company._id;

    const schedule = await ScheduledReport.create({
      companyId,
      name,
      metrics,
      dateRange,
      frequency,
      time,
      day,
      recipients: recipients || [],
      format: format || 'pdf',
      active: true
    });

    setupCronJob(schedule);

    res.json({
      success: true,
      message: 'Report scheduled successfully',
      schedule
    });

  } catch (error) {
    console.error('Schedule report error:', error);
    res.json({ success: false, message: error.message });
  }
};

const setupCronJob = (schedule) => {
  let cronExpression;

  if (schedule.frequency === 'daily') {
    const [hour, minute] = schedule.time.split(':');
    cronExpression = `${minute} ${hour} * * *`;
  } else if (schedule.frequency === 'weekly') {
    const dayMap = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0 };
    const [hour, minute] = schedule.time.split(':');
    cronExpression = `${minute} ${hour} * * ${dayMap[schedule.day]}`;
  } else if (schedule.frequency === 'monthly') {
    const [hour, minute] = schedule.time.split(':');
    cronExpression = `${minute} ${hour} 1 * *`;
  }

  cron.schedule(cronExpression, async () => {
    try {
      console.log(`Running scheduled report: ${schedule.name}`);
      await runScheduledReport(schedule);
    } catch (error) {
      console.error('Scheduled report error:', error);
    }
  });
};

const runScheduledReport = async (schedule) => {
  try {
    const company = await Company.findById(schedule.companyId);
    
    const startDate = schedule.dateRange?.start ? new Date(schedule.dateRange.start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = schedule.dateRange?.end ? new Date(schedule.dateRange.end) : new Date();

    const applications = await JobApplication.find({
      companyId: schedule.companyId,
      submittedAt: { $gte: startDate, $lte: endDate }
    })
      .populate('userId', 'name email')
      .populate('jobId', 'title location category level salary');

    const jobs = await Job.find({ companyId: schedule.companyId });
    const reportData = await generateReportData(schedule.metrics, applications, jobs, company);

    let filePath;
    let fileName = `${schedule.name.replace(/\s+/g, '_')}_${Date.now()}.${schedule.format === 'excel' ? 'xlsx' : schedule.format}`;

    if (schedule.format === 'pdf') {
      filePath = await generatePDFReport(reportData, company, {}, fileName);
    } else if (schedule.format === 'excel') {
      filePath = await generateExcelReport(reportData, company, fileName);
    } else {
      filePath = await generateCSVReport(reportData, fileName);
    }

    if (schedule.recipients && schedule.recipients.length > 0) {
      for (const recipient of schedule.recipients) {
        await EmailService.sendEmail(
          recipient,
          `Scheduled Report: ${schedule.name}`,
          `<h2>Your scheduled report is ready</h2><p>Please find the attached ${schedule.format.toUpperCase()} report.</p>`,
          [{ filename: fileName, path: filePath }]
        );
      }
    }

    await ScheduledReport.findByIdAndUpdate(schedule._id, { lastRun: new Date() });

  } catch (error) {
    console.error('Run scheduled report error:', error);
  }
};

export const getScheduledReports = async (req, res) => {
  try {
    const companyId = req.company._id;
    const schedules = await ScheduledReport.find({ companyId }).sort({ createdAt: -1 });
    
    res.json({ success: true, schedules });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.company._id;
    
    const schedule = await ScheduledReport.findOneAndUpdate(
      { _id: id, companyId },
      req.body,
      { new: true }
    );
    
    if (!schedule) {
      return res.json({ success: false, message: 'Schedule not found' });
    }
    
    res.json({ success: true, schedule });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.company._id;
    
    await ScheduledReport.findOneAndDelete({ _id: id, companyId });
    
    res.json({ success: true, message: 'Schedule deleted successfully' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const exportReport = async (req, res) => {
  try {
    const { reportType, format } = req.body;
    const companyId = req.company._id;

    const applications = await JobApplication.find({ companyId })
      .populate('userId', 'name email')
      .populate('jobId', 'title location category level salary')
      .sort({ submittedAt: -1 });

    const jobs = await Job.find({ companyId });
    const company = await Company.findById(companyId);

    let metrics;
    if (reportType === 'all') {
      metrics = ['applications', 'accepted', 'rejected', 'pending', 'avgScore', 'topCandidates', 'jobPerformance'];
    } else if (reportType === 'candidates') {
      metrics = ['topCandidates', 'avgScore'];
    } else if (reportType === 'jobs') {
      metrics = ['jobPerformance', 'categoryStats'];
    }

    const reportData = await generateReportData(metrics, applications, jobs, company);
    
    let filePath;
    let fileName = `${reportType}_report_${Date.now()}.${format === 'excel' ? 'xlsx' : format}`;

    if (format === 'pdf') {
      filePath = await generatePDFReport(reportData, company, {}, fileName);
    } else if (format === 'excel') {
      filePath = await generateExcelReport(reportData, company, fileName);
    } else {
      filePath = await generateCSVReport(reportData, fileName);
    }

    res.json({
      success: true,
      downloadUrl: `/api/reports/download/${fileName}`
    });

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getReportHistory = async (req, res) => {
  try {
    const companyId = req.company._id;
    const reports = await Report.find({ companyId })
      .sort({ generatedAt: -1 })
      .limit(20);
    
    res.json({ success: true, reports });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const updateWhiteLabelSettings = async (req, res) => {
  try {
    const companyId = req.company._id;
    const settings = await WhiteLabelSettings.findOneAndUpdate(
      { companyId },
      { ...req.body, companyId },
      { upsert: true, new: true }
    );
    
    res.json({ success: true, settings });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getWhiteLabelSettings = async (req, res) => {
  try {
    const companyId = req.company._id;
    const settings = await WhiteLabelSettings.findOne({ companyId });
    
    res.json({ success: true, settings: settings || {} });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getReportStatistics = async (req, res) => {
  try {
    const companyId = req.company._id;
    
    const reports = await Report.find({ companyId });
    const schedules = await ScheduledReport.find({ companyId, active: true });
    
    const stats = {
      total: reports.length,
      byFormat: {
        pdf: reports.filter(r => r.format === 'pdf').length,
        excel: reports.filter(r => r.format === 'excel').length,
        csv: reports.filter(r => r.format === 'csv').length
      },
      last7Days: reports.filter(r => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return new Date(r.generatedAt) >= sevenDaysAgo;
      }).length,
      last30Days: reports.filter(r => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return new Date(r.generatedAt) >= thirtyDaysAgo;
      }).length,
      totalSize: reports.reduce((sum, r) => sum + (r.fileSize || 0), 0),
      activeSchedules: schedules.length,
      scheduledByFrequency: {
        daily: schedules.filter(s => s.frequency === 'daily').length,
        weekly: schedules.filter(s => s.frequency === 'weekly').length,
        monthly: schedules.filter(s => s.frequency === 'monthly').length
      }
    };
    
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Get report statistics error:', error);
    res.json({ success: false, message: error.message });
  }
};

export const downloadReport = async (req, res) => {
  try {
    const { filename } = req.params;
    
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(process.cwd(), 'reports', sanitizedFilename);

    const normalizedPath = path.normalize(filePath);
    const reportsDir = path.join(process.cwd(), 'reports');
    
    if (!normalizedPath.startsWith(reportsDir)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Report file not found' });
    }

    const ext = path.extname(sanitizedFilename).toLowerCase();
    let contentType;
    
    if (ext === '.pdf') {
      contentType = 'application/pdf';
    } else if (ext === '.xlsx') {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (ext === '.csv') {
      contentType = 'text/csv';
    } else {
      contentType = 'application/octet-stream';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const fileStream = fs.createReadStream(filePath);
    
    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Error reading file' });
      }
    });

    fileStream.pipe(res);

  } catch (error) {
    console.error('Download report error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};