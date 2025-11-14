import express from 'express';
import { 
  generateReport, 
  scheduleReport, 
  getScheduledReports,
  updateSchedule,
  deleteSchedule,
  exportReport,
  getReportHistory,
  updateWhiteLabelSettings,
  getWhiteLabelSettings,
  getReportStatistics,
  downloadReport
} from '../controllers/reportController.js';
import { protectCompany } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public download route - NO AUTHENTICATION REQUIRED
// This allows direct download links to work without auth
router.get('/download/:filename', downloadReport);

// All other routes require company authentication
router.post('/generate', protectCompany, generateReport);
router.post('/schedule', protectCompany, scheduleReport);
router.get('/scheduled', protectCompany, getScheduledReports);
router.put('/schedule/:id', protectCompany, updateSchedule);
router.delete('/schedule/:id', protectCompany, deleteSchedule);
router.post('/export', protectCompany, exportReport);
router.get('/history', protectCompany, getReportHistory);
router.get('/statistics', protectCompany, getReportStatistics);
router.get('/white-label', protectCompany, getWhiteLabelSettings);
router.put('/white-label', protectCompany, updateWhiteLabelSettings);

export default router;