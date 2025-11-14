import React, { useContext, useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { assets } from '../assets/assets'
import moment from 'moment'
import Footer from '../components/Footer'
import { AppContext } from '../context/AppContext'
import { useUser } from '@clerk/clerk-react';
import { useAuth } from '@clerk/clerk-react'
import { toast } from 'react-toastify'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const Applications = () => {
  const [isEdit, setisEdit] = useState(false)
  const [resume, setResume] = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const [deletingId, setDeletingId] = useState(null)
  const navigate = useNavigate()

  const { user, isLoaded: userLoaded } = useUser()
  const { getToken, isSignedIn } = useAuth()

  const { backendUrl, userData, userApplications, fetchUserData, fetchUserApplications } = useContext(AppContext)

  useEffect(() => {
    if (isSignedIn && userLoaded && user && !userData) {
      console.log('Fetching user data...', user.id);
      fetchUserData()
    }
  }, [isSignedIn, userLoaded, user, userData, fetchUserData])

  useEffect(() => {
    if (userData && (!userApplications || userApplications.length === 0)) {
      console.log('Fetching user applications...');
      fetchUserApplications()
    }
  }, [userData, userApplications, fetchUserApplications])

  const updateResume = async () => {
    if (!resume) {
      toast.error('Please select a resume file')
      return
    }

    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(resume.type)) {
      toast.error('Please select a PDF or Word document');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (resume.size > maxSize) {
      toast.error('File size must be less than 5MB');
      return;
    }

    try {
      const formData = new FormData()
      formData.append('resume', resume)
      const token = await getToken()

      if (!token) {
        toast.error('Authentication failed. Please login again.')
        return
      }

      console.log('Uploading resume...', resume.name);

      const { data } = await axios.post(backendUrl + '/api/users/update-resume',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          timeout: 30000
        }
      )

      console.log('Resume upload response:', data);

      if (data.success) {
        toast.success(data.message || 'Resume updated successfully')
        await fetchUserData()
        setisEdit(false)
        setResume(null)
      }
      else {
        toast.error(data.message || 'Failed to update resume')
      }
    }
    catch (error) {
      console.error('Resume update error:', error)
      if (error.code === 'ECONNABORTED') {
        toast.error('Upload timeout. Please try again with a smaller file.')
      } else {
        toast.error(error.response?.data?.message || error.message || 'Failed to update resume')
      }
    }
  }

  const deleteApplication = async (applicationId, jobTitle) => {
    if (!window.confirm(`Are you sure you want to withdraw your application for "${jobTitle}"? This action cannot be undone.`)) {
      return
    }

    setDeletingId(applicationId)
    try {
      const token = await getToken()
      if (!token) {
        toast.error('Authentication failed. Please login again.')
        return
      }

      const { data } = await axios.post(
        backendUrl + '/api/users/delete-application',
        { id: applicationId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (data.success) {
        toast.success('🗑️ Application withdrawn successfully')
        // Refresh applications list
        await fetchUserApplications()
      } else {
        toast.error(data.message || 'Failed to withdraw application')
      }
    } catch (error) {
      console.error('Delete application error:', error)
      toast.error(error.response?.data?.message || error.message || 'Failed to withdraw application')
    } finally {
      setDeletingId(null)
    }
  }

  // Filter applications based on active tab
  const filteredApplications = userApplications?.filter(app => {
    if (activeTab === 'all') return true
    return app.status?.toLowerCase() === activeTab.toLowerCase()
  }) || []

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'accepted':
        return 'from-emerald-500 to-green-600'
      case 'rejected':
        return 'from-rose-500 to-red-600'
      case 'pending':
        return 'from-amber-500 to-orange-600'
      case 'reviewed':
        return 'from-blue-500 to-cyan-600'
      default:
        return 'from-gray-500 to-slate-600'
    }
  }

  const getStatusBgColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'accepted':
        return 'bg-gradient-to-r from-emerald-50 to-green-100 text-emerald-800 border-emerald-200'
      case 'rejected':
        return 'bg-gradient-to-r from-rose-50 to-red-100 text-rose-800 border-rose-200'
      case 'pending':
        return 'bg-gradient-to-r from-amber-50 to-orange-100 text-amber-800 border-amber-200'
      case 'reviewed':
        return 'bg-gradient-to-r from-blue-50 to-cyan-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gradient-to-r from-gray-50 to-slate-100 text-gray-800 border-gray-200'
    }
  }

  const statusCounts = {
    all: userApplications?.length || 0,
    pending: userApplications?.filter(app => app.status?.toLowerCase() === 'pending')?.length || 0,
    reviewed: userApplications?.filter(app => app.status?.toLowerCase() === 'reviewed')?.length || 0,
    accepted: userApplications?.filter(app => app.status?.toLowerCase() === 'accepted')?.length || 0,
    rejected: userApplications?.filter(app => app.status?.toLowerCase() === 'rejected')?.length || 0,
  }

  if (!userLoaded || (isSignedIn && !userData)) {
    return (
      <>
        <Navbar />
        <div className='min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center px-4'>
          <div className='text-center bg-white/90 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-white/40'>
            <div className='relative mb-4'>
              <div className='w-16 h-16 border-4 border-blue-100 rounded-full mx-auto'></div>
              <div className='w-16 h-16 border-4 border-transparent border-t-blue-600 rounded-full animate-spin absolute top-0 left-1/2 -translate-x-1/2'></div>
            </div>
            <p className='text-gray-700 font-semibold'>Loading your data...</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (!isSignedIn) {
    return (
      <>
        <Navbar />
        <div className='min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center px-4'>
          <div className='text-center bg-white/90 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-white/40 max-w-md w-full'>
            <div className='w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg'>
              <svg className='w-10 h-10 text-white' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className='text-2xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent'>Please Login</h2>
            <p className='text-gray-600 mb-4'>You need to be logged in to view your applications.</p>
            <button
              onClick={() => navigate('/')}
              className='px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
            >
              Go Home
            </button>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className='min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8 px-4 sm:px-6'>
        <div className='container max-w-7xl mx-auto'>
          {/* Header with Back Button */}
          <div className='flex items-center justify-between mb-8'>
            <button
              onClick={() => navigate(-1)}
              className='flex items-center gap-2 px-4 py-2 bg-white/80 hover:bg-white text-gray-700 rounded-xl transition-all shadow-md hover:shadow-lg border border-white/40 backdrop-blur-sm'
            >
              <svg className='w-5 h-5' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
            <div className='text-center'>
              <h1 className='text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent'>
                Applications
              </h1>
              <p className='text-gray-600 mt-1'>Manage your job applications and resume</p>
            </div>
            <div className='w-20'></div> {/* Spacer for balance */}
          </div>

          {/* Resume Section */}
          <div className='bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-6 border border-white/40'>
            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4'>
              <div className='flex items-center gap-3'>
                <div className='w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg'>
                  <svg className='w-6 h-6 text-white' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className='text-xl font-bold text-gray-800'>Your Resume</h2>
                  <p className='text-gray-600 text-sm'>Keep your resume updated for better opportunities</p>
                </div>
              </div>

              {userData?.resume && !isEdit && (
                <div className='flex gap-2'>
                  <a
                    className='px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center gap-2 text-sm'
                    href={userData.resume}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg className='w-4 h-4' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View
                  </a>
                  <button
                    onClick={() => setisEdit(true)}
                    className='px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 text-sm'
                  >
                    <svg className='w-4 h-4' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                </div>
              )}
            </div>

            {(isEdit || !userData?.resume) && (
              <div className='flex flex-col sm:flex-row gap-3 items-start sm:items-center'>
                <label className='flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer transition-all shadow-sm hover:shadow-md group flex-1'>
                  <svg className='w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className='text-blue-700 font-semibold text-sm flex-1'>
                    {resume ? resume.name : "Choose PDF or Word document (max 5MB)"}
                  </span>
                  <input
                    id='resumeUpload'
                    onChange={e => setResume(e.target.files[0])}
                    accept='application/pdf,.doc,.docx'
                    type="file"
                    hidden
                  />
                </label>
                <div className='flex gap-2'>
                  <button
                    onClick={updateResume}
                    className='px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm'
                    disabled={!resume}
                  >
                    Save Resume
                  </button>
                  {isEdit && (
                    <button
                      onClick={() => {
                        setisEdit(false)
                        setResume(null)
                      }}
                      className='px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all text-sm'
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Applications Section */}
          <div className='bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/40'>
            <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6'>
              <div className='flex items-center gap-3'>
                <div className='w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg'>
                  <svg className='w-6 h-6 text-white' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className='text-xl font-bold text-gray-800'>Job Applications</h2>
                  <p className='text-gray-600 text-sm'>Track your application progress</p>
                </div>
              </div>

              {/* Status Tabs */}
              <div className='flex flex-wrap gap-2'>
                {[
                  { key: 'all', label: 'All', count: statusCounts.all },
                  { key: 'pending', label: 'Pending', count: statusCounts.pending },
                  { key: 'reviewed', label: 'Reviewed', count: statusCounts.reviewed },
                  { key: 'accepted', label: 'Accepted', count: statusCounts.accepted },
                  { key: 'rejected', label: 'Rejected', count: statusCounts.rejected },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === tab.key
                      ? 'bg-gradient-to-r from-purple-500 to-blue-600 text-white shadow-lg transform -translate-y-0.5'
                      : 'bg-white text-gray-600 hover:bg-gray-50 shadow-md hover:shadow-lg'
                      }`}
                  >
                    {tab.label}
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab.key
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 text-gray-600'
                      }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {filteredApplications && filteredApplications.length > 0 ? (
              <div className='overflow-hidden rounded-xl border border-gray-200 shadow-sm'>
                {/* Desktop Table */}
                <div className='hidden md:block'>
                  <table className='w-full bg-white'>
                    <thead className='bg-gradient-to-r from-gray-50 to-blue-50'>
                      <tr>
                        <th className='py-4 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider'>Company</th>
                        <th className='py-4 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider'>Job Title</th>
                        <th className='py-4 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider'>Location</th>
                        <th className='py-4 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider'>Date</th>
                        <th className='py-4 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider'>Status</th>
                        <th className='py-4 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider'>Actions</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-200'>
                      {filteredApplications.map((job, index) => {
                        const hasValidData = job.CompanyId && job.jobId;

                        if (!hasValidData) {
                          console.warn('Invalid application data at index', index, job);
                          return null;
                        }

                        return (
                          <tr key={job._id || index} className='hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-colors'>
                            <td className='py-4 px-4'>
                              <div className='flex items-center gap-3'>
                                {job.CompanyId.image && (
                                  <img
                                    className='w-10 h-10 rounded-xl object-cover ring-1 ring-gray-200 shadow-sm'
                                    src={job.CompanyId.image}
                                    alt={job.CompanyId.name}
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                )}
                                <span className='font-semibold text-gray-800'>{job.CompanyId.name}</span>
                              </div>
                            </td>
                            <td className='py-4 px-4 text-gray-700 font-medium'>{job.jobId.title}</td>
                            <td className='py-4 px-4 text-gray-600'>{job.jobId.location}</td>
                            <td className='py-4 px-4 text-gray-600 text-sm'>
                              {job.date ? moment(job.date).format('MMM D, YYYY') : 'N/A'}
                            </td>
                            <td className='py-4 px-4'>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBgColor(job.status)} border`}>
                                <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${getStatusColor(job.status)} mr-2`}></span>
                                {job.status}
                              </span>
                            </td>
                            <td className='py-4 px-4'>
                              <button
                                onClick={() => deleteApplication(job._id, job.jobId.title)}
                                disabled={deletingId === job._id}
                                className={`p-2 rounded-lg transition-all ${
                                  deletingId === job._id 
                                    ? 'bg-gray-300 cursor-not-allowed' 
                                    : 'bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700'
                                }`}
                                title="Withdraw Application"
                              >
                                {deletingId === job._id ? (
                                  <div className='w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin'></div>
                                ) : (
                                  <svg className='w-4 h-4' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                )}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className='md:hidden space-y-3 p-3'>
                  {filteredApplications.map((job, index) => {
                    const hasValidData = job.CompanyId && job.jobId;

                    if (!hasValidData) {
                      console.warn('Invalid application data at index', index, job);
                      return null;
                    }

                    return (
                      <div key={job._id || index} className='bg-white rounded-xl p-4 shadow-md border border-gray-200 hover:shadow-lg transition-shadow'>
                        <div className='flex items-start justify-between mb-3'>
                          <div className='flex items-center gap-3'>
                            {job.CompanyId.image && (
                              <img
                                className='w-12 h-12 rounded-xl object-cover ring-1 ring-gray-200'
                                src={job.CompanyId.image}
                                alt={job.CompanyId.name}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            )}
                            <div>
                              <h3 className='font-semibold text-gray-800'>{job.CompanyId.name}</h3>
                              <p className='text-gray-600 text-sm'>{job.jobId.title}</p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getStatusBgColor(job.status)} border`}>
                            <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${getStatusColor(job.status)} mr-1`}></span>
                            {job.status}
                          </span>
                        </div>
                        <div className='flex justify-between text-sm text-gray-600 mb-3'>
                          <div className='flex items-center gap-1'>
                            <svg className='w-4 h-4' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {job.jobId.location}
                          </div>
                          <div className='flex items-center gap-1'>
                            <svg className='w-4 h-4' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {job.date ? moment(job.date).format('MMM D') : 'N/A'}
                          </div>
                        </div>
                        <div className='flex justify-end'>
                          <button
                            onClick={() => deleteApplication(job._id, job.jobId.title)}
                            disabled={deletingId === job._id}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                              deletingId === job._id 
                                ? 'bg-gray-300 cursor-not-allowed text-gray-600' 
                                : 'bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700'
                            }`}
                          >
                            {deletingId === job._id ? (
                              <div className='flex items-center gap-2'>
                                <div className='w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin'></div>
                                Withdrawing...
                              </div>
                            ) : (
                              <div className='flex items-center gap-1'>
                                <svg className='w-3 h-3' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Withdraw
                              </div>
                            )}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className='text-center py-12'>
                <div className='w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg'>
                  <svg className='w-12 h-12 text-gray-400' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className='text-gray-600 text-lg font-semibold mb-2'>
                  {userApplications === null ? 'Loading applications...' : `No ${activeTab !== 'all' ? activeTab : ''} applications found`}
                </p>
                {userApplications !== null && activeTab === 'all' && (
                  <p className='text-gray-500'>Start applying for jobs to see them here!</p>
                )}
                {userApplications !== null && activeTab !== 'all' && (
                  <p className='text-gray-500'>No {activeTab} applications at the moment.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}

export default Applications