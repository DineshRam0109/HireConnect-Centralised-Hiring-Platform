
import Job from "../models/Job.js"



export const getJobs = async(req, res) => {
   try {
    // Fetch all visible jobs and populate company data
    const jobs = await Job.find({visible: true})
      .populate({path: 'companyId', select: '-password'})
      .lean()
    
    // Remove duplicates by _id - use a Map to keep only first occurrence
    const jobMap = new Map();
    jobs.forEach(job => {
      const jobId = job._id.toString();
      if (!jobMap.has(jobId)) {
        jobMap.set(jobId, job);
      }
    });
    
    const uniqueJobs = Array.from(jobMap.values());
    
    // Log if duplicates were found
    if (jobs.length !== uniqueJobs.length) {
      console.warn(`Duplicate jobs detected: ${jobs.length} total, ${uniqueJobs.length} unique. Removed ${jobs.length - uniqueJobs.length} duplicates`);
    }

    res.json({success: true, jobs: uniqueJobs})
   }
   catch(error) {
    console.error('Get jobs error:', error);
    res.json({success: false, message: error.message})
   }
}


// get single job by id

export const getJobById = async(req, res) => {
    try {
        const {id} = req.params

        const job = await Job.findById(id)
        .populate({
            path: 'companyId',
            select: '-password'
        })

        if(!job) {
            return res.json({
                success: false,
                message: 'Job not found'
            })
        }

        res.json({
            success: true,
            job
        })
    }
    catch(error) {
        res.json({success: false, message: error.message})
    }
}
