import React, { useState, useContext, useEffect } from 'react'
import { AppContext } from '../context/AppContext'
import { assets, JobCategories, JobLocations } from '../assets/assets'
import Jobcard from './Jobcard';

const JobListing = () => {
    const { isSearched, searchFilter, setSearchFilter, jobs } = useContext(AppContext)

    const [showFilter, setShowFilter] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [selectedCategories, setSelectedCategories] = useState([])
    const [selectedLocations, setSelectedLocations] = useState([])

    const [filteredJobs, setFilteredJobs] = useState(jobs)

    const handleCategoryChange = (category) => (
        setSelectedCategories(
            prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
        )
    )

    const handleLocationChange = (location) => (
        setSelectedLocations(
            prev => prev.includes(location) ? prev.filter(c => c !== location) : [...prev, location]
        )
    )

    const clearAllFilters = () => {
        setSelectedCategories([])
        setSelectedLocations([])
        setSearchFilter({ title: "", location: "" })
    }

   // Add this to your JobListing.jsx - Replace the useEffect that filters jobs

useEffect(() => {
    const matchesCategory = job => selectedCategories.length === 0 || selectedCategories.includes(job.category)
    const matchesLocation = job => selectedLocations.length === 0 || selectedLocations.includes(job.location)
    const matchesTitle = job => searchFilter.title === "" || job.title.toLowerCase().includes(searchFilter.title.toLowerCase())
    const matchesSearchLocation = job => searchFilter.location === "" || job.location.toLowerCase().includes(searchFilter.location.toLowerCase())
    
    // CRITICAL FIX: Remove duplicate jobs based on _id before filtering
    const uniqueJobs = jobs.reduce((acc, current) => {
      // Check if job with this _id already exists in accumulator
      const exists = acc.find(item => item._id === current._id);
      if (!exists) {
        acc.push(current);
      } else {
        console.warn('Duplicate job detected and removed:', current._id, current.title);
      }
      return acc;
    }, []);
    
    const newFilteredJobs = uniqueJobs.slice().reverse().filter(
        job => matchesCategory(job) && matchesLocation(job) && matchesTitle(job) && matchesSearchLocation(job)
    )
    
    setFilteredJobs(newFilteredJobs)
    setCurrentPage(1)
}, [jobs, selectedCategories, selectedLocations, searchFilter])

    const totalPages = Math.ceil(filteredJobs.length / 6)
    const hasActiveFilters = selectedCategories.length > 0 || selectedLocations.length > 0 || searchFilter.title || searchFilter.location

    return (
        <div className='min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-6 px-4'>
            <div className='container max-w-8xl mx-auto'>
                {/* Header - Compact */}
                <div className='text-center mb-6 bg-white rounded-xl shadow-md p-6 mx-4 border border-gray-300'>
                    <h1 className='text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent mb-2'>
                        HireConnect
                    </h1>
                    <p className='text-gray-600 text-base font-medium max-w-3xl mx-auto'>
                        Discover opportunities from top companies that match your skills and aspirations
                    </p>
                </div>

                <div className='flex flex-col lg:flex-row gap-4 mx-4'>
                    {/* Sidebar Filters - Dark Borders */}
                    <div className='w-full lg:w-80 flex-shrink-0'>
                        <div className='bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 sticky top-6'>
                            {/* Filter Header */}
                            <div className='flex items-center justify-between mb-4'>
                                <div className='flex items-center gap-3'>
                                    <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md'>
                                        <svg className='w-5 h-5 text-white' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className='text-xl font-bold text-gray-800'>Filters</h3>
                                        <p className='text-gray-500 text-sm'>Refine your search</p>
                                    </div>
                                </div>
                                {hasActiveFilters && (
                                    <button
                                        onClick={clearAllFilters}
                                        className='text-blue-600 hover:text-blue-700 font-medium px-2 py-1 hover:bg-blue-50 rounded transition-colors text-xs border border-blue-200'
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>

                            {/* Mobile Filter Toggle */}
                            <button
                                onClick={e => setShowFilter(prev => !prev)}
                                className='w-full lg:hidden px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium rounded-lg transition-all shadow-md mb-3 flex items-center justify-center gap-2 text-sm'
                            >
                                <svg className='w-4 h-4' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                </svg>
                                {showFilter ? "Hide Filters" : "Show Filters"}
                            </button>

                            {/* Current Search Filters */}
                            {isSearched && (searchFilter.title !== "" || searchFilter.location !== "") && (
                                <div className='mb-4 p-3 bg-blue-50 rounded-lg border-2 border-blue-300'>
                                    <h4 className='font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm'>
                                        <svg className='w-4 h-4 text-blue-600' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        Current Search
                                    </h4>
                                    <div className='flex flex-wrap gap-2'>
                                        {searchFilter.title && (
                                            <span className='inline-flex items-center gap-2 bg-white border-2 border-blue-400 px-3 py-1 rounded-lg font-semibold text-blue-700 text-sm'>
                                                {searchFilter.title}
                                                <img
                                                    onClick={e => setSearchFilter(prev => ({ ...prev, title: "" }))}
                                                    className='cursor-pointer w-4 h-4 hover:scale-110 transition-transform'
                                                    src={assets.cross_icon}
                                                    alt="Remove"
                                                />
                                            </span>
                                        )}
                                        {searchFilter.location && (
                                            <span className='inline-flex items-center gap-2 bg-white border-2 border-green-400 px-3 py-1 rounded-lg font-semibold text-green-700 text-sm'>
                                                {searchFilter.location}
                                                <img
                                                    onClick={e => setSearchFilter(prev => ({ ...prev, location: "" }))}
                                                    className='cursor-pointer w-4 h-4 hover:scale-110 transition-transform'
                                                    src={assets.cross_icon}
                                                    alt="Remove"
                                                />
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Filters Content */}
                            <div className={showFilter ? "space-y-4" : "max-lg:hidden space-y-4"}>
                                {/* Category Filter */}
                                <div>
                                    <h4 className='font-semibold text-gray-800 mb-3 flex items-center gap-2 text-lg'>
                                        <svg className='w-5 h-5 text-blue-600' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                        Job Categories
                                    </h4>
                                    <div className='space-y-2 max-h-60 overflow-y-auto pr-2'>
                                        {JobCategories.map((category, index) => (
                                            <label key={index} className='flex items-center gap-3 p-2 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors group border border-transparent hover:border-blue-300'>
                                                <input
                                                    className='w-4 h-4 text-blue-600 bg-gray-100 border-2 border-gray-400 rounded focus:ring-blue-500 focus:ring-1'
                                                    type="checkbox"
                                                    onChange={() => handleCategoryChange(category)}
                                                    checked={selectedCategories.includes(category)}
                                                />
                                                <span className='text-gray-700 group-hover:text-gray-900 font-medium text-base flex-1'>
                                                    {category}
                                                </span>
                                                {selectedCategories.includes(category) && (
                                                    <div className='w-2 h-2 bg-blue-600 rounded-full'></div>
                                                )}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Location Filter */}
                                <div>
                                    <h4 className='font-semibold text-gray-800 mb-3 flex items-center gap-2 text-lg'>
                                        <svg className='w-5 h-5 text-green-600' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Locations
                                    </h4>
                                    <div className='space-y-2 max-h-60 overflow-y-auto pr-2'>
                                        {JobLocations.map((location, index) => (
                                            <label key={index} className='flex items-center gap-3 p-2 rounded-lg hover:bg-green-50 cursor-pointer transition-colors group border border-transparent hover:border-green-300'>
                                                <input
                                                    className='w-4 h-4 text-green-600 bg-gray-100 border-2 border-gray-400 rounded focus:ring-green-500 focus:ring-1'
                                                    type="checkbox"
                                                    onChange={() => handleLocationChange(location)}
                                                    checked={selectedLocations.includes(location)}
                                                />
                                                <span className='text-gray-700 group-hover:text-gray-900 font-medium text-base flex-1'>
                                                    {location}
                                                </span>
                                                {selectedLocations.includes(location) && (
                                                    <div className='w-2 h-2 bg-green-600 rounded-full'></div>
                                                )}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Results Count */}
                                <div className='text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-300'>
                                    <p className='text-gray-600 text-sm mb-1'>Showing</p>
                                    <p className='text-2xl font-bold text-gray-800'>{filteredJobs.length}</p>
                                    <p className='text-gray-600 text-sm mt-1'>jobs available</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Job Listing Section - Dark Borders */}
                    <section className='flex-1'>
                        <div className='bg-white rounded-xl shadow-lg p-6 border-2 border-gray-300'>
                            {/* Section Header */}
                            <div className='flex flex-col sm:flex-row sm:items-center justify-between mb-6'>
                                <div>
                                    <h3 className='text-2xl font-bold text-gray-800 mb-2' id='job-list'>
                                        Latest Job Opportunities
                                    </h3>
                                    <p className='text-gray-600 font-medium'>
                                        {filteredJobs.length > 0
                                            ? `Found ${filteredJobs.length} matching jobs`
                                            : 'No jobs match your current filters'
                                        }
                                    </p>
                                </div>
                                {filteredJobs.length > 0 && (
                                    <div className='flex items-center gap-2 mt-3 sm:mt-0'>
                                        <span className='text-gray-500 text-sm font-medium'>Page {currentPage} of {totalPages}</span>
                                    </div>
                                )}
                            </div>

                            {/* Jobs Grid */}
                            {filteredJobs.length > 0 ? (
                                <>
                                    <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
                                        {filteredJobs.slice((currentPage - 1) * 6, currentPage * 6).map((job, index) => (
                                            <Jobcard key={index} job={job} />
                                        ))}
                                    </div>

                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div className='flex items-center justify-center space-x-2 mt-8'>
                                            <a href="#job-list">
                                                <button
                                                    onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                                                    disabled={currentPage === 1}
                                                    className={`w-10 h-10 flex items-center justify-center border-2 rounded-lg transition-all ${
                                                        currentPage === 1
                                                            ? 'bg-gray-100 border-gray-400 text-gray-500 cursor-not-allowed'
                                                            : 'bg-white border-gray-500 text-gray-700 hover:bg-blue-50 hover:border-blue-500 hover:text-blue-700 shadow-md'
                                                    }`}
                                                >
                                                    ←
                                                </button>
                                            </a>

                                            {Array.from({ length: totalPages }).map((_, index) => (
                                                <a key={index} href="#job-list">
                                                    <button
                                                        onClick={() => setCurrentPage(index + 1)}
                                                        className={`w-10 h-10 flex items-center justify-center border-2 rounded-lg font-semibold transition-all ${
                                                            currentPage === index + 1
                                                                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-transparent shadow-lg'
                                                                : 'bg-white border-gray-400 text-gray-700 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 shadow-md'
                                                        }`}
                                                    >
                                                        {index + 1}
                                                    </button>
                                                </a>
                                            ))}

                                            <a href="#job-list">
                                                <button
                                                    onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                                                    disabled={currentPage === totalPages}
                                                    className={`w-10 h-10 flex items-center justify-center border-2 rounded-lg transition-all ${
                                                        currentPage === totalPages
                                                            ? 'bg-gray-100 border-gray-400 text-gray-500 cursor-not-allowed'
                                                            : 'bg-white border-gray-500 text-gray-700 hover:bg-blue-50 hover:border-blue-500 hover:text-blue-700 shadow-md'
                                                    }`}
                                                >
                                                    →
                                                </button>
                                            </a>
                                        </div>
                                    )}
                                </>
                            ) : (
                                /* Empty State */
                                <div className='text-center py-12'>
                                    <div className='w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md border border-gray-300'>
                                        <svg className='w-10 h-10 text-blue-500' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h4 className='text-xl font-bold text-gray-800 mb-2'>No jobs found</h4>
                                    <p className='text-gray-600 mb-4'>Try adjusting your filters or search terms</p>
                                    <button
                                        onClick={clearAllFilters}
                                        className='px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl text-sm'
                                    >
                                        Clear All Filters
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}

export default JobListing