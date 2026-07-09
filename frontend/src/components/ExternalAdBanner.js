import { useState, useEffect } from 'react';
import client from '../api/client';
import { X, Megaphone, ArrowUpRight } from '@phosphor-icons/react';

const SESSION_KEY = 'osiolog_extad_dismissed';

export default function ExternalAdBanner({ variant = 'bottom' }) {
  const [ads, setAds] = useState([]);
  const [adIdx, setAdIdx] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    client.get('/api/ads')
      .then(r => {
        if (r.data?.length > 0) { setAds(r.data); setVisible(true); }
      })
      .catch(() => {});
    const timer = setInterval(() => setAdIdx(i => i + 1), 12000);
    return () => clearInterval(timer);
  }, []);

  const dismiss = () => { sessionStorage.setItem(SESSION_KEY, '1'); setVisible(false); };

  if (!visible || ads.length === 0) return null;
  const ad = ads[adIdx % ads.length];

  /* ── Sidebar card (desktop) ── */
  if (variant === 'sidebar') {
    return (
      <div
        data-testid="external-ad-sidebar"
        className="mx-3 mb-4 rounded-xl border overflow-hidden"
        style={{ background: ad.bg_color || '#F0F4FF', borderColor: ad.border_color || '#BFD0F7' }}
      >
        {/* Image zone */}
        {ad.image_url ? (
          <img src={ad.image_url} alt={ad.headline} className="w-full h-28 object-cover" />
        ) : (
          <div
            className="w-full h-28 flex flex-col items-center justify-center gap-1"
            style={{ background: ad.bg_color || '#E8EFFF' }}
          >
            <Megaphone size={32} color="#6B7280" weight="duotone" />
            <span className="text-[10px] text-[#9CA3AF] font-medium tracking-widest uppercase">Your Ad Here</span>
          </div>
        )}

        {/* Body */}
        <div className="p-3">
          <div className="flex items-start justify-between gap-1 mb-1">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/70 text-[#6B7280] border border-[#D1D5DB] uppercase tracking-wide">
              {ad.tag || 'Sponsored'}
            </span>
            <button
              data-testid="external-ad-dismiss-sidebar"
              onClick={dismiss}
              className="w-5 h-5 rounded-full flex items-center justify-center text-[#9CA3AF] hover:text-[#5C6773] hover:bg-white/60 transition-colors shrink-0"
            >
              <X size={10} weight="bold" />
            </button>
          </div>
          <p className="text-xs font-semibold text-[#2A2F35] leading-tight mb-1">{ad.headline}</p>
          {ad.subtext && (
            <p className="text-[10px] text-[#5C6773] leading-snug mb-2 line-clamp-2">{ad.subtext}</p>
          )}
          {ad.cta_label && (
            <a
              data-testid="external-ad-cta-sidebar"
              href={ad.cta_url || '#'}
              target={ad.cta_url ? '_blank' : undefined}
              rel="noopener noreferrer"
              onClick={e => { if (!ad.cta_url) e.preventDefault(); }}
              className="flex items-center justify-center gap-1 w-full py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#D1D5DB] text-[#2A2F35] hover:bg-[#F9F9F8] transition-colors"
            >
              {ad.cta_label} <ArrowUpRight size={11} weight="bold" />
            </a>
          )}
        </div>

        {/* Dot nav */}
        {ads.length > 1 && (
          <div className="flex justify-center gap-1 pb-2">
            {ads.map((_, i) => (
              <button key={i} onClick={() => setAdIdx(i)}
                className="w-1.5 h-1.5 rounded-full transition-all"
                style={{ background: i === adIdx % ads.length ? '#6B7280' : '#D1D5DB' }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── Bottom banner (mobile / inline) ── */
  return (
    <div
      data-testid="external-ad-banner"
      className="mx-3 mb-3 rounded-xl border overflow-hidden flex-shrink-0"
      style={{ background: ad.bg_color || '#F0F4FF', borderColor: ad.border_color || '#BFD0F7' }}
    >
      {/* Image strip */}
      {ad.image_url ? (
        <img src={ad.image_url} alt={ad.headline} className="w-full h-32 object-cover" />
      ) : (
        <div
          className="w-full h-24 flex flex-col items-center justify-center gap-1"
          style={{ background: ad.bg_color || '#E8EFFF' }}
        >
          <Megaphone size={28} color="#6B7280" weight="duotone" />
          <span className="text-[10px] text-[#9CA3AF] font-medium tracking-widest uppercase">Your Ad Here</span>
        </div>
      )}

      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/70 text-[#6B7280] border border-[#D1D5DB] uppercase tracking-wide">
              {ad.tag || 'Sponsored'}
            </span>
          </div>
          <p className="text-sm font-semibold text-[#2A2F35]">{ad.headline}</p>
          {ad.subtext && (
            <p className="text-xs text-[#5C6773] mt-0.5 line-clamp-2">{ad.subtext}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <button
            data-testid="external-ad-dismiss"
            onClick={dismiss}
            className="w-6 h-6 rounded-full flex items-center justify-center text-[#9CA3AF] hover:text-[#5C6773] hover:bg-white/60 transition-colors"
          >
            <X size={12} weight="bold" />
          </button>
          {ad.cta_label && (
            <a
              data-testid="external-ad-cta"
              href={ad.cta_url || '#'}
              target={ad.cta_url ? '_blank' : undefined}
              rel="noopener noreferrer"
              onClick={e => { if (!ad.cta_url) e.preventDefault(); }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#D1D5DB] text-[#2A2F35] hover:bg-[#F9F9F8] transition-colors whitespace-nowrap flex items-center gap-1"
            >
              {ad.cta_label} <ArrowUpRight size={11} weight="bold" />
            </a>
          )}
        </div>
      </div>

      {ads.length > 1 && (
        <div className="flex justify-center gap-1 pb-2">
          {ads.map((_, i) => (
            <button key={i} onClick={() => setAdIdx(i)}
              className="w-1.5 h-1.5 rounded-full transition-all"
              style={{ background: i === adIdx % ads.length ? '#6B7280' : '#D1D5DB' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
