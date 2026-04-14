import { useMemo, useState } from 'react';

/*
  DentalChart layout (matching user's PSD sample exactly):

  PAD_TOP
  ┌─ UPPER ROOT zone  (roots point UP, away from number row)
  ├─ UPPER CROWN zone (crowns touch the number row FROM ABOVE)
  ├─ [18][17]...[11] | [21]...[28]   ← blue number boxes
  ══════════════════════════════════  ← dividing line
  ├─ [48][47]...[41] | [31]...[38]   ← blue number boxes
  ├─ LOWER CROWN zone (crowns touch the number row FROM BELOW)
  └─ LOWER ROOT zone  (roots point DOWN, away from number row)

  Per tooth we have 3 separate PNGs:
    tooth_N.png  — full natural tooth (root+crown together, for healthy state)
    crown_N.png  — crown only (natural grey crown)
    root_N.png   — root only
    fpd_N.png    — FPD/crown-on-implant (green crown, same size as crown_N)
    implant_upper/lower.png — implant screw

  For implant teeth: show root zone = implant screw, crown zone = fpd or crown png
  Gap between crown and implant MUST be zero — they share the same junction line.
*/

/* ── LAYOUT CONSTANTS ── */
const SLOT    = 62;          // width per tooth slot (wider for spacious look)
const GAP     = 24;          // midline gap between quadrants
const LM      = 20;          // left/right margin
const CROWN_H = 52;          // crown zone height
const ROOT_H  = 70;          // root zone height
const NUM_H   = 28;          // number box row height
const PAD     = 12;          // top padding
const ARCH_GAP = 16;         // extra gap between upper and lower arch number rows

/* Vertical positions — upper arch */
const U_ROOT_Y  = PAD;
const U_CROWN_Y = U_ROOT_Y + ROOT_H;
const U_NUM_Y   = U_CROWN_Y + CROWN_H;

/* Dividing line sits between the two number rows with extra gap */
const DIV_Y     = U_NUM_Y + NUM_H + ARCH_GAP / 2;

/* Lower arch */
const L_NUM_Y   = DIV_Y + ARCH_GAP / 2;
const L_CROWN_Y = L_NUM_Y + NUM_H;
const L_ROOT_Y  = L_CROWN_Y + CROWN_H;
const LEGEND_Y  = L_ROOT_Y + ROOT_H + 16;

const W = SLOT * 16 + GAP + LM * 2;
const H = LEGEND_Y + 24;

/* Slot X position for any FDI tooth number */
function slotX(n) {
  const q = Math.floor(n / 10), u = n % 10;
  if (q === 1) return LM + (8 - u) * SLOT;            // 18→0, 11→7
  if (q === 2) return LM + 8 * SLOT + GAP + (u - 1) * SLOT; // 21→8, 28→15
  if (q === 3) return LM + 8 * SLOT + GAP + (u - 1) * SLOT; // 31→8, 38→15
  if (q === 4) return LM + (8 - u) * SLOT;            // 48→0, 41→7
  return 0;
}
const slotCX = n => slotX(n) + SLOT / 2;
const isUpper = n => Math.floor(n / 10) <= 2;

const UPPER = [18,17,16,15,14,13,12,11, 21,22,23,24,25,26,27,28];
const LOWER = [48,47,46,45,44,43,42,41, 31,32,33,34,35,36,37,38];

/* Condition tint config */
const COND = {
  healthy:        { tint: null,                    badge: null },
  missing:        { tint: null,                    badge: null },
  rootStump:      { tint: 'rgba(160,100,50,0.45)', badge: 'RS' },
  grosslyDecayed: { tint: 'rgba(80,55,35,0.48)',   badge: 'GD' },
  fractured:      { tint: 'rgba(200,50,40,0.42)',  badge: 'F'  },
};

/* ── MAIN COMPONENT ── */
export default function DentalChart({
  implants        = [],
  fpdRecords      = [],
  toothConditions = {},
  onMarkMissing,
  onImplantLog,
  onCrownLog,
  selectedTeeth   = [],
  onToothToggle,
  mode            = 'view',
}) {
  const [actionMode, setActionMode] = useState(null);
  const [hov, setHov] = useState(null);

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
    if (actionMode === 'missing') onMarkMissing?.(n);
    else if (actionMode === 'implant') onImplantLog?.(n);
    else if (actionMode === 'crown') onCrownLog?.(n);
  };

  const toggleAction = key => setActionMode(prev => prev === key ? null : key);

  /* FPD bridge overlays — intentionally empty (no bar shown) */
  const bridgeOverlays = [];

  /* Render one tooth slot */
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
    const isHov      = hov === n;

    /* Zone top-Y for crown and root in this arch */
    const crownY = up ? U_CROWN_Y : L_CROWN_Y;
    const rootY  = up ? U_ROOT_Y  : L_ROOT_Y;

    /* Image sources */
    const toothSrc   = `/teeth/tooth_${n}.png`;
    const crownSrc   = `/teeth/crown_${n}.png`;
    const rootSrc    = `/teeth/root_${n}.png`;
    const fpdSrc     = `/teeth/fpd_${n}.png`;
    const implantSrc = up ? '/teeth/implant_upper.png' : '/teeth/implant_lower.png';

    /* Number box background */
    const numBg = hasImp    ? '#0369A1'
      : hasFpd   ? '#16A34A'
      : isMissing ? '#6B7280'
      : '#1E40AF';

    /* Hover ring colour */
    const ringColor = actionMode === 'missing' ? '#EF4444'
      : actionMode === 'implant' ? '#0369A1'
      : '#16A34A';

    /* Total slot height for rings */
    const slotTop = up ? U_ROOT_Y : L_CROWN_Y;
    const slotH   = ROOT_H + CROWN_H;

    return (
      <g key={n}
        onClick={() => handleToothClick(n)}
        onMouseEnter={() => setHov(n)}
        onMouseLeave={() => setHov(null)}
        style={{ cursor: actionMode || mode === 'fpd' ? 'crosshair' : 'pointer' }}
        data-testid={`fdi-tooth-${n}`}
      >
        {/* Hover ring */}
        {isHov && actionMode && !isMissing && (
          <rect x={sx + 1} y={slotTop + 1} width={SLOT - 2} height={slotH - 2}
            rx={5} fill="none" stroke={ringColor} strokeWidth={2} />
        )}
        {/* FPD selection ring */}
        {isSel && (
          <rect x={sx + 1} y={slotTop + 1} width={SLOT - 2} height={slotH - 2}
            rx={5} fill="rgba(34,197,94,0.08)" stroke="#16A34A" strokeWidth={2} />
        )}

        {/* ── TOOTH RENDERING ── */}
        {isMissing ? (
          /* Ghost outline only */
          <rect x={sx + 8} y={slotTop + 6} width={SLOT - 16} height={slotH - 12}
            rx={6} fill="rgba(200,210,218,0.12)"
            stroke="rgba(150,165,178,0.30)" strokeWidth={1} strokeDasharray="3,3" />

        ) : hasImp ? (
          /* ── IMPLANT: screw in root zone, crown/fpd in crown zone, NO GAP ── */
          <>
            {/* Implant screw fills root zone exactly */}
            <image href={implantSrc}
              x={sx + 6} y={rootY} width={SLOT - 12} height={ROOT_H}
              preserveAspectRatio="xMidYMid meet" />
            {/* Crown/FPD sits flush against number row */}
            {(hasCrownOnImp || hasFpd) ? (
              <image href={hasFpd ? fpdSrc : crownSrc}
                x={sx + 2} y={crownY} width={SLOT - 4} height={CROWN_H}
                preserveAspectRatio="xMidYMid meet" />
            ) : (
              /* No crown yet — dashed line at junction */
              <line
                x1={sx + 6} y1={up ? crownY : rootY}
                x2={sx + SLOT - 6} y2={up ? crownY : rootY}
                stroke="#5B9BBD" strokeWidth={1.5} strokeDasharray="4,3"
                style={{ pointerEvents: 'none' }} />
            )}
          </>

        ) : hasFpd ? (
          /* ── FPD CROWN ONLY (no implant): green crown + natural root ── */
          <>
            <image href={rootSrc}
              x={sx + 4} y={rootY} width={SLOT - 8} height={ROOT_H}
              preserveAspectRatio="xMidYMid meet" />
            <image href={fpdSrc}
              x={sx + 2} y={crownY} width={SLOT - 4} height={CROWN_H}
              preserveAspectRatio="xMidYMid meet" />
            {cfg.tint && (
              <rect x={sx + 2} y={rootY} width={SLOT - 4} height={slotH}
                rx={4} fill={cfg.tint} style={{ pointerEvents: 'none' }} />
            )}
          </>

        ) : (
          /* ── NATURAL TOOTH: single full tooth PNG spanning root+crown zone ── */
          <>
            <image href={toothSrc}
              x={sx + 2} y={slotTop} width={SLOT - 4} height={ROOT_H + CROWN_H}
              preserveAspectRatio="xMidYMid meet"
              opacity={condition === 'healthy' ? 1 : 0.85}
            />
            {/* Condition tint overlay */}
            {cfg.tint && (
              <rect x={sx + 2} y={slotTop} width={SLOT - 4} height={slotH}
                rx={4} fill={cfg.tint} style={{ pointerEvents: 'none' }} />
            )}
            {/* Condition badge */}
            {cfg.badge && (
              <text x={scx} y={slotTop + slotH / 2 + 5}
                textAnchor="middle" fontSize={12} fontWeight="800"
                fill="#7C2D12" fontFamily="'IBM Plex Sans',sans-serif"
                style={{ userSelect: 'none', pointerEvents: 'none' }}
              >{cfg.badge}</text>
            )}
          </>
        )}

        {/* ── NUMBER BOX ── */}
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
      </g>
    );
  };

  /* Button style */
  const btnStyle = (key, base, active) => ({
    padding: '6px 14px',
    borderRadius: 6,
    border: `1.5px solid ${actionMode === key ? active : base}`,
    background: actionMode === key ? active : '#F9F9F8',
    color: actionMode === key ? '#fff' : base,
    fontWeight: 600,
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'IBM Plex Sans, sans-serif',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E5E5E2', overflow: 'hidden' }}>

      {/* Action buttons — hidden in fpd selection mode */}
      {mode !== 'fpd' && (
        <div style={{ display: 'flex', gap: 10, padding: '10px 14px 8px', borderBottom: '1px solid #F0EDE8', flexWrap: 'wrap', alignItems: 'center' }}>
          <button data-testid="action-missing"
            style={btnStyle('missing', '#2563EB', '#2563EB')}
            onClick={() => toggleAction('missing')}>+ missing teeth</button>
          <button data-testid="action-implant"
            style={btnStyle('implant', '#64748B', '#0369A1')}
            onClick={() => toggleAction('implant')}>+ dental implant</button>
          <button data-testid="action-crown"
            style={btnStyle('crown', '#16A34A', '#16A34A')}
            onClick={() => toggleAction('crown')}>+ crowns/FDP</button>
          {actionMode && (
            <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 4 }}>
              {actionMode === 'missing' && 'Click a tooth to mark missing'}
              {actionMode === 'implant' && 'Click a tooth to log an implant'}
              {actionMode === 'crown'   && 'Click a tooth to log a crown / FPD'}
            </span>
          )}
        </div>
      )}

      {/* SVG chart */}
      <div style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%"
          style={{ display: 'block', minWidth: 600 }}
          aria-label="FDI Dental Chart">

          <rect width={W} height={H} fill="#FFFFFF" />

          {/* Midline vertical dashed */}
          <line x1={LM + 8 * SLOT + GAP / 2} y1={PAD}
            x2={LM + 8 * SLOT + GAP / 2} y2={L_ROOT_Y + ROOT_H}
            stroke="#D0C8BC" strokeWidth={1} strokeDasharray="4,4" />

          {/* Horizontal dividing line between arch number rows */}
          <line x1={LM} y1={(U_NUM_Y + NUM_H + L_NUM_Y) / 2} x2={W - LM} y2={(U_NUM_Y + NUM_H + L_NUM_Y) / 2}
            stroke="#B0A898" strokeWidth={1.5} />

          {/* FPD bridge connectors */}
          {bridgeOverlays}

          {/* All 32 teeth */}
          {UPPER.map(renderTooth)}
          {LOWER.map(renderTooth)}

          {/* Legend */}
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
    </div>
  );
}
