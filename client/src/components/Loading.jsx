import React from 'react'

const Loading = () => {
  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50'>
      <div className='flex flex-col items-center gap-4'>
        <div className='relative'>
          <div className='w-20 h-20 border-4 border-blue-200 rounded-full'></div>
          <div className='w-20 h-20 border-4 border-transparent border-t-blue-600 rounded-full animate-spin absolute top-0'></div>
        </div>
        <p className='text-gray-600 font-medium animate-pulse'>Loading...</p>
      </div>
    </div>
  )
}

export default Loading