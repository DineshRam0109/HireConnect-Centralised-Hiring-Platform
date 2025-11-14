import express from 'express';
import multer from 'multer';
import {
  registerCompany,
  loginCompany,
  getCompanyData,
  postJob,
  getCompanyJobApplicants,
  getCompanyPostedJobs,
  ChangeJobApplicationStatus,
  changeVisibility,
  bulkUpdateApplicationStatus,
  sendCustomEmail,
  triggerAutoReview,
  deleteJob,
   updateJob 
  
} from '../controllers/companyController.js';
import { protectCompany } from '../middleware/authMiddleware.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Authentication routes
router.post('/register', upload.single('image'), registerCompany);
router.post('/login', loginCompany);

// Protected company routes
router.get('/company', protectCompany, getCompanyData);
router.post('/post-job', protectCompany, postJob);
router.get('/applicants', protectCompany, getCompanyJobApplicants);
router.get('/list-jobs', protectCompany, getCompanyPostedJobs);
router.post('/delete-job', protectCompany, deleteJob);
router.post('/update-job', protectCompany,  updateJob);


// Application management routes
router.post('/change-status', protectCompany, ChangeJobApplicationStatus);
router.post('/bulk-update-status', protectCompany, bulkUpdateApplicationStatus);


// Auto-review and processing routes
router.post('/auto-review', protectCompany, triggerAutoReview);

// Email communication routes
router.post('/send-email', protectCompany, sendCustomEmail);

// Job management routes
router.post('/change-visibility', protectCompany, changeVisibility);

export default router;