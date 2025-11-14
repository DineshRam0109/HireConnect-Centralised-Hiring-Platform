import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ComposedChart
} from 'recharts';
import { 
  Users, Briefcase, TrendingUp, Star, Calendar, Award,
  MapPin, DollarSign, BarChart3, Activity, UserCheck, XCircle
} from 'lucide-react';

const EmployerDashboard = () => {
  const { backendUrl, companyToken, companyData } = useContext(AppContext);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('30');
  const [analytics, setAnalytics] = useState(null);

  const COLORS = ['#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'];

  useEffect(() => {
    if (companyToken) {
      fetchDashboardData();
    }
  }, [companyToken, timeFilter]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [jobsResponse, applicationsResponse] = await Promise.all([
        fetch(`${backendUrl}/api/company/list-jobs`, {
          headers: { token: companyToken }
        }),
        fetch(`${backendUrl}/api/company/applicants`, {
          headers: { token: companyToken }
        })
      ]);

      const jobsData = await jobsResponse.json();
      const applicationsData = await applicationsResponse.json();

      if (jobsData.success && applicationsData.success) {
        const jobsList = jobsData.jobsData || [];
        const applicationsList = applicationsData.applications || [];
        
        setJobs(jobsList);
        setApplications(applicationsList);
        processAnalytics(jobsList, applicationsList);
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const processAnalytics = (jobsList, applicationsList) => {
    const now = new Date();
    const daysAgo = parseInt(timeFilter);
    const filterDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
    
    const filteredApps = applicationsList.filter(app => 
      new Date(app.submittedAt || app.date) >= filterDate
    );

    const summary = calculateSummaryStats(jobsList, applicationsList, filteredApps);
    const charts = generateChartData(jobsList, applicationsList, filteredApps, daysAgo);
    
    setAnalytics({ summary, charts });
  };

  const calculateSummaryStats = (jobsList, applicationsList, filteredApps) => {
    const totalApplications = applicationsList.length;
    const accepted = applicationsList.filter(app => app.status === 'Accepted').length;
    const pending = applicationsList.filter(app => app.status === 'Pending').length;
    const rejected = applicationsList.filter(app => app.status === 'Rejected').length;
    const pending12Months = applicationsList.filter(app => app.status === 'Pending').length;
    
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const last12MonthsApps = applicationsList.filter(app => 
      new Date(app.submittedAt || app.date) >= twelveMonthsAgo
    );
    
    const accepted12Months = last12MonthsApps.filter(app => app.status === 'Accepted').length;
    const rejected12Months = last12MonthsApps.filter(app => app.status === 'Rejected').length;

    return {
      totalJobs: jobsList.length,
      activeJobs: jobsList.filter(job => job.visible).length,
      totalApplications,
      acceptedApplications: accepted,
      pendingApplications: pending,
      rejectedApplications: rejected,
      applications12Months: last12MonthsApps.length,
      selected12Months: accepted12Months,
      rejected12Months: rejected12Months,
      pending12Months: pending12Months
    };
  };

  const generateChartData = (jobsList, applicationsList, filteredApps, daysAgo) => {
    return {
      applicationStatus: generateApplicationStatus(applicationsList),
      resumeScoreDistribution: generateResumeScoreDistribution(applicationsList),
      dailyApplications: generateDailyApplications(filteredApps, daysAgo),
      topCandidates: generateTopCandidates(applicationsList),
      jobRoleStats: generateJobRoleStats(jobsList, applicationsList),
      locationDistribution: generateLocationDistribution(jobsList, applicationsList),
      topSalaries: generateTopSalaries(jobsList),
      monthlyTrends: generateMonthlyTrends(applicationsList)
    };
  };

  const generateApplicationStatus = (applicationsList) => {
    const statusCounts = {
      Pending: applicationsList.filter(app => app.status === 'Pending').length,
      Accepted: applicationsList.filter(app => app.status === 'Accepted').length,
      Rejected: applicationsList.filter(app => app.status === 'Rejected').length,
      'Manual Review': applicationsList.filter(app => app.reviewStatus === 'MANUAL_REVIEW').length
    };

    return Object.entries(statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({
        name,
        value,
        percentage: applicationsList.length > 0 ? Math.round((value / applicationsList.length) * 100) : 0
      }));
  };

  const generateResumeScoreDistribution = (applicationsList) => {
    const ranges = [
      { range: '90-100', min: 90, max: 100 },
      { range: '80-89', min: 80, max: 89 },
      { range: '70-79', min: 70, max: 79 },
      { range: '60-69', min: 60, max: 69 },
      { range: 'Below 60', min: 0, max: 59 }
    ];

    return ranges.map(range => {
      const count = applicationsList.filter(app => {
        const score = app.resumeScore?.displayScore || app.resumeScore?.totalScore;
        return score >= range.min && score <= range.max;
      }).length;

      return {
        range: range.range,
        count,
        percentage: applicationsList.length > 0 ? Math.round((count / applicationsList.length) * 100) : 0
      };
    });
  };

  const generateDailyApplications = (filteredApps, daysAgo) => {
  const trends = [];
  for (let i = daysAgo - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const dayApps = filteredApps.filter(app => {
      const appDate = new Date(app.submittedAt || app.date);
      return appDate.toDateString() === date.toDateString();
    });

    trends.push({
      date: dateStr,
      applications: dayApps.length,
      accepted: dayApps.filter(app => app.status === 'Accepted').length,
      rejected: dayApps.filter(app => app.status === 'Rejected').length,
      pending: dayApps.filter(app => app.status === 'Pending').length
    });
  }
  return trends;
};

  const generateTopCandidates = (applicationsList) => {
    const candidatesWithScores = applicationsList
      .filter(app => {
        const hasScore = app.resumeScore?.displayScore || app.resumeScore?.totalScore;
        const hasName = app.userId?.name || app.name || app.candidateName || app.userId?.email;
        return hasScore && hasName;
      })
      .map(app => ({
        name: app.userId?.name || app.name || app.candidateName || 'Unknown',
        email: app.userId?.email || app.email || app.candidateEmail || 'No email',
        score: app.resumeScore.displayScore || app.resumeScore.totalScore,
        status: app.status || 'Pending',
        appliedDate: new Date(app.submittedAt || app.date).toLocaleDateString(),
        job: app.jobId?.title || 'Unknown Job'
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return candidatesWithScores;
  };

  const generateJobRoleStats = (jobsList, applicationsList) => {
    return jobsList.map(job => {
      const jobApps = applicationsList.filter(app => app.jobId && app.jobId._id === job._id);
      const accepted = jobApps.filter(app => app.status === 'Accepted').length;
      const rejected = jobApps.filter(app => app.status === 'Rejected').length;
      const pending = jobApps.filter(app => app.status === 'Pending').length;
      
      return {
        jobRole: job.title.length > 20 ? job.title.substring(0, 20) + '...' : job.title,
        totalApplicants: jobApps.length,
        accepted,
        rejected,
        pending,
        category: job.category || 'Other',
        level: job.level || 'Not specified'
      };
    })
    .filter(job => job.totalApplicants > 0)
    .sort((a, b) => b.totalApplicants - a.totalApplicants)
    .slice(0, 10);
  };

 const generateLocationDistribution = (jobsList, applicationsList) => {
  const locationData = {};
  
  applicationsList.forEach(app => {
    const location = app.jobId?.location || 'Unknown';
    if (!locationData[location]) {
      locationData[location] = {
        location,
        count: 0,
        accepted: 0,
        rejected: 0
      };
    }
    
    locationData[location].count++;
    if (app.status === 'Accepted') locationData[location].accepted++;
    if (app.status === 'Rejected') locationData[location].rejected++;
  });

  return Object.values(locationData)
    .map(item => ({
      ...item,
      percentage: applicationsList.length > 0 ? Math.round((item.count / applicationsList.length) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
};
  const generateTopSalaries = (jobsList) => {
    return jobsList
      .filter(job => job.salary && job.salary !== 'Not specified')
      .map(job => {
        const salaryMatch = job.salary.toString().match(/\d+/);
        const salaryValue = salaryMatch ? parseInt(salaryMatch[0]) : 0;
        
        return {
          jobTitle: job.title.length > 20 ? job.title.substring(0, 20) + '...' : job.title,
          salary: job.salary,
          salaryValue,
          location: job.location || 'Unknown',
          date: new Date(job.date || job.createdAt).toLocaleDateString()
        };
      })
      .sort((a, b) => b.salaryValue - a.salaryValue)
      .slice(0, 5);
  };

  const generateMonthlyTrends = (applicationsList) => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      const monthApps = applicationsList.filter(app => {
        const appDate = new Date(app.submittedAt || app.date);
        return appDate.getMonth() === date.getMonth() && 
               appDate.getFullYear() === date.getFullYear();
      });

      const accepted = monthApps.filter(app => app.status === 'Accepted').length;
      const rejected = monthApps.filter(app => app.status === 'Rejected').length;

      months.push({
        month: monthStr,
        applications: monthApps.length,
        accepted,
        rejected
      });
    }
    return months;
  };

  const StatCard = ({ icon: Icon, title, value, color, subtitle }) => (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-xl border border-gray-700 hover:border-blue-500 transition-all duration-300 group hover:transform hover:-translate-y-1 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <div className={`p-2 rounded-lg bg-opacity-20 ${color.replace('text', 'bg')}`}>
              <Icon className={`w-5 h-5 ${color} group-hover:scale-110 transition-transform`} />
            </div>
            <p className="text-xs font-medium text-gray-300">{title}</p>
          </div>
          <p className="text-2xl font-bold text-white mb-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
    </div>
  );

  const ChartContainer = ({ title, icon: Icon, children, className = "" }) => (
    <div className={`bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-xl border border-gray-700 shadow-lg ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center text-white">
          <Icon className="w-5 h-5 mr-2 text-blue-400" />
          {title}
        </h3>
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
      </div>
      {children}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">Loading your recruitment dashboard...</p>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-gray-900 to-gray-800 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Recruitment Analytics
            </h1>
            <p className="text-gray-400 mt-1 text-sm">Welcome back, {companyData?.name || 'Team'}</p>
          </div>
          <div className="flex items-center space-x-3 mt-4 md:mt-0">
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="border border-gray-600 rounded-lg px-3 py-2 bg-gray-800 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last 12 months</option>
            </select>
          </div>
        </div>

       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
  <StatCard
    icon={Briefcase}
    title="Total Jobs"
    value={analytics.summary.totalJobs}
    color="text-blue-400"
    subtitle={`${analytics.summary.activeJobs} active`}
  />
  <StatCard
    icon={Users}
    title="12 Month Apps"
    value={analytics.summary.applications12Months}
    color="text-green-400"
    subtitle={`${analytics.summary.selected12Months} selected`}
  />
  <StatCard
    icon={UserCheck}
    title="Selected"
    value={analytics.summary.selected12Months}
    color="text-green-400"
    subtitle="Last 12 months"
  />
  <StatCard
    icon={XCircle}
    title="Rejected"
    value={analytics.summary.rejected12Months}
    color="text-red-400"
    subtitle="Last 12 months"
  />
  <StatCard
    icon={Activity}
    title="Pending"
    value={analytics.summary.pending12Months}
    color="text-yellow-400"
    subtitle="Last 12 months"
  />
</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartContainer title="Application Status" icon={Activity}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={analytics.charts.applicationStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({name, percentage}) => `${name}\n${percentage}%`}
                  outerRadius={80}
                  innerRadius={40}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.charts.applicationStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fafbfdff', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>

         <ChartContainer title="Job Role Performance (Applicants, Accepted, Rejected, Pending)" icon={Briefcase}>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={analytics.charts.jobRoleStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="jobRole" 
                stroke="#9CA3AF" 
                angle={-45} 
                textAnchor="end" 
                height={90} 
                fontSize={10} 
              />
              <YAxis stroke="#9CA3AF" fontSize={11} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="totalApplicants" fill="#3B82F6" name="Total Applicants" radius={[3, 3, 0, 0]} />
              <Bar dataKey="accepted" fill="#10B981" name="Accepted" radius={[3, 3, 0, 0]} />
              <Bar dataKey="rejected" fill="#EF4444" name="Rejected" radius={[3, 3, 0, 0]} />
              <Bar dataKey="pending" fill="#F59E0B" name="Pending" radius={[3, 3, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartContainer title="Resume Score Distribution" icon={Star}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.charts.resumeScoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="range" stroke="#9CA3AF" fontSize={11} />
                <YAxis stroke="#9CA3AF" fontSize={11} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>

          <ChartContainer title="Daily Applications Trend" icon={TrendingUp}>
  <ResponsiveContainer width="100%" height={220}>
    <ComposedChart data={analytics.charts.dailyApplications}>
      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
      <XAxis dataKey="date" stroke="#9CA3AF" fontSize={10} />
      <YAxis stroke="#9CA3AF" fontSize={11} />
      <Tooltip 
        content={({ active, payload, label }) => {
          if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
              <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
                <p className="font-semibold text-white text-sm mb-2">{label}</p>
                <div className="space-y-1 text-xs">
                  <p className="text-blue-300">Total: {data.applications}</p>
                  <p className="text-green-300">Accepted: {data.accepted}</p>
                  <p className="text-red-300">Rejected: {data.rejected}</p>
                  <p className="text-yellow-300">Pending: {data.pending}</p>
                </div>
              </div>
            );
          }
          return null;
        }}
      />
      <Bar dataKey="applications" fill="#3B82F6" name="Applications" radius={[3, 3, 0, 0]} />
      <Line 
        type="monotone" 
        dataKey="accepted" 
        stroke="#10B981" 
        strokeWidth={2}
        dot={{ fill: '#10B981', strokeWidth: 1, r: 3 }}
        name="Accepted"
      />
      <Line 
        type="monotone" 
        dataKey="rejected" 
        stroke="#EF4444" 
        strokeWidth={2}
        dot={{ fill: '#EF4444', strokeWidth: 1, r: 3 }}
        name="Rejected"
      />
    </ComposedChart>
  </ResponsiveContainer>
</ChartContainer>
        </div>
 <ChartContainer title="Top 5 Candidates by Score" icon={Award}>
            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {analytics.charts.topCandidates && analytics.charts.topCandidates.length > 0 ? (
                analytics.charts.topCandidates.map((candidate, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-all duration-300 group">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs
                        ${index === 0 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                          index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                          index === 2 ? 'bg-gradient-to-r from-orange-700 to-orange-800' :
                          'bg-gradient-to-r from-blue-500 to-purple-500'}`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate group-hover:text-blue-300 transition-colors">
                          {candidate.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{candidate.job}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-yellow-400">{candidate.score}%</div>
                      <div className={`text-xs capitalize px-2 py-0.5 rounded-full ${
                        candidate.status === 'Accepted' ? 'bg-green-900 text-green-300' :
                        candidate.status === 'Rejected' ? 'bg-red-900 text-red-300' :
                        'bg-yellow-900 text-yellow-300'
                      }`}>
                        {candidate.status}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Star className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No candidate data available</p>
                </div>
              )}
            </div>
          </ChartContainer>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
         <ChartContainer title="Applicants by Location" icon={MapPin}>
  <ResponsiveContainer width="100%" height={220}>
    <PieChart>
      <Pie
        data={analytics.charts.locationDistribution}
        cx="50%"
        cy="50%"
        labelLine={false}
        label={({location, percentage}) => `${location}\n${percentage}%`}
        outerRadius={80}
        fill="#8884d8"
        dataKey="count"
      >
        {analytics.charts.locationDistribution.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip 
        content={({ active, payload }) => {
          if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
              <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
                <p className="font-semibold text-white text-sm mb-2">{data.location}</p>
                <div className="space-y-1 text-xs">
                  <p className="text-blue-300">Total: {data.count}</p>
                  <p className="text-green-300">Accepted: {data.accepted}</p>
                  <p className="text-red-300">Rejected: {data.rejected}</p>
                  <p className="text-yellow-300">Pending: {data.count - data.accepted - data.rejected}</p>
                  <p className="text-gray-300">Percentage: {data.percentage}%</p>
                </div>
              </div>
            );
          }
          return null;
        }}
      />
    </PieChart>
  </ResponsiveContainer>
</ChartContainer>

          <ChartContainer title="Top 5 Highest Salaries" icon={DollarSign}>
            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {analytics.charts.topSalaries.length > 0 ? (
                analytics.charts.topSalaries.map((job, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-all duration-300 group">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate group-hover:text-green-300 transition-colors">
                          {job.jobTitle}
                        </p>
                        <p className="text-xs text-gray-400">{job.location}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-green-400">{job.salary}</div>
                      <div className="text-xs text-gray-500">{job.date}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No salary data available</p>
                </div>
              )}
            </div>
          </ChartContainer>
        </div>

        <ChartContainer title="6-Month Trends" icon={Calendar}>
  <ResponsiveContainer width="100%" height={220}>
    <ComposedChart data={analytics.charts.monthlyTrends}>
      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
      <XAxis dataKey="month" stroke="#9CA3AF" fontSize={11} />
      <YAxis stroke="#9CA3AF" fontSize={11} />
      <Tooltip 
        contentStyle={{ 
          backgroundColor: '#1f2937', 
          border: '1px solid #374151',
          borderRadius: '8px',
          color: 'white',
          fontSize: '12px'
        }}
      />
      <Bar dataKey="applications" fill="#3B82F6" name="Applications" radius={[3, 3, 0, 0]} />
      <Line 
        type="monotone" 
        dataKey="accepted" 
        stroke="#10B981" 
        strokeWidth={2}
        dot={{ fill: '#10B981', strokeWidth: 1, r: 3 }}
        name="Accepted"
      />
      <Line 
        type="monotone" 
        dataKey="rejected" 
        stroke="#EF4444" 
        strokeWidth={2}
        dot={{ fill: '#EF4444', strokeWidth: 1, r: 3 }}
        name="Rejected"
      />
    </ComposedChart>
  </ResponsiveContainer>
</ChartContainer>
      </div>
    </div>
  );
};

export default EmployerDashboard;