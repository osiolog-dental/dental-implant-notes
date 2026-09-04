import { Link } from 'react-router-dom';
import {
  Tooth, ChartLine, Camera, CloudArrowUp, FileText, Users,
  CheckCircle, Star, Buildings, User, ArrowRight,
} from '@phosphor-icons/react';

const FEATURES = [
  {
    icon: Tooth,
    title: 'FDI Dental Chart',
    desc: 'A visual, tap-to-log chart for every case — implants, abutments, crowns/FPDs, overdentures, full mouth rehab, and extractions, all mapped to the tooth they belong to.',
  },
  {
    icon: ChartLine,
    title: 'Osseointegration Tracking',
    desc: 'Automatic healing-phase countdowns and reminders for second-stage and prosthetic loading, so no case gets forgotten.',
  },
  {
    icon: Camera,
    title: 'Photo & Radiograph Vault',
    desc: 'Date-wise photo storage per patient, right alongside their case history.',
  },
  {
    icon: FileText,
    title: 'PDF Case Reports',
    desc: 'Export a complete, professional case summary for any patient in one click.',
  },
  {
    icon: Users,
    title: 'Multi-Clinic Support',
    desc: 'Track cases across every clinic you consult at, with per-clinic breakdowns in your analytics.',
  },
  {
    icon: CloudArrowUp,
    title: 'Automatic Backups',
    desc: 'Local export any time, plus Google Drive backup on paid plans — your case history is never locked in one place.',
  },
];

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    icon: User,
    color: '#6B7280',
    bg: '#F9F9F8',
    border: '#E5E5E2',
    price: '$0',
    period: '',
    features: ['Up to 10 patients', '500 MB photo storage', 'FDI dental chart', 'Implant & FPD logs', 'PDF report export', 'Local backup'],
  },
  {
    key: 'pro',
    name: 'Pro',
    icon: Star,
    color: '#82A098',
    bg: '#EEF4F3',
    border: '#82A098',
    price: '$12',
    period: '/month',
    badge: 'Most Popular',
    features: ['Unlimited patients', '5 GB photo storage', 'Everything in Free', 'Google Drive backup', 'Analytics dashboard', 'Priority email support'],
  },
  {
    key: 'clinic',
    name: 'Clinic',
    icon: Buildings,
    color: '#C27E70',
    bg: '#FDF6F4',
    border: '#C27E70',
    price: '$29',
    period: '/month',
    badge: 'Best Value',
    features: ['Unlimited patients', '20 GB photo storage', 'Everything in Pro', 'Multi-clinic management', 'Custom branding on reports', 'Priority phone & email support'],
  },
];

const navLink = "text-sm font-medium text-[#5C6773] hover:text-[#2A2F35] transition-colors";

export default function Landing() {
  return (
    <div style={{ fontFamily: 'IBM Plex Sans, sans-serif' }} className="bg-[#F9F9F8] text-[#2A2F35]">
      {/* Nav */}
      <header className="border-b border-[#E5E5E2] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Work Sans, sans-serif', color: '#82A098' }}>
            OSIOLOG
          </span>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className={navLink} data-testid="nav-features">Features</a>
            <a href="#pricing" className={navLink} data-testid="nav-pricing">Pricing</a>
            <Link to="/login" className={navLink} data-testid="nav-login">Log In</Link>
          </nav>
          <Link
            to="/register"
            data-testid="nav-get-started"
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: '#82A098' }}
          >
            Get Started Free
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-5" style={{ fontFamily: 'Work Sans, sans-serif' }}>
          Dental implant case management,<br className="hidden md:block" /> built for implantologists
        </h1>
        <p className="text-lg text-[#5C6773] max-w-2xl mx-auto mb-8">
          Osiolog replaces the spreadsheet — a visual FDI chart, implant &amp; prosthetic logging, healing-phase
          reminders, photo vault, and analytics, all in one place for your practice.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            to="/register"
            data-testid="hero-get-started"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: '#82A098' }}
          >
            Get Started Free <ArrowRight size={16} weight="bold" />
          </Link>
          <a
            href="#pricing"
            data-testid="hero-see-pricing"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold border border-[#E5E5E2] hover:border-[#82A098] transition-colors"
          >
            See Pricing
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-3" style={{ fontFamily: 'Work Sans, sans-serif' }}>
          Everything a case needs, in one record
        </h2>
        <p className="text-center text-[#5C6773] mb-12">No more separate notebooks, spreadsheets, and photo folders.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-white rounded-xl border border-[#E5E5E2] p-6" data-testid={`feature-${f.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: '#82A09820' }}>
                <f.icon size={22} style={{ color: '#82A098' }} weight="fill" />
              </div>
              <h3 className="font-semibold mb-1.5">{f.title}</h3>
              <p className="text-sm text-[#5C6773] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-3" style={{ fontFamily: 'Work Sans, sans-serif' }}>
          Simple pricing, start free
        </h2>
        <p className="text-center text-[#5C6773] mb-12">Upgrade whenever your practice needs more room.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map(plan => (
            <div
              key={plan.key}
              data-testid={`landing-plan-${plan.key}`}
              className="rounded-2xl border-2 p-6 flex flex-col"
              style={{ borderColor: plan.border, backgroundColor: plan.bg }}
            >
              {plan.badge && (
                <span
                  className="self-start text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full text-white mb-3"
                  style={{ backgroundColor: plan.color }}
                >
                  {plan.badge}
                </span>
              )}
              <div className="flex items-center gap-2 mb-1">
                <plan.icon size={20} style={{ color: plan.color }} weight="fill" />
                <span className="font-semibold">{plan.name}</span>
              </div>
              <p className="mb-5">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-sm text-[#5C6773]">{plan.period}</span>
              </p>
              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#2A2F35]">
                    <CheckCircle size={16} style={{ color: plan.color }} weight="fill" className="shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                data-testid={`landing-plan-cta-${plan.key}`}
                className="text-center px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: plan.color }}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5E5E2] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-sm text-[#5C6773]">© {new Date().getFullYear()} Osiolog</span>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className={navLink} data-testid="footer-privacy">Privacy Policy</Link>
            <Link to="/login" className={navLink} data-testid="footer-login">Log In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
