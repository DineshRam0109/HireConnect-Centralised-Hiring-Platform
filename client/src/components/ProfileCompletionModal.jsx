import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { toast } from 'react-toastify';

const ProfileCompletionModal = ({ isOpen, onClose, currentUser }) => {
  const { updateUserProfile } = useContext(AppContext);
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;

    // Validate form
    if (!formData.name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    
    if (!formData.email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateUserProfile({
        name: formData.name.trim(),
        email: formData.email.trim()
      });

      if (result.success) {
        onClose();
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Complete Your Profile
          </h2>
          <p className="text-gray-600">
            Please provide your name and email to continue using the job portal and receive application updates.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your full name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email address"
              required
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  Your email is required to receive job application updates and communications from employers.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 py-2 px-4 rounded-md text-white font-medium ${
                isSubmitting 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? 'Updating...' : 'Save Profile'}
            </button>
            
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-md border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Later
            </button>
          </div>
        </form>

        <p className="text-xs text-gray-500 text-center mt-4">
          * Required fields
        </p>
      </div>
    </div>
  );
};

export default ProfileCompletionModal;