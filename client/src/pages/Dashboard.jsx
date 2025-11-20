import React, { useContext, useEffect, useState, useRef } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'
import { AppContext } from '../context/AppContext'

const Dashboard = () => {
    const navigate = useNavigate()
    const { companyData, setCompanyData, setCompanyToken } = useContext(AppContext)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [showProfileDropdown, setShowProfileDropdown] = useState(false)
    const profileDropdownRef = useRef(null)

    // function to logout for company
    const logout = () => {
        setCompanyToken(null)
        localStorage.removeItem('companyToken')
        setCompanyData(null)
        setShowProfileDropdown(false)
        navigate('/')
    }

    // Toggle profile dropdown
    const toggleProfileDropdown = () => {
        setShowProfileDropdown(!showProfileDropdown)
    }

    // Close profile dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
                setShowProfileDropdown(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    useEffect(() => {
        if (companyData) {
            navigate('/dashboard/analytics')
        }
    }, [companyData])

    // Close sidebar when clicking on a link on mobile
    const handleNavLinkClick = () => {
        if (window.innerWidth < 768) {
            setIsSidebarOpen(false)
        }
    }

    // Close sidebar when clicking outside on mobile
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isSidebarOpen && window.innerWidth < 768) {
                const sidebar = document.getElementById('sidebar')
                const hamburger = document.getElementById('hamburger')
                if (sidebar && !sidebar.contains(event.target) && hamburger && !hamburger.contains(event.target)) {
                    setIsSidebarOpen(false)
                }
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isSidebarOpen])

    return (
        <div className='min-h-screen bg-gradient-to-br from-gray-50 to-blue-50'>
            {/* Enhanced Navbar for Recruiter Panel */}
            <div className='bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 shadow-lg py-4'>
                <div className='px-4 sm:px-6 flex justify-between items-center'>
                    {/* Left section with hamburger and logo */}
                    <div className='flex items-center gap-4'>
                        {/* Hamburger Menu for Mobile */}
                        <button 
                            id="hamburger"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className='md:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors'
                        >
                            <svg className='w-6 h-6 text-white' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d={isSidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                                />
                            </svg>
                        </button>

                        {/* HireConnect Logo */}
                        <div 
                            onClick={() => navigate('/')}
                            className='flex items-center gap-3 cursor-pointer group'
                        >
                            <div className='w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-xl flex items-center justify-center shadow-lg'>
                                <svg className='w-4 h-4 sm:w-6 sm:h-6 text-blue-600' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <span className='text-xl sm:text-2xl font-bold text-white group-hover:text-blue-100 transition-colors'>
                                HireConnect
                            </span>
                        </div>
                    </div>

                    {companyData && (
    <div className='flex items-center gap-3 sm:gap-4'>
        <p className='max-sm:hidden text-white font-medium text-sm sm:text-base'>
            Welcome, {companyData.name}
        </p>
        <div className='relative' ref={profileDropdownRef}>
            <img 
                className='w-8 h-8 sm:w-10 sm:h-10 border-2 border-white/30 rounded-xl object-cover shadow-lg cursor-pointer hover:border-white/50 transition-all' 
                src={companyData.image} 
                alt={companyData.name}
                onClick={toggleProfileDropdown}
            />
            {showProfileDropdown && (
                <div className='absolute top-full right-0 z-50 mt-2 w-48'>
                    <div className='bg-white rounded-xl shadow-2xl border border-gray-200 p-2'>
                        <div className='p-3 border-b border-gray-100'>
                            <p className='font-semibold text-gray-800 text-sm'>{companyData.name}</p>
                            <p className='text-xs text-gray-600 truncate'>{companyData.email}</p>
                        </div>
                        <button 
                            onClick={logout}
                            className='w-full text-left p-3 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm'
                        >
                            <svg className='w-4 h-4' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Logout
                        </button>
                    </div>
                </div>
            )}
 
        </div>
    </div>
)}
                </div>
            </div>

            <div className='flex items-start'>
                {/* Enhanced Sidebar */}
                <div 
                    id="sidebar"
                    className={`
                        fixed md:static top-0 left-0 z-40
                        w-64 min-h-screen bg-white shadow-xl border-r border-gray-200
                        transform transition-transform duration-300 ease-in-out
                        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                    `}
                >
                    {/* Close button for mobile */}
                    <div className='md:hidden absolute top-4 right-4'>
                        <button 
                            onClick={() => setIsSidebarOpen(false)}
                            className='p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors'
                        >
                            <svg className='w-5 h-5 text-gray-600' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className='p-4 sm:p-6 border-b border-gray-100'>
                        <h2 className='text-lg font-bold text-gray-800'>Recruiter Dashboard</h2>
                        <p className='text-sm text-gray-600 mt-1'>Manage your hiring process</p>
                    </div>
                    
                    <ul className='flex flex-col p-3 sm:p-4 space-y-1 sm:space-y-2'>
                        <NavLink 
                            className={({ isActive }) => `flex items-center p-3 sm:p-4 gap-3 rounded-xl transition-all duration-200 group ${
                                isActive 
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105' 
                                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:shadow-md'
                            }`} 
                            to={'/dashboard/analytics'}
                            onClick={handleNavLinkClick}
                        >
                            {({ isActive }) => (
                                <>
                                    <div className={`p-2 rounded-lg ${
                                        isActive ? 'bg-white/20' : 'bg-blue-100 group-hover:bg-blue-200'
                                    }`}>
                                        <svg className='w-4 h-4 sm:w-5 sm:h-5' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <span className='font-medium text-sm sm:text-base'>Analytics</span>
                                </>
                            )}
                        </NavLink>

                        <NavLink 
                            className={({ isActive }) => `flex items-center p-3 sm:p-4 gap-3 rounded-xl transition-all duration-200 group ${
                                isActive 
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105' 
                                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:shadow-md'
                            }`} 
                            to={'/dashboard/add-job'}
                            onClick={handleNavLinkClick}
                        >
                            {({ isActive }) => (
                                <>
                                    <div className={`p-2 rounded-lg ${
                                        isActive ? 'bg-white/20' : 'bg-green-100 group-hover:bg-green-200'
                                    }`}>
                                        <svg className='w-4 h-4 sm:w-5 sm:h-5' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </div>
                                    <span className='font-medium text-sm sm:text-base'>Add Job</span>
                                </>
                            )}
                        </NavLink>

                        <NavLink 
                            className={({ isActive }) => `flex items-center p-3 sm:p-4 gap-3 rounded-xl transition-all duration-200 group ${
                                isActive 
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105' 
                                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:shadow-md'
                            }`} 
                            to={'/dashboard/manage-jobs'}
                            onClick={handleNavLinkClick}
                        >
                            {({ isActive }) => (
                                <>
                                    <div className={`p-2 rounded-lg ${
                                        isActive ? 'bg-white/20' : 'bg-orange-100 group-hover:bg-orange-200'
                                    }`}>
                                        <svg className='w-4 h-4 sm:w-5 sm:h-5' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                    </div>
                                    <span className='font-medium text-sm sm:text-base'>Manage Jobs</span>
                                </>
                            )}
                        </NavLink>

                        <NavLink 
                            className={({ isActive }) => `flex items-center p-3 sm:p-4 gap-3 rounded-xl transition-all duration-200 group ${
                                isActive 
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105' 
                                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:shadow-md'
                            }`} 
                            to={'/dashboard/view-applications'}
                            onClick={handleNavLinkClick}
                        >
                            {({ isActive }) => (
                                <>
                                    <div className={`p-2 rounded-lg ${
                                        isActive ? 'bg-white/20' : 'bg-purple-100 group-hover:bg-purple-200'
                                    }`}>
                                        <svg className='w-4 h-4 sm:w-5 sm:h-5' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <span className='font-medium text-sm sm:text-base'>View Applications</span>
                                </>
                            )}
                        </NavLink>

                        {/* NEW: Advanced Reports Link */}
                        <NavLink 
                            className={({ isActive }) => `flex items-center p-3 sm:p-4 gap-3 rounded-xl transition-all duration-200 group ${
                                isActive 
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105' 
                                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:shadow-md'
                            }`} 
                            to={'/dashboard/reports'}
                            onClick={handleNavLinkClick}
                        >
                            {({ isActive }) => (
                                <>
                                    <div className={`p-2 rounded-lg ${
                                        isActive ? 'bg-white/20' : 'bg-cyan-100 group-hover:bg-cyan-200'
                                    }`}>
                                        <svg className='w-4 h-4 sm:w-5 sm:h-5' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <span className='font-medium text-sm sm:text-base'>Advanced Reports</span>
                                </>
                            )}
                        </NavLink>
                    </ul>
                </div>

                {/* Overlay for mobile sidebar */}
                {isSidebarOpen && (
                    <div 
                        className='fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden'
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* Main Content Area */}
                <div className='flex-1 min-h-screen bg-transparent w-full'>
                    <div className='p-3 sm:p-4 md:p-6'>
                        <Outlet />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Dashboard