import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import {
  CalendarDots, Bell, ArrowRight, CheckCircle,
  XCircle, Warning, Heartbeat, X, Tooth
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { getAnalyticsOverview, getDueForSecondStage, getAllImplants, getDueForImplant } from '../api/dashboard';
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

// Group implants placed on the same patient + same surgery date into a single
// clinical case — implants placed together heal together, so they belong in
// one card, not one card per tooth. Implants without a surgery date, or a
// different date, always get their own case.
const groupIntoCases = (implants) => {
  const groups = new Map();
  implants.forEach(imp => {
    const dateKey = imp.surgery_date ? new Date(imp.surgery_date).toDateString() : null;
    const key = dateKey ? `${imp.patient_id}::${dateKey}` : `solo::${imp.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(imp);
  });
  return Array.from(groups.values());
};

// Group implants purely by patient — used for the Active/Completed lists,
// where we only care which patients currently have something healing or
// finished, not how many implants or sessions they have.
const groupByPatient = (implants) => {
  const groups = new Map();
  implants.forEach(imp => {
    if (!groups.has(imp.patient_id)) groups.set(imp.patient_id, []);
    groups.get(imp.patient_id).push(imp);
  });
  return Array.from(groups.values());
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
    compact: true, // one row per patient, name only — regardless of implant count
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
    compact: true, // one row per patient, name only — regardless of implant count
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
// `implants` is a group of one or more implant records — either a single
// clinical case (same patient + same surgery date) or, in `compact` mode,
// every implant a patient has in this bucket, collapsed to just their name.
function CaseRow({ implants, patient, accent, compact }) {
  const first = implants[0];
  const patientId = patient?.id || patient?._id || first.patient_id;

  if (compact) {
    return (
      <Link
        to={`/patients/${patientId}`}
        data-testid={`case-row-${patientId}`}
        className="flex items-center gap-4 p-4 bg-white rounded-xl border border-[#E5E5E2] hover:border-[#82A098]/50 hover:shadow-sm transition-all duration-150 group"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ backgroundColor: accent }}
        >
          {getInitials(patient?.name || 'UN')}
        </div>
        <p className="flex-1 min-w-0 text-sm font-semibold text-[#2A2F35] truncate">
          {patient?.name || 'Unknown Patient'}
        </p>
        <ArrowRight size={14} className="text-[#5C6773] group-hover:text-[#2A2F35] transition-colors flex-shrink-0" />
      </Link>
    );
  }

  const teeth = implants.map(i => i.tooth_number).filter(Boolean);
  const caseNumbers = [...new Set(implants.map(i => i.case_number).filter(Boolean))];
  const brands = [...new Set(implants.map(i => i.brand).filter(Boolean))];
  const outcomes = [...new Set(implants.map(i => i.implant_outcome).filter(Boolean))];

  return (
    <Link
      to={`/patients/${patientId}`}
      data-testid={`case-row-${first.id}`}
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
          {caseNumbers.length > 0 && (
            <span className="text-xs text-[#5C6773]">{caseNumbers.join(', ')}</span>
          )}
          <span className="text-xs text-[#5C6773]">
            {teeth.length > 1 ? `Teeth #${teeth.join(', #')}` : `Tooth #${teeth[0]}`}
          </span>
          {brands.length > 0 && <span className="text-xs text-[#5C6773]">{brands.join(' / ')}</span>}
          {first.surgery_date && (
            <span className="flex items-center gap-1 text-xs text-[#5C6773]">
              <CalendarDots size={11} /> {fmtDate(first.surgery_date)}
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
          {outcomes.length > 0 ? outcomes.join(' / ') : 'Pending'}
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
  const [dueExtractions, setDueExtractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(null); // null | 'active' | 'completed' | 'guarded' | 'failed'

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [summary, patientsData, dueData, implantsData, dueExtractionData] = await Promise.all([
        getAnalyticsOverview(),
        getPatients({ perPage: 100 }),
        getDueForSecondStage().catch(() => []),
        getAllImplants().catch(() => []),
        getDueForImplant().catch(() => []),
      ]);
      setAnalytics(summary);
      const patientList = patientsData.items ?? patientsData;
      setPatients(patientList);
      setDueImplants(dueData);
      setAllImplants(implantsData);
      setDueExtractions(dueExtractionData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Build patient lookup map
  const patientMap = patients.reduce((acc, p) => { acc[p.id || p._id] = p; return acc; }, {});

  // Bucket implants by outcome, then group them for display: Active/Completed
  // collapse to one row per patient (regardless of implant count), the other
  // tabs group same-patient/same-date implants into single cases.
  const buckets = { active: [], completed: [], guarded: [], failed: [] };
  allImplants.forEach(imp => { buckets[classify(imp)].push(imp); });
  const caseBuckets = {
    active: groupByPatient(buckets.active),
    completed: groupByPatient(buckets.completed),
    guarded: groupIntoCases(buckets.guarded),
    failed: groupIntoCases(buckets.failed),
  };

  const handleStatClick = (key) => {
    setActiveTab(prev => (prev === key ? null : key));
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
  const tabCases = activeTab ? caseBuckets[activeTab] : [];

  return (
    <div className="min-h-screen bg-[#F9F9F8]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
      {/* Header */}
      <div className="bg-white border-b border-[#E5E5E2] px-6 py-4">
        <h1 className="text-2xl font-semibold text-[#2A2F35]" style={{ fontFamily: 'Work Sans, sans-serif' }}>
          Clinical Cases
        </h1>
      </div>

      <div className="p-4 md:p-6 space-y-6">

        {/* ── 4 Stat Boxes ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.values(TAB_CONFIG).map(cfg => {
            const Icon = cfg.icon;
            const count = caseBuckets[cfg.key].length;
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
                  {tabCases.length} case{tabCases.length !== 1 ? 's' : ''}
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
              {tabCases.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Tooth size={40} className="text-[#E5E5E2] mb-3" weight="fill" />
                  <p className="text-sm font-medium text-[#5C6773]">No {tabCfg.label.toLowerCase()} found</p>
                  <p className="text-xs text-[#5C6773] mt-1">Cases will appear here as you log implants</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tabCases.map(group => (
                    <CaseRow
                      key={tabCfg.compact ? group[0].patient_id : group[0].id}
                      implants={group}
                      patient={patientMap[group[0].patient_id]}
                      accent={tabCfg.accent}
                      compact={tabCfg.compact}
                    />
                  ))}
                </div>
              )}
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

        {/* ── Ready-for-Implant Reminders (extraction sites healed & waiting) ── */}
        {dueExtractions.length > 0 && (
          <div data-testid="implant-placement-reminders">
            <div className="flex items-center gap-2 mb-3">
              <Bell size={18} className="text-[#2563EB]" weight="fill" />
              <h3 className="text-base font-semibold text-[#2A2F35]" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                Ready for Implant Placement
              </h3>
              <span className="ml-auto bg-[#2563EB] text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                {dueExtractions.length}
              </span>
            </div>
            <div className="space-y-2">
              {dueExtractions.map((item) => (
                <Link
                  key={item.extraction_id}
                  to={`/patients/${item.patient_id}`}
                  data-testid={`implant-placement-alert-${item.extraction_id}`}
                  className="flex items-center justify-between bg-[#EFF6FF] border border-[#2563EB]/30 rounded-xl px-4 py-3 hover:border-[#2563EB] hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {item.tooth_numbers.join(',')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#2A2F35]">{item.patient_name}</p>
                      <p className="text-xs text-[#5C6773]">
                        Extracted {item.extraction_date} · Tooth {item.tooth_numbers.join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-xs font-semibold text-[#2563EB]">Day {item.days_elapsed}</p>
                    <p className="text-[10px] text-[#5C6773]">of {item.reminder_days} days</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

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
