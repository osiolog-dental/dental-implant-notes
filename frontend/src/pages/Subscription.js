import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import ContactModal from '../components/ContactModal';
import {
  CheckCircle, X, Crown, Buildings, User,
  HardDrive, ArrowRight, Star, Rocket, Plus, Users,
  GoogleLogo, CloudCheck, LinkBreak,
} from '@phosphor-icons/react';


/* Discount rules for multi-month billing — Pro and Clinic only (see plan.discountEligible) */
const SIX_MONTH_DISCOUNT = 0.10;
const YEARLY_DISCOUNT = 0.20;

/* ── Plan definitions ── */
const PLANS = [
  {
    key: 'free',
    name: 'Free',
    icon: User,
    iconColor: '#6B7280',
    storage: '100 MB',
    storageMB: 100,
    priceMonthly: 0,
    priceMonthlyINR: 0,
    discountEligible: false,
    color: '#6B7280',
    bg: '#F9F9F8',
    border: '#E5E5E2',
    baseClinics: 1,
    features: [
      'Up to 50 patients',
      '100 MB photo storage',
      'FDI dental chart',
      'Implant & FPD logs',
      'PDF report export',
      'Local backup',
      '1 clinic',
    ],
    missing: [
      'Google Drive backup',
      'Priority support',
      'Analytics dashboard',
    ],
    badge: null,
  },
  {
    key: 'basic',
    name: 'Basic',
    icon: Crown,
    iconColor: '#3B82F6',
    storage: '1 GB',
    storageMB: 1024,
    priceMonthly: 5,
    priceMonthlyINR: 35,
    discountEligible: false,
    color: '#3B82F6',
    bg: '#EFF6FF',
    border: '#3B82F6',
    baseClinics: 1,
    features: [
      'Up to 250 patients',
      '1 GB photo storage',
      'FDI dental chart',
      'Implant & FPD logs',
      'PDF report export',
      'Local backup',
      '1 clinic',
    ],
    missing: [
      'Google Drive backup',
      'Priority support',
      'Analytics dashboard',
    ],
    badge: null,
  },
  {
    key: 'pro',
    name: 'Pro',
    icon: Star,
    iconColor: '#82A098',
    storage: '5 GB',
    storageMB: 5120,
    priceMonthly: 12,
    priceMonthlyINR: 112,
    discountEligible: true,
    color: '#82A098',
    bg: '#EEF4F3',
    border: '#82A098',
    baseClinics: 1,
    features: [
      'Unlimited patients',
      '5 GB photo & radiograph storage',
      'FDI dental chart',
      'Implant & FPD logs',
      'PDF report export',
      'Google Drive backup',
      'Analytics dashboard',
      'Priority email support',
      '1 clinic',
    ],
    missing: [],
    badge: 'Most Popular',
    badgeColor: '#82A098',
  },
  {
    key: 'clinic',
    name: 'Clinic',
    icon: Buildings,
    iconColor: '#C27E70',
    storage: '20 GB',
    storageMB: 20480,
    priceMonthly: 29,
    priceMonthlyINR: 499,
    discountEligible: true,
    color: '#C27E70',
    bg: '#FDF6F4',
    border: '#C27E70',
    baseClinics: 5,
    features: [
      'Unlimited patients',
      '20 GB photo & radiograph storage',
      'FDI dental chart',
      'Implant & FPD logs',
      'PDF report export',
      'Google Drive backup',
      'Advanced analytics',
      '5 clinics',
      'Priority phone & email support',
      'Custom branding on reports',
    ],
    missing: [],
    badge: 'Best Value',
    badgeColor: '#C27E70',
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    icon: Rocket,
    iconColor: '#7C3AED',
    storage: '100 GB',
    storageMB: 102400,
    priceMonthly: 79,
    priceMonthlyINR: 1999,
    discountEligible: true,
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#7C3AED',
    baseClinics: null,
    features: [
      'Unlimited patients',
      '100 GB photo & radiograph storage',
      'FDI dental chart',
      'Implant & FPD logs',
      'PDF report export',
      'Google Drive backup',
      'Advanced analytics',
      'Unlimited clinics',
      'Priority phone & email support',
      'Custom branding on reports',
    ],
    missing: [],
    badge: 'Highest Storage',
    badgeColor: '#7C3AED',
  },
];

/* Clinic add-on — lets basic/pro/clinic plans raise their base clinic limit
   without changing plan. Keep in sync with CLINIC_ADDON_OPTIONS in
   backend/app/core/plans.py. Enterprise is already unlimited so has no
   add-on, and Free has no add-on path (upsell only applies to paid plans). */
const CLINIC_ADDON_OPTIONS = [
  { clinics: 5, priceInr: 5, priceUsd: 0.1 },
  { clinics: 10, priceInr: 10, priceUsd: 0.2 },
];
const PLANS_WITH_CLINIC_ADDON = new Set(['basic', 'pro', 'clinic']);

/* Extra storage, in 10 GB blocks, addable to any plan without changing it.
   Priced with a healthy margin over the underlying Cloudflare R2 cost
   (~$0.015/GB-month, i.e. ~$0.15 per 10 GB) — see the note next to the UI. */
const STORAGE_ADDON_BLOCK_GB = 10;
const STORAGE_ADDON_PRICE_INR = 49;   // per 10 GB / month
const STORAGE_ADDON_PRICE_USD = 0.99; // per 10 GB / month
const STORAGE_ADDON_OPTIONS = [1, 2, 3]; // ×10 GB blocks → 10 / 20 / 30 GB

function StorageMeter({ usedMB, limitMB, color }) {
  const pct = limitMB ? Math.min((usedMB / limitMB) * 100, 100) : 0;
  const isWarning = pct > 80;
  return (
    <div>
      <div className="flex justify-between text-xs text-[#5C6773] mb-1">
        <span>{usedMB < 1 ? `${(usedMB * 1024).toFixed(0)} KB` : `${usedMB.toFixed(1)} MB`} used</span>
        <span>{limitMB >= 1024 ? `${(limitMB / 1024).toFixed(0)} GB` : `${limitMB} MB`} total</span>
      </div>
      <div className="h-2 bg-[#E5E5E2] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: isWarning ? '#EF4444' : color,
          }}
        />
      </div>
      {isWarning && (
        <p className="text-xs text-red-500 mt-1">Storage almost full — consider upgrading</p>
      )}
    </div>
  );
}

export default function Subscription() {
  const { user } = useAuth();
  const { country } = useLocale();
  const isIndia = country.currency === 'INR';
  const currencySymbol = isIndia ? '₹' : '$';
  const [searchParams, setSearchParams] = useSearchParams();
  const [billing, setBilling] = useState('monthly'); // 'monthly' | 'sixmonth' | 'yearly'
  const [status, setStatus] = useState(null);
  const [storageStatus, setStorageStatus] = useState(null);
  const [connectingDrive, setConnectingDrive] = useState(false);
  const [switchingBackend, setSwitchingBackend] = useState(false);
  const [addingStorage, setAddingStorage] = useState(null); // blocks count currently submitting
  const [upgradeRequest, setUpgradeRequest] = useState(null); // { subject, message } or null

  const fetchStorageStatus = () => {
    client.get('/api/storage/status').then(r => setStorageStatus(r.data)).catch(() => {});
  };

  useEffect(() => {
    client.get('/api/subscription/status')
      .then(r => setStatus(r.data))
      .catch(() => {});
    fetchStorageStatus();
  }, []);

  // Land back here after the Google OAuth redirect — surface the result once, then clean the URL.
  useEffect(() => {
    if (searchParams.get('drive_connected')) {
      toast.success('Google Drive connected');
      fetchStorageStatus();
      setSearchParams({}, { replace: true });
    } else if (searchParams.get('drive_error')) {
      const messages = {
        access_denied: 'Google Drive connection was cancelled',
        invalid_state: 'That connection link expired — please try again',
        no_refresh_token: 'Google needs a fresh consent — revoke Osiolog access in your Google Account and try connecting again',
        connect_failed: 'Could not connect Google Drive — please try again',
      };
      toast.error(messages[searchParams.get('drive_error')] || 'Could not connect Google Drive');
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const connectGoogleDrive = async () => {
    setConnectingDrive(true);
    try {
      const { data } = await client.get('/api/storage/google-drive/connect-url');
      window.location.href = data.url;
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not start Google Drive connection');
      setConnectingDrive(false);
    }
  };

  const disconnectGoogleDrive = async () => {
    if (!window.confirm('Disconnect Google Drive? New photos will go back to our storage.')) return;
    try {
      await client.delete('/api/storage/google-drive');
      toast.success('Google Drive disconnected');
      fetchStorageStatus();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not disconnect');
    }
  };

  const setStorageBackend = async (backend) => {
    setSwitchingBackend(true);
    try {
      await client.post('/api/storage/backend', { backend });
      toast.success(backend === 'google_drive' ? 'New photos will now save to your Google Drive' : 'New photos will now save to our storage');
      fetchStorageStatus();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not switch storage');
    } finally {
      setSwitchingBackend(false);
    }
  };

  const currentPlan = status?.plan || 'free';

  // There's no self-serve checkout yet — requesting a plan change opens the
  // Contact form pre-filled, so it reaches admin@osiolog.com directly
  // instead of hitting a payment integration that doesn't exist.
  const requestUpgrade = (planKey, effectiveBilling) => {
    if (planKey === currentPlan) return;
    const planName = planKey.charAt(0).toUpperCase() + planKey.slice(1);
    const billingLabel = effectiveBilling === 'yearly' ? 'yearly' : effectiveBilling === 'sixmonth' ? '6-month' : 'monthly';
    setUpgradeRequest({
      subject: `${planKey === 'free' ? 'Downgrade' : 'Upgrade'} to ${planName} plan`,
      message: `I'd like to switch from my current ${currentPlan} plan to the ${planName} plan (${billingLabel} billing). Please let me know how to proceed with payment.`,
    });
  };

  // Same interim pattern as plan upgrades — no self-serve checkout yet, so
  // this opens the Contact form pre-filled and admin applies it manually
  // via Organization.extra_clinics in the Admin panel.
  const requestClinicAddon = (clinics, priceInr, priceUsd) => {
    setUpgradeRequest({
      subject: `Add ${clinics} more clinics to my ${currentPlan} plan`,
      message: `I'd like to add ${clinics} extra clinic slots on top of my current ${currentPlan} plan `
        + `(+${isIndia ? `₹${priceInr}` : `$${priceUsd}`}/month). Please let me know how to proceed with payment.`,
    });
  };

  const handleAddStorage = async (blocks) => {
    setAddingStorage(blocks);
    try {
      await client.post('/api/subscription/storage-addon', { blocks, gb: blocks * STORAGE_ADDON_BLOCK_GB });
      toast.success(`+${blocks * STORAGE_ADDON_BLOCK_GB} GB added to your plan`);
      const r = await client.get('/api/subscription/status');
      setStatus(r.data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not add storage');
    } finally {
      setAddingStorage(null);
    }
  };

  const currentPlanDef = PLANS.find(p => p.key === currentPlan) || PLANS[0];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-semibold text-[#2A2F35] tracking-tight mb-2" style={{ fontFamily: 'Work Sans, sans-serif' }}>
          Choose Your Plan
        </h1>
        <p className="text-[#5C6773]">Scale your practice management as you grow</p>
      </div>

      {/* Current plan + storage usage */}
      {status && (
        <div className="bg-white border border-[#E5E5E2] rounded-xl p-5 mb-8 flex flex-col sm:flex-row gap-5 items-start">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: currentPlanDef.color + '20' }}>
              {(() => { const Icon = currentPlanDef.icon; return <Icon size={20} color={currentPlanDef.color} weight="fill" />; })()}
            </div>
            <div>
              <p className="text-xs text-[#5C6773]">Current plan</p>
              <p className="font-bold text-[#2A2F35]">{currentPlanDef.name}</p>
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <HardDrive size={14} className="text-[#82A098]" />
                <span className="text-xs font-medium text-[#5C6773]">Storage Usage</span>
              </div>
              <StorageMeter
                usedMB={status.used_mb}
                limitMB={status.limit_mb}
                color={currentPlanDef.color}
              />
            </div>
            {status.patient_limit != null && (
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5 font-medium text-[#5C6773]"><Users size={14} className="text-[#82A098]" /> Patients</span>
                  <span className="text-[#5C6773]">{status.patient_count} / {status.patient_limit}</span>
                </div>
                <div className="h-2 bg-[#E5E5E2] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((status.patient_count / status.patient_limit) * 100, 100)}%`,
                      background: status.patient_count >= status.patient_limit ? '#EF4444' : currentPlanDef.color,
                    }}
                  />
                </div>
              </div>
            )}
            {status.clinic_limit != null && (
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5 font-medium text-[#5C6773]"><Buildings size={14} className="text-[#82A098]" /> Clinics</span>
                  <span className="text-[#5C6773]">{status.clinic_count} / {status.clinic_limit}</span>
                </div>
                <div className="h-2 bg-[#E5E5E2] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((status.clinic_count / status.clinic_limit) * 100, 100)}%`,
                      background: status.clinic_count >= status.clinic_limit ? '#EF4444' : currentPlanDef.color,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          {status.plan_end && (
            <div className="shrink-0 text-right">
              <p className="text-xs text-[#9CA3AF]">Renews</p>
              <p className="text-xs font-medium text-[#2A2F35]">
                {new Date(status.plan_end).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Photo storage backend choice */}
      {storageStatus && (
        <div className="bg-white border border-[#E5E5E2] rounded-xl p-6 mb-8">
          <h3 className="font-semibold text-[#2A2F35] mb-1">Where should your photos be stored?</h3>
          <p className="text-xs text-[#5C6773] mb-4">
            New case photos go to whichever you pick below. Switching doesn't move photos already uploaded.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Our storage */}
            <div
              className="border-2 rounded-xl p-4"
              style={{ borderColor: storageStatus.backend === 'platform' ? '#82A098' : '#E5E5E2' }}
              data-testid="storage-option-platform"
            >
              <div className="flex items-center gap-2 mb-2">
                <HardDrive size={18} className="text-[#82A098]" />
                <p className="font-semibold text-[#2A2F35] text-sm">Our Storage (Cloudflare)</p>
                {storageStatus.backend === 'platform' && (
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-[#82A098]">Active</span>
                )}
              </div>
              <p className="text-xs text-[#5C6773] mb-3">
                Included in your plan — {currentPlanDef.storage} on {currentPlanDef.name}. No setup needed.
              </p>
              {storageStatus.backend !== 'platform' && (
                <button
                  onClick={() => setStorageBackend('platform')}
                  disabled={switchingBackend}
                  data-testid="use-platform-storage"
                  className="w-full py-2 rounded-lg text-xs font-semibold border border-[#82A098] text-[#82A098] hover:bg-[#82A098] hover:text-white transition-colors disabled:opacity-60"
                >
                  Use Our Storage
                </button>
              )}
            </div>

            {/* Google Drive */}
            <div
              className="border-2 rounded-xl p-4"
              style={{ borderColor: storageStatus.backend === 'google_drive' ? '#82A098' : '#E5E5E2' }}
              data-testid="storage-option-google-drive"
            >
              <div className="flex items-center gap-2 mb-2">
                <GoogleLogo size={18} className="text-[#4285F4]" weight="bold" />
                <p className="font-semibold text-[#2A2F35] text-sm">Your Google Drive</p>
                {storageStatus.backend === 'google_drive' && (
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-[#82A098]">Active</span>
                )}
              </div>
              <p className="text-xs text-[#5C6773] mb-3">
                Uses your own Drive quota — 15 GB free from Google, or their Google One plans
                (e.g. ~{currencySymbol}{isIndia ? '130' : '1.99'}/month for 100 GB) billed directly by Google, not us.
              </p>

              {!storageStatus.google_drive_configured ? (
                <p className="text-[11px] text-[#9CA3AF]">Not available yet.</p>
              ) : !storageStatus.google_drive_connected ? (
                <button
                  onClick={connectGoogleDrive}
                  disabled={connectingDrive}
                  data-testid="connect-google-drive"
                  className="w-full py-2 rounded-lg text-xs font-semibold border border-[#4285F4] text-[#4285F4] hover:bg-[#4285F4] hover:text-white transition-colors disabled:opacity-60"
                >
                  {connectingDrive ? 'Redirecting…' : 'Connect Google Drive'}
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-[#5C6773] flex items-center gap-1">
                    <CloudCheck size={13} className="text-emerald-600" /> Connected as {storageStatus.google_drive_email}
                  </p>
                  {storageStatus.backend !== 'google_drive' ? (
                    <button
                      onClick={() => setStorageBackend('google_drive')}
                      disabled={switchingBackend}
                      data-testid="use-google-drive-storage"
                      className="w-full py-2 rounded-lg text-xs font-semibold border border-[#4285F4] text-[#4285F4] hover:bg-[#4285F4] hover:text-white transition-colors disabled:opacity-60"
                    >
                      Use Google Drive
                    </button>
                  ) : null}
                  <button
                    onClick={disconnectGoogleDrive}
                    data-testid="disconnect-google-drive"
                    className="w-full py-1.5 rounded-lg text-[11px] font-medium text-[#9CA3AF] hover:text-red-600 flex items-center justify-center gap-1"
                  >
                    <LinkBreak size={12} /> Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Billing period selector */}
      <div className="flex flex-col items-center gap-2 mb-8">
        <div className="inline-flex rounded-xl bg-[#F0F0EE] p-1">
          {[
            { key: 'monthly', label: 'Monthly' },
            { key: 'sixmonth', label: '6 Months', save: 10 },
            { key: 'yearly', label: 'Yearly', save: 20 },
          ].map(opt => (
            <button
              key={opt.key}
              data-testid={`billing-toggle-${opt.key}`}
              onClick={() => setBilling(opt.key)}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                billing === opt.key ? 'bg-white text-[#2A2F35] shadow-sm' : 'text-[#5C6773] hover:text-[#2A2F35]'
              }`}
            >
              {opt.label}
              {opt.save && (
                <span className="ml-1.5 text-[10px] font-bold bg-[#82A098] text-white px-1.5 py-0.5 rounded-full">
                  Save {opt.save}%
                </span>
              )}
            </button>
          ))}
        </div>
        {billing !== 'monthly' && (
          <p className="text-xs text-[#9CA3AF]">6-month and yearly discounts apply to Pro and Clinic plans only</p>
        )}
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 mb-10">
        {PLANS.map(plan => {
          const Icon = plan.icon;
          const isCurrent = plan.key === currentPlan;
          const baseMonthly = isIndia ? plan.priceMonthlyINR : plan.priceMonthly;
          // Basic and Free never get the 6-month/yearly discount — always show monthly pricing for them.
          const effectiveBilling = plan.discountEligible ? billing : 'monthly';
          const months = effectiveBilling === 'yearly' ? 12 : effectiveBilling === 'sixmonth' ? 6 : 1;
          const discount = effectiveBilling === 'yearly' ? YEARLY_DISCOUNT : effectiveBilling === 'sixmonth' ? SIX_MONTH_DISCOUNT : 0;
          const price = baseMonthly > 0 ? Math.round(baseMonthly * months * (1 - discount)) : 0;
          const periodLabel = effectiveBilling === 'yearly' ? '/yr' : effectiveBilling === 'sixmonth' ? '/6mo' : '/mo';
          const perMonth = months > 1 && price > 0 ? Math.round(price / months) : null;
          const billingNote = !plan.discountEligible && billing !== 'monthly' && baseMonthly > 0
            ? 'Billed monthly only'
            : null;

          return (
            <div
              key={plan.key}
              data-testid={`plan-card-${plan.key}`}
              className="relative rounded-2xl border-2 p-6 flex flex-col transition-all"
              style={{
                borderColor: isCurrent ? plan.color : plan.border,
                background: plan.bg,
                boxShadow: isCurrent ? `0 0 0 3px ${plan.color}22` : undefined,
              }}
            >
              {/* Badge */}
              {plan.badge && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white px-3 py-1 rounded-full whitespace-nowrap"
                  style={{ background: plan.badgeColor }}
                >
                  {plan.badge}
                </div>
              )}

              {/* Plan icon + name */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: plan.color + '20' }}>
                  <Icon size={20} color={plan.color} weight="fill" />
                </div>
                <div>
                  <h2 className="font-bold text-[#2A2F35] text-lg" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                    {plan.name}
                  </h2>
                  <p className="text-xs text-[#5C6773]">{plan.storage} storage</p>
                </div>
              </div>

              {/* Price */}
              <div className="mb-5">
                {price === 0 ? (
                  <div className="text-3xl font-bold text-[#2A2F35]">Free</div>
                ) : (
                  <>
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-bold text-[#2A2F35]">{currencySymbol}{price}</span>
                      <span className="text-sm text-[#5C6773] mb-1">{periodLabel}</span>
                    </div>
                    {perMonth && (
                      <p className="text-xs text-[#5C6773]">
                        {currencySymbol}{perMonth}/month billed {effectiveBilling === 'yearly' ? 'yearly' : 'every 6 months'}
                      </p>
                    )}
                    {billingNote && (
                      <p className="text-xs text-[#9CA3AF]">{billingNote}</p>
                    )}
                  </>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-[#2A2F35]">
                    <CheckCircle size={14} weight="fill" color={plan.color} className="shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
                {plan.missing.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-[#9CA3AF]">
                    <X size={14} weight="bold" className="shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA button */}
              <button
                data-testid={`upgrade-${plan.key}`}
                onClick={() => requestUpgrade(plan.key, effectiveBilling)}
                disabled={isCurrent}
                className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: isCurrent ? plan.color + '18' : plan.color,
                  color: isCurrent ? plan.color : '#fff',
                  border: `1.5px solid ${plan.color}`,
                }}
              >
                {isCurrent ? (
                  <>
                    <CheckCircle size={15} weight="fill" /> Current Plan
                  </>
                ) : (
                  <>
                    {plan.key === 'free' ? 'Downgrade' : 'Upgrade'} <ArrowRight size={14} weight="bold" />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Extra storage add-on — stays on the same plan */}
      <div className="bg-white border border-[#E5E5E2] rounded-xl p-6 mb-8">
        <div className="flex items-center gap-2 mb-1">
          <HardDrive size={18} className="text-[#82A098]" />
          <h3 className="font-semibold text-[#2A2F35]">Need More Storage?</h3>
        </div>
        <p className="text-xs text-[#5C6773] mb-4">
          Add extra photo/radiograph storage in {STORAGE_ADDON_BLOCK_GB} GB blocks without changing your plan.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {STORAGE_ADDON_OPTIONS.map(blocks => {
            const gb = blocks * STORAGE_ADDON_BLOCK_GB;
            const price = blocks * (isIndia ? STORAGE_ADDON_PRICE_INR : STORAGE_ADDON_PRICE_USD);
            return (
              <div
                key={blocks}
                data-testid={`storage-addon-${gb}gb`}
                className="border border-[#E5E5E2] rounded-xl p-4 flex flex-col items-center text-center hover:border-[#82A098] transition-colors"
              >
                <p className="text-2xl font-bold text-[#2A2F35]">+{gb} GB</p>
                <p className="text-xs text-[#5C6773] mb-3">
                  {currencySymbol}{isIndia ? price : price.toFixed(2)}/month
                </p>
                <button
                  data-testid={`add-storage-${gb}gb`}
                  onClick={() => handleAddStorage(blocks)}
                  disabled={addingStorage === blocks}
                  className="w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#82A098] text-[#82A098] hover:bg-[#82A098] hover:text-white transition-colors disabled:opacity-60"
                >
                  {addingStorage === blocks
                    ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    : <Plus size={13} weight="bold" />}
                  Add {gb} GB
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-[#9CA3AF] mt-4">
          Storage add-ons apply to any plan, including Free. Priced above our own storage cost
          (Cloudflare R2) so it stays cheap for you while remaining sustainable for us.
        </p>
      </div>

      {/* Extra clinics add-on — Basic/Pro/Clinic only; Enterprise is already unlimited */}
      {PLANS_WITH_CLINIC_ADDON.has(currentPlan) && (
        <div className="bg-white border border-[#E5E5E2] rounded-xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Buildings size={18} className="text-[#82A098]" />
            <h3 className="font-semibold text-[#2A2F35]">Need More Clinics?</h3>
          </div>
          <p className="text-xs text-[#5C6773] mb-4">
            Raise your clinic limit above your plan's base of {currentPlanDef.baseClinics} without upgrading plans.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CLINIC_ADDON_OPTIONS.map(opt => (
              <div
                key={opt.clinics}
                data-testid={`clinic-addon-${opt.clinics}`}
                className="border border-[#E5E5E2] rounded-xl p-4 flex flex-col items-center text-center hover:border-[#82A098] transition-colors"
              >
                <p className="text-2xl font-bold text-[#2A2F35]">+{opt.clinics} clinics</p>
                <p className="text-xs text-[#5C6773] mb-3">
                  {currencySymbol}{isIndia ? opt.priceInr : opt.priceUsd}/month
                </p>
                <button
                  data-testid={`add-clinics-${opt.clinics}`}
                  onClick={() => requestClinicAddon(opt.clinics, opt.priceInr, opt.priceUsd)}
                  className="w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#82A098] text-[#82A098] hover:bg-[#82A098] hover:text-white transition-colors"
                >
                  <Plus size={13} weight="bold" /> Add {opt.clinics} Clinics
                </button>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[#9CA3AF] mt-4">
            No self-serve payment yet — this sends a request to admin who applies it to your account.
          </p>
        </div>
      )}

      {/* Feature comparison table */}
      <div className="bg-white border border-[#E5E5E2] rounded-xl overflow-hidden mb-8">
        <div className="px-5 py-4 border-b border-[#E5E5E2]">
          <h3 className="font-semibold text-[#2A2F35]">Full Feature Comparison</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E2]">
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#5C6773] w-1/2">Feature</th>
                {PLANS.map(p => (
                  <th key={p.key} className="text-center px-3 py-3 text-xs font-bold"
                    style={{ color: p.color }}>{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EDE8]">
              {[
                ['Patients',            '50',        '250',       'Unlimited',  'Unlimited',  'Unlimited'],
                ['Storage',             '100 MB',    '1 GB',      '5 GB',       '20 GB',      '100 GB'],
                ['Clinics',             '1',         '1',         '1',          '5',          'Unlimited'],
                ['FDI Dental Chart',    true,        true,        true,         true,         true],
                ['Implant & FPD Logs',  true,        true,        true,         true,         true],
                ['PDF Report Export',   true,        true,        true,         true,         true],
                ['Local Backup',        true,        true,        true,         true,         true],
                ['Google Drive Backup', false,       false,       true,         true,         true],
                ['Analytics',           false,       false,       true,         true,         true],
                ['Priority Support',    false,       false,       true,         true,         true],
                ['Custom Report Brand', false,       false,       false,        true,         true],
              ].map(([label, ...vals]) => (
                <tr key={label} className="hover:bg-[#F9F9F8] transition-colors">
                  <td className="px-5 py-3 text-xs text-[#2A2F35] font-medium">{label}</td>
                  {vals.map((v, i) => (
                    <td key={i} className="px-3 py-3 text-center">
                      {v === true  ? <CheckCircle size={16} weight="fill" color={PLANS[i].color} className="mx-auto" /> :
                       v === false ? <X size={14} weight="bold" className="mx-auto text-[#D1D5DB]" /> :
                       <span className="text-xs font-semibold text-[#2A2F35]">{v}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fine print */}
      <p className="text-xs text-center text-[#9CA3AF]">
        All plans include a 7-day free trial. No credit card required for Free plan.
        Prices in {isIndia ? 'INR' : 'USD'}. Cancel anytime.
      </p>

      <ContactModal
        open={!!upgradeRequest}
        onOpenChange={(open) => { if (!open) setUpgradeRequest(null); }}
        defaultName={user?.name || ''}
        defaultEmail={user?.email || ''}
        defaultSubject={upgradeRequest?.subject || ''}
        defaultMessage={upgradeRequest?.message || ''}
      />
    </div>
  );
}
