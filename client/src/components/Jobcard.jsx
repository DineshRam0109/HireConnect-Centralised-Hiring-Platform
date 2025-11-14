import React from 'react'
import { useNavigate } from 'react-router-dom'

const Jobcard = ({ job }) => {
  const navigate = useNavigate();

  return (
    <div className="group bg-white border border-gray-100 hover:border-blue-200 p-6 rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 relative overflow-hidden">
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-indigo-50/0 group-hover:from-blue-50/60 group-hover:to-indigo-50/60 transition-all duration-300 rounded-3xl"></div>
      
      <div className="relative z-10">
        {/* Company Logo */}
        <div className="flex justify-between items-start mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center p-2 shadow-md group-hover:shadow-lg transition-all">
            <img className="w-full h-full object-contain" src={job.companyId.image} alt="Company" />
          </div>
        </div>
        
        {/* Job Title */}
        <h4 className="font-bold text-xl text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {job.title}
        </h4>
        
        {/* Tags */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-xl text-xs font-semibold">
            📍 {job.location}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-xl text-xs font-semibold">
            ⚡ {job.level}
          </span>
        </div>
        
        {/* Description */}
        <p className="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-3" 
           dangerouslySetInnerHTML={{ __html: job.description.slice(0,150) }}>
        </p>
        
        {/* Apply Button */}
        <button 
          onClick={() => { navigate(`/apply-job/${job._id}`); scrollTo(0,0); }}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 
                     text-white px-5 py-3 rounded-2xl font-semibold text-sm transition-all 
                     shadow-md hover:shadow-lg flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          Apply Now
        </button>
      </div>
    </div>
  )
}

export default Jobcard
