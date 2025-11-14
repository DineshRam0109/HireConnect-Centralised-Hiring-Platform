import React, { useState, useContext, useEffect, useRef } from 'react';
import HireConnectLogo from '../assets/HireConnectLogo.png'; 

// Footer Component
const Footer = ({ assets }) => {
  return (
    <footer className='bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 mt-8'>
      <div className='container px-4 2xl:px-20 mx-auto py-6'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 items-center'>
          {/* Logo Section */}
          <div className='flex justify-center md:justify-start'>
            <img 
              width={160} 
              src={HireConnectLogo}             
              alt="HireConnect Logo" 
              className='brightness-0 invert'
            />
          </div>
          
          {/* Copyright Section */}
          <div className='text-center'>
            <p className='text-white text-xl font-bold'>
              © 2025 HireConnect
            </p>
            <p className='text-gray-300 text-md mt-1'>
              All Rights Reserved
            </p>
          </div>
          
          {/* Social Media Section */}
          <div className='flex justify-center md:justify-end gap-3'>
            <a href="#" className='w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 backdrop-blur-sm border border-white/10'>
              <svg className='w-5 h-5 text-white' fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
            <a href="#" className='w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 backdrop-blur-sm border border-white/10'>
              <svg className='w-5 h-5 text-white' fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
            </a>
            <a href="#" className='w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 backdrop-blur-sm border border-white/10'>
              <svg className='w-5 h-5 text-white' fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.042-3.441.219-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.001 12.017 24.001c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"/>
              </svg>
            </a>
          </div>
        </div>
        
        {/* Bottom Links */}
        <div className='mt-4 pt-3 border-t border-white/10'>
          <div className='flex flex-wrap justify-center gap-4 text-gray-300 text-md font-semibold'>
            <a href="#" className='hover:text-white transition-colors'>Privacy Policy</a>
            <span>•</span>
            <a href="#" className='hover:text-white transition-colors'>Terms of Service</a>
            <span>•</span>
            <a href="#" className='hover:text-white transition-colors'>Contact Us</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;