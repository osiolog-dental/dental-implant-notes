import { useMemo, useState } from 'react';

/*
  DentalChart — image-based FDI chart using real tooth PNG icons.

  KEY LAYOUT RULES (matching reference photo):
  ─────────────────────────────────────────────
  • Each tooth slot is WIDE enough that no tooth gets squashed (SLOT = 54px)
  • Upper teeth: image sits ABOVE the bite line (crown at top, root toward bite line)
  • Lower teeth: image sits BELOW the bite line (crown at bottom, root toward bite line)
  • Numbers: BELOW upper arch, ABOVE lower arch (matching reference)

  IMPLANT + CROWN LAYERING:
  ─────────────────────────
  Upper tooth zone split:
    Crown zone:  top ~42% of IMG_H  (where crown PNG goes)
    Root zone:   bottom ~58% of IMG_H  (where implant screw goes)
  Lower tooth zone split (mirrored):
    Crown zone:  bottom ~42% of IMG_H
    Root zone:   top ~58% of IMG_H

  Crown and screw are sized so their touching edges align exactly (no gap, no overlap).
*/

/* ── LAYOUT CONSTANTS ── */
const SLOT  = 54;    // wide enough for any tooth without squashing
const GAP   = 20;    // midline gap
const LM    = 22;    // left margin
const IMG_H = 190;   // full tooth height (crown + root combined)
const NUM_H = 18;    // height reserved for FDI number label

/* Crown = top 42% of tooth image, Root = bottom 58% */
const CROWN_FRAC = 0.42;
const ROOT_FRAC  = 1 - CROWN_FRAC;

const CROWN_H = Math.round(IMG_H * CROWN_FRAC);  // 80px
const ROOT_H  = Math.round(IMG_H * ROOT_FRAC);   // 110px

/* Total height per arch row = tooth image + number label */
const ROW_H = IMG_H + NUM_H;

const W = SLOT * 16 + GAP + LM * 2;
const H = ROW_H * 2 + 50;  // two rows + inter-arch gap + legend space

/* Upper arch: teeth hang DOWN from bite line
   UY = top of upper tooth image area
   Bite line = UY + IMG_H  (bottom edge of upper teeth) */
const UY        = NUM_H + 4;           // leave room for numbers above? No — numbers go below
const BITE_U    = UY + IMG_H;          // upper bite line Y
const BITE_L    = BITE_U + 36;         // lower bite line Y (gap between arches)
const LY        = BITE_L;             // lower teeth start exactly at lower bite line
/* For lower teeth: root is at TOP (toward bite line), crown is at BOTTOM */

const LEGEND_Y  = LY + IMG_H + NUM_H + 10;

/* X left edge of tooth slot */
function slotX(n) {
  const q = Math.floor(n / 10), u = n % 10;
  if (q === 1) return LM + (8 - u) * SLOT;
  if (q === 2) return LM + 8 * SLOT + GAP + (u - 1) * SLOT;
  if (q === 3) return LM + 8 * SLOT + GAP + (u - 1) * SLOT;
  if (q === 4) return LM + (8 - u) * SLOT;
  return 0;
}
const cx    = n => slotX(n) + SLOT / 2;
const isUp  = n => Math.floor(n / 10) <= 2;

const UPPER = [18,17,16,15,14,13,12,11, 21,22,23,24,25,26,27,28];
const LOWER = [48,47,46,45,44,43,42,41, 31,32,33,34,35,36,37,38];

/* ── CONDITION VISUAL STYLES ── */
const COND = {
  healthy:        { opacity: 1,    tint: null,                    badge: null },
  missing:        { opacity: 0.12, tint: 'rgba(160,175,190,0.6)', badge: null },
  rootStump:      { opacity: 0.55, tint: 'rgba(180,120,60,0.45)', badge: 'RS' },
  grosslyDecayed: { opacity: 0.60, tint: 'rgba(90,65,40,0.45)',   badge: 'GD' },
  fractured:      { opacity: 0.60, tint: 'rgba(210,60,50,0.38)',  badge: 'F'  },
};

export default function DentalChart({
  implants        = [],
  fpdRecords      = [],
  toothConditions = {},
  onToothClick,
  selectedTeeth   = [],
  onToothToggle,
  mode            = 'implant',
}) {
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

  const handleClick = n => {
    if (mode === 'fpd') onToothToggle?.(n);
    else onToothClick?.(n);
  };

  /* ── FPD bridge overlay: a cervical connector bar spanning the bridge ── */
  const bridgeOverlays = fpdRecords
    .filter(f => f.tooth_numbers?.length > 1)
    .map((f, idx) => {
      const sorted = [...f.tooth_numbers].sort((a, b) => slotX(a) - slotX(b));
      const up = isUp(sorted[0]);
      const x1 = slotX(sorted[0]) + 4;
      const x2 = slotX(sorted[sorted.length - 1]) + SLOT - 4;
      /* For upper: connector at cervical margin = UY + CROWN_H (bottom of crown zone)
         For lower: connector at cervical margin = LY + ROOT_H  (top of crown zone) */
      const connY  = up ? UY + CROWN_H - 5 : LY + ROOT_H - 5;
      const connH  = 12;
      return (
        <g key={idx} style={{ pointerEvents: 'none' }}>
          <rect x={x1} y={connY} width={x2 - x1} height={connH}
            rx={5} fill="rgba(148,185,218,0.80)" stroke="#6BAED6" strokeWidth={1.3} />
        </g>
      );
    });

  /* ── Render one tooth slot ── */
  const renderTooth = n => {
    const up    = isUp(n);
    const sx    = slotX(n);
    const scx   = cx(n);

    /* For upper: image top = UY, crown at top, root at bottom (toward bite line)
       For lower: image top = LY, root at top (toward bite line), crown at bottom */
    const imgTop = up ? UY : LY;

    /* Crown zone bounds (where crown PNG is positioned) */
    const crownTop  = up ? imgTop             : imgTop + ROOT_H;
    const crownLeft = sx + 2;
    const crownW    = SLOT - 4;

    /* Root / implant zone bounds */
    const rootTop   = up ? imgTop + CROWN_H   : imgTop;
    const rootW     = SLOT * 0.62;
    const rootLeft  = scx - rootW / 2;

    /* FDI number Y: below upper arch, above lower arch */
    const numY = up ? imgTop + IMG_H + 13 : imgTop - 5;

    /* Data */
    const imp       = impMap[n];
    const fpd       = fpdMap[n];
    const tc        = toothConditions[n] || {};
    const condition = tc.condition || 'healthy';
    const isSel     = selectedTeeth.includes(n);
    const isHov     = hov === n;
    const hasImp    = !!imp;
    const hasCrown  = !!(fpd || imp?.prosthetic_loading_date);
    const isMissing = condition === 'missing';
    const cs        = COND[condition] || COND.healthy;

    const labelFill = hasImp  ? '#0369A1'
      : hasCrown    ? '#4338CA'
      : isMissing   ? '#9CA3AF'
      : condition !== 'healthy' ? '#92400E'
      : '#374151';

    /* Image sources */
    const toothSrc   = `/teeth/tooth_${n}.png`;
    const crownSrc   = `/teeth/crown_${n}.png`;
    const implantSrc = up ? '/teeth/implant_upper.png' : '/teeth/implant_lower.png';

    return (
      <g key={n}
        onClick={() => handleClick(n)}
        onMouseEnter={() => setHov(n)}
        onMouseLeave={() => setHov(null)}
        style={{ cursor: 'pointer' }}
        data-testid={`fdi-tooth-${n}`}
      >
        {/* Selection / hover highlight box */}
        {(isHov || isSel) && (
          <rect x={sx + 1} y={imgTop} width={SLOT - 2} height={IMG_H} rx={7}
            fill={isSel ? 'rgba(99,102,241,0.10)' : 'rgba(130,160,152,0.10)'}
            stroke={isSel ? 'rgba(99,102,241,0.55)' : 'rgba(130,160,152,0.40)'}
            strokeWidth={1.2}
          />
        )}

        {isMissing ? (
          /* MISSING — ghost slot only */
          <rect x={sx + 10} y={imgTop + 8} width={SLOT - 20} height={IMG_H - 16}
            rx={6} fill="rgba(195,208,218,0.18)"
            stroke="rgba(155,170,182,0.28)" strokeWidth={1} strokeDasharray="3,3" />

        ) : hasImp ? (
          /* ── IMPLANT ──
             Screw sits in root zone, crown sits in crown zone.
             They share a common edge so margins are merged. */
          <>
            {/* Implant screw — fills the ROOT zone exactly */}
            <image
              href={implantSrc}
              x={rootLeft} y={rootTop}
              width={rootW} height={ROOT_H}
              preserveAspectRatio="xMidYMid meet"
            />
            {/* Crown on implant — fills the CROWN zone exactly, right above/below screw */}
            {hasCrown && (
              <image
                href={crownSrc}
                x={crownLeft} y={crownTop}
                width={crownW} height={CROWN_H}
                preserveAspectRatio="xMidYMid meet"
              />
            )}
            {/* No crown yet: show thin platform line at junction */}
            {!hasCrown && (
              <line
                x1={rootLeft} y1={up ? rootTop : rootTop + ROOT_H}
                x2={rootLeft + rootW} y2={up ? rootTop : rootTop + ROOT_H}
                stroke="#6BAED6" strokeWidth={1.5} strokeDasharray="3,2"
                style={{ pointerEvents: 'none' }}
              />
            )}
          </>

        ) : hasCrown ? (
          /* ── CROWN ONLY (FPD or prosthetic on natural) ── */
          <image
            href={crownSrc}
            x={crownLeft} y={crownTop}
            width={crownW} height={CROWN_H}
            preserveAspectRatio="xMidYMid meet"
            opacity={cs.opacity}
          />

        ) : (
          /* ── NATURAL TOOTH ── full image filling the slot */
          <>
            <image
              href={toothSrc}
              x={sx + 1} y={imgTop}
              width={SLOT - 2} height={IMG_H}
              preserveAspectRatio="xMidYMid meet"
              opacity={cs.opacity}
            />
            {/* Condition colour tint */}
            {cs.tint && (
              <rect x={sx + 1} y={imgTop} width={SLOT - 2} height={IMG_H}
                rx={4} fill={cs.tint} opacity={0.5}
                style={{ pointerEvents: 'none' }} />
            )}
            {/* Condition badge */}
            {cs.badge && (
              <text x={scx} y={imgTop + IMG_H * 0.5 + 5}
                textAnchor="middle" fontSize={12} fontWeight="800"
                fill="#7C2D12" fontFamily="'IBM Plex Sans',sans-serif"
                style={{ userSelect: 'none', pointerEvents: 'none' }}>{cs.badge}</text>
            )}
          </>
        )}

        {/* FDI number label */}
        <text x={scx} y={numY}
          textAnchor="middle" fontSize={9.5}
          fontFamily="'IBM Plex Mono',monospace"
          fill={labelFill}
          fontWeight={hasImp || hasCrown ? '700' : '500'}
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >{n}</text>
      </g>
    );
  };

  /* ── LEGEND ── */
  const legends = [
    { color: '#F5F3EE', border: '#C0B8A8', label: 'Healthy' },
    { color: '#4A5C62', border: '#2E3A3E', label: 'Implant' },
    { color: '#B8D4E8', border: '#6BAED6', label: 'Crown / FPD' },
    { color: 'rgba(195,208,218,0.3)', border: 'rgba(155,170,182,0.5)', label: 'Missing', dashed: true },
  ];

  return (
    <div style={{
      background: '#F7F5F0',
      borderRadius: 14,
      overflow: 'hidden',
      border: '1px solid #DDD8CE',
    }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: 'block' }}
        aria-label="FDI Dental Chart"
      >
        {/* Background */}
        <rect width={W} height={H} fill="#F7F5F0" />

        {/* Inter-arch shaded band */}
        <rect x={LM} y={BITE_U} width={W - LM * 2} height={BITE_L - BITE_U}
          fill="rgba(195,185,170,0.14)" />

        {/* Bite lines */}
        <line x1={LM} y1={BITE_U} x2={W - LM} y2={BITE_U}
          stroke="#C0B8A8" strokeWidth={1.2} />
        <line x1={LM} y1={BITE_L} x2={W - LM} y2={BITE_L}
          stroke="#C0B8A8" strokeWidth={1.2} />

        {/* Midline separator */}
        <line
          x1={LM + 8 * SLOT + GAP / 2} y1={UY}
          x2={LM + 8 * SLOT + GAP / 2} y2={LY + IMG_H}
          stroke="#B0A898" strokeWidth={1.2} strokeDasharray="4,4"
        />

        {/* FPD bridge connectors */}
        {bridgeOverlays}

        {/* All 32 teeth */}
        {UPPER.map(renderTooth)}
        {LOWER.map(renderTooth)}

        {/* Legend */}
        {legends.map(({ color, border, label, dashed }, i) => (
          <g key={label} transform={`translate(${LM + i * 138} ${LEGEND_Y})`}>
            <rect width={14} height={14} rx={3}
              fill={color} stroke={border} strokeWidth={1.2}
              strokeDasharray={dashed ? '2,2' : undefined} />
            <text x={20} y={11.5} fontSize={9.5} fill="#5C6370"
              fontFamily="'IBM Plex Sans',sans-serif">{label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
