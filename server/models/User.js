import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    resume: { type: String, default: '' },
    image: { type: String, default: '' },
    
    // NEW: Parsed resume data fields
    skills: [{ type: String }], // Array of skills extracted from resume
    totalExperience: { type: Number, default: 0 }, // Years of experience
    summary: { type: String, default: '' }, // Professional summary
    
    // Resume parsing metadata
    lastResumeParseDate: { type: Date },
    resumeParseSuccess: { type: Boolean, default: false },
    resumeParseError: { type: String }
}, {
    timestamps: true
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ name: 1 });
userSchema.index({ skills: 1 });
userSchema.index({ totalExperience: -1 });

const User = mongoose.model('User', userSchema);

export default User;