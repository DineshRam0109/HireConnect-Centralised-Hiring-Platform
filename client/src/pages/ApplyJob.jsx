import React, { useContext, useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { assets } from '../assets/assets';
import Loading from '../components/Loading';
import Navbar from '../components/Navbar'; 
import kconvert from 'k-convert';
import moment from 'moment';
import JobCard from '../components/Jobcard';
import Footer from '../components/Footer'
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '@clerk/clerk-react';

const ApplyJob = () => {
  const { id } = useParams()
  const { getToken } = useAuth()
  const navigate = useNavigate()

  const [JobData, setJobData] = useState(null)
  const [isAlreadyApplied, setIsAlreadyApplied] = useState(false)
  const { jobs, backendUrl, userData, userApplications, fetchUserApplications } = useContext(AppContext)

  const fetchJob = async () => {
    try {
      const { data } = await axios.get(backendUrl + `/api/jobs/${id}`)
      if (data.success) {
        setJobData(data.job)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const applyHandler = async () => {
    try {
      if (!userData) {
        return toast.error('Login to apply for jobs')
      }

      if (!userData.resume) {
        navigate('/applications')
        return toast.error('Upload resume to apply')
      }

      const token = await getToken()
      const { data } = await axios.post(backendUrl + '/api/users/apply',
        { jobId: JobData._id },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        toast.success(data.message)
        setIsAlreadyApplied(true)
        // CRITICAL FIX: Refresh applications immediately after applying
        await fetchUserApplications()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const checkAlreadyApplied = () => {
    if (JobData && userApplications && userApplications.length > 0) {
      const hasApplied = userApplications.some(item => 
        item.jobId && item.jobId._id === JobData._id
      );
      setIsAlreadyApplied(hasApplied);
    }
  };

  const handleBack = () => {
    navigate('/');
  }

  useEffect(() => {
    fetchJob();
  }, [id])

  // CRITICAL FIX: Check for already applied whenever userApplications or JobData changes
  useEffect(() => {
    checkAlreadyApplied();
  }, [JobData, userApplications, id]);

  // Get more jobs from the same company - Improved filtering
  const moreJobs = jobs
    .filter(job => {
      // Exclude current job
      if (job._id === JobData?._id) return false;
      
      // Ensure company matches
      if (job.companyId._id !== JobData?.companyId._id) return false;
      
      // CRITICAL FIX: Filter out already applied jobs
      if (userData && userApplications && userApplications.length > 0) {
        const appliedJobIds = userApplications
          .filter(app => app.jobId) // Ensure jobId exists
          .map(app => app.jobId._id);
        
        if (appliedJobIds.includes(job._id)) {
          return false;
        }
      }
      
      return true;
    })
    .slice(0, 8)

  return JobData ? (
    <>
      <Navbar />
      <div className='min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-6 px-4'>
        <div className='max-w-8xl mx-auto'>
          
          {/* Back Button */}
          <div className='mb-6'>
            <button
              onClick={handleBack}
              className='flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg border border-gray-200 hover:border-gray-300'
            >
              <svg className='w-5 h-5' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
          </div>

          {/* Main Content Grid */}
          <div className='grid grid-cols-1 xl:grid-cols-4 gap-6'>
            
            {/* Job Details - 3/4 width */}
            <div className='xl:col-span-3 space-y-6'>
              
              {/* Header Card */}
              <div className='bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden'>
                <div className='bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 p-6 text-white'>
                  <div className='flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4'>
                    <div className='flex items-start gap-4'>
                      <img 
                        className='w-20 h-20 bg-white rounded-xl p-2 border-4 border-white/20 shadow-lg' 
                        src={JobData.companyId.image} 
                        alt={JobData.companyId.name} 
                      />
                      <div className='flex-1'>
                        <h1 className='text-2xl lg:text-3xl font-bold mb-2'>{JobData.title}</h1>
                        <div className='flex flex-wrap gap-4 text-blue-100 text-sm'>
                          <div className='flex items-center gap-2'>
                            <svg className='w-4 h-4' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span className='font-semibold'>{JobData.companyId.name}</span>
                          </div>
                          <div className='flex items-center gap-2'>
                            <svg className='w-4 h-4' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            <span>{JobData.location}</span>
                          </div>
                          <div className='flex items-center gap-2'>
                            <svg className='w-4 h-4' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>{JobData.level}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className='text-center lg:text-right'>
                      <div className='bg-white/20 backdrop-blur-sm rounded-xl p-3 border border-white/30'>
                        <p className='text-2xl font-bold'>{kconvert.convertTo(JobData.salary)}</p>
                        <p className='text-blue-100 text-xs'>Annual Package</p>
                      </div>
                      <p className='text-blue-100 mt-1 text-xs'>Posted {moment(JobData.date).fromNow()}</p>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className='p-6'>
                  <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mb-6'>
                    <div className='bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200 text-center'>
                      <p className='text-xs text-blue-600 font-semibold mb-1 uppercase tracking-wide'>Category</p>
                      <p className='font-bold text-gray-800 text-sm'>{JobData.category}</p>
                    </div>
                    <div className='bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-lg border border-purple-200 text-center'>
                      <p className='text-xs text-purple-600 font-semibold mb-1 uppercase tracking-wide'>Level</p>
                      <p className='font-bold text-gray-800 text-sm'>{JobData.level}</p>
                    </div>
                    <div className='bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg border border-green-200 text-center'>
                      <p className='text-xs text-green-600 font-semibold mb-1 uppercase tracking-wide'>Type</p>
                      <p className='font-bold text-gray-800 text-sm'>Full-time</p>
                    </div>
                    <div className='bg-gradient-to-br from-orange-50 to-orange-100 p-3 rounded-lg border border-orange-200 text-center'>
                      <p className='text-xs text-orange-600 font-semibold mb-1 uppercase tracking-wide'>Experience</p>
                      <p className='font-bold text-gray-800 text-sm'>2+ years</p>
                    </div>
                  </div>

                  {/* Apply Button */}
                  <div className='border-t border-gray-200 pt-4'>
                    {isAlreadyApplied ? (
                      <div className='bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-6 rounded-lg text-center font-semibold shadow-lg flex items-center justify-center gap-2'>
                        <svg className='w-5 h-5' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Application Submitted
                      </div>
                    ) : (
                      <button
                        onClick={applyHandler}
                        className='w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 px-6 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2'
                      >
                        <svg className='w-5 h-5' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Apply Now
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Job Description */}
              <div className='bg-white rounded-2xl shadow-xl border border-blue-100 p-6'>
                <h2 className='text-xl font-bold text-gray-800 mb-4 flex items-center gap-2'>
                  <svg className='w-5 h-5 text-blue-600' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Job Description
                </h2>
                <div 
                  className='prose max-w-none text-gray-700 leading-relaxed text-base'
                  style={{ lineHeight: '1.6' }}
                  dangerouslySetInnerHTML={{ __html: JobData.description }}
                />
              </div>
            </div>

            {/* Sidebar - 1/4 width */}
            <div className='space-y-6'>
              
              {/* Company Info */}
              <div className='bg-white rounded-xl shadow-lg border border-blue-100 p-5'>
                <h3 className='text-lg font-bold text-gray-800 mb-3 flex items-center gap-2'>
                  <svg className='w-4 h-4 text-blue-600' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Company
                </h3>
                <div className='flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200'>
                  <img 
                    className='w-12 h-12 rounded-lg object-cover border-2 border-white shadow'
                    src={JobData.companyId.image} 
                    alt={JobData.companyId.name} 
                  />
                  <div>
                    <p className='font-bold text-gray-800'>{JobData.companyId.name}</p>
                    <p className='text-gray-600 text-xs'>{JobData.companyId.email}</p>
                  </div>
                </div>
              </div>

              {/* More Jobs */}
              <div className='bg-white rounded-xl shadow-lg border border-blue-100 p-5'>
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-lg font-bold text-gray-800 flex items-center gap-2'>
                    <svg className='w-4 h-4 text-purple-600' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    More Jobs at {JobData.companyId.name}
                  </h3>
                  <span className='bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full'>
                    {moreJobs.length} jobs
                  </span>
                </div>
                <div className='space-y-3 max-h-[600px] overflow-y-auto pr-2'>
                  {moreJobs.length > 0 ? (
                    moreJobs.map((job, index) => (
                      <JobCard key={job._id || index} job={job} compact={true} />
                    ))
                  ) : (
                    <p className='text-gray-500 text-sm text-center py-4'>
                      No other available jobs from this company
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  ) : (
    <Loading />
  )
}

export default ApplyJob