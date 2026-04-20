import { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendUp, Users, Tooth, CurrencyDollar } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { getAnalyticsOverview, getAnalyticsFinancial } from '../api/dashboard';

const Analytics = () => {
  const [overview, setOverview] = useState(null);
  const [financial, setFinancial] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [overviewData, financialData] = await Promise.all([
        getAnalyticsOverview(),
        getAnalyticsFinancial(),
      ]);
      setOverview(overviewData);
      setFinancial(financialData);
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

  const implantTypeData = overview?.implant_types?.map((type, index) => ({
    name: type._id || 'Unknown',
    value: type.count,
    color: COLORS[index % COLORS.length],
  })) || [];

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
          data-testid="total-implants-card"
          className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-[#5C6773] mb-1">Total Implants</p>
              <p className="text-3xl font-semibold text-[#2A2F35]">{overview?.total_implants || 0}</p>
            </div>
            <div className="w-12 h-12 bg-[#C27E70]/10 rounded-lg flex items-center justify-center">
              <Tooth size={24} weight="fill" className="text-[#C27E70]" />
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm text-[#C27E70]">
            <span>{overview?.pending_osseointegration || 0} healing</span>
          </div>
        </div>

        <div
          data-testid="revenue-card"
          className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-[#5C6773] mb-1">Est. Revenue</p>
              <p className="text-3xl font-semibold text-[#2A2F35]">
                ${(financial?.total_revenue || 0).toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-[#7B9EBB]/10 rounded-lg flex items-center justify-center">
              <CurrencyDollar size={24} weight="fill" className="text-[#7B9EBB]" />
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm text-[#7B9EBB]">
            <span>Avg: ${Math.round(financial?.average_per_implant || 0)}/implant</span>
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

      {/* Financial Breakdown */}
      <div className="mt-6 bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-medium text-[#2A2F35] mb-4" style={{ fontFamily: 'Work Sans, sans-serif' }}>
          Financial Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border-l-4 border-[#82A098] pl-4">
            <p className="text-sm text-[#5C6773] mb-1">Total Revenue</p>
            <p className="text-2xl font-semibold text-[#2A2F35]">
              ${(financial?.total_revenue || 0).toLocaleString()}
            </p>
          </div>
          <div className="border-l-4 border-[#C27E70] pl-4">
            <p className="text-sm text-[#5C6773] mb-1">Total Procedures</p>
            <p className="text-2xl font-semibold text-[#2A2F35]">
              {financial?.total_implants || 0}
            </p>
          </div>
          <div className="border-l-4 border-[#7B9EBB] pl-4">
            <p className="text-sm text-[#5C6773] mb-1">Average per Procedure</p>
            <p className="text-2xl font-semibold text-[#2A2F35]">
              ${Math.round(financial?.average_per_implant || 0)}
            </p>
          </div>
        </div>
        <div className="mt-6 p-4 bg-[#F9F9F8] rounded-lg">
          <p className="text-xs text-[#5C6773] italic">
            * Revenue estimates are based on average market rates: Single ($1,500), Bridge ($4,500), Full Mouth ($25,000)
          </p>
        </div>
      </div>

    </div>
  );
};

export default Analytics;