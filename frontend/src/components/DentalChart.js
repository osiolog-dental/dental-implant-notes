import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

/*
  DentalChart — tap any tooth to get an action menu popup.
  No "select mode" button needed — just tap a tooth directly.
*/

/* ── LAYOUT CONSTANTS ── */
const SLOT    = 62;
const GAP     = 24;
const LM      = 20;
const CROWN_H = 52;
const ROOT_H  = 70;
const NUM_H   = 28;
const PAD     = 12;
const ARCH_GAP = 16;

const U_ROOT_Y  = PAD;
const U_CROWN_Y = U_ROOT_Y + ROOT_H;
const U_NUM_Y   = U_CROWN_Y + CROWN_H;
const DIV_Y     = U_NUM_Y + NUM_H + ARCH_GAP / 2;
const L_NUM_Y   = DIV_Y + ARCH_GAP / 2;
const L_CROWN_Y = L_NUM_Y + NUM_H;
const L_ROOT_Y  = L_CROWN_Y + CROWN_H;
const LEGEND_Y  = L_ROOT_Y + ROOT_H + 16;

const W = SLOT * 16 + GAP + LM * 2;
const H = LEGEND_Y + 24;

function slotX(n) {
  const q = Math.floor(n / 10), u = n % 10;
  if (q === 1) return LM + (8 - u) * SLOT;
  if (q === 2) return LM + 8 * SLOT + GAP + (u - 1) * SLOT;
  if (q === 3) return LM + 8 * SLOT + GAP + (u - 1) * SLOT;
  if (q === 4) return LM + (8 - u) * SLOT;
  return 0;
}
const slotCX = n => slotX(n) + SLOT / 2;
const isUpper = n => Math.floor(n / 10) <= 2;

const UPPER = [18,17,16,15,14,13,12,11, 21,22,23,24,25,26,27,28];
const LOWER = [48,47,46,45,44,43,42,41, 31,32,33,34,35,36,37,38];

const COND = {
  healthy:        { tint: null,                    badge: null },
  missing:        { tint: null,                    badge: null },
  rootStump:      { tint: 'rgba(160,100,50,0.45)', badge: 'RS' },
  grosslyDecayed: { tint: 'rgba(80,55,35,0.48)',   badge: 'GD' },
  fractured:      { tint: 'rgba(200,50,40,0.42)',  badge: 'F'  },
};

/* ── TOOTH ACTION POPUP ── */
function ToothPopup({ tooth, condition, hasImplant, onClose, onMissing, onImplant, onCrown, onAbutment }) {
  if (!tooth) return null;
  const isMissing = condition === 'missing';

  const actions = [
    {
      label: isMissing ? '↩ Restore Tooth' : '✕ Mark Missing',
      color: '#DC2626',
      bg: '#FEF2F2',
      onClick: () => { onMissing(tooth); onClose(); },
    },
    {
      label: '⬡ Add Implant',
      color: '#0369A1',
      bg: '#EFF6FF',
      onClick: () => { onImplant(tooth); onClose(); },
    },
    {
      label: '◎ Add Crown / FPD',
      color: '#16A34A',
      bg: '#F0FDF4',
      onClick: () => { onCrown(tooth); onClose(); },
    },
    {
      label: '○ Add Abutment',
      color: '#C2850A',
      bg: '#FFFBEB',
      onClick: () => { onAbutment(tooth); onClose(); },
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.25)',
        }}
      />
      {/* Popup */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1001,
        background: '#fff',
        borderRadius: 14,
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        width: 260,
        overflow: 'hidden',
        fontFamily: 'IBM Plex Sans, sans-serif',
      }}>
        <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #F0EDE8' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#2A2F35', margin: 0 }}>
            Tooth #{tooth}
          </p>
          <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>
            {isUpper(tooth) ? 'Upper' : 'Lower'} · {(tooth % 10) <= 3 ? 'Anterior' : 'Posterior'}
            {hasImplant ? ' · Implant present' : ''}
            {isMissing ? ' · Missing' : ''}
          </p>
        </div>
        <div style={{ padding: '8px 8px' }}>
          {actions.map(a => (
            <button
              key={a.label}
              onClick={a.onClick}
              style={{
                display: 'block', width: '100%',
                padding: '10px 14px',
                marginBottom: 4,
                border: 'none',
                borderRadius: 8,
                background: a.bg,
                color: a.color,
                fontWeight: 600,
                fontSize: 13,
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'IBM Plex Sans, sans-serif',
                WebkitTapHighlightColor: 'transparent',
              }}
            >{a.label}</button>
          ))}
        </div>
        <div style={{ padding: '0 8px 8px' }}>
          <button
            onClick={onClose}
            style={{
              display: 'block', width: '100%',
              padding: '9px 14px',
              border: '1px solid #E5E5E2',
              borderRadius: 8,
              background: '#F9F9F8',
              color: '#6B7280',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'IBM Plex Sans, sans-serif',
              WebkitTapHighlightColor: 'transparent',
            }}
          >Cancel</button>
        </div>
      </div>
    </>
  );
}

/* ── MAIN COMPONENT ── */
export default function DentalChart({
  implants        = [],
  fpdRecords      = [],
  toothConditions = {},
  onMarkMissing,
  onImplantLog,
  onCrownLog,
  onAbutmentLog,
  onOverdentureLog,
  selectedTeeth   = [],
  onToothToggle,
  mode            = 'view',
}) {
  const [popup, setPopup] = useState(null); // tooth number that was tapped

  const impMap = useMemo(() => {
    const m = {};
    implants.forEach(i => { m[i.tooth_number] = i; });
    return m;
  }, [implants]);

  const fpdMap = useMemo(() => {
    const m = {};
    fpdRecords.forEach(f => { f.tooth_numbers?.forEach(n => { m[n] = f; }); });
    return m;
  }, [fpdRecords]);

  const handleToothClick = n => {
    if (mode === 'fpd') { onToothToggle?.(n); return; }
    setPopup(n);
  };

  const renderTooth = n => {
    const up  = isUpper(n);
    const sx  = slotX(n);
    const scx = slotCX(n);

    const imp       = impMap[n];
    const fpd       = fpdMap[n];
    const tc        = toothConditions[n] || {};
    const condition = tc.condition || 'healthy';
    const cfg       = COND[condition] || COND.healthy;

    const isMissing  = condition === 'missing';
    const hasImp     = !!imp;
    const hasFpd     = !!fpd;
    const hasCrownOnImp = hasImp && !!imp.prosthetic_loading_date;
    const isSel      = selectedTeeth.includes(n);
    const isActive   = popup === n;

    const crownY = up ? U_CROWN_Y : L_CROWN_Y;
    const rootY  = up ? U_ROOT_Y  : L_ROOT_Y;

    const base = process.env.PUBLIC_URL || '';
    const toothSrc   = `${base}/teeth/tooth_${n}.png`;
    const crownSrc   = `${base}/teeth/crown_${n}.png`;
    const rootSrc    = `${base}/teeth/root_${n}.png`;
    const fpdSrc     = `${base}/teeth/fpd_${n}.png`;
    const implantSrc = up ? `${base}/teeth/implant_upper.png` : `${base}/teeth/implant_lower.png`;

    const numBg = hasImp    ? '#0369A1'
      : hasFpd   ? '#16A34A'
      : isMissing ? '#6B7280'
      : '#1E40AF';

    const slotTop = up ? U_ROOT_Y : L_CROWN_Y;
    const slotH   = ROOT_H + CROWN_H;

    return (
      <g key={n}
        onClick={() => handleToothClick(n)}
        style={{ cursor: 'pointer' }}
        data-testid={`fdi-tooth-${n}`}
      >
        {/* Active highlight */}
        {isActive && (
          <rect x={sx + 1} y={slotTop + 1} width={SLOT - 2} height={slotH - 2}
            rx={5} fill="rgba(130,160,152,0.15)" stroke="#82A098" strokeWidth={2.5} />
        )}
        {/* FPD selection ring */}
        {isSel && (
          <rect x={sx + 1} y={slotTop + 1} width={SLOT - 2} height={slotH - 2}
            rx={5} fill="rgba(34,197,94,0.08)" stroke="#16A34A" strokeWidth={2} />
        )}

        {/* TOOTH RENDERING — using SVG <image> (scales correctly, no foreignObject) */}
        {isMissing ? (
          <rect x={sx + 8} y={slotTop + 6} width={SLOT - 16} height={slotH - 12}
            rx={6} fill="rgba(200,210,218,0.12)"
            stroke="rgba(150,165,178,0.30)" strokeWidth={1} strokeDasharray="3,3"
            pointerEvents="none" />

        ) : hasImp ? (
          <>
            <image href={implantSrc} x={sx + 6} y={rootY} width={SLOT - 12} height={ROOT_H}
              preserveAspectRatio="xMidYMid meet" pointerEvents="none" />
            {(hasCrownOnImp || hasFpd) ? (
              <image href={hasFpd ? fpdSrc : crownSrc} x={sx + 2} y={crownY} width={SLOT - 4} height={CROWN_H}
                preserveAspectRatio="xMidYMid meet" pointerEvents="none" />
            ) : (
              <line
                x1={sx + 6} y1={up ? crownY : rootY}
                x2={sx + SLOT - 6} y2={up ? crownY : rootY}
                stroke="#5B9BBD" strokeWidth={1.5} strokeDasharray="4,3"
                pointerEvents="none" />
            )}
          </>

        ) : hasFpd ? (
          <>
            <image href={rootSrc} x={sx + 4} y={rootY} width={SLOT - 8} height={ROOT_H}
              preserveAspectRatio="xMidYMid meet" pointerEvents="none" />
            <image href={fpdSrc} x={sx + 2} y={crownY} width={SLOT - 4} height={CROWN_H}
              preserveAspectRatio="xMidYMid meet" pointerEvents="none" />
            {cfg.tint && (
              <rect x={sx + 2} y={rootY} width={SLOT - 4} height={slotH}
                rx={4} fill={cfg.tint} pointerEvents="none" />
            )}
          </>

        ) : (
          <>
            <image href={toothSrc} x={sx + 2} y={slotTop} width={SLOT - 4} height={ROOT_H + CROWN_H}
              preserveAspectRatio="xMidYMid meet"
              pointerEvents="none" opacity={condition === 'healthy' ? 1 : 0.85} />
            {cfg.tint && (
              <rect x={sx + 2} y={slotTop} width={SLOT - 4} height={slotH}
                rx={4} fill={cfg.tint} pointerEvents="none" />
            )}
            {cfg.badge && (
              <text x={scx} y={slotTop + slotH / 2 + 5}
                textAnchor="middle" fontSize={12} fontWeight="800"
                fill="#7C2D12" fontFamily="'IBM Plex Sans',sans-serif"
                style={{ userSelect: 'none', pointerEvents: 'none' }}
              >{cfg.badge}</text>
            )}
          </>
        )}

        {/* NUMBER BOX */}
        {(() => {
          const ny = up ? U_NUM_Y : L_NUM_Y;
          return (
            <g style={{ pointerEvents: 'none' }}>
              <rect x={sx + 1} y={ny + 3} width={SLOT - 2} height={NUM_H - 6}
                rx={3} fill={numBg} />
              <text x={scx} y={ny + NUM_H - 9}
                textAnchor="middle" fontSize={10}
                fontFamily="'IBM Plex Mono',monospace"
                fill="#FFFFFF" fontWeight="700"
                style={{ userSelect: 'none' }}>{n}</text>
            </g>
          );
        })()}

        {/* Invisible large tap target over the whole slot (important for mobile) */}
        <rect x={sx} y={slotTop} width={SLOT} height={slotH}
          fill="transparent" stroke="none" />
      </g>
    );
  };

  return (
    <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E5E5E2', overflow: 'hidden' }}>

      {/* Overdenture button — only action button remaining */}
      {mode !== 'fpd' && (
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #F0EDE8', display: 'flex', alignItems: 'center', gap: 10 }}>
          <p style={{ fontSize: 12, color: '#6B7280', margin: 0, flex: 1 }}>
            👆 Tap any tooth to mark missing, add implant, crown, or abutment
          </p>
          <button
            data-testid="action-overdenture"
            onClick={() => onOverdentureLog?.()}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1.5px solid #7C3AED',
              background: 'transparent',
              color: '#7C3AED',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'IBM Plex Sans, sans-serif',
              whiteSpace: 'nowrap',
              WebkitTapHighlightColor: 'transparent',
            }}
          >+ Overdenture</button>
        </div>
      )}

      {/* SVG chart — scales to fit width, touchAction on SVG only so popup buttons still work */}
      <div style={{ width: '100%', overflowX: 'hidden' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto"
          style={{ display: 'block', touchAction: 'manipulation' }}
          aria-label="FDI Dental Chart">

          <rect width={W} height={H} fill="#FFFFFF" />

          <line x1={LM + 8 * SLOT + GAP / 2} y1={PAD}
            x2={LM + 8 * SLOT + GAP / 2} y2={L_ROOT_Y + ROOT_H}
            stroke="#D0C8BC" strokeWidth={1} strokeDasharray="4,4" />

          <line x1={LM} y1={(U_NUM_Y + NUM_H + L_NUM_Y) / 2} x2={W - LM} y2={(U_NUM_Y + NUM_H + L_NUM_Y) / 2}
            stroke="#B0A898" strokeWidth={1.5} />

          {UPPER.map(renderTooth)}
          {LOWER.map(renderTooth)}

          {[
            { color: '#F0EDE8', border: '#C0B8A8', label: 'Healthy' },
            { color: '#0369A1', border: '#024f7c', label: 'Implant' },
            { color: '#16A34A', border: '#0f7234', label: 'Crown/FPD' },
            { color: 'rgba(195,208,218,0.25)', border: '#9CA3AF', label: 'Missing', dashed: true },
          ].map(({ color, border, label, dashed }, i) => (
            <g key={label} transform={`translate(${LM + i * 130} ${LEGEND_Y})`}>
              <rect width={12} height={12} rx={2}
                fill={color} stroke={border} strokeWidth={1}
                strokeDasharray={dashed ? '2,2' : undefined} />
              <text x={17} y={10} fontSize={9} fill="#5C6370"
                fontFamily="'IBM Plex Sans',sans-serif">{label}</text>
            </g>
          ))}
        </svg>
      </div>

      {/* Tooth action popup — rendered via portal directly on body, outside all chart CSS */}
      {popup && createPortal(
        <ToothPopup
          tooth={popup}
          condition={toothConditions[popup]?.condition || 'healthy'}
          hasImplant={!!impMap[popup]}
          onClose={() => setPopup(null)}
          onMissing={n => { setPopup(null); onMarkMissing?.(n); }}
          onImplant={n => { setPopup(null); onImplantLog?.(n); }}
          onCrown={n => { setPopup(null); onCrownLog?.(n); }}
          onAbutment={n => { setPopup(null); onAbutmentLog?.(n); }}
        />,
        document.body
      )}
    </div>
  );
}
