import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ComposedChart
} from 'recharts';
import { 
  FileText, TrendingUp, Calendar, Target, CheckCircle, 
  XCircle, Briefcase, DollarSign, ArrowLeft, PieChart as PieChartIcon, 
  MapPin, Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EmployeeDashboard = () => {
  const { backendUrl, userData, userApplications, fetchUserApplications } = useContext(AppContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('30');

  useEffect(() => {
    const loadApplications = async () => {
      if (!userApplications || userApplications.length === 0) {
        setLoading(true);
        await fetchUserApplications();
        setLoading(false);
      } else {
        setLoading(false);
      }
    };

    if (userData) {
      loadApplications();
    }
  }, [userData]);

  // Define all helper functions BEFORE useMemo
  const calculateEmployeeSummary = (allApps, filteredApps) => {
    const total = allApps.length;
    const accepted = allApps.filter(app => app.status === 'Accepted').length;
    const pending = allApps.filter(app => app.status === 'Pending').length;
    const rejected = allApps.filter(app => app.status === 'Rejected').length;
    
    const responded = accepted + rejected;
    const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;
    const successRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeek = allApps.filter(app => 
      app.submittedAt ? new Date(app.submittedAt) >= weekAgo : false
    ).length;

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const thisMonth = allApps.filter(app => 
      app.submittedAt ? new Date(app.submittedAt) >= monthAgo : false
    ).length;

    return {
      totalApplications: total,
      acceptedApplications: accepted,
      pendingApplications: pending,
      rejectedApplications: rejected,
      responseRate,
      successRate,
      applicationsThisWeek: thisWeek,
      applicationsThisMonth: thisMonth,
      respondedCompanies: responded
    };
  };

  const generateApplicationTrends = (filteredApps, days) => {
    const trends = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const dayApps = filteredApps.filter(app => {
        if (!app.submittedAt) return false;
        const appDate = new Date(app.submittedAt);
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
    return trends.length > 0 ? trends : [
      { date: 'No Data', applications: 0, accepted: 0, rejected: 0, pending: 0 }
    ];
  };

  const generateStatusDistribution = (allApps) => {
    const statusCounts = {
      Pending: 0,
      Accepted: 0,
      Rejected: 0
    };

    allApps.forEach(app => {
      if (statusCounts.hasOwnProperty(app.status)) {
        statusCounts[app.status]++;
      }
    });

    return Object.entries(statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        name: status,
        value: count,
        percentage: allApps.length > 0 ? Math.round((count / allApps.length) * 100) : 0
      }));
  };

  const generateSalaryRangeAnalysis = (allApps) => {
    const salaryRanges = {
      '0-50k': { min: 0, max: 50000, applications: 0, accepted: 0, rejected: 0 },
      '50k-100k': { min: 50000, max: 100000, applications: 0, accepted: 0, rejected: 0 },
      '100k-150k': { min: 100000, max: 150000, applications: 0, accepted: 0, rejected: 0 },
      '150k+': { min: 150000, max: Infinity, applications: 0, accepted: 0, rejected: 0 }
    };

    allApps.forEach(app => {
      const salary = app.jobId?.salary || app.salary;
      if (salary) {
        for (const [range, data] of Object.entries(salaryRanges)) {
          if (salary >= data.min && salary <= data.max) {
            salaryRanges[range].applications++;
            if (app.status === 'Accepted') salaryRanges[range].accepted++;
            if (app.status === 'Rejected') salaryRanges[range].rejected++;
            break;
          }
        }
      }
    });

    return Object.entries(salaryRanges)
      .filter(([_, data]) => data.applications > 0)
      .map(([range, data]) => ({
        range,
        applications: data.applications,
        accepted: data.accepted,
        rejected: data.rejected
      }));
  };

  const generateLocationAnalysis = (allApps) => {
    const locationStats = {};
    
    allApps.forEach(app => {
      const location = app.jobId?.location || app.location || 'Unknown';
      if (!locationStats[location]) {
        locationStats[location] = { applied: 0, accepted: 0, rejected: 0 };
      }
      locationStats[location].applied++;
      if (app.status === 'Accepted') locationStats[location].accepted++;
      if (app.status === 'Rejected') locationStats[location].rejected++;
    });

    return Object.entries(locationStats)
      .map(([location, stats]) => ({
        location: location.length > 12 ? location.substring(0, 12) + '...' : location,
        applications: stats.applied,
        accepted: stats.accepted,
        rejected: stats.rejected,
        successRate: stats.applied > 0 ? Math.round((stats.accepted / stats.applied) * 100) : 0
      }))
      .sort((a, b) => b.applications - a.applications)
      .slice(0, 6);
  };

  const generateCompanyResponse = (allApps) => {
    const companyStats = {};
    
    allApps.forEach(app => {
      const company = app.CompanyId?.name || app.companyName || 'Unknown Company';
      if (!companyStats[company]) {
        companyStats[company] = { applied: 0, accepted: 0, rejected: 0 };
      }
      companyStats[company].applied++;
      if (app.status === 'Accepted') companyStats[company].accepted++;
      if (app.status === 'Rejected') companyStats[company].rejected++;
    });

    return Object.entries(companyStats)
      .map(([company, stats]) => ({
        company: company.length > 15 ? company.substring(0, 15) + '...' : company,
        applications: stats.applied,
        accepted: stats.accepted,
        rejected: stats.rejected,
        successRate: stats.applied > 0 ? Math.round((stats.accepted / stats.applied) * 100) : 0
      }))
      .sort((a, b) => b.applications - a.applications)
      .slice(0, 6);
  };

  const generateMonthlyActivity = (allApps) => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      const monthApps = allApps.filter(app => {
        if (!app.submittedAt) return false;
        const appDate = new Date(app.submittedAt);
        return appDate.getMonth() === date.getMonth() && 
               appDate.getFullYear() === date.getFullYear();
      });

      months.push({
        month: monthStr,
        applications: monthApps.length,
        accepted: monthApps.filter(app => app.status === 'Accepted').length,
        rejected: monthApps.filter(app => app.status === 'Rejected').length
      });
    }
    return months;
  };

  const generateCategoryBreakdown = (allApps) => {
    const categories = {};
    
    allApps.forEach(app => {
      const category = app.jobId?.category || app.category || 'Other';
      if (!categories[category]) {
        categories[category] = { applications: 0, accepted: 0, rejected: 0 };
      }
      categories[category].applications++;
      if (app.status === 'Accepted') categories[category].accepted++;
      if (app.status === 'Rejected') categories[category].rejected++;
    });

    return Object.entries(categories)
      .map(([category, data]) => ({
        category:category,
        applications: data.applications,
        accepted: data.accepted,
        rejected: data.rejected
      }))
      .sort((a, b) => b.applications - a.applications)
      .slice(0, 6);
  };

  const generateEmployeeCharts = (allApps, filteredApps, days) => {
    return {
      applicationTrends: generateApplicationTrends(filteredApps, days),
      statusDistribution: generateStatusDistribution(allApps),
      salaryRangeAnalysis: generateSalaryRangeAnalysis(allApps),
      locationAnalysis: generateLocationAnalysis(allApps),
      companyResponse: generateCompanyResponse(allApps),
      monthlyActivity: generateMonthlyActivity(allApps),
      categoryBreakdown: generateCategoryBreakdown(allApps)
    };
  };

  // NOW use useMemo after all functions are defined
  const insights = useMemo(() => {
    if (!userApplications || userApplications.length === 0) {
      return null;
    }

    const now = new Date();
    const daysAgo = parseInt(timeFilter);
    const filterDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
    
    const filteredApps = userApplications.filter(app => 
      app.submittedAt ? new Date(app.submittedAt) >= filterDate : true
    );

    return {
      summary: calculateEmployeeSummary(userApplications, filteredApps),
      charts: generateEmployeeCharts(userApplications, filteredApps, daysAgo)
    };
  }, [userApplications, timeFilter]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/90 border-2 border-cyan-400/50 rounded-lg p-4 shadow-2xl backdrop-blur-sm">
          <p className="text-cyan-400 font-bold mb-2 text-lg">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
              {entry.name}: <span className="text-white font-bold">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color, gradient }) => (
    <div className={`bg-black/60 backdrop-blur-lg border-2 ${color} hover:border-opacity-80 p-6 rounded-xl transition-all duration-500 transform hover:scale-105 hover:shadow-2xl cursor-pointer`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-4">
            <div className={`p-3 rounded-full ${gradient} shadow-lg`}>
              <Icon className="w-8 h-8 text-black" />
            </div>
            <p className="text-sm font-bold text-gray-300 uppercase tracking-wide">{title}</p>
          </div>
          <p className={`text-4xl font-black mb-2 ${color.replace('border-', 'text-')}`}>{value}</p>
          {subtitle && <p className="text-sm text-gray-400 font-medium">{subtitle}</p>}
        </div>
      </div>
    </div>
  );

  const ChartContainer = ({ title, icon: Icon, children, className = "", accentColor = "cyan" }) => (
    <div className={`bg-black/70 backdrop-blur-lg p-6 rounded-xl border-2 border-${accentColor}-400 border-opacity-30 hover:border-opacity-60 shadow-2xl transition-all duration-300 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-xl font-black flex items-center text-${accentColor}-400`}>
          <Icon className={`w-6 h-6 mr-3 text-${accentColor}-400`} />
          {title}
        </h3>
        <div className={`w-3 h-3 rounded-full bg-${accentColor}-400 animate-pulse shadow-lg`}></div>
      </div>
      {children}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-cyan-400 border-t-transparent mx-auto mb-6 shadow-2xl"></div>
          <p className="text-cyan-400 text-xl font-bold">Loading your career insights...</p>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <FileText className="w-20 h-20 text-cyan-400 mx-auto mb-4" />
          <p className="text-cyan-400 text-xl font-bold">No application data yet</p>
          <p className="text-gray-400 mt-2">Start applying to jobs to see your analytics!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center space-x-6">
            <button 
              onClick={() => navigate(-1)}
              className="bg-black/80 hover:bg-cyan-400/20 border-2 border-cyan-400 text-cyan-400 p-4 rounded-xl transition-all duration-300 shadow-xl hover:shadow-cyan-400/50"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-pink-400 to-yellow-400 bg-clip-text text-transparent">
                Your Dashboard
              </h1>
              <p className="text-gray-300 mt-2 text-lg">Transform your job search into data-driven insights</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 mt-6 md:mt-0">
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="border-2 border-cyan-400/50 rounded-xl px-6 py-3 bg-black/80 text-cyan-400 focus:ring-4 focus:ring-cyan-400/50 focus:border-cyan-400 transition-all shadow-lg font-bold"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last 12 months</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={FileText}
            title="Total Applications"
            value={insights.summary.totalApplications}
            color="border-cyan-400"
            gradient="bg-gradient-to-br from-cyan-400 to-blue-500"
            subtitle={`${insights.summary.applicationsThisWeek} applications this week`}
          />
          <StatCard
            icon={CheckCircle}
            title="Accepted"
            value={insights.summary.acceptedApplications}
            color="border-green-400"
            gradient="bg-gradient-to-br from-green-400 to-emerald-500"
            subtitle="Dream jobs secured"
          />
          <StatCard
            icon={XCircle}
            title="Rejected"
            value={insights.summary.rejectedApplications}
            color="border-red-400"
            gradient="bg-gradient-to-br from-red-400 to-pink-500"
            subtitle="Growth from feedback"
          />
          <StatCard
            icon={Target}
            title="Victory Rate"
            value={`${insights.summary.successRate}%`}
            color="border-yellow-400"
            gradient="bg-gradient-to-br from-yellow-400 to-orange-500"
            subtitle="Success percentage"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartContainer title="Application Status Overview" icon={PieChartIcon} accentColor="pink">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={insights.charts.statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({name, percentage, value}) => `${name}: ${value} (${percentage}%)`}
                  outerRadius={90}
                  innerRadius={50}
                  dataKey="value"
                  stroke="#000"
                  strokeWidth={2}
                >
                  {insights.charts.statusDistribution.map((entry, index) => {
                    let color = '#00D9FF';
                    if (entry.name === 'Accepted') color = '#00FF88';
                    if (entry.name === 'Rejected') color = '#FF3366';
                    if (entry.name === 'Pending') color = '#FFCC00';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Pie>
                <Tooltip content={({ payload }) => {
                  if (payload && payload.length) {
                    const data = payload[0];
                    return (
                      <div className="bg-black/90 border-2 border-pink-400/50 rounded-lg p-3 shadow-2xl">
                        <p className="text-pink-400 font-bold text-sm">{data.name}</p>
                        <p className="text-white">Count: <span className="font-bold">{data.value}</span></p>
                        <p className="text-white">Percentage: <span className="font-bold">{data.payload.percentage}%</span></p>
                      </div>
                    );
                  }
                  return null;
                }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>

          <ChartContainer title="Activity Pulse" icon={TrendingUp} accentColor="green">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={insights.charts.applicationTrends}>
                <defs>
                  <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D9FF" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00D9FF" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorAccepted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00FF88" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00FF88" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorRejected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF3366" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#FF3366" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#00FF88" fontSize={12} />
                <YAxis stroke="#00FF88" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="applications" stroke="#00D9FF" strokeWidth={2} fillOpacity={1} fill="url(#colorApplications)" name="Applications" />
                <Area type="monotone" dataKey="accepted" stroke="#00FF88" strokeWidth={2} fillOpacity={1} fill="url(#colorAccepted)" name="Accepted" />
                <Area type="monotone" dataKey="rejected" stroke="#FF3366" strokeWidth={2} fillOpacity={1} fill="url(#colorRejected)" name="Rejected" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartContainer title="Salary Range Performance" icon={DollarSign} accentColor="yellow">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={insights.charts.salaryRangeAnalysis} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="range" stroke="#FFCC00" fontSize={12} />
                <YAxis stroke="#FFCC00" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="applications" fill="#00D9FF" name="Applications" radius={[2, 2, 0, 0]} />
                <Bar dataKey="accepted" fill="#00FF88" name="Accepted" radius={[2, 2, 0, 0]} />
                <Bar dataKey="rejected" fill="#FF3366" name="Rejected" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>

          <ChartContainer title="Domain Wise Chart" icon={Briefcase} accentColor="yellow">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={insights.charts.categoryBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="category" stroke="#75f4f8ff" fontSize={12} angle={-45} textAnchor="end" height={60} />
                <YAxis stroke="#f3f1f7ff" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="applications" fill="#ff0000ff" name="Applications" radius={[2, 2, 0, 0]} />
                <Bar dataKey="accepted" fill="#00FF88" name="Accepted" radius={[2, 2, 0, 0]} />
                <Bar dataKey="rejected" fill="#e7ff33ff" name="Rejected" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartContainer title="Location Based Chart" icon={MapPin} accentColor="red">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={insights.charts.locationAnalysis}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="location" stroke="#faf6f9ff" fontSize={12} angle={-45} textAnchor="end" height={60} />
                <YAxis stroke="#ddff00ff" fontSize={12} />
                <Tooltip content={({ payload, label }) => {
                  if (payload && payload.length) {
                    return (
                      <div className="bg-black/90 border-2 border-orange-400/50 rounded-lg p-3 shadow-2xl">
                        {payload.map((entry, index) => (
                          <p key={index} className="text-xs" style={{ color: entry.color }}>
                            {entry.name}: <span className="text-white font-bold">{entry.value}</span>
                          </p>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }} />
                <Bar dataKey="applications" fill="#ff9100ff" name="Applications" radius={[2, 2, 0, 0]} />
                <Bar dataKey="accepted" fill="#00FF88" name="Accepted" radius={[2, 2, 0, 0]} />
                <Bar dataKey="rejected" fill="#f4f4f4ff" name="Rejected" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>

          <ChartContainer title="Monthly Progress" icon={Calendar} accentColor="red">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={insights.charts.monthlyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="month" stroke="#6366F1" fontSize={12} />
                <YAxis stroke="#6366F1" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="applications" stroke="#00D9FF" strokeWidth={3} dot={{ fill: '#00D9FF', r: 4 }} name="Applications" />
                <Line type="monotone" dataKey="accepted" stroke="#00FF88" strokeWidth={3} dot={{ fill: '#00FF88', r: 4 }} name="Accepted" />
                <Line type="monotone" dataKey="rejected" stroke="#FF3366" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: '#FF3366', r: 3 }} name="Rejected" />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        <div className="grid grid-cols-1">
          <ChartContainer title="Company Engagement Analysis" icon={Users} accentColor="yellow">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={insights.charts.companyResponse}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="company" stroke="#4ECDC4" angle={-45} textAnchor="end" height={80} fontSize={12} />
                <YAxis stroke="#4ECDC4" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="applications" fill="#00D9FF" name="Applications" radius={[2, 2, 0, 0]} />
                <Bar dataKey="accepted" fill="#00FF88" name="Accepted" radius={[2, 2, 0, 0]} />
                <Bar dataKey="rejected" fill="#FF3366" name="Rejected" radius={[2, 2, 0, 0]} />
                <Line type="monotone" dataKey="successRate" stroke="#FFCC00" strokeWidth={3} dot={{ fill: '#FFCC00', r: 4 }} name="Success Rate %" />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

      </div>
    </div>
  );
};

export default EmployeeDashboard;