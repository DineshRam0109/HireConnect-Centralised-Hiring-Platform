import React, { useState, useEffect, useContext } from 'react';
import { 
  FileText, Download, Calendar, Settings, Filter, 
  BarChart3, PieChart, TrendingUp, Users, Briefcase,
  Mail, Clock, CheckCircle, X, Plus, Trash2, Edit, AlertCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { AppContext } from '../context/AppContext';

const AdvancedReportingDashboard = () => {
  const { backendUrl, companyToken } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('builder');
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [reportName, setReportName] = useState('');
  const [loading, setLoading] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState({
    frequency: 'weekly',
    day: 'monday',
    time: '09:00',
    recipients: ''
  });
  const [savedReports, setSavedReports] = useState([]);
  const [reportHistory, setReportHistory] = useState([]);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [whiteLabelSettings, setWhiteLabelSettings] = useState({
    companyLogo: '',
    primaryColor: '#2196F3',
    secondaryColor: '#1976D2',
    headerText: 'Recruitment Analytics Report',
    footerText: 'Confidential - Internal Use Only',
    showCompanyLogo: true,
    showGeneratedDate: true
  });

        const availableMetrics = [
    { id: 'applications', name: 'Total Applications', icon: FileText, category: 'volume', description: 'Total number of applications received' },
    { id: 'accepted', name: 'Accepted Candidates', icon: CheckCircle, category: 'status', description: 'Number of accepted applications' },
    { id: 'rejected', name: 'Rejected Candidates', icon: X, category: 'status', description: 'Number of rejected applications' },
    { id: 'pending', name: 'Pending Reviews', icon: Clock, category: 'status', description: 'Applications awaiting review' },
    { id: 'avgScore', name: 'Average Resume Score', icon: BarChart3, category: 'quality', description: 'Mean score across all applications' },
    { id: 'topCandidates', name: 'Top 10 Candidates', icon: Users, category: 'quality', description: 'Highest scoring applicants' },
    { id: 'jobPerformance', name: 'Job Performance', icon: Briefcase, category: 'jobs', description: 'Analytics by job posting' },
    { id: 'locationBreakdown', name: 'Location Distribution', icon: TrendingUp, category: 'demographics', description: 'Applications by location' },
    { id: 'categoryStats', name: 'Category Statistics', icon: PieChart, category: 'demographics', description: 'Applications by job category' },
    { id: 'timeToHire', name: 'Time to Hire', icon: Calendar, category: 'efficiency', description: 'Average days from application to hire' },
    { id: 'conversionRate', name: 'Conversion Rate', icon: TrendingUp, category: 'efficiency', description: 'Application to hire ratio' },
    { id: 'skillsAnalysis', name: 'Skills Analysis', icon: BarChart3, category: 'quality', description: 'Most common candidate skills' },
    { id: 'experienceLevel', name: 'Experience Level', icon: Users, category: 'demographics', description: 'Distribution by experience level' },
    { id: 'applicationTrends', name: 'Application Trends', icon: Calendar, category: 'volume', description: 'Applications over time' },
  ];
  useEffect(() => {
    if (companyToken) {
      fetchScheduledReports();
      fetchReportHistory();
      fetchWhiteLabelSettings();
    }
  }, [companyToken]);

  const fetchScheduledReports = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/reports/scheduled`, {
        headers: { token: companyToken }
      });
      if (response.data.success) {
        setSavedReports(response.data.schedules);
      }
    } catch (error) {
      console.error('Failed to fetch scheduled reports:', error);
    }
  };

  const fetchReportHistory = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/reports/history`, {
        headers: { token: companyToken }
      });
      if (response.data.success) {
        setReportHistory(response.data.reports);
      }
    } catch (error) {
      console.error('Failed to fetch report history:', error);
    }
  };

  const fetchWhiteLabelSettings = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/reports/white-label`, {
        headers: { token: companyToken }
      });
      if (response.data.success && response.data.settings) {
        setWhiteLabelSettings(prev => ({ ...prev, ...response.data.settings }));
      }
    } catch (error) {
      console.error('Failed to fetch white label settings:', error);
    }
  };

  const toggleMetric = (metricId) => {
    setSelectedMetrics(prev => 
      prev.includes(metricId) 
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  };

  const generateReport = async () => {
    if (selectedMetrics.length === 0) {
      toast.error('Please select at least one metric');
      return;
    }

    setLoading(true);
    try {
      const reportData = {
        name: reportName || `Report_${new Date().toISOString().split('T')[0]}`,
        metrics: selectedMetrics,
        dateRange,
        format: exportFormat,
        whiteLabelSettings
      };

      const response = await axios.post(
        `${backendUrl}/api/reports/generate`,
        reportData,
        {
          headers: { token: companyToken }
        }
      );

      if (response.data.success) {
        toast.success('Report generated successfully!');
        
        // Download the file
        if (response.data.downloadUrl) {
          window.open(`${backendUrl}${response.data.downloadUrl}`, '_blank');
        }
        
        fetchReportHistory();
        
        // Reset form
        setReportName('');
        setSelectedMetrics([]);
        setDateRange({ start: '', end: '' });
      } else {
        toast.error(response.data.message || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Generate report error:', error);
      toast.error(error.response?.data?.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const scheduleReport = async () => {
    if (selectedMetrics.length === 0) {
      toast.error('Please select at least one metric');
      return;
    }

    if (!reportName.trim()) {
      toast.error('Please enter a report name');
      return;
    }

    setLoading(true);
    try {
      const recipients = scheduleConfig.recipients
        .split(',')
        .map(email => email.trim())
        .filter(email => email);

      const scheduleData = {
        name: reportName,
        metrics: selectedMetrics,
        dateRange,
        frequency: scheduleConfig.frequency,
        time: scheduleConfig.time,
        day: scheduleConfig.day,
        recipients,
        format: exportFormat
      };

      const response = await axios.post(
        `${backendUrl}/api/reports/schedule`,
        scheduleData,
        {
          headers: { token: companyToken }
        }
      );

      if (response.data.success) {
        toast.success(`Report scheduled: ${scheduleConfig.frequency} at ${scheduleConfig.time}`);
        fetchScheduledReports();
        setActiveTab('scheduled');
      } else {
        toast.error(response.data.message || 'Failed to schedule report');
      }
    } catch (error) {
      console.error('Schedule report error:', error);
      toast.error(error.response?.data?.message || 'Failed to schedule report');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (reportType, format) => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${backendUrl}/api/reports/export`,
        { reportType, format },
        {
          headers: { token: companyToken }
        }
      );

      if (response.data.success && response.data.downloadUrl) {
        toast.success(`Downloading ${format.toUpperCase()} report...`);
        window.open(`${backendUrl}${response.data.downloadUrl}`, '_blank');
        fetchReportHistory();
      } else {
        toast.error('Failed to export report');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error.response?.data?.message || 'Failed to export report');
    } finally {
      setLoading(false);
    }
  };

  const deleteScheduledReport = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to delete this scheduled report?')) {
      return;
    }

    try {
      const response = await axios.delete(
        `${backendUrl}/api/reports/schedule/${scheduleId}`,
        {
          headers: { token: companyToken }
        }
      );

      if (response.data.success) {
        toast.success('Schedule deleted successfully');
        fetchScheduledReports();
      }
    } catch (error) {
      console.error('Delete schedule error:', error);
      toast.error('Failed to delete schedule');
    }
  };

  const saveWhiteLabelSettings = async () => {
    setLoading(true);
    try {
      const response = await axios.put(
        `${backendUrl}/api/reports/white-label`,
        whiteLabelSettings,
        {
          headers: { token: companyToken }
        }
      );

      if (response.data.success) {
        toast.success('Branding settings saved successfully');
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Save white label settings error:', error);
      toast.error('Failed to save branding settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
         {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
            Advanced Reporting
          </h1>
          <p className="text-gray-400">Create custom reports, schedule automated delivery, and export data</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 mb-6 bg-gray-800 p-1 rounded-lg overflow-x-auto">
          {[
            { id: 'builder', label: 'Report Builder', icon: Settings },
            { id: 'scheduled', label: 'Scheduled Reports', icon: Calendar },
            { id: 'export', label: 'Export & Download', icon: Download },
            { id: 'branding', label: 'White Label', icon: Edit }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Report Builder Tab */}
        {activeTab === 'builder' && (
          <div className="space-y-6">
            {/* Report Name */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <label className="block text-sm font-medium text-gray-300 mb-2">Report Name</label>
              <input
                type="text"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="e.g., Monthly Recruitment Report"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Date Range */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-blue-400" />
                Date Range
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">End Date</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Metric Selection */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Filter className="w-5 h-5 mr-2 text-blue-400" />
                Select Metrics ({selectedMetrics.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableMetrics.map(metric => (
                  <button
                    key={metric.id}
                    onClick={() => toggleMetric(metric.id)}
                    className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all ${
                      selectedMetrics.includes(metric.id)
                        ? 'border-blue-500 bg-blue-500/20 text-white'
                        : 'border-gray-600 bg-gray-900 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <metric.icon className="w-5 h-5" />
                    <div className="text-left flex-1">
                      <div className="font-medium">{metric.name}</div>
                      <div className="text-xs opacity-60 capitalize">{metric.category}</div>
                    </div>
                    {selectedMetrics.includes(metric.id) && (
                      <CheckCircle className="w-5 h-5 text-blue-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Export Format */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Export Format</h3>
              <div className="flex space-x-4">
                {['pdf', 'excel', 'csv'].map(format => (
                  <button
                    key={format}
                    onClick={() => setExportFormat(format)}
                    className={`px-6 py-3 rounded-lg font-medium transition-all ${
                      exportFormat === format
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4">
              <button
                onClick={generateReport}
                disabled={selectedMetrics.length === 0 || loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>Generate Report</span>
                  </>
                )}
              </button>
              <button
                onClick={scheduleReport}
                disabled={selectedMetrics.length === 0 || loading || !reportName.trim()}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2"
              >
                <Calendar className="w-5 h-5" />
                <span>Schedule Report</span>
              </button>
            </div>
          </div>
        )}

        {/* Scheduled Reports Tab */}
        {activeTab === 'scheduled' && (
          <div className="space-y-6">
            {/* Schedule Configuration */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Schedule Configuration</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Frequency</label>
                    <select
                      value={scheduleConfig.frequency}
                      onChange={(e) => setScheduleConfig(prev => ({ ...prev, frequency: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  
                  {scheduleConfig.frequency === 'weekly' && (
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Day</label>
                      <select
                        value={scheduleConfig.day}
                        onChange={(e) => setScheduleConfig(prev => ({ ...prev, day: e.target.value }))}
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="monday">Monday</option>
                        <option value="tuesday">Tuesday</option>
                        <option value="wednesday">Wednesday</option>
                        <option value="thursday">Thursday</option>
                        <option value="friday">Friday</option>
                      </select>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Time</label>
                    <input
                      type="time"
                      value={scheduleConfig.time}
                      onChange={(e) => setScheduleConfig(prev => ({ ...prev, time: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Email Recipients (comma-separated)</label>
                  <input
                    type="text"
                    value={scheduleConfig.recipients}
                    onChange={(e) => setScheduleConfig(prev => ({ ...prev, recipients: e.target.value }))}
                    placeholder="email1@company.com, email2@company.com"
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Saved Scheduled Reports */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Active Schedules ({savedReports.length})</h3>
              {savedReports.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No scheduled reports yet</p>
                  <p className="text-sm mt-2">Create a report and click "Schedule Report" to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedReports.map(report => (
                    <div key={report._id} className="bg-gray-900 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-white">{report.name}</h4>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-400">
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {report.frequency}
                          </span>
                          {report.lastRun && (
                            <span className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              Last: {new Date(report.lastRun).toLocaleDateString()}
                            </span>
                          )}
                          <span className="flex items-center">
                            <FileText className="w-4 h-4 mr-1" />
                            {report.format?.toUpperCase() || 'PDF'}
                          </span>
                          {report.recipients?.length > 0 && (
                            <span className="flex items-center">
                              <Mail className="w-4 h-4 mr-1" />
                              {report.recipients.length} recipients
                            </span>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteScheduledReport(report._id)}
                        className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-all ml-4"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Export</h3>
              <p className="text-gray-400 mb-6">Download pre-configured reports instantly</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { type: 'all', name: 'All Applications', format: 'excel', icon: FileText },
                  { type: 'candidates', name: 'Candidate Summary', format: 'pdf', icon: Users },
                  { type: 'jobs', name: 'Job Performance', format: 'csv', icon: Briefcase }
                ].map(preset => (
                  <button
                    key={preset.type}
                    onClick={() => exportReport(preset.type, preset.format)}
                    disabled={loading}
                    className="bg-gray-900 hover:bg-gray-700 border border-gray-600 rounded-lg p-6 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <preset.icon className="w-12 h-12 mx-auto mb-3 text-blue-400 group-hover:scale-110 transition-transform" />
                    <h4 className="font-semibold text-white mb-1">{preset.name}</h4>
                    <p className="text-sm text-gray-400">{preset.format.toUpperCase()} Format</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Exports - Update this section */}
<div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
  <h3 className="text-lg font-semibold text-white mb-4">Recent Exports</h3>
  {reportHistory.length === 0 ? (
    <div className="text-center py-8 text-gray-400">
      <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
      <p>No reports generated yet</p>
    </div>
  ) : (
    <div className="space-y-3">
      {reportHistory.slice(0, 10).map((file) => {
        // Extract filename from downloadUrl or generate from report data
        const filename = file.downloadUrl 
          ? file.downloadUrl.split('/').pop() 
          : `${file.name.replace(/\s+/g, '_')}.${file.format}`;
        
        return (
          <div key={file._id} className="bg-gray-900 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-blue-400" />
              <div>
                <h4 className="font-medium text-white">{file.name}</h4>
                <p className="text-sm text-gray-400">
                  {new Date(file.generatedAt).toLocaleDateString()} • {file.format?.toUpperCase()}
                </p>
              </div>
            </div>
            
            <a
              href={`${backendUrl}/api/reports/download/${filename}`}
              download
              className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all"
            >
              <Download className="w-5 h-5 text-white" />
            </a>
          </div>
        );
      })}
    </div>
  )}
</div>
          </div>
        )}

        {/* White Label Tab */}
        {activeTab === 'branding' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Brand Customization</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Company Logo URL</label>
                  <input
                    type="text"
                    value={whiteLabelSettings.companyLogo}
                    onChange={(e) => setWhiteLabelSettings(prev => ({ ...prev, companyLogo: e.target.value }))}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Primary Brand Color</label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="color"
                        value={whiteLabelSettings.primaryColor}
                        onChange={(e) => setWhiteLabelSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="w-16 h-10 rounded-lg cursor-pointer border-2 border-gray-600"
                      />
                      <input
                        type="text"
                        value={whiteLabelSettings.primaryColor}
                        onChange={(e) => setWhiteLabelSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="flex-1 px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Secondary Brand Color</label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="color"
                        value={whiteLabelSettings.secondaryColor}
                        onChange={(e) => setWhiteLabelSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                        className="w-16 h-10 rounded-lg cursor-pointer border-2 border-gray-600"
                      />
                      <input
                        type="text"
                        value={whiteLabelSettings.secondaryColor}
                        onChange={(e) => setWhiteLabelSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                        className="flex-1 px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Report Header Text</label>
                  <input
                    type="text"
                    value={whiteLabelSettings.headerText}
                    onChange={(e) => setWhiteLabelSettings(prev => ({ ...prev, headerText: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Report Footer Text</label>
                  <input
                    type="text"
                    value={whiteLabelSettings.footerText}
                    onChange={(e) => setWhiteLabelSettings(prev => ({ ...prev, footerText: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whiteLabelSettings.showCompanyLogo}
                      onChange={(e) => setWhiteLabelSettings(prev => ({ ...prev, showCompanyLogo: e.target.checked }))}
                      className="w-5 h-5 bg-gray-900 border-gray-600 rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-gray-300">Show Company Logo</span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whiteLabelSettings.showGeneratedDate}
                      onChange={(e) => setWhiteLabelSettings(prev => ({ ...prev, showGeneratedDate: e.target.checked }))}
                      className="w-5 h-5 bg-gray-900 border-gray-600 rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-gray-300">Show Generated Date</span>
                  </label>
                </div>

                <button 
                  onClick={saveWhiteLabelSettings}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Save Branding Settings</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Report Preview</h3>
              <div className="bg-white rounded-lg p-8 shadow-lg" style={{ borderTop: `4px solid ${whiteLabelSettings.primaryColor}` }}>
                <div className="text-center mb-6">
                  {whiteLabelSettings.showCompanyLogo && whiteLabelSettings.companyLogo && (
                    <img 
                      src={whiteLabelSettings.companyLogo} 
                      alt="Company Logo" 
                      className="h-12 mx-auto mb-4"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  )}
                  <h2 className="text-2xl font-bold text-gray-800" style={{ color: whiteLabelSettings.primaryColor }}>
                    {whiteLabelSettings.headerText}
                  </h2>
                  {whiteLabelSettings.showGeneratedDate && (
                    <p className="text-sm text-gray-500 mt-2">
                      Generated on {new Date().toLocaleDateString()}
                    </p>
                  )}
                </div>
                
                <div className="my-6 border-t border-gray-200 pt-6">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-2xl font-bold" style={{ color: whiteLabelSettings.primaryColor }}>
                        142
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Total Applications</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-2xl font-bold" style={{ color: whiteLabelSettings.secondaryColor }}>
                        68%
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Avg Score</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-600">
                        23
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Accepted</div>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4 mt-8">
                  <p className="text-sm text-gray-500 text-center">{whiteLabelSettings.footerText}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedReportingDashboard;