import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import client from '../api/client';
import {
  CheckCircle, X, Crown, Buildings, User,
  HardDrive, ArrowRight, Star,
} from '@phosphor-icons/react';


/* ── Plan definitions ── */
const PLANS = [
  {
    key: 'free',
    name: 'Free',
    icon: User,
    iconColor: '#6B7280',
    storage: '500 MB',
    storageMB: 500,
    priceMonthly: 0,
    priceYearly: 0,
    color: '#6B7280',
    bg: '#F9F9F8',
    border: '#E5E5E2',
    features: [
      'Up to 10 patients',
      '500 MB photo storage',
      'FDI dental chart',
      'Implant & FPD logs',
      'PDF report export',
      'Local backup',
    ],
    missing: [
      'Google Drive backup',
      'Priority support',
      'Analytics dashboard',
      'Multi-clinic management',
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
    priceYearly: 99,
    color: '#82A098',
    bg: '#EEF4F3',
    border: '#82A098',
    features: [
      'Unlimited patients',
      '5 GB photo & radiograph storage',
      'FDI dental chart',
      'Implant & FPD logs',
      'PDF report export',
      'Google Drive backup',
      'Analytics dashboard',
      'Priority email support',
    ],
    missing: ['Multi-clinic management'],
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
    priceYearly: 249,
    color: '#C27E70',
    bg: '#FDF6F4',
    border: '#C27E70',
    features: [
      'Unlimited patients',
      '20 GB photo & radiograph storage',
      'FDI dental chart',
      'Implant & FPD logs',
      'PDF report export',
      'Google Drive backup',
      'Advanced analytics',
      'Multi-clinic management',
      'Priority phone & email support',
      'Custom branding on reports',
    ],
    missing: [],
    badge: 'Best Value',
    badgeColor: '#C27E70',
  },
];

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
  const [billing, setBilling] = useState('monthly'); // 'monthly' | 'yearly'
  const [status, setStatus] = useState(null);
  const [upgrading, setUpgrading] = useState(null);

  useEffect(() => {
    client.get('/api/subscription/status')
      .then(r => setStatus(r.data))
      .catch(() => {});
  }, []);

  const currentPlan = status?.plan || 'free';

  const handleUpgrade = async (planKey) => {
    if (planKey === currentPlan) return;
    setUpgrading(planKey);
    try {
      await client.post('/api/subscription/upgrade', { plan: planKey, billing });
      toast.success(`Upgraded to ${planKey.charAt(0).toUpperCase() + planKey.slice(1)} plan!`);
      const r = await client.get('/api/subscription/status');
      setStatus(r.data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Upgrade failed');
    } finally {
      setUpgrading(null);
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
          <div className="flex-1 min-w-0">
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

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <span className={`text-sm font-medium ${billing === 'monthly' ? 'text-[#2A2F35]' : 'text-[#9CA3AF]'}`}>Monthly</span>
        <button
          data-testid="billing-toggle"
          onClick={() => setBilling(b => b === 'monthly' ? 'yearly' : 'monthly')}
          className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${billing === 'yearly' ? 'bg-[#82A098]' : 'bg-[#D1D5DB]'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${billing === 'yearly' ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
        <span className={`text-sm font-medium ${billing === 'yearly' ? 'text-[#2A2F35]' : 'text-[#9CA3AF]'}`}>
          Yearly
          <span className="ml-1.5 text-[10px] font-bold bg-[#82A098] text-white px-1.5 py-0.5 rounded-full">Save 30%</span>
        </span>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {PLANS.map(plan => {
          const Icon = plan.icon;
          const isCurrent = plan.key === currentPlan;
          const price = billing === 'yearly' ? plan.priceYearly : plan.priceMonthly;
          const perMonth = billing === 'yearly' && plan.priceYearly > 0
            ? (plan.priceYearly / 12).toFixed(0)
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
                      <span className="text-3xl font-bold text-[#2A2F35]">${price}</span>
                      <span className="text-sm text-[#5C6773] mb-1">/{billing === 'yearly' ? 'yr' : 'mo'}</span>
                    </div>
                    {perMonth && (
                      <p className="text-xs text-[#5C6773]">${perMonth}/month billed yearly</p>
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
                onClick={() => handleUpgrade(plan.key)}
                disabled={isCurrent || upgrading === plan.key}
                className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: isCurrent ? plan.color + '18' : plan.color,
                  color: isCurrent ? plan.color : '#fff',
                  border: `1.5px solid ${plan.color}`,
                }}
              >
                {upgrading === plan.key ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : isCurrent ? (
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
                ['Patients',            '10',        'Unlimited',  'Unlimited'],
                ['Storage',             '500 MB',    '5 GB',       '20 GB'],
                ['FDI Dental Chart',    true,        true,         true],
                ['Implant & FPD Logs',  true,        true,         true],
                ['PDF Report Export',   true,        true,         true],
                ['Local Backup',        true,        true,         true],
                ['Google Drive Backup', false,       true,         true],
                ['Analytics',           false,       true,         true],
                ['Multi-Clinic',        false,       false,        true],
                ['Priority Support',    false,       true,         true],
                ['Custom Report Brand', false,       false,        true],
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
        Prices in USD. Cancel anytime.
      </p>
    </div>
  );
}
