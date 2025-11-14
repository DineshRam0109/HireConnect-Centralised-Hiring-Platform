import React, { useContext } from 'react';
import { useClerk, UserButton, useUser } from '@clerk/clerk-react';
import { Link, useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';

const Navbar = () => {
  const { openSignIn } = useClerk();
  const { user, isSignedIn } = useUser();
  const navigate = useNavigate();
  const { setShowRecruiterLogin, companyToken } = useContext(AppContext);

  // Simple logic: Show employee dashboard if user is signed in AND not a company
  const isEmployeeUser = isSignedIn && !companyToken;

  return (
    <div className='bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 border-b border-white/10 shadow-lg py-3 sticky top-0 z-50 backdrop-blur-md'>
      <div className='container px-4 mx-auto flex justify-between items-center'>
        {/* Brand Name */}
        <div 
          onClick={() => navigate('/')}
          className='cursor-pointer group flex items-center gap-3'
        >
          <div className='w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-400 rounded-lg flex items-center justify-center shadow-lg'>
            <svg className='w-4 h-4 text-white' fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className='text-2xl font-bold bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent transition-all duration-300 group-hover:from-blue-200 group-hover:to-purple-200'>
            HireConnect
          </span>
        </div>

        {user ? (
          <div className='flex items-center gap-4'>
            {/* Navigation Links */}
            <div className='flex items-center gap-6 max-sm:hidden'>
              {/* Employee Dashboard Link - Show for signed-in users who are NOT companies */}
              {isEmployeeUser && (
                <>
                  <Link 
                    to='/employee-dashboard' 
                    className='text-gray-200 hover:text-white font-medium transition-all duration-200 flex items-center gap-2 hover:bg-white/10 px-3 py-2 rounded-xl'
                  >
                    <svg className='w-4 h-4' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Dashboard
                  </Link>
                  <div className='w-px h-6 bg-white/20'></div>
                </>
              )}
              
              {/* Applications Link - Show for all logged-in users */}
              <Link 
                to='/Applications' 
                className='text-gray-200 hover:text-white font-medium transition-all duration-200 flex items-center gap-2 hover:bg-white/10 px-3 py-2 rounded-xl'
              >
                <svg className='w-4 h-4' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Applications
              </Link>
            </div>

            {/* User Info */}
            <div className='flex items-center gap-3 pl-4 border-l border-white/20'>
              <p className='max-sm:hidden text-gray-200 font-medium text-sm'>
                Hi, {user?.firstName || 'User'}
              </p>
              <div className='relative'>
                <UserButton 
                  appearance={{
                    elements: {
                      avatarBox: "w-9 h-9 border-2 border-white/30 hover:border-white/50 transition-all duration-200 shadow-lg",
                      userButtonTrigger: "focus:shadow-lg"
                    }
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className='flex items-center gap-3'>
            <button
              onClick={() => setShowRecruiterLogin(true)}
              className='text-gray-200 hover:text-white font-medium transition-all duration-200 px-4 py-2 rounded-xl hover:bg-white/10 border border-white/20 hover:border-white/40 flex items-center gap-2 backdrop-blur-sm'
            >
              <svg className='w-4 h-4' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className='max-sm:hidden'>For Recruiters</span>
              <span className='sm:hidden'>Recruiters</span>
            </button>
            <button
              onClick={() => openSignIn()}
              className='bg-gradient-to-r from-blue-400 to-purple-400 hover:from-blue-300 hover:to-purple-300 text-slate-900 font-semibold px-6 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 hover:scale-105'
            >
              <svg className='w-4 h-4' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Login
            </button>
          </div>
        )}
      </div>

      {/* Mobile Navigation */}
      {user && (
        <div className='container px-4 mx-auto sm:hidden mt-3 pt-3 border-t border-white/10'>
          <div className='flex items-center gap-4 justify-center'>
            {isEmployeeUser && (
              <Link 
                to='/employee-dashboard' 
                className='text-gray-200 hover:text-white transition-all duration-200 flex items-center gap-2 text-sm px-3 py-2 rounded-lg hover:bg-white/10'
              >
                <svg className='w-4 h-4' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </Link>
            )}
            <Link 
              to='/Applications' 
              className='text-gray-200 hover:text-white transition-all duration-200 flex items-center gap-2 text-sm px-3 py-2 rounded-lg hover:bg-white/10'
            >
              <svg className='w-4 h-4' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Applications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Navbar;