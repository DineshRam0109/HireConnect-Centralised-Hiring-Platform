import React, { useContext, useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import { JobCategories, JobLocations } from '../assets/assets'
import axios from 'axios'
import { toast } from 'react-toastify'

const EditJob = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { backendUrl, companyToken } = useContext(AppContext)
  
  const jobData = location.state?.job

  const [title, setTitle] = useState('')
  const [location_field, setLocation] = useState('')
  const [category, setCategory] = useState('')
  const [level, setLevel] = useState('')
  const [salary, setSalary] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!jobData) {
      toast.error('No job data found')
      navigate('/dashboard/manage-jobs')
      return
    }

    setTitle(jobData.title || '')
    setLocation(jobData.location || '')
    setCategory(jobData.category || '')
    setLevel(jobData.level || '')
    setSalary(jobData.salary || '')
    setDescription(jobData.description || '')
  }, [jobData, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!title || !location_field || !category || !level || !salary || !description) {
      toast.error('Please fill all fields')
      return
    }

    setLoading(true)

    try {
      const { data } = await axios.post(
        backendUrl + '/api/company/update-job',
        {
          id: jobData._id,
          title,
          location: location_field,
          category,
          level,
          salary,
          description
        },
        { headers: { token: companyToken } }
      )

      if (data.success) {
        toast.success('Job updated successfully')
        navigate('/dashboard/manage-jobs')
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.error('Update job error:', error)
      toast.error(error.response?.data?.message || 'Failed to update job')
    } finally {
      setLoading(false)
    }
  }

  if (!jobData) {
    return null
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-4 sm:p-6'>
      <div className='max-w-4xl mx-auto'>
        <div className='flex items-center gap-4 mb-6'>
          <button
            onClick={() => navigate('/dashboard/manage-jobs')}
            className='flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl transition-all shadow-md hover:shadow-lg border border-gray-200'
          >
            <svg className='w-5 h-5' fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
          <div>
            <h1 className='text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
              Edit Job
            </h1>
            <p className='text-gray-600 text-sm'>Update job details</p>
          </div>
        </div>

        <div className='bg-white rounded-2xl shadow-xl p-6 border border-gray-100'>
          <form onSubmit={handleSubmit} className='space-y-6'>
            <div>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                Job Title
              </label>
              <input
                type='text'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'
                placeholder='e.g., Senior Frontend Developer'
                required
              />
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-2'>
                  Location
                </label>
                <select
                  value={location_field}
                  onChange={(e) => setLocation(e.target.value)}
                  className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'
                  required
                >
                  <option value=''>Select Location</option>
                  {JobLocations.map((loc, index) => (
                    <option key={index} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-2'>
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'
                  required
                >
                  <option value=''>Select Category</option>
                  {JobCategories.map((cat, index) => (
                    <option key={index} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-2'>
                  Experience Level
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'
                  required
                >
                  <option value=''>Select Level</option>
                  <option value='Beginner level'>Beginner level</option>
                  <option value='Intermediate level'>Intermediate level</option>
                  <option value='Senior level'>Senior level</option>
                </select>
              </div>

              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-2'>
                  Salary
                </label>
                <input
                  type='text'
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'
                  placeholder='e.g., $80k - $120k'
                  required
                />
              </div>
            </div>

            <div>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                Job Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows='8'
                className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none'
                placeholder='Describe the role, responsibilities, requirements...'
                required
              />
            </div>

            <div className='flex gap-3 pt-4'>
              <button
                type='submit'
                disabled={loading}
                className='flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
              >
                {loading ? (
                  <>
                    <div className='w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <svg className='w-5 h-5' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Update Job
                  </>
                )}
              </button>
              <button
                type='button'
                onClick={() => navigate('/dashboard/manage-jobs')}
                className='px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all'
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EditJob