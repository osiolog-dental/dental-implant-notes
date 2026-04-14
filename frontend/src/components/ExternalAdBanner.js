import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Megaphone } from '@phosphor-icons/react';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const SESSION_KEY = 'dentalhub_extad_dismissed';

export default function ExternalAdBanner() {
  const [ads, setAds] = useState([]);
  const [adIdx, setAdIdx] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if dismissed this session
    if (sessionStorage.getItem(SESSION_KEY)) return;

    axios.get(`${API_URL}/api/ads`)
      .then(r => {
        if (r.data?.length > 0) {
          setAds(r.data);
          setVisible(true);
        }
      })
      .catch(() => {});

    // Rotate ads every 12 seconds if multiple
    const timer = setInterval(() => setAdIdx(i => (i + 1)), 12000);
    return () => clearInterval(timer);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setVisible(false);
  };

  if (!visible || ads.length === 0) return null;

  const ad = ads[adIdx % ads.length];

  return (
    <div
      data-testid="external-ad-banner"
      className="mx-4 mb-3 rounded-xl border overflow-hidden flex-shrink-0"
      style={{
        background: ad.bg_color || '#F0F4FF',
        borderColor: ad.border_color || '#BFD0F7',
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3">

        {/* Ad image or icon placeholder */}
        {ad.image_url ? (
          <img
            src={ad.image_url}
            alt={ad.headline}
            className="w-14 h-14 rounded-lg object-cover shrink-0 border border-white/60"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-white/70 border border-white flex items-center justify-center shrink-0">
            <Megaphone size={22} color="#6B7280" weight="duotone" />
          </div>
        )}

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/70 text-[#6B7280] border border-[#D1D5DB]">
              {ad.tag || 'Sponsored'}
            </span>
          </div>
          <p className="text-sm font-semibold text-[#2A2F35] truncate">{ad.headline}</p>
          <p className="text-xs text-[#5C6773] line-clamp-1 mt-0.5">{ad.subtext}</p>
        </div>

        {/* CTA */}
        {ad.cta_label && (
          <a
            data-testid="external-ad-cta"
            href={ad.cta_url || '#'}
            target={ad.cta_url ? '_blank' : undefined}
            rel="noopener noreferrer"
            onClick={e => { if (!ad.cta_url) e.preventDefault(); }}
            className="shrink-0 px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-[#D1D5DB] text-[#2A2F35] hover:bg-[#F9F9F8] transition-colors whitespace-nowrap"
          >
            {ad.cta_label}
          </a>
        )}

        {/* Dismiss */}
        <button
          data-testid="external-ad-dismiss"
          onClick={dismiss}
          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[#9CA3AF] hover:text-[#5C6773] hover:bg-white/60 transition-colors ml-1"
          title="Close ad"
        >
          <X size={12} weight="bold" />
        </button>
      </div>

      {/* Multiple ads dot indicator */}
      {ads.length > 1 && (
        <div className="flex justify-center gap-1 pb-2">
          {ads.map((_, i) => (
            <button
              key={i}
              onClick={() => setAdIdx(i)}
              className="w-1.5 h-1.5 rounded-full transition-all"
              style={{ background: i === adIdx % ads.length ? '#6B7280' : '#D1D5DB' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
