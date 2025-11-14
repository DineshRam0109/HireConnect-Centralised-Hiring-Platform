import React, { useContext, useEffect, useRef, useState } from 'react'
import Quill from 'quill';
import { JobCategories, JobLocations } from '../assets/assets';
import axios from 'axios';
import { AppContext } from '../context/AppContext';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const AddJob = () => {
  const [title,setTitle]=useState('');
  const [location,setLocation]=useState('Bangalore');
  const[category,setCategory]=useState('Programming');
  const[level,setLevel]=useState('Beginner level');
  const[salary,setSalary]=useState(0);

  const editorRef=useRef(null)
  const quillRef=useRef(null)
  const navigate = useNavigate()

  const {backendUrl,companyToken}=useContext(AppContext)

  const onSubmitHandler=async(e)=>{
    e.preventDefault()
    try{
      const description=quillRef.current.root.innerHTML
      const {data}=await axios.post(backendUrl+'/api/company/post-job',
        {title,description,location,salary,category,level},
        {headers:{token:companyToken}}
      )
      if(data.success){
        toast.success('🎉 Job posted successfully! Candidates can now apply.')
        setTitle('')
        setSalary(0)
        quillRef.current.root.innerHTML=""
      }
      else{
        toast.error(data.message)
      }
    }
    catch(error){
      toast.error('Failed to post job. Please try again.')
    }
  }
  
  useEffect(()=>{
    if(!quillRef.current && editorRef.current){
      quillRef.current=new Quill(editorRef.current,{
        theme:'snow',
      })
    }
  },[])

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6'>
      <div className='max-w-5xl mx-auto'>
        
        {/* Header */}
        <div className='flex items-center gap-4 mb-6'>
          <button 
            onClick={() => navigate('/dashboard/analytics')}
            className='flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-all group px-4 py-2 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200'
          >
            <svg className='w-5 h-5 group-hover:-translate-x-1 transition-transform' fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className='font-bold'>Back to Dashboard</span>
          </button>
          <div className='h-6 w-px bg-gray-300'></div>
          <div>
            <h1 className='text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
              Create Job Opportunity
            </h1>
            <p className='text-gray-500 font-medium'>Fill the job details below</p>
          </div>
        </div>

        <div className='bg-white rounded-2xl shadow-xl border border-gray-100 p-8'>
          <form onSubmit={onSubmitHandler} className='space-y-6'>
            
            {/* First Row: Title and Salary */}
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
              <div className='space-y-2'>
                <label className='block text-base font-bold text-gray-800 mb-2 flex items-center gap-2'>
                  <div className='w-3 h-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full'></div>
                  Job Title & Role
                </label>
                <input 
                  type="text" 
                  placeholder='e.g. Senior Full Stack Developer'
                  onChange={e=> setTitle(e.target.value)} 
                  value={title}  
                  required
                  className='w-full px-4 py-3 bg-gradient-to-r from-blue-100 to-cyan-100 border-2 border-blue-300 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition-all outline-none placeholder-gray-500 font-bold'
                />
              </div>

              <div className='space-y-2'>
                <label className='block text-base font-bold text-gray-800 mb-2 flex items-center gap-2'>
                  <div className='w-3 h-3 bg-gradient-to-r from-emerald-600 to-green-600 rounded-full'></div>
                  Annual Salary Package
                </label>
                <div className='relative'>
                  <span className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-700 font-bold'>$</span>
                  <input 
                    min={0} 
                    className='w-full pl-10 pr-4 py-3 bg-gradient-to-r from-emerald-100 to-green-100 border-2 border-emerald-300 rounded-xl focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 transition-all outline-none font-bold text-gray-800'
                    onChange={e=>setSalary(e.target.value)}
                    type="Number" 
                    placeholder='65000' 
                  />
                </div>
              </div>
            </div>

            {/* Job Description */}
            <div className='space-y-2'>
              <label className='block text-base font-bold text-gray-800 mb-2 flex items-center gap-2'>
                <div className='w-3 h-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full'></div>
                Job Description & Requirements
              </label>
              <div className='border-2 border-purple-300 rounded-xl overflow-hidden focus-within:border-purple-600 focus-within:ring-2 focus-within:ring-purple-200 transition-all bg-gradient-to-r from-purple-100 to-pink-100'>
                <div ref={editorRef} className='min-h-[160px]'></div>
              </div>
            </div>

            {/* Selection Row */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <div className='space-y-2'>
                <label className='block text-base font-bold text-gray-800 mb-2'>Job Category</label>
                <select 
                  className='w-full px-3 py-3 bg-gradient-to-r from-indigo-100 to-blue-100 border-2 border-indigo-300 rounded-xl focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 transition-all outline-none cursor-pointer text-gray-800 font-bold'
                  onChange={e=>setCategory(e.target.value)}
                >
                  {JobCategories.map((category,index)=>(
                    <option key={index} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className='space-y-2'>
                <label className='block text-base font-bold text-gray-800 mb-2'>Work Location</label>
                <select 
                  className='w-full px-3 py-3 bg-gradient-to-r from-rose-100 to-pink-100 border-2 border-rose-300 rounded-xl focus:bg-white focus:border-rose-600 focus:ring-2 focus:ring-rose-200 transition-all outline-none cursor-pointer text-gray-800 font-bold'
                  onChange={e=>setLocation(e.target.value)}
                >
                  {JobLocations.map((location,index)=>(
                    <option key={index} value={location}>{location}</option>
                  ))}
                </select>
              </div>

              <div className='space-y-2'>
                <label className='block text-base font-bold text-gray-800 mb-2'>Experience Level</label>
                <select 
                  className='w-full px-3 py-3 bg-gradient-to-r from-amber-100 to-orange-100 border-2 border-amber-300 rounded-xl focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-200 transition-all outline-none cursor-pointer text-gray-800 font-bold'
                  onChange={e=>setLevel(e.target.value)}
                >
                  <option value="Beginner level">Entry Level (0-2 years)</option>
                  <option value="Intermediate level">Mid Level (2-5 years)</option>
                  <option value="Senior level">Senior Level (5+ years)</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className='flex gap-4 pt-6'>
              <button 
                type='button'
                onClick={() => navigate(-1)}
                className='px-6 py-3 border-2 border-gray-400 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-500 transition-all font-bold flex items-center gap-2'
              >
                <svg className='w-5 h-5' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Discard
              </button>
              <button 
                type='submit'
                className='flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2'
              >
                <svg className='w-5 h-5' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                🚀 Publish Job Listing
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AddJob