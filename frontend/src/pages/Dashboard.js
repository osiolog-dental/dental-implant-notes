import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import {
  CalendarDots, Bell, ArrowRight, CheckCircle,
  XCircle, Warning, Heartbeat, X, Tooth, Timer
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { getDashboardSummary, getDueForSecondStage, getAllImplants, getOsseointegrationAlerts } from '../api/dashboard';
import { getPatients } from '../api/patients';

// ── helpers ────────────────────────────────────────────────────────────────
const getInitials = (name = '') => {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
};

const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return '—'; }
};

// Classify an implant into one of the 4 buckets
const classify = (implant) => {
  const outcome = (implant.implant_outcome || '').toLowerCase();
  const status  = (implant.status || '').toLowerCase();
  if (outcome === 'failed' || status === 'failed') return 'failed';
  if (outcome === 'guarded' || outcome === 'questionable' || outcome === 'guarded prognosis') return 'guarded';
  if (outcome === 'success' || implant.osseointegration_success === true) return 'completed';
  return 'active'; // Pending / healing / anything else
};

// ── Tab panel config ───────────────────────────────────────────────────────
const TAB_CONFIG = {
  active: {
    key: 'active',
    label: 'Active Cases',
    icon: Heartbeat,
    accent: '#82A098',
    bg: 'bg-[#82A098]/10',
    border: 'border-[#82A098]/30',
    ring: 'focus:ring-[#82A098]',
    badgeBg: 'bg-[#82A098]',
    description: 'Ongoing implant cases in placement or healing phase',
  },
  completed: {
    key: 'completed',
    label: 'Completed Cases',
    icon: CheckCircle,
    accent: '#4ADE80',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    ring: 'focus:ring-emerald-400',
    badgeBg: 'bg-emerald-500',
    description: 'Successful osseointegration, prosthetic loading complete',
  },
  guarded: {
    key: 'guarded',
    label: 'Guarded Prognosis',
    icon: Warning,
    accent: '#F59E0B',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    ring: 'focus:ring-amber-400',
    badgeBg: 'bg-amber-500',
    description: 'Questionable implants requiring close monitoring',
  },
  failed: {
    key: 'failed',
    label: 'Failed Cases',
    icon: XCircle,
    accent: '#C27E70',
    bg: 'bg-[#FDF5F3]',
    border: 'border-[#C27E70]/30',
    ring: 'focus:ring-[#C27E70]',
    badgeBg: 'bg-[#C27E70]',
    description: 'Implants that have failed and require review',
  },
};

// ── CaseRow ────────────────────────────────────────────────────────────────
function CaseRow({ implant, patient, accent }) {
  return (
    <Link
      to={`/patients/${implant.patient_id}`}
      data-testid={`case-row-${implant.id}`}
      className="flex items-center gap-4 p-4 bg-white rounded-xl border border-[#E5E5E2] hover:border-[#82A098]/50 hover:shadow-sm transition-all duration-150 group"
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
        style={{ backgroundColor: accent }}
      >
        {getInitials(patient?.name || 'UN')}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#2A2F35] truncate">{patient?.name || 'Unknown Patient'}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
          {implant.case_number && (
            <span className="text-xs text-[#5C6773]">{implant.case_number}</span>
          )}
          <span className="text-xs text-[#5C6773]">Tooth #{implant.tooth_number}</span>
          {implant.brand && <span className="text-xs text-[#5C6773]">{implant.brand}</span>}
          {implant.surgery_date && (
            <span className="flex items-center gap-1 text-xs text-[#5C6773]">
              <CalendarDots size={11} /> {fmtDate(implant.surgery_date)}
            </span>
          )}
        </div>
      </div>

      {/* Outcome badge */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ backgroundColor: `${accent}20`, color: accent }}
        >
          {implant.implant_outcome || 'Pending'}
        </span>
        <ArrowRight size={14} className="text-[#5C6773] group-hover:text-[#2A2F35] transition-colors" />
      </div>
    </Link>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
const Dashboard = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [patients, setPatients] = useState([]);
  const [allImplants, setAllImplants] = useState([]);
  const [dueImplants, setDueImplants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(null); // null | 'active' | 'completed' | 'guarded' | 'failed'
  const [urgentAlerts, setUrgentAlerts] = useState([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [summary, patientsData, dueData, implantsData] = await Promise.all([
        getDashboardSummary(),
        getPatients({ perPage: 100 }),
        getDueForSecondStage().catch(() => []),
        getAllImplants().catch(() => []),
      ]);
      setAnalytics(summary);
      const patientList = patientsData.items ?? patientsData;
      setPatients(patientList);
      setDueImplants(dueData);
      setAllImplants(implantsData);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
    try {
      const alertsData = await getOsseointegrationAlerts();
      setUrgentAlerts(Array.isArray(alertsData) ? alertsData : []);
    } catch {
      // alerts are non-critical — silently ignore
    }
  };

  // Build patient lookup map
  const patientMap = patients.reduce((acc, p) => { acc[p.id || p._id] = p; return acc; }, {});

  // Bucket implants
  const buckets = { active: [], completed: [], guarded: [], failed: [] };
  allImplants.forEach(imp => { buckets[classify(imp)].push(imp); });

  // Compute healing-phase implants (current_stage === 1) with countdown.
  // Excludes implants already past their osseointegration window — those appear
  // in the "Ready for Second Stage" section below.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const healingImplants = allImplants
    .filter(imp => imp.current_stage === 1)
    .map(imp => {
      let daysRemaining = null;
      if (imp.surgery_date) {
        const surgeryDate = new Date(imp.surgery_date);
        surgeryDate.setHours(0, 0, 0, 0);
        const osseoIntegrationDays = imp.osseointegration_days ?? 90;
        const endDate = new Date(surgeryDate);
        endDate.setDate(endDate.getDate() + osseoIntegrationDays);
        daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
      }
      const patient = patientMap[imp.patient_id];
      return {
        ...imp,
        patientName: patient?.name || 'Unknown Patient',
        daysRemaining,
        osseointegration_days: imp.osseointegration_days ?? 90,
      };
    })
    // Keep only implants still within window (daysRemaining > 0) or with no surgery date
    .filter(imp => imp.daysRemaining === null || imp.daysRemaining > 0)
    .sort((a, b) => {
      // Sort: no-date last, then ascending days remaining (most urgent first)
      if (a.daysRemaining === null && b.daysRemaining === null) return 0;
      if (a.daysRemaining === null) return 1;
      if (b.daysRemaining === null) return -1;
      return a.daysRemaining - b.daysRemaining;
    });

  const handleStatClick = (key) => {
    setActiveTab(prev => (prev === key ? null : key));
  };

  const getStageColor = (index) => {
    const colors = ['#7DD3FC', '#A5F3FC', '#93C5FD', '#BAE6FD', '#E0F2FE'];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#E5E5E2] rounded w-1/4" />
          <div className="h-48 bg-[#E5E5E2] rounded-xl" />
        </div>
      </div>
    );
  }

  const tabCfg = activeTab ? TAB_CONFIG[activeTab] : null;
  const tabImplants = activeTab ? buckets[activeTab] : [];

  return (
    <div className="min-h-screen bg-[#F9F9F8]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
      {/* Header */}
      <div className="bg-white border-b border-[#E5E5E2] px-6 py-4">
        <h1 className="text-2xl font-semibold text-[#2A2F35]" style={{ fontFamily: 'Work Sans, sans-serif' }}>
          Clinical Cases
        </h1>
      </div>

      <div className="p-4 md:p-6 space-y-6">

        {/* ── Urgent Alerts ── */}
        {urgentAlerts.length > 0 && (
          <div data-testid="urgent-alerts-section" className="mb-6 bg-amber-50 border border-[#E8A76C] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Warning size={18} weight="fill" className="text-[#E8A76C]" />
              <h3 className="text-sm font-semibold text-[#2A2F35]">Osseointegration Completing Soon</h3>
              <span className="ml-auto text-xs font-semibold bg-[#E8A76C] text-white px-2 py-0.5 rounded-full">
                {urgentAlerts.length}
              </span>
            </div>
            <div className="space-y-2">
              {urgentAlerts.map(alert => (
                <Link
                  key={alert.implant_id}
                  to={`/patients/${alert.patient_id}`}
                  data-testid={`urgent-alert-${alert.implant_id}`}
                  className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-[#E8A76C]/30 hover:border-[#E8A76C] transition-colors"
                >
                  <div>
                    <span className="text-sm font-medium text-[#2A2F35]">{alert.patient_name}</span>
                    <span className="text-xs text-[#5C6773] ml-2">Tooth #{alert.tooth_number} · {alert.brand}</span>
                  </div>
                  <span className="text-xs font-semibold text-[#E8A76C]">{alert.days_remaining}d left</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── 4 Stat Boxes ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.values(TAB_CONFIG).map(cfg => {
            const Icon = cfg.icon;
            const count = buckets[cfg.key].length;
            const isOpen = activeTab === cfg.key;
            return (
              <button
                key={cfg.key}
                onClick={() => handleStatClick(cfg.key)}
                data-testid={`stat-box-${cfg.key}`}
                className={`text-left p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer hover:shadow-md active:scale-[0.98] ${
                  isOpen
                    ? `${cfg.bg} ${cfg.border} shadow-md`
                    : 'bg-white border-[#E5E5E2] hover:border-[#82A098]/30'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${cfg.accent}20` }}
                  >
                    <Icon size={20} style={{ color: cfg.accent }} weight="fill" />
                  </div>
                  {isOpen && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ backgroundColor: cfg.accent, color: '#fff' }}>
                      Open
                    </span>
                  )}
                </div>
                <p className="text-3xl font-bold text-[#2A2F35] leading-none mb-1">{count}</p>
                <p className="text-sm font-medium text-[#2A2F35]">{cfg.label}</p>
                <p className="text-xs text-[#5C6773] mt-0.5 leading-tight">{cfg.description}</p>
              </button>
            );
          })}
        </div>

        {/* ── Tab Panel ── */}
        {activeTab && tabCfg && (
          <div
            data-testid={`tab-panel-${activeTab}`}
            className={`rounded-2xl border-2 ${tabCfg.border} overflow-hidden`}
          >
            {/* Panel header */}
            <div className={`flex items-center justify-between px-5 py-4 ${tabCfg.bg}`}>
              <div className="flex items-center gap-3">
                <tabCfg.icon size={20} style={{ color: tabCfg.accent }} weight="fill" />
                <div>
                  <h3 className="text-base font-semibold text-[#2A2F35]" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                    {tabCfg.label}
                  </h3>
                  <p className="text-xs text-[#5C6773]">{tabCfg.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
                  style={{ backgroundColor: tabCfg.accent }}
                >
                  {tabImplants.length} case{tabImplants.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => setActiveTab(null)}
                  data-testid="close-tab-panel"
                  className="w-7 h-7 rounded-lg bg-white/70 hover:bg-white flex items-center justify-center text-[#5C6773] hover:text-[#2A2F35] transition-colors border border-[#E5E5E2]"
                >
                  <X size={14} weight="bold" />
                </button>
              </div>
            </div>

            {/* Case list */}
            <div className="p-4 bg-[#F9F9F8]">
              {tabImplants.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Tooth size={40} className="text-[#E5E5E2] mb-3" weight="fill" />
                  <p className="text-sm font-medium text-[#5C6773]">No {tabCfg.label.toLowerCase()} found</p>
                  <p className="text-xs text-[#5C6773] mt-1">Cases will appear here as you log implants</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tabImplants.map(imp => (
                    <CaseRow
                      key={imp.id}
                      implant={imp}
                      patient={patientMap[imp.patient_id]}
                      accent={tabCfg.accent}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Healing Phase Implants ── */}
        {healingImplants.length > 0 && (
          <div data-testid="healing-phase-section">
            <div className="flex items-center gap-2 mb-3">
              <Timer size={18} className="text-[#82A098]" weight="fill" />
              <h3 className="text-base font-semibold text-[#2A2F35]" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                Osseointegration in Progress
              </h3>
              <span className="ml-auto bg-[#82A098] text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                {healingImplants.length}
              </span>
            </div>
            <div className="space-y-2">
              {healingImplants.map((item) => {
                const daysRemaining = item.daysRemaining;
                const pct = item.surgery_date
                  ? Math.min(100, Math.max(0, Math.round(((item.osseointegration_days - daysRemaining) / item.osseointegration_days) * 100)))
                  : null;
                const isNearDone = daysRemaining !== null && daysRemaining <= 14 && daysRemaining > 0;
                return (
                  <Link
                    key={item.id}
                    to={`/patients/${item.patient_id}`}
                    data-testid={`healing-implant-${item.id}`}
                    className="flex items-center justify-between bg-white border border-[#E5E5E2] rounded-xl px-4 py-3 hover:border-[#82A098]/50 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#82A098]/15 flex items-center justify-center text-[#82A098] font-bold text-sm shrink-0">
                        {item.tooth_number ?? '—'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#2A2F35]">{item.patientName}</p>
                        <p className="text-xs text-[#5C6773]">
                          {item.brand ? `${item.brand} · ` : ''}Tooth #{item.tooth_number ?? '—'}
                          {item.surgery_date ? ` · Placed ${fmtDate(item.surgery_date)}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-3 flex flex-col items-end gap-1">
                      {daysRemaining === null ? (
                        <span className="text-xs text-[#5C6773]">No surgery date</span>
                      ) : daysRemaining > 0 ? (
                        <>
                          <span
                            data-testid={`healing-countdown-${item.id}`}
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: isNearDone ? '#E8A76C20' : '#82A09820',
                              color: isNearDone ? '#E8A76C' : '#82A098',
                            }}
                          >
                            {daysRemaining}d left
                          </span>
                          {pct !== null && (
                            <div className="w-16 h-1 bg-[#E5E5E2] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: isNearDone ? '#E8A76C' : '#82A098',
                                }}
                              />
                            </div>
                          )}
                        </>
                      ) : (
                        <span
                          data-testid={`healing-overdue-${item.id}`}
                          className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E8A76C]/20 text-[#E8A76C]"
                        >
                          Ready for stage 2
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Second Stage Reminders ── */}
        {dueImplants.length > 0 && (
          <div data-testid="second-stage-reminders">
            <div className="flex items-center gap-2 mb-3">
              <Bell size={18} className="text-[#C27E70]" weight="fill" />
              <h3 className="text-base font-semibold text-[#2A2F35]" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                Ready for Second Stage
              </h3>
              <span className="ml-auto bg-[#C27E70] text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                {dueImplants.length}
              </span>
            </div>
            <div className="space-y-2">
              {dueImplants.map((item) => (
                <Link
                  key={item.implant_id}
                  to={`/patients/${item.patient_id}`}
                  data-testid={`second-stage-alert-${item.implant_id}`}
                  className="flex items-center justify-between bg-[#FDF5F3] border border-[#C27E70]/30 rounded-xl px-4 py-3 hover:border-[#C27E70] hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#C27E70] flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {item.tooth_number}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#2A2F35]">{item.patient_name}</p>
                      <p className="text-xs text-[#5C6773]">
                        {item.brand} · Tooth #{item.tooth_number}
                        {item.case_number ? ` · ${item.case_number}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-xs font-semibold text-[#C27E70]">Day {item.days_elapsed}</p>
                    <p className="text-[10px] text-[#5C6773]">of {item.osseointegration_days} days</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Active Patient Queue ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-[#2A2F35]" style={{ fontFamily: 'Work Sans, sans-serif' }}>
              Active Patient Queue
            </h3>
            <Link to="/patients" className="text-[#82A098] text-sm font-medium hover:text-[#6B8A82] transition-colors flex items-center gap-1">
              View All <ArrowRight size={14} />
            </Link>
          </div>

          {patients.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E5E5E2] p-6 text-center">
              <p className="text-sm text-[#5C6773]">No patients yet. <Link to="/patients" className="text-[#82A098] font-medium">Add your first patient</Link></p>
            </div>
          ) : (
            <div className="space-y-3">
              {patients.slice(0, 5).map((patient, index) => (
                <Link
                  key={patient.id || patient._id}
                  to={`/patients/${patient.id || patient._id}`}
                  data-testid={`patient-queue-${patient.id || patient._id}`}
                  className="bg-white rounded-xl p-4 border border-[#E5E5E2] hover:border-[#82A098]/50 hover:shadow-md transition-all duration-200 flex items-center gap-4"
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-[#1E40AF] font-bold text-sm flex-shrink-0"
                    style={{ backgroundColor: getStageColor(index) }}
                  >
                    {getInitials(patient.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#2A2F35] truncate">{patient.name}</p>
                    <p className="text-xs text-[#5C6773]">ID #{String(patient.id || patient._id || '').slice(-8).toUpperCase()}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-[#5C6773]">
                      <CalendarDots size={12} />
                      <span>{fmtDate(patient.created_at)}</span>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-[#5C6773] flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Bottom Stats ── */}
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 md:gap-4">
          <div className="bg-white rounded-xl p-4 border border-[#E5E5E2]">
            <p className="text-2xl font-bold text-[#2A2F35]">{analytics?.total_implants || 0}</p>
            <p className="text-sm text-[#5C6773]">Total Implants</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-[#E5E5E2]">
            <p className="text-2xl font-bold text-[#2A2F35]">{analytics?.total_clinics || 0}</p>
            <p className="text-sm text-[#5C6773]">Clinics</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-[#E5E5E2]">
            <p className="text-2xl font-bold text-[#2A2F35]">{analytics?.pending_osseointegration || 0}</p>
            <p className="text-sm text-[#5C6773]">Healing Phase</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
