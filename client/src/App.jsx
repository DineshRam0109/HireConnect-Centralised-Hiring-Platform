import React, { useContext, useState, useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import ApplyJob from './pages/ApplyJob'
import Applications from './pages/Applications'
import RecruiterLogin from './components/RecruiterLogin'
import ProfileCompletionModal from './components/ProfileCompletionModal'
import { AppContext } from './context/AppContext'
import Dashboard from './pages/Dashboard'
import AddJob from './pages/AddJob'
import ManageJobs from './pages/ManageJobs'
import ViewApplications from './pages/ViewApplications'
import EditJob from './pages/EditJob'
// ADD THESE IMPORTS
import EmployerDashboard from './pages/EmployerDashboard'
import EmployeeDashboard from './pages/EmployeeDashboard'
import AdvancedReportingDashboard from './components/AdvancedReportingDashboard';

import Chatbot from './components/Chatbot'
import { useAuth } from '@clerk/clerk-react'
import 'quill/dist/quill.snow.css'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const App = () => {
  const { showRecruiterLogin, companyToken, userData, needsProfileCompletion } = useContext(AppContext)
  const { isSignedIn } = useAuth()
  const [showProfileModal, setShowProfileModal] = useState(false)

  useEffect(() => {
    if (isSignedIn && needsProfileCompletion && userData && !companyToken) {
      setShowProfileModal(true)
    } else {
      setShowProfileModal(false)
    }
  }, [isSignedIn, needsProfileCompletion, userData, companyToken])

  const handleCloseProfileModal = () => {
    setShowProfileModal(false)
  }

  return (
    <div>
      {showRecruiterLogin && <RecruiterLogin />}
      
      <ProfileCompletionModal
        isOpen={showProfileModal}
        onClose={handleCloseProfileModal}
        currentUser={userData}
      />
      
      <ToastContainer position="top-right" />
      <Chatbot />
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/apply-job/:id' element={<ApplyJob />} />       
        <Route path='/Applications' element={<Applications />} />
        {/* ADD THESE NEW ROUTES */}
        {/* Employee Dashboard - for job seekers */}
        <Route path='/employee-dashboard' element={<EmployeeDashboard />} />
        
        {/* Employer Dashboard - for companies */}
        <Route path='/employer-dashboard' element={<EmployerDashboard />} />
        
        <Route path='/dashboard' element={<Dashboard/>} >
          {companyToken ? <>
            <Route path='add-job' element={<AddJob />} />
            <Route path='manage-jobs' element={<ManageJobs />} />
            <Route path='view-applications' element={<ViewApplications/>}/>
            <Route path='analytics' element={<EmployerDashboard />} />
            <Route path="reports" element={<AdvancedReportingDashboard />} />
            <Route path="update-job" element={<EditJob />} />
          </> : null}
        </Route>
      </Routes>
    </div>
  )
}

export default App