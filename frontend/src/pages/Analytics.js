import { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendUp, Users, Tooth, CurrencyDollar } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { getDashboardSummary } from '../api/dashboard';

const Analytics = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const summary = await getDashboardSummary();
      setOverview(summary);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#E5E5E2] rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-[#E5E5E2] rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const COLORS = ['#82A098', '#C27E70', '#7B9EBB', '#E8A76C'];
  const implantTypeData = [];

  return (
    <div className="p-4 md:p-8" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
      <div className="mb-6 md:mb-8">
        <h1 className="text-4xl font-semibold text-[#2A2F35] tracking-tight" style={{ fontFamily: 'Work Sans, sans-serif' }}>
          Analytics
        </h1>
        <p className="text-[#5C6773] mt-2">Practice performance and insights</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div
          data-testid="total-patients-card"
          className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-[#5C6773] mb-1">Total Patients</p>
              <p className="text-3xl font-semibold text-[#2A2F35]">{overview?.total_patients || 0}</p>
            </div>
            <div className="w-12 h-12 bg-[#82A098]/10 rounded-lg flex items-center justify-center">
              <Users size={24} weight="fill" className="text-[#82A098]" />
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm text-[#82A098]">
            <TrendUp size={16} />
            <span>Active practice</span>
          </div>
        </div>

        <div
          data-testid="active-cases-card"
          className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-[#5C6773] mb-1">Active Cases</p>
              <p className="text-3xl font-semibold text-[#2A2F35]">{overview?.active_cases || 0}</p>
            </div>
            <div className="w-12 h-12 bg-[#C27E70]/10 rounded-lg flex items-center justify-center">
              <Tooth size={24} weight="fill" className="text-[#C27E70]" />
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm text-[#C27E70]">
            <span>{overview?.upcoming_followups || 0} upcoming follow-ups</span>
          </div>
        </div>

        <div
          data-testid="cases-this-month-card"
          className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-[#5C6773] mb-1">Cases This Month</p>
              <p className="text-3xl font-semibold text-[#2A2F35]">{overview?.cases_this_month || 0}</p>
            </div>
            <div className="w-12 h-12 bg-[#7B9EBB]/10 rounded-lg flex items-center justify-center">
              <CurrencyDollar size={24} weight="fill" className="text-[#7B9EBB]" />
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm text-[#7B9EBB]">
            <span>New cases opened this month</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Implant Types Distribution */}
        {implantTypeData.length > 0 && (
          <div className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-medium text-[#2A2F35] mb-6" style={{ fontFamily: 'Work Sans, sans-serif' }}>
              Implant Types Distribution
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={implantTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {implantTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Implant Count Bar Chart */}
        {implantTypeData.length > 0 && (
          <div className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-medium text-[#2A2F35] mb-6" style={{ fontFamily: 'Work Sans, sans-serif' }}>
              Implant Count by Type
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={implantTypeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E2" />
                <XAxis dataKey="name" tick={{ fill: '#5C6773' }} />
                <YAxis tick={{ fill: '#5C6773' }} />
                <Tooltip />
                <Bar dataKey="value" fill="#82A098" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

    </div>
  );
};

export default Analytics;