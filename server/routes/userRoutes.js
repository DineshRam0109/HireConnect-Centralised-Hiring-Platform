import express from 'express'
import { 
  applyforJob, 
  getUserData, 
  getUserJobApplications, 
  updateUserResume, 
  createUser, 
  updateUserProfile,
  getUserApplicationInsights,
  getResumeJobMatch,
  deleteUserResume,
  getApplicationStatus,
  deleteUserApplication

} from '../controllers/userController.js'
import upload from '../config/multer.js'

const router = express.Router()

// Basic user routes
router.post('/create', createUser)
router.get('/user', getUserData)
router.put('/profile', updateUserProfile)
router.post('/apply', applyforJob)
router.get('/applied-jobs', getUserJobApplications)

// Resume management routes
router.post('/update-resume', upload.single('resume'), updateUserResume)
router.delete('/delete-resume', deleteUserResume)

// Analytics and insights routes
router.get('/insights', getUserApplicationInsights)
router.get('/resume-match/:jobId', getResumeJobMatch)
router.get('/application-status/:jobId', getApplicationStatus)
router.post('/delete-application', deleteUserApplication);

export default router;