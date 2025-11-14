import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  Filter, 
  SortAsc, 
  CheckSquare, 
  Square, 
  Mail, 
  FileText, 
  Calendar,
  Clock,
  MapPin,
  X,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
  Eye,
  Star,
  Award,
  TrendingUp,
  User
} from 'lucide-react';

const ViewApplications = () => {
  const { backendUrl, companyToken } = useContext(AppContext);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedApplications, setSelectedApplications] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [currentApplication, setCurrentApplication] = useState(null);
  const [filter, setFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [interviewDetails, setInterviewDetails] = useState({
    date: '',
    time: '',
    mode: 'Online',
    location: '',
    additionalInfo: ''
  });

  // Fetch applications
  const fetchCompanyJobApplications = async () => {
    try {
      setLoading(true);
      if (!companyToken) {
        toast.error('Company authentication required');
        return;
      }

      const { data } = await axios.get(`${backendUrl}/api/company/applicants`, {
        headers: { token: companyToken },
      });

      if (data.success) {
        console.log('Fetched applications:', data.applications?.length || 0);
        setApplicants(data.applications || []);
      } else {
        toast.error(data.message || 'Failed to fetch applications');
      }
    } catch (err) {
      console.error('Fetch applications error:', err);
      toast.error('Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyJobApplications();
  }, [companyToken]);

  // Enhanced filtering and sorting
  const filteredAndSortedApplicants = applicants
    .filter(applicant => {
      if (filter === 'All') return true;
      if (filter === 'High Score') return (applicant.resumeScore?.totalScore || applicant.resumeScore?.displayScore) >= 80;
      return applicant.status === filter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return (b.resumeScore?.totalScore || b.resumeScore?.displayScore || 0) - 
                 (a.resumeScore?.totalScore || a.resumeScore?.displayScore || 0);
        case 'experience':
          return (b.userId?.totalExperience || 0) - (a.userId?.totalExperience || 0);
        case 'name':
          return (a.userId?.name || '').localeCompare(b.userId?.name || '');
        case 'date':
        default:
          return new Date(b.date) - new Date(a.date);
      }
    });

  // Get score color styling
  const getScoreColor = (score) => {
    if (!score) return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-gray-300';
    if (score >= 80) return 'bg-gradient-to-r from-green-100 to-emerald-200 text-green-800 border-green-300';
    if (score >= 60) return 'bg-gradient-to-r from-yellow-100 to-amber-200 text-yellow-800 border-yellow-300';
    return 'bg-gradient-to-r from-red-100 to-pink-200 text-red-800 border-red-300';
  };

  // Get status styling
  const getStatusStyle = (status) => {
    switch (status) {
      case 'Accepted':
        return 'bg-gradient-to-r from-green-100 to-emerald-200 text-green-800 border-green-300';
      case 'Rejected':
        return 'bg-gradient-to-r from-red-100 to-pink-200 text-red-800 border-red-300';
      default:
        return 'bg-gradient-to-r from-yellow-100 to-amber-200 text-yellow-800 border-yellow-300';
    }
  };

  // Manual status change (ACCEPT/REJECT only)
  const changeApplicationStatus = async (applicationId, status, feedback = null, customInterviewDetails = null) => {
    if (actionLoading) {
      toast.info('Please wait, processing previous request...');
      return;
    }

    try {
      if (!applicationId) {
        toast.error('Application ID is missing');
        return;
      }

      if (!['Pending', 'Accepted', 'Rejected'].includes(status)) {
        toast.error('Invalid status');
        return;
      }

      console.log(`Manual review: changing status for application ${applicationId} to ${status}`);
      setActionLoading(applicationId);
      
      const requestData = { 
        applicationId, 
        status,
        feedback,
        interviewDetails: customInterviewDetails || (status === 'Accepted' ? interviewDetails : null)
      };

      console.log('Manual review request:', requestData);
      
      const { data } = await axios.post(
        `${backendUrl}/api/company/change-status`,
        requestData,
        { headers: { token: companyToken } }
      );
      
      console.log('Manual review response:', data);
      
      if (data.success) {
        if (data.emailSent) {
          toast.success(`Application ${status.toLowerCase()} and email sent!`);
        } else {
          toast.warning(`Application ${status.toLowerCase()} but email failed: ${data.emailError || 'Unknown error'}`);
        }
        
        // Update local state
        setApplicants(prev => prev.map(app => 
          app._id === applicationId ? { 
            ...app, 
            status: status,
            emailSent: data.emailSent,
            emailSentDate: data.emailSentDate,
            feedback: feedback || app.feedback
          } : app
        ));

        // Close modals
        if (status === 'Accepted') {
          setShowInterviewModal(false);
          setInterviewDetails({ date: '', time: '', mode: 'Online', location: '', additionalInfo: '' });
        }
        if (status === 'Rejected') {
          setShowFeedbackModal(false);
          setFeedbackText('');
        }
        setCurrentApplication(null);
        
      } else {
        toast.error(data.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Manual review error:', err);
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setTimeout(() => setActionLoading(null), 2000);
    }
  };

  // Trigger Auto-Review for specific application
  const triggerAutoReview = async (applicationId, forceReparse = false) => {
    if (actionLoading) {
      toast.info('Please wait, processing previous request...');
      return;
    }

    try {
      console.log(`Triggering auto-review for application: ${applicationId}`);
      setActionLoading(applicationId);

      const { data } = await axios.post(
        `${backendUrl}/api/company/auto-review`,
        { applicationId, forceReparse },
        { headers: { token: companyToken } }
      );

      console.log('Auto-review response:', data);

      if (data.success) {
        toast.success('Auto-review completed successfully');
        // Refresh applications to show updated scores
        await fetchCompanyJobApplications();
      } else {
        toast.error(data.message || 'Auto-review failed');
      }
    } catch (error) {
      console.error('Auto-review error:', error);
      toast.error(error.response?.data?.message || 'Auto-review failed');
    } finally {
      setTimeout(() => setActionLoading(null), 2000);
    }
  };

  // Handle manual accept with interview
  const handleAcceptWithInterview = (application) => {
    if (actionLoading || application.status === 'Accepted') return;
    setCurrentApplication(application);
    setShowInterviewModal(true);
  };

  // Handle manual reject with feedback
  const handleRejectWithFeedback = (application) => {
    if (actionLoading || application.status === 'Rejected') return;
    setCurrentApplication(application);
    setShowFeedbackModal(true);
  };

  // Confirm acceptance with interview details
  const confirmAcceptWithInterview = async () => {
    if (!currentApplication || !interviewDetails.date || !interviewDetails.time || !interviewDetails.mode || !interviewDetails.location) {
      toast.error('Please fill all required interview details');
      return;
    }
    await changeApplicationStatus(currentApplication._id, 'Accepted', null, interviewDetails);
  };

  // Confirm rejection with feedback
  const confirmRejectWithFeedback = async () => {
    if (!currentApplication) return;
    await changeApplicationStatus(currentApplication._id, 'Rejected', feedbackText.trim() || null);
  };

  // Bulk status change
  const handleBulkStatusChange = async (status) => {
    if (selectedApplications.length === 0) {
      toast.error('Please select applications first');
      return;
    }

    if (isBulkLoading) return;

    try {
      console.log(`Bulk ${status} for ${selectedApplications.length} applications`);
      setIsBulkLoading(true);
      
      const { data } = await axios.post(
        `${backendUrl}/api/company/bulk-update-status`,
        { applications: selectedApplications, status },
        { headers: { token: companyToken } }
      );

      if (data.success) {
        toast.success(`Updated ${data.summary.updated}/${data.summary.total} applications`);
        setSelectedApplications([]);
        setBulkAction('');
        await fetchCompanyJobApplications();
      } else {
        toast.error(data.message || 'Bulk update failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Bulk update failed');
    } finally {
      setIsBulkLoading(false);
    }
  };

  // Button disabled states
  const isButtonDisabled = (applicationId, targetStatus, currentStatus) => {
    return (
      currentStatus === targetStatus || 
      actionLoading === applicationId || 
      actionLoading !== null || 
      isBulkLoading
    );
  };

  // Handle checkbox selection
  const handleSelectApplication = (applicationId) => {
    setSelectedApplications(prev => {
      if (prev.includes(applicationId)) {
        return prev.filter(id => id !== applicationId);
      } else {
        return [...prev, applicationId];
      }
    });
  };

  // Select all visible applications
  const handleSelectAll = () => {
    if (selectedApplications.length === filteredAndSortedApplicants.length) {
      setSelectedApplications([]);
    } else {
      setSelectedApplications(filteredAndSortedApplicants.map(app => app._id));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-bold">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">Job Applications</h1>
              <div className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
                  <span>{filteredAndSortedApplicants.length} applications</span>
                </div>
                {selectedApplications.length > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
                    <span>{selectedApplications.length} selected</span>
                  </div>
                )}
              </div>
            </div>
            
            <button
              onClick={fetchCompanyJobApplications}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-white to-gray-50 border-2 border-blue-200 rounded-xl hover:border-blue-300 transition-all shadow-lg hover:shadow-xl font-bold text-blue-700"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter and Sort Section */}
        <div className="bg-gradient-to-r from-white to-blue-50 rounded-2xl shadow-xl border-2 border-blue-100 p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Filter Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-6 h-6 text-blue-600" />
                <h3 className="font-bold text-gray-900 text-lg">Filter Applications</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'All', label: 'All', color: 'from-blue-500 to-cyan-500' },
                  { key: 'Pending', label: 'Pending', color: 'from-yellow-500 to-amber-500' },
                  { key: 'Accepted', label: 'Accepted', color: 'from-green-500 to-emerald-500' },
                  { key: 'Rejected', label: 'Rejected', color: 'from-red-500 to-pink-500' },
                  { key: 'High Score', label: 'High Score', color: 'from-purple-500 to-indigo-500' }
                ].map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-bold transition-all shadow-lg ${
                      filter === key
                        ? `bg-gradient-to-r ${color} text-white border-transparent shadow-xl transform scale-105`
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600 hover:shadow-md'
                    }`}
                  >
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <SortAsc className="w-6 h-6 text-purple-600" />
                <h3 className="font-bold text-gray-900 text-lg">Sort By</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 min-w-[200px] border-2 border-purple-200 rounded-xl px-4 py-2.5 bg-white text-gray-700 font-bold focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all shadow-lg"
                >
                  <option value="date">Application Date</option>
                  <option value="score">Resume Score</option>
                  <option value="experience">Experience</option>
                  <option value="name">Candidate Name</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedApplications.length > 0 && (
          <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl shadow-xl border-2 border-blue-200 p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-xl">
                  <CheckSquare className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Bulk Actions</h3>
                  <p className="text-sm font-semibold text-gray-600">
                    {selectedApplications.length} application{selectedApplications.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3 lg:ml-auto">
                <select 
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="flex-1 min-w-[150px] border-2 border-blue-200 rounded-xl px-4 py-2.5 bg-white text-gray-700 font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-lg"
                  disabled={isBulkLoading}
                >
                  <option value="">Choose action...</option>
                  <option value="Accepted">Accept Selected</option>
                  <option value="Rejected">Reject Selected</option>
                  <option value="Pending">Set as Pending</option>
                </select>
                
                <button
                  onClick={() => handleBulkStatusChange(bulkAction)}
                  disabled={!bulkAction || isBulkLoading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-xl font-bold transform hover:scale-105"
                >
                  {isBulkLoading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckSquare className="w-5 h-5" />
                  )}
                  {isBulkLoading ? 'Processing...' : 'Apply'}
                </button>
                
                <button
                  onClick={() => setSelectedApplications([])}
                  className="px-4 py-2.5 text-gray-600 hover:text-gray-800 font-bold transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Applications Grid/Table */}
        <div className="bg-gradient-to-r from-white to-blue-50 rounded-2xl shadow-xl border-2 border-blue-100 overflow-hidden">
          {filteredAndSortedApplicants.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                <User className="w-12 h-12 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No applications found</h3>
              <p className="text-gray-600 font-semibold mb-4">
                {filter !== 'All' 
                  ? `No applications match the "${filter}" filter.`
                  : 'No job applications have been submitted yet.'
                }
              </p>
              {filter !== 'All' && (
                <button
                  onClick={() => setFilter('All')}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-xl font-bold"
                >
                  View all applications
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="lg:hidden">
                <div className="p-4 border-b-2 border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedApplications.length === filteredAndSortedApplicants.length && filteredAndSortedApplicants.length > 0}
                      onChange={handleSelectAll}
                      disabled={isBulkLoading}
                      className="rounded-xl border-2 border-blue-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-bold text-gray-700">
                      Select all ({selectedApplications.length}/{filteredAndSortedApplicants.length})
                    </span>
                  </div>
                </div>
                
                <div className="divide-y-2 divide-blue-100">
                  {filteredAndSortedApplicants.map((applicant) => (
                    <div key={applicant._id} className="p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all">
                      <div className="flex items-start gap-4">
                        <input
                          type="checkbox"
                          checked={selectedApplications.includes(applicant._id)}
                          onChange={() => handleSelectApplication(applicant._id)}
                          disabled={isBulkLoading}
                          className="mt-1 rounded-xl border-2 border-blue-300 text-blue-600 focus:ring-blue-500"
                        />
                        
                        <div className="flex-1 min-w-0">
                          {/* Candidate Info */}
                          <div className="flex items-start gap-3 mb-3">
                            <img 
                              className="h-14 w-14 rounded-2xl object-cover border-2 border-blue-200 shadow-lg" 
                              src={applicant.userId?.image || '/default-avatar.png'} 
                              alt={applicant.userId?.name} 
                            />
                            <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-gray-900 text-lg truncate">
                                {applicant.userId?.name || 'N/A'}
                              </h3>
                              <p className="text-sm font-semibold text-gray-600 truncate">
                                {applicant.userId?.email || 'N/A'}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border-2 ${getStatusStyle(applicant.status)}`}>
                                  {applicant.status}
                                </span>
                                {applicant.emailSent && (
                                  <Mail className="w-4 h-4 text-green-500" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Job Info */}
                          <div className="mb-3">
                            <p className="font-bold text-gray-900">{applicant.jobId?.title || 'N/A'}</p>
                            <p className="text-sm font-semibold text-gray-600">{applicant.jobId?.location || 'N/A'}</p>
                          </div>

                          {/* Score and Date */}
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              {applicant.resumeScore ? (
                                <div className="flex items-center gap-2">
                                  <div className={`inline-flex items-center px-3 py-1 rounded-xl border-2 text-sm font-bold ${getScoreColor(applicant.resumeScore.displayScore || applicant.resumeScore.totalScore)}`}>
                                    <Star className="w-4 h-4 mr-1" />
                                    {applicant.resumeScore.displayScore || applicant.resumeScore.totalScore || 0}%
                                  </div>
                                  <span className="text-xs font-semibold text-gray-500">
                                    {applicant.resumeScore.decision || 'N/A'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm font-semibold text-gray-400">Not analyzed</span>
                              )}
                            </div>
                            <span className="text-sm font-bold text-gray-500">
                              {new Date(applicant.date).toLocaleDateString()}
                            </span>
                          </div>

                          {/* Skills */}
                          {applicant.resumeScore?.matchedSkills?.length > 0 && (
                            <div className="mb-4">
                              <div className="flex flex-wrap gap-1">
                                {applicant.resumeScore.matchedSkills.slice(0, 3).map((skill, idx) => (
                                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border-2 border-blue-200">
                                    {skill}
                                  </span>
                                ))}
                                {applicant.resumeScore.matchedSkills.length > 3 && (
                                  <span className="text-xs font-semibold text-gray-500 px-2 py-1">
                                    +{applicant.resumeScore.matchedSkills.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => triggerAutoReview(applicant._id)}
                              disabled={actionLoading === applicant._id || actionLoading !== null || isBulkLoading}
                              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
                                actionLoading === applicant._id
                                  ? 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-400 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 hover:from-purple-200 hover:to-indigo-200 border-2 border-purple-200 hover:shadow-xl'
                              }`}
                            >
                              <RefreshCw className="w-4 h-4" />
                              {actionLoading === applicant._id ? 'Reviewing...' : 'Auto-Review'}
                            </button>
                            
                            <button
                              onClick={() => handleAcceptWithInterview(applicant)}
                              disabled={isButtonDisabled(applicant._id, 'Accepted', applicant.status)}
                              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
                                applicant.status === 'Accepted'
                                  ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-600 cursor-default border-2 border-green-200'
                                  : actionLoading === applicant._id || actionLoading !== null || isBulkLoading
                                  ? 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-400 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 hover:from-green-200 hover:to-emerald-200 border-2 border-green-200 hover:shadow-xl'
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Accept
                            </button>
                            
                            <button
                              onClick={() => handleRejectWithFeedback(applicant)}
                              disabled={isButtonDisabled(applicant._id, 'Rejected', applicant.status)}
                              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
                                applicant.status === 'Rejected'
                                  ? 'bg-gradient-to-r from-red-100 to-pink-100 text-red-600 cursor-default border-2 border-red-200'
                                  : actionLoading === applicant._id || actionLoading !== null || isBulkLoading
                                  ? 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-400 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-red-100 to-pink-100 text-red-700 hover:from-red-200 hover:to-pink-200 border-2 border-red-200 hover:shadow-xl'
                              }`}
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </button>

                            {applicant.userId?.resume && (
                              <button
                                onClick={() => window.open(applicant.userId.resume, '_blank')}
                                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 hover:from-blue-200 hover:to-cyan-200 border-2 border-blue-200 transition-all shadow-lg hover:shadow-xl"
                              >
                                <Eye className="w-4 h-4" />
                                Resume
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop View */}
              <div className="hidden lg:block">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-100">
                      <tr>
                        <th className="px-6 py-4 text-left">
                          <input
                            type="checkbox"
                            checked={selectedApplications.length === filteredAndSortedApplicants.length && filteredAndSortedApplicants.length > 0}
                            onChange={handleSelectAll}
                            disabled={isBulkLoading}
                            className="rounded-xl border-2 border-blue-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">
                          Candidate
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">
                          Job Details
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">
                          Score
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">
                          Applied
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y-2 divide-blue-100">
                      {filteredAndSortedApplicants.map((applicant) => (
                        <tr key={applicant._id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedApplications.includes(applicant._id)}
                              onChange={() => handleSelectApplication(applicant._id)}
                              disabled={isBulkLoading}
                              className="rounded-xl border-2 border-blue-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <img 
                                className="h-12 w-12 rounded-2xl object-cover border-2 border-blue-200 shadow-lg" 
                                src={applicant.userId?.image || '/default-avatar.png'} 
                                alt={applicant.userId?.name} 
                              />
                              <div className="ml-4">
                                <div className="text-sm font-bold text-gray-900">
                                  {applicant.userId?.name || 'N/A'}
                                </div>
                                <div className="text-sm font-semibold text-gray-500">
                                  {applicant.userId?.email || 'N/A'}
                                </div>
                                {applicant.resumeScore?.matchedSkills?.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {applicant.resumeScore.matchedSkills.slice(0, 2).map((skill, idx) => (
                                      <span key={idx} className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border-2 border-blue-200">
                                        {skill}
                                      </span>
                                    ))}
                                    {applicant.resumeScore.matchedSkills.length > 2 && (
                                      <span className="text-xs font-semibold text-gray-500">+{applicant.resumeScore.matchedSkills.length - 2} more</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900">{applicant.jobId?.title || 'N/A'}</div>
                            <div className="text-sm font-semibold text-gray-500">{applicant.jobId?.location || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {applicant.resumeScore ? (
                              <div className="space-y-1">
                                <div className={`inline-flex items-center px-3 py-2 rounded-xl border-2 text-sm font-bold ${getScoreColor(applicant.resumeScore.displayScore || applicant.resumeScore.totalScore)}`}>
                                  <Star className="w-4 h-4 mr-1" />
                                  {applicant.resumeScore.displayScore || applicant.resumeScore.totalScore || 0}%
                                </div>
                                <div className="text-xs font-semibold text-gray-500">
                                  {applicant.resumeScore.decision || 'N/A'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm font-semibold text-gray-400">Not analyzed</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                            {new Date(applicant.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-3 py-2 rounded-full text-xs font-bold border-2 ${getStatusStyle(applicant.status)}`}>
                                {applicant.status}
                              </span>
                              {applicant.emailSent && (
                                <Mail className="w-5 h-5 text-green-500" title="Email sent" />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => triggerAutoReview(applicant._id)}
                                disabled={actionLoading === applicant._id || actionLoading !== null || isBulkLoading}
                                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
                                  actionLoading === applicant._id
                                    ? 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 hover:from-purple-200 hover:to-indigo-200 border-2 border-purple-200 hover:shadow-xl'
                                }`}
                                title="Trigger AI-powered auto-review"
                              >
                                <RefreshCw className="w-4 h-4" />
                                {actionLoading === applicant._id ? 'Reviewing...' : 'Auto-Review'}
                              </button>
                              
                              <button
                                onClick={() => handleAcceptWithInterview(applicant)}
                                disabled={isButtonDisabled(applicant._id, 'Accepted', applicant.status)}
                                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
                                  applicant.status === 'Accepted'
                                    ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-600 cursor-default border-2 border-green-200'
                                    : actionLoading === applicant._id || actionLoading !== null || isBulkLoading
                                    ? 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 hover:from-green-200 hover:to-emerald-200 border-2 border-green-200 hover:shadow-xl'
                                }`}
                                title="Manual accept with interview details"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                Accept
                              </button>
                              
                              <button
                                onClick={() => handleRejectWithFeedback(applicant)}
                                disabled={isButtonDisabled(applicant._id, 'Rejected', applicant.status)}
                                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
                                  applicant.status === 'Rejected'
                                    ? 'bg-gradient-to-r from-red-100 to-pink-100 text-red-600 cursor-default border-2 border-red-200'
                                    : actionLoading === applicant._id || actionLoading !== null || isBulkLoading
                                    ? 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-red-100 to-pink-100 text-red-700 hover:from-red-200 hover:to-pink-200 border-2 border-red-200 hover:shadow-xl'
                                }`}
                                title="Manual reject with feedback"
                              >
                                <XCircle className="w-4 h-4" />
                                Reject
                              </button>

                              {applicant.userId?.resume && (
                                <button
                                  onClick={() => window.open(applicant.userId.resume, '_blank')}
                                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 hover:from-blue-200 hover:to-cyan-200 border-2 border-blue-200 transition-all shadow-lg hover:shadow-xl"
                                  title="View resume"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Interview Modal */}
        {showInterviewModal && currentApplication && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-r from-white to-blue-50 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border-2 border-blue-200">
              <div className="p-6 border-b-2 border-blue-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">
                    Schedule Interview
                  </h3>
                  <button
                    onClick={() => {
                      setShowInterviewModal(false);
                      setInterviewDetails({ date: '', time: '', mode: 'Online', location: '', additionalInfo: '' });
                      setCurrentApplication(null);
                    }}
                    className="p-2 hover:bg-blue-100 rounded-xl transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <p className="text-sm font-semibold text-gray-600 mt-1">
                  {currentApplication.userId.name} - {currentApplication.jobId?.title}
                </p>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Interview Date *
                  </label>
                  <input
                    type="date"
                    value={interviewDetails.date}
                    onChange={(e) => setInterviewDetails(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full border-2 border-blue-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-lg"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Interview Time *
                  </label>
                  <input
                    type="time"
                    value={interviewDetails.time}
                    onChange={(e) => setInterviewDetails(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full border-2 border-blue-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Interview Mode *
                  </label>
                  <select
                    value={interviewDetails.mode}
                    onChange={(e) => setInterviewDetails(prev => ({ ...prev, mode: e.target.value }))}
                    className="w-full border-2 border-blue-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-lg"
                  >
                    <option value="Online">Online</option>
                    <option value="In-person">In-person</option>
                    <option value="Phone">Phone</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {interviewDetails.mode === 'Online' ? 'Meeting Link *' : 'Location *'}
                  </label>
                  <input
                    type="text"
                    value={interviewDetails.location}
                    onChange={(e) => setInterviewDetails(prev => ({ ...prev, location: e.target.value }))}
                    placeholder={interviewDetails.mode === 'Online' ? 'https://meet.google.com/...' : 'Office address...'}
                    className="w-full border-2 border-blue-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Additional Information
                  </label>
                  <textarea
                    value={interviewDetails.additionalInfo}
                    onChange={(e) => setInterviewDetails(prev => ({ ...prev, additionalInfo: e.target.value }))}
                    placeholder="Any special instructions, agenda, or notes for the candidate..."
                    rows="3"
                    className="w-full border-2 border-blue-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-lg resize-none"
                  />
                </div>
              </div>

              <div className="p-6 border-t-2 border-blue-100 flex gap-3">
                <button
                  onClick={() => {
                    setShowInterviewModal(false);
                    setInterviewDetails({ date: '', time: '', mode: 'Online', location: '', additionalInfo: '' });
                    setCurrentApplication(null);
                  }}
                  className="flex-1 px-4 py-2.5 border-2 border-blue-200 text-gray-700 rounded-xl hover:bg-blue-50 transition-all font-bold shadow-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAcceptWithInterview}
                  disabled={!interviewDetails.date || !interviewDetails.time || !interviewDetails.location || actionLoading}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all font-bold shadow-xl"
                >
                  {actionLoading ? 'Scheduling...' : 'Schedule Interview'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Modal */}
        {showFeedbackModal && currentApplication && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-r from-white to-red-50 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border-2 border-red-200">
              <div className="p-6 border-b-2 border-red-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">
                    Reject Application
                  </h3>
                  <button
                    onClick={() => {
                      setShowFeedbackModal(false);
                      setFeedbackText('');
                      setCurrentApplication(null);
                    }}
                    className="p-2 hover:bg-red-100 rounded-xl transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <p className="text-sm font-semibold text-gray-600 mt-1">
                  {currentApplication.userId.name} - {currentApplication.jobId?.title}
                </p>
              </div>
              
              <div className="p-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Feedback (Optional)
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Provide constructive feedback to help the candidate improve..."
                  rows="4"
                  className="w-full border-2 border-red-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all shadow-lg resize-none"
                />
                <p className="text-xs font-semibold text-gray-500 mt-2">
                  This feedback will be included in the rejection email sent to the candidate.
                </p>
              </div>

              <div className="p-6 border-t-2 border-red-100 flex gap-3">
                <button
                  onClick={() => {
                    setShowFeedbackModal(false);
                    setFeedbackText('');
                    setCurrentApplication(null);
                  }}
                  className="flex-1 px-4 py-2.5 border-2 border-red-200 text-gray-700 rounded-xl hover:bg-red-50 transition-all font-bold shadow-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRejectWithFeedback}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all font-bold shadow-xl"
                >
                  {actionLoading ? 'Rejecting...' : 'Reject Application'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewApplications;