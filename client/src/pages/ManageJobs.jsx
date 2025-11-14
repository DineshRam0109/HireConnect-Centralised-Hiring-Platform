import React, { useContext, useEffect, useState } from 'react'
import moment from 'moment'
import {useNavigate} from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const ManageJobs = () => {
  const navigate=useNavigate()
  const [jobs,setJobs]=useState([])
  const [deletingId, setDeletingId] = useState(null)
  const {backendUrl,companyToken}=useContext(AppContext)

  const fetchCompanyJobs=async()=>{
    try{
      const{data}=await axios.get(backendUrl+'/api/company/list-jobs',
        {headers:{token:companyToken}}
      )

      if(data.success){
        setJobs(data.jobsData.reverse())
      }
      else{
        toast.error(data.message)
      }
    }
    catch(error){
      toast.error(error.message)
    }
  }

  const changeJobVisibility=async(id)=>{
    try{
      const {data}=await axios.post(backendUrl+'/api/company/change-visibility',
        {id},
        {headers:{token:companyToken}}
      )

      if(data.success){
        toast.success(data.message)
        fetchCompanyJobs()
      }
      else{
        toast.error(data.message)
      }
    }
    catch(error){
      toast.error(error.message)
    }
  }

  const deleteJob = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return
    }

    setDeletingId(id)
    try {
      const {data} = await axios.post(backendUrl+'/api/company/delete-job',
        {id},
        {headers:{token:companyToken}}
      )

      if(data.success){
        toast.success('🗑️ Job deleted successfully')
        fetchCompanyJobs()
      }
      else{
        toast.error(data.message)
      }
    }
    catch(error){
      toast.error('Failed to delete job')
    }
    finally{
      setDeletingId(null)
    }
  }

  const updateJob = (job) => {
    // Navigate to edit job page with job data
    navigate('/dashboard/update-job', { state: { job } })
  }

  const getApplicationColor = (applicants) => {
    if (applicants === 0) {
      return 'bg-gradient-to-br from-gray-400 to-gray-500'
    } else if (applicants >= 11) {
      return 'bg-gradient-to-br from-red-500 to-pink-600'
    } else if (applicants >= 6) {
      return 'bg-gradient-to-br from-orange-500 to-amber-600'
    } else {
      return 'bg-gradient-to-br from-green-500 to-emerald-600'
    }
  }

  useEffect(()=>{
    if(companyToken){
      fetchCompanyJobs()
    }
  },[companyToken])

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-3 sm:p-4 md:p-6'>
      <div className='max-w-7xl mx-auto'>
        
        {/* Header with Back Button and Analytics Link */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-4'>
          <div className='flex items-center gap-2 sm:gap-4'>
            <button 
              onClick={() => navigate(-1)}
              className='flex items-center gap-1 sm:gap-2 text-gray-600 hover:text-gray-800 transition-all group px-2 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 text-sm sm:text-base'
            >
              <svg className='w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className='font-medium'>Back</span>
            </button>
            <div className='h-4 sm:h-6 w-px bg-gray-300'></div>
            <div>
              <h1 className='text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
                Job Management
              </h1>
              <p className='text-gray-600 text-xs sm:text-sm'>Manage your job listings</p>
            </div>
          </div>
          
          <div className='flex gap-2 sm:gap-3 mt-3 sm:mt-0'>
            <button 
              onClick={() => navigate('/dashboard/analytics')}
              className='px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-medium transition-all shadow hover:shadow-md flex items-center gap-1 sm:gap-2 text-xs sm:text-sm'
            >
              <svg className='w-3 h-3 sm:w-4 sm:h-4' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className='hidden xs:inline'>Analytics</span>
            </button>
            <button 
              onClick={()=>navigate('/dashboard/add-job')}
              className='px-3 py-1.5 sm:px-6 sm:py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-1 sm:gap-2 text-xs sm:text-sm'
            >
              <svg className='w-3 h-3 sm:w-4 sm:h-4' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className='hidden xs:inline'>Add Job</span>
            </button>
          </div>
        </div>

        <div className='bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-3 sm:p-4 md:p-6'>
          {jobs.length > 0 ? (
            <div className='overflow-x-auto'>
              {/* Mobile Card View */}
              <div className='sm:hidden space-y-3'>
                {jobs.map((job,index)=>(
                  <div key={index} className='bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all'>
                    <div className='flex justify-between items-start mb-3'>
                      <div className='flex-1'>
                        <h3 className='font-bold text-gray-800 text-sm line-clamp-2 mb-1'>{job.title}</h3>
                        <div className='flex flex-wrap gap-1 text-xs'>
                          <span className='inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded'>
                            <svg className='w-3 h-3' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            {job.location}
                          </span>
                          <span className='inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded'>
                            <svg className='w-3 h-3' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {moment(job.date).format('MMM DD')}
                          </span>
                        </div>
                      </div>
                      <div className={`inline-flex flex-col items-center justify-center w-10 h-10 rounded-lg font-bold text-white text-xs shadow ${getApplicationColor(job.applicants)} ml-2`}>
                        <span className='text-sm'>{job.applicants}</span>
                        <span className='text-[10px] opacity-90'>apps</span>
                      </div>
                    </div>
                    
                    <div className='flex justify-between items-center'>
                      <div className='flex items-center gap-2'>
                        <label className='relative inline-flex items-center cursor-pointer'>
                          <input 
                            onChange={()=>changeJobVisibility(job._id)} 
                            type="checkbox" 
                            checked={job.visible}
                            className='sr-only peer'
                          />
                          <div className="w-10 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-green-500 peer-checked:to-emerald-600"></div>
                        </label>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          job.visible 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {job.visible ? 'Active' : 'Hidden'}
                        </span>
                      </div>
                      
                      <div className='flex gap-1'>
                        <button
                          onClick={() => updateJob(job)}
                          className='p-1.5 rounded transition-all bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700'
                        >
                          <svg className='w-4 h-4' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteJob(job._id, job.title)}
                          disabled={deletingId === job._id}
                          className={`p-1.5 rounded transition-all ${
                            deletingId === job._id 
                              ? 'bg-gray-300 cursor-not-allowed' 
                              : 'bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700'
                          }`}
                        >
                          {deletingId === job._id ? (
                            <div className='w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin'></div>
                          ) : (
                            <svg className='w-4 h-4' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <table className='hidden sm:table w-full'>
                <thead>
                  <tr className='border-b-2 border-gray-200'>
                    <th className='py-3 px-3 md:py-4 md:px-4 text-left text-xs md:text-sm font-bold text-gray-700'>No</th>
                    <th className='py-3 px-3 md:py-4 md:px-4 text-left text-xs md:text-sm font-bold text-gray-700'>Job Details</th>
                    <th className='py-3 px-3 md:py-4 md:px-4 text-center text-xs md:text-sm font-bold text-gray-700'>Applications</th>
                    <th className='py-3 px-3 md:py-4 md:px-4 text-center text-xs md:text-sm font-bold text-gray-700'>Status</th>
                    <th className='py-3 px-3 md:py-4 md:px-4 text-center text-xs md:text-sm font-bold text-gray-700'>Actions</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100'>
                  {jobs.map((job,index)=>(
                    <tr key={index} className='hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-colors group'>
                      <td className='py-3 px-3 md:py-4 md:px-4 text-gray-600 font-medium'>
                        <div className='w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg flex items-center justify-center text-sm md:text-lg font-bold text-blue-700'>
                          {index+1}
                        </div>
                      </td>
                      <td className='py-3 px-3 md:py-4 md:px-4'>
                        <div className='space-y-2 md:space-y-3'>
                          <div className='font-bold text-gray-800 text-sm md:text-base group-hover:text-blue-600 transition-colors line-clamp-2'>
                            {job.title}
                          </div>
                          <div className='flex flex-wrap gap-1 md:gap-2 text-xs md:text-sm'>
                            <span className='inline-flex items-center gap-1 md:gap-2 bg-blue-50 text-blue-700 px-2 py-1 md:px-3 md:py-1.5 rounded-lg font-medium'>
                              <svg className='w-3 h-3 md:w-4 md:h-4' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                              {job.location}
                            </span>
                            <span className='inline-flex items-center gap-1 md:gap-2 bg-purple-50 text-purple-700 px-2 py-1 md:px-3 md:py-1.5 rounded-lg font-medium'>
                              <svg className='w-3 h-3 md:w-4 md:h-4' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {moment(job.date).format('MMM DD, YYYY')}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className='py-3 px-3 md:py-4 md:px-4 text-center'>
                        <div className={`inline-flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl font-bold text-white text-sm md:text-base shadow-lg ${getApplicationColor(job.applicants)}`}>
                          <span className='text-base md:text-lg'>{job.applicants}</span>
                          <span className='text-[10px] md:text-xs opacity-90'>apps</span>
                        </div>
                      </td>
                      <td className='py-3 px-3 md:py-4 md:px-4 text-center'>
                        <div className='flex flex-col items-center gap-1 md:gap-2'>
                          <label className='relative inline-flex items-center cursor-pointer'>
                            <input 
                              onChange={()=>changeJobVisibility(job._id)} 
                              type="checkbox" 
                              checked={job.visible}
                              className='sr-only peer'
                            />
                            <div className="w-10 h-5 md:w-12 md:h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 md:after:h-5 md:after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-green-500 peer-checked:to-emerald-600"></div>
                          </label>
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            job.visible 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {job.visible ? 'Active' : 'Hidden'}
                          </span>
                        </div>
                      </td>
                      <td className='py-3 px-3 md:py-4 md:px-4 text-center'>
                        <div className='flex justify-center gap-1 md:gap-2'>
                          <button
                            onClick={() => updateJob(job)}
                            className='p-1.5 md:p-2 rounded-lg transition-all bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700'
                            title='Edit Job'
                          >
                            <svg className='w-4 h-4 md:w-5 md:h-5' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteJob(job._id, job.title)}
                            disabled={deletingId === job._id}
                            className={`p-1.5 md:p-2 rounded-lg transition-all ${
                              deletingId === job._id 
                                ? 'bg-gray-300 cursor-not-allowed' 
                                : 'bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700'
                            }`}
                            title='Delete Job'
                          >
                            {deletingId === job._id ? (
                              <div className='w-4 h-4 md:w-5 md:h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin'></div>
                            ) : (
                              <svg className='w-4 h-4 md:w-5 md:h-5' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className='text-center py-8 sm:py-12'>
              <div className='w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4'>
                <svg className='w-8 h-8 sm:w-10 sm:h-10 text-blue-500' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className='text-lg sm:text-xl font-semibold text-gray-700 mb-1 sm:mb-2'>No jobs posted yet</h3>
              <p className='text-gray-500 text-sm sm:text-base mb-4 sm:mb-6'>Create your first job listing to get started</p>
              <button 
                onClick={()=>navigate('/dashboard/add-job')}
                className='px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg sm:rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2 text-sm sm:text-base mx-auto'
              >
                <svg className='w-4 h-4 sm:w-5 sm:h-5' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create First Job
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ManageJobs