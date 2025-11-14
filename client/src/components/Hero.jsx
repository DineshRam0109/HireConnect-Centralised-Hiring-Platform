import React, { useContext, useRef } from 'react'
import { assets } from '../assets/assets'
import { AppContext } from '../context/AppContext'

const Hero = () => {
    const {setSearchFilter,setIsSearched}=useContext(AppContext)

    const titleRef=useRef(null)
    const locationRef=useRef(null)

    const onSearch=()=>{
        setSearchFilter({
            title:titleRef.current.value,
            location:locationRef.current.value
        })
        setIsSearched(true)
    }

  return (
    <div className='container mx-auto my-8 px-4'>
        {/* Main Hero Section */}
        <div className='bg-gradient-to-br from-indigo-600 to-purple-700 text-white py-16 rounded-2xl shadow-xl overflow-hidden'>
            
            {/* Background Elements */}
            <div className='absolute inset-0 opacity-10'>
                <div className='absolute top-0 left-0 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-2xl'></div>
                <div className='absolute bottom-0 right-0 w-64 h-64 bg-pink-300 rounded-full mix-blend-overlay filter blur-2xl'></div>
            </div>

            <div className='relative z-10 text-center px-4'>
                {/* Heading */}
                <h2 className='text-2xl md:text-4xl font-bold mb-4 leading-tight'>
                    Find Your Dream Job
                </h2>
                <p className='mb-8 max-w-xl mx-auto text-indigo-100 text-sm md:text-base'>
                    Explore 10,000+ opportunities and take the next step in your career
                </p>

                {/* Search Bar */}
                <div className='flex flex-col md:flex-row items-center gap-3 bg-white rounded-xl max-w-2xl mx-auto p-2 shadow-lg'>
                    <div className='flex items-center flex-1 w-full px-4 py-2 bg-gray-50 rounded-lg'>
                        <svg className='w-4 h-4 text-gray-500 mr-2' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder='Job title or keyword'
                            className='flex-1 bg-transparent text-gray-800 outline-none placeholder-gray-500 text-sm'
                            ref={titleRef}
                        />
                    </div>

                    <div className='flex items-center flex-1 w-full px-4 py-2 bg-gray-50 rounded-lg'>
                        <svg className='w-4 h-4 text-gray-500 mr-2' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder='City or state'
                            className='flex-1 bg-transparent text-gray-800 outline-none placeholder-gray-500 text-sm'
                            ref={locationRef}
                        />
                    </div>

                    <button
                        onClick={onSearch}
                        className='w-full md:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2'
                    >
                        <svg className='w-4 h-4' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Search
                    </button>
                </div>
            </div>
        </div>

        {/* Trusted Companies */}
        <div className='mt-6 bg-white border border-gray-200 rounded-xl p-4 shadow-sm'>
            <div className='flex flex-wrap items-center justify-center gap-6 md:gap-8'>
                <p className='text-gray-500 font-medium text-xs uppercase tracking-wide'>Trusted By</p>
                <img className='h-5  hover:opacity-100 transition-opacity' src={assets.microsoft_logo} alt="Microsoft" />
                <img className='h-5  hover:opacity-100 transition-opacity' src={assets.walmart_logo} alt="Walmart" />
                <img className='h-5  hover:opacity-100 transition-opacity' src={assets.accenture_logo} alt="Accenture" />
                <img className='h-5 hover:opacity-100 transition-opacity' src={assets.samsung_logo} alt="Samsung" />
                <img className='h-5  hover:opacity-100 transition-opacity' src={assets.amazon_logo} alt="Amazon" />
                <img className='h-5 hover:opacity-100 transition-opacity' src={assets.adobe_logo} alt="Adobe" />
            </div>
        </div>
    </div>
  )
}

export default Hero