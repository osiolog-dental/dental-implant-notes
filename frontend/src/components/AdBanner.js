import { useState, useEffect } from 'react';
import { X, ArrowRight } from '@phosphor-icons/react';

const ADS = [
  {
    id: 1,
    tag: 'New Feature',
    tagColor: '#82A098',
    headline: 'Upgrade to Osiolog Pro',
    sub: 'Unlock 5 GB storage, unlimited patients, and priority support.',
    cta: 'View Plans',
    ctaLink: '/subscription',
    bg: 'linear-gradient(90deg, #EEF4F3 0%, #F9F9F8 100%)',
    border: '#C8DCD8',
  },
  {
    id: 2,
    tag: 'Tip',
    tagColor: '#C27E70',
    headline: 'Export patient reports as PDF',
    sub: 'Click "Export PDF" on any patient page to get a full clinical summary.',
    cta: 'Learn More',
    ctaLink: null,
    bg: 'linear-gradient(90deg, #FDF6F4 0%, #F9F9F8 100%)',
    border: '#E8C9C0',
  },
  {
    id: 3,
    tag: 'Offer',
    tagColor: '#2563EB',
    headline: 'Save 30% with a Yearly Plan',
    sub: 'Switch to annual billing and get 2 months free on Pro or Clinic.',
    cta: 'See Pricing',
    ctaLink: '/subscription',
    bg: 'linear-gradient(90deg, #EFF6FF 0%, #F9F9F8 100%)',
    border: '#BFDBFE',
  },
];

const DISMISS_KEY = 'dentalhub_ad_dismissed';

export default function AdBanner({ onNavigate }) {
  const [adIdx, setAdIdx] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if not recently dismissed (24h cooldown)
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (!dismissed || Date.now() - parseInt(dismissed) > 86400000) {
      setVisible(true);
    }
    // Rotate ad every 8 seconds
    const timer = setInterval(() => setAdIdx(i => (i + 1) % ADS.length), 8000);
    return () => clearInterval(timer);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  const ad = ADS[adIdx];

  return (
    <div
      style={{
        background: ad.bg,
        borderBottom: `1px solid ${ad.border}`,
        transition: 'background 0.5s',
      }}
      className="relative flex items-center gap-3 px-4 py-2 text-sm"
      data-testid="ad-banner"
    >
      {/* Tag pill */}
      <span
        className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
        style={{ background: ad.tagColor }}
      >
        {ad.tag}
      </span>

      {/* Text */}
      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-[#2A2F35] text-xs">{ad.headline}</span>
        <span className="text-[#5C6773] text-xs hidden sm:inline">{ad.sub}</span>
      </div>

      {/* CTA */}
      {ad.cta && (
        <button
          data-testid="ad-cta-btn"
          onClick={() => {
            if (ad.ctaLink) onNavigate?.(ad.ctaLink);
          }}
          className="shrink-0 flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full border transition-colors"
          style={{ borderColor: ad.tagColor, color: ad.tagColor }}
        >
          {ad.cta} <ArrowRight size={11} weight="bold" />
        </button>
      )}

      {/* Dot indicators */}
      <div className="hidden sm:flex items-center gap-1 shrink-0">
        {ADS.map((_, i) => (
          <button
            key={i}
            onClick={() => setAdIdx(i)}
            className="w-1.5 h-1.5 rounded-full transition-all"
            style={{ background: i === adIdx ? ad.tagColor : '#D1D5DB' }}
          />
        ))}
      </div>

      {/* Dismiss */}
      <button
        data-testid="ad-dismiss-btn"
        onClick={dismiss}
        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[#9CA3AF] hover:text-[#5C6773] hover:bg-[#F0F0EE] transition-colors"
        title="Dismiss"
      >
        <X size={11} weight="bold" />
      </button>
    </div>
  );
}
