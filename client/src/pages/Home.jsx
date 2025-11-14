import React from 'react'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import JobListing from '../components/JobListing'
import Jobcard from '../components/Jobcard'
import Footer from '../components/Footer'

const home = () => {
 
  return (
    <div>
      <Navbar />
      <Hero/>
      <JobListing/>
      <Footer/>
    </div>
  )
}

export default home