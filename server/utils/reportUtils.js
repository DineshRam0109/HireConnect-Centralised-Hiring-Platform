import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import Report from '../models/Report.js';

// Clean up old report files (older than 30 days)
export const cleanupOldReports = async () => {
  try {
    const reportsDir = path.join(process.cwd(), 'reports');
    
    if (!fs.existsSync(reportsDir)) {
      console.log('Reports directory does not exist');
      return;
    }

    const files = fs.readdirSync(reportsDir);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let deletedCount = 0;

    files.forEach(file => {
      const filePath = path.join(reportsDir, file);
      const stats = fs.statSync(filePath);

      if (stats.mtime < thirtyDaysAgo) {
        fs.unlinkSync(filePath);
        deletedCount++;
        console.log(`Deleted old report file: ${file}`);
      }
    });

    // Also clean up database records for files that no longer exist
    const dbReports = await Report.find({});
    let dbDeletedCount = 0;

    for (const report of dbReports) {
      if (report.fileUrl) {
        const fileName = path.basename(report.fileUrl);
        const filePath = path.join(reportsDir, fileName);
        
        if (!fs.existsSync(filePath)) {
          await Report.findByIdAndDelete(report._id);
          dbDeletedCount++;
          console.log(`Deleted orphaned report record: ${report.name}`);
        }
      }
    }

    console.log(`Cleanup complete: ${deletedCount} files deleted, ${dbDeletedCount} database records removed`);
    
    return { filesDeleted: deletedCount, recordsDeleted: dbDeletedCount };
  } catch (error) {
    console.error('Error cleaning up old reports:', error);
    throw error;
  }
};

// Schedule daily cleanup at 2 AM
export const scheduleReportCleanup = () => {
  cron.schedule('0 2 * * *', async () => {
    console.log('Running scheduled report cleanup...');
    try {
      await cleanupOldReports();
    } catch (error) {
      console.error('Scheduled cleanup failed:', error);
    }
  });
  
  console.log('Report cleanup scheduler initialized (runs daily at 2 AM)');
};

// Get report statistics
export const getReportStatistics = async (companyId) => {
  try {
    const reports = await Report.find({ companyId });
    
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
      totalSize: reports.reduce((sum, r) => sum + (r.fileSize || 0), 0)
    };

    return stats;
  } catch (error) {
    console.error('Error getting report statistics:', error);
    throw error;
  }
};

// Validate report data before generation
export const validateReportData = (metrics, dateRange) => {
  const errors = [];

  if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
    errors.push('At least one metric must be selected');
  }

  if (dateRange && dateRange.start && dateRange.end) {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    if (startDate > endDate) {
      errors.push('Start date must be before end date');
    }

    if (endDate > new Date()) {
      errors.push('End date cannot be in the future');
    }

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    if (startDate < oneYearAgo) {
      errors.push('Date range cannot exceed 1 year from today');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Format file size for display
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// Generate report filename with timestamp
export const generateReportFilename = (reportName, format) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const safeName = reportName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const extension = format === 'excel' ? 'xlsx' : format;
  
  return `${safeName}_${timestamp}_${Date.now()}.${extension}`;
};

// Check if report exists
export const reportExists = (filename) => {
  const filePath = path.join(process.cwd(), 'reports', filename);
  return fs.existsSync(filePath);
};

// Get file stats
export const getFileStats = (filename) => {
  try {
    const filePath = path.join(process.cwd(), 'reports', filename);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const stats = fs.statSync(filePath);
    
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      sizeFormatted: formatFileSize(stats.size)
    };
  } catch (error) {
    console.error('Error getting file stats:', error);
    return null;
  }
};

export default {
  cleanupOldReports,
  scheduleReportCleanup,
  getReportStatistics,
  validateReportData,
  formatFileSize,
  generateReportFilename,
  reportExists,
  getFileStats
};