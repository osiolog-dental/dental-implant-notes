import { useMemo, useState } from 'react';
import { archForRehabType } from './FullMouthRehabFormModal';

/*
  Panoramic (OPG-style) FDI chart — the default patient-page chart (the classic
  DentalChart stays available behind the switch in PatientChart.js). It reads
  the same records as the classic chart and opens the same forms; it never
  saves anything itself.

  Drawing: each tooth is one of the doctor's own tooth drawings in
  /public/opg-teeth, sized by average anatomical length. Zygomatic and
  pterygoid implants are drawn from the crest to the zygoma / pterygoid plate.
  The zygomatic path (anterior vs posterior) is chosen from the tooth number:
  12–13 / 22–23 anterior, 14–16 / 24–26 posterior.

  All colours and fonts are inline SVG attributes (not CSS classes) so the
  PDF export, which serialises this SVG, keeps the look.
*/

/* ── record colours (same as the classic chart's buttons) ── */
const C = {
  missing: '#2563EB', implant: '#0369A1', zyg: '#B04A33', ptg: '#9A6B12',
  abut: '#C2850A', crown: '#16A34A', od: '#7C3AED', fmr: '#4F46E5',
  natural: '#5F7F77', ink: '#2A2F35', ink2: '#5C6773', line: '#E5E5E2',
  graft: '#A16207', failed: '#DC2626',
};
const OUTLINE = '#2E2A26';
const TOOTH_LINE = '#535353';

/* ── geometry ── */
const DIMS = {11:[200,555],12:[168,597],13:[183,647],14:[179,586],15:[254,786],16:[345,698],17:[343,726],18:[338,682],21:[200,555],22:[168,597],23:[183,647],24:[179,586],25:[254,786],26:[345,698],27:[343,726],28:[338,682],31:[137,595],32:[160,593],33:[168,626],34:[259,824],35:[271,836],36:[369,776],37:[340,637],38:[335,600],41:[137,595],42:[160,593],43:[169,626],44:[259,824],45:[271,836],46:[369,776],47:[340,637],48:[342,580]};
// Where each drawing's outline crosses the crown cut line (fraction of picture width)
const CERV = {11:[0.1,0.825],12:[0.104,0.821],13:[0.178,0.877],14:[0.181,0.819],15:[0.137,0.814],16:[0.087,0.87],17:[0.036,0.898],18:[0.059,0.889],21:[0.175,0.9],22:[0.179,0.896],23:[0.123,0.822],24:[0.181,0.819],25:[0.186,0.863],26:[0.13,0.913],27:[0.102,0.964],28:[0.111,0.941],31:[0.182,0.855],32:[0.156,0.766],33:[0.075,0.821],34:[0.135,0.865],35:[0.167,0.824],36:[0.061,0.892],37:[0.074,0.941],38:[0.097,0.94],41:[0.145,0.818],42:[0.234,0.844],43:[0.176,0.912],44:[0.135,0.865],45:[0.176,0.833],46:[0.108,0.939],47:[0.059,0.926],48:[0.073,0.905]};
const LEN  = { U: [23.5,22,27,22.5,22.5,20.5,20,17.5], L: [21.5,23.5,27,22.5,22.5,21.5,20,18] };
const CRMM = { U: [10.5,9,10,8.5,8.5,7.5,7,6.5],       L: [9,9.5,11,8.5,8,7.5,7,7] };
const PXMM = 5;
const VW = 1170, VH = 700, MID = 585, Y_UP = 400, Y_LO = 446;
const occU = x => { const d = x - MID; return Y_UP - 0.33 * (Math.sqrt(d * d + 3600) - 60); };
const occL = x => { const d = x - MID; return Y_LO - 0.00083 * d * d; };
const slope = (f, x) => f(x + 0.5) - f(x - 0.5);
const tiltU = x => Math.atan(slope(occU, x)) * 180 / Math.PI * 0.45;
const tiltL = x => Math.atan(slope(occL, x)) * 180 / Math.PI * 0.45;

const TEETH = [];
[['U', 1, 2], ['L', 4, 3]].forEach(([arch, qR, qL]) => {
  [[qR, -1], [qL, 1]].forEach(([q, s]) => {
    let cum = 0;
    for (let i = 0; i < 8; i++) {
      const n = q * 10 + i + 1, [ow, oh] = DIMS[n];
      const H = LEN[arch][i] * PXMM, W = H * ow / oh, step = W * 0.95, cx = cum + step / 2;
      cum += step;
      const x = MID + s * cx;
      TEETH.push({ n, q, idx: i, arch, x, W, H, c: CRMM[arch][i] * PXMM,
        a: arch === 'U' ? tiltU(x) : tiltL(x), y: arch === 'U' ? occU(x) : occL(x) });
    }
  });
});
const BY = {}; TEETH.forEach(t => { BY[t.n] = t; });
const ORD = {
  U: [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28],
  L: [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38],
};
const archOf = n => (Math.floor(n / 10) <= 2 ? 'U' : 'L');
const ARCH_NAME = { U: 'Upper', L: 'Lower' };

function toGlobal(t, lx, ly) {
  const a = t.a * Math.PI / 180; if (t.arch === 'L') ly = -ly;
  return { x: t.x + lx * Math.cos(a) - ly * Math.sin(a), y: t.y + lx * Math.sin(a) + ly * Math.cos(a) };
}
const ZYG = { post: { x: 285, y: 98 }, ant: { x: 322, y: 75 } };
const PTG = { x: 268, y: 195 };
const isAnteriorZyg = t => (t.idx + 1) <= 3;
function anchorFor(t, base) {
  const p = base === 'zygomatic' ? (isAnteriorZyg(t) ? ZYG.ant : ZYG.post) : PTG;
  return t.q === 1 ? { x: p.x, y: p.y } : { x: 2 * MID - p.x, y: p.y };
}
const siteOk = (base, n) => {
  const t = BY[n], u = t.idx + 1;
  if (base === 'zygomatic') return t.arch === 'U' && u >= 2 && u <= 6;
  if (base === 'pterygoid') return t.arch === 'U' && u >= 7;
  return true;
};

const NAMES = ['central incisor','lateral incisor','canine','first premolar','second premolar','first molar','second molar','third molar'];
const QUAD = { 1: 'Upper right', 2: 'Upper left', 3: 'Lower left', 4: 'Lower right' };
const COND_BADGE = { rootStump: 'RS', grosslyDecayed: 'GD', fractured: 'F' };
const COND_LABEL = { rootStump: 'Root stump', grosslyDecayed: 'Grossly decayed', fractured: 'Fractured' };
const isImp = b => b === 'implant' || b === 'zygomatic' || b === 'pterygoid';
const isFailedImplant = i => (i.implant_outcome || '').toLowerCase() === 'failed';
const isGone = b => b === 'missing' || b === 'extracted';
const f1 = v => Number(v).toFixed(1);
const pts = arr => arr.map(p => `${f1(p.x)},${f1(p.y)}`).join(' ');
const fmtDate = d => {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt) ? String(d) : dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

/* ── turn the patient's saved records into what the chart draws ── */
function useChartModel({ implants, fpdRecords, toothConditions, abutmentRecords, overdentureRecords, fullMouthRehabRecords, extractionRecords }) {
  return useMemo(() => {
    // Implants per tooth, split three ways:
    //   impBy     — the implant in the bone (not failed; newest if several)
    //   failedBy  — failed and still in place, waiting to be removed (drawn red)
    //   removedBy — failed and removed: dated, or (for older records with no date)
    //               a newer implant has already been logged on that tooth
    const impBy = {}, failedBy = {}, removedBy = {};
    const stamp = i => i.created_at || i.surgery_date || '';
    const byTooth = {};
    implants.forEach(i => { (byTooth[i.tooth_number] = byTooth[i.tooth_number] || []).push(i); });
    Object.entries(byTooth).forEach(([tn, list]) => {
      const n = Number(tn);
      const sorted = [...list].sort((a, b) => String(stamp(a)).localeCompare(String(stamp(b))));
      const active = sorted.filter(i => !isFailedImplant(i));
      if (active.length) impBy[n] = active[active.length - 1];
      sorted.filter(isFailedImplant).forEach(f => {
        const newerPlaced = active.some(o => String(stamp(o)) > String(stamp(f)));
        if (f.removed_date || newerPlaced) (removedBy[n] = removedBy[n] || []).push(f);
        else failedBy[n] = f;
      });
    });
    const extractedBy = {};
    extractionRecords.forEach(r => (r.tooth_numbers || []).forEach(n => { extractedBy[n] = r; }));
    const abutBy = {};
    abutmentRecords.forEach(a => { if (a.tooth_number) abutBy[a.tooth_number] = a; });

    const base = {};
    const kindOf = imp => (imp.is_zygomatic ? 'zygomatic' : imp.is_pterygoid ? 'pterygoid' : 'implant');
    const failedAs = {};
    TEETH.forEach(({ n }) => {
      const imp = impBy[n];
      if (failedBy[n]) { base[n] = 'failed'; failedAs[n] = kindOf(failedBy[n]); }  // still in the bone — flag it first
      else if (imp) base[n] = kindOf(imp);
      else if (extractedBy[n]) base[n] = 'extracted';
      else if (removedBy[n] || toothConditions[n]?.condition === 'missing') base[n] = 'missing';  // removed = empty site
      else base[n] = 'present';
    });

    const pontic = new Map();   // n → 'fpd' | 'fmr' | 'od'
    const crownOf = new Map();  // n → 'crown' | 'fpd' | 'fmr'
    const att = new Map();      // n → attachment type (overdenture)
    const fpdBy = {};
    const bridges = [];
    fpdRecords.forEach(f => {
      const teeth = (f.tooth_numbers || []).filter(n => BY[n]);
      if (!teeth.length) return;
      teeth.forEach(n => { fpdBy[n] = f; });
      if (teeth.length === 1) { crownOf.set(teeth[0], 'crown'); return; }
      const arch = archOf(teeth[0]);
      const sorted = [...teeth].sort((a, b) => ORD[arch].indexOf(a) - ORD[arch].indexOf(b));
      bridges.push(sorted);
      sorted.forEach(n => {
        const role = f.tooth_roles?.[n] || f.tooth_roles?.[String(n)];
        if (role === 'pontic' || isGone(base[n])) pontic.set(n, 'fpd'); else crownOf.set(n, 'fpd');
      });
    });
    // implant with a prosthetic loading date = restored (same rule as the classic chart)
    Object.values(impBy).forEach(i => {
      if (i.prosthetic_loading_date && !crownOf.has(i.tooth_number) && !pontic.has(i.tooth_number)) crownOf.set(i.tooth_number, 'crown');
    });

    const implantsIn = arch => ORD[arch].filter(n => isImp(base[n]));
    const archesOfIds = ids => {
      const s = new Set();
      (ids || []).forEach(id => { const imp = implants.find(i => i.id === id); if (imp) s.add(archOf(imp.tooth_number)); });
      return s;
    };

    const fmrSpans = {}, fmrBy = {};
    fullMouthRehabRecords.forEach(r => {
      const a = archForRehabType(r.rehab_type);
      const arches = a === 'upper' ? ['U'] : a === 'lower' ? ['L'] : a === 'both' ? ['U', 'L'] : [...archesOfIds(r.connected_implant_ids)];
      arches.forEach(arch => {
        const idx = implantsIn(arch).map(n => ORD[arch].indexOf(n));
        const span = idx.length >= 2 ? ORD[arch].slice(Math.min(...idx), Math.max(...idx) + 1) : ORD[arch].slice(2, 14);
        fmrSpans[arch] = span; fmrBy[arch] = r;
        span.forEach(n => { if (isGone(base[n])) pontic.set(n, 'fmr'); else crownOf.set(n, 'fmr'); });
      });
    });

    const odSpans = {}, odBy = {}, odBars = {};
    overdentureRecords.forEach(r => {
      const arches = archesOfIds(r.connected_implant_ids);
      (r.tooth_numbers || []).forEach(n => { if (BY[n]) arches.add(archOf(n)); });
      arches.forEach(arch => {
        const span = ORD[arch].slice(1, 15);
        odSpans[arch] = span; odBy[arch] = r;
        const linked = (r.connected_implant_ids || []).length
          ? implants.filter(i => r.connected_implant_ids.includes(i.id)).map(i => i.tooth_number)
          : implantsIn(arch);
        const kind = attachmentKind(r.attachment_type, r.has_bar);
        span.forEach(n => {
          if (isGone(base[n])) pontic.set(n, 'od');
          else if (isImp(base[n]) && linked.includes(n)) { att.set(n, kind); crownOf.delete(n); }
        });
        const onBar = span.filter(n => att.has(n));
        if (kind === 'bar' && onBar.length >= 2) odBars[arch] = onBar;
      });
    });

    // Extraction follow-through: grafted socket, implant still planned, or implant placed
    // straight into the fresh socket (extraction logged + implant marked Immediate Placement).
    const site = {};
    TEETH.forEach(({ n }) => {
      const ext = extractedBy[n], imp = impBy[n];
      if (!ext) return;
      const due = ext.planned_future_implant && ext.extraction_date && ext.reminder_days
        ? new Date(new Date(ext.extraction_date).getTime() + ext.reminder_days * 86400000) : null;
      site[n] = {
        graft: !imp && !!ext.bone_graft,
        planned: !imp && !!ext.planned_future_implant,
        due: due && !isNaN(due) ? due : null,
        immediate: !!imp && imp.surgical_approach === 'Immediate Placement',
      };
    });

    return { impBy, failedBy, removedBy, failedAs, abutBy, fpdBy, extractedBy, site, base, pontic, crownOf, att, bridges, fmrSpans, fmrBy, odSpans, odBy, odBars };
  }, [implants, fpdRecords, toothConditions, abutmentRecords, overdentureRecords, fullMouthRehabRecords, extractionRecords]);
}

/* ── small drawing helpers ── */
function Fixture({ L, r, mode, stroke }) {
  const apexR = r * 0.85;
  const start = mode === 'apical' ? L * 0.6 : 5;
  let d = '';
  for (let y = start; y < L - apexR * 0.6; y += 4.5) {
    d += `M${f1(-r - 2)},${f1(-y)} L${f1(-r + 2.2)},${f1(-y + 1.5)} M${f1(r + 2)},${f1(-y)} L${f1(r - 2.2)},${f1(-y + 1.5)} `;
  }
  return (
    <>
      <path d={`M${f1(-r)},0 L${f1(-r)},${f1(-(L - apexR))} Q${f1(-r)},${f1(-L)} 0,${f1(-L)} Q${f1(r)},${f1(-L)} ${f1(r)},${f1(-(L - apexR))} L${f1(r)},0 Z`}
        fill="url(#opg-metal)" stroke={stroke || OUTLINE} strokeWidth={stroke ? 1.6 : 0.9} />
      {d && <path d={d} stroke="#4B5553" strokeWidth={1} fill="none" opacity={0.8} />}
      <rect x={-r - 1.4} y={-4} width={2 * r + 2.8} height={5} rx={1} fill="#6E7B78" />
    </>
  );
}

/* closed gum-line margin under a crown drawn on its own */
function Margin({ t, r }) {
  const sg = t.arch === 'U' ? -1 : 1, c = t.c, f = CERV[t.n];
  const xl = -t.W / 2 + f[0] * t.W + 0.8, xr = -t.W / 2 + f[1] * t.W - 0.8, w = xr - xl;
  const Y = v => f1(sg * v), X = v => f1(v);
  let edge;
  if (r > 0) {
    const d = Math.min(9, w * 0.2), seat = c + 3, rr = r + 0.6;
    edge = `M${X(xl)},${Y(c)} C${X(xl + w * 0.04)},${Y(c + d)} ${X(-rr - w * 0.12)},${Y(seat + 1)} ${X(-rr)},${Y(seat)} L${X(rr)},${Y(seat)} C${X(rr + w * 0.12)},${Y(seat + 1)} ${X(xr - w * 0.04)},${Y(c + d)} ${X(xr)},${Y(c)}`;
  } else {
    const k = Math.min(10, w * 0.24);
    edge = `M${X(xl)},${Y(c)} C${X(xl + w * 0.02)},${Y(c + k)} ${X(xr - w * 0.02)},${Y(c + k)} ${X(xr)},${Y(c)}`;
  }
  return (
    <>
      <path d={`${edge} L${X(xr)},${Y(c - 3)} L${X(xl)},${Y(c - 3)} Z`} fill="#FFFFFF" />
      <path d={edge} fill="none" stroke={TOOTH_LINE} strokeWidth={1.5} strokeLinecap="round" />
    </>
  );
}

function HaloFilter({ id, color, warm }) {
  return (
    <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
      {warm
        ? <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0.97 0 0 0  0 0 0.84 0 0  0 0 0 1 0" result="g" />
        : <feOffset in="SourceGraphic" dx="0" dy="0" result="g" />}
      <feMorphology in="SourceAlpha" operator="dilate" radius="1.6" result="d" />
      <feFlood floodColor={color} floodOpacity="0.9" />
      <feComposite in2="d" operator="in" result="halo" />
      <feMerge><feMergeNode in="halo" /><feMergeNode in="g" /></feMerge>
    </filter>
  );
}

/* What sits on top of an implant, read from the saved abutment type / overdenture attachment */
const abutmentKind = type => {
  const s = (type || '').toLowerCase();
  if (s.includes('ball')) return 'ball';
  if (s.includes('locator')) return 'locator';
  if (s.includes('mua') || s.includes('multi-unit')) return 'mua';
  return 'stock';
};
const attachmentKind = (type, hasBar) => {
  const s = (type || '').toLowerCase();
  if (s.includes('bar') || hasBar) return 'bar';
  if (s.includes('ball')) return 'ball';
  if (s.includes('locator')) return 'locator';
  if (s.includes('magnet')) return 'magnet';
  return 'stud';           // ERA, Ceka and other stud attachments
};

/* Drawn in the tooth's own frame: implant platform at y = -c, crown side toward +y */
function Attachment({ kind, r, c, color, fill }) {
  const y0 = -c, s = { fill, stroke: color, strokeWidth: 1.4 };
  switch (kind) {
    case 'ball':
      return (<>
        <rect x={f1(-r * 0.7)} y={f1(y0)} width={f1(r * 1.4)} height={6} rx={1} {...s} />
        <rect x={-2} y={f1(y0 + 6)} width={4} height={4} {...s} />
        <circle cx={0} cy={f1(y0 + 15)} r={5.5} {...s} />
      </>);
    case 'locator':
      return (<>
        <rect x={f1(-r * 0.8)} y={f1(y0)} width={f1(r * 1.6)} height={5} rx={1} {...s} />
        <rect x={f1(-r * 0.95)} y={f1(y0 + 5)} width={f1(r * 1.9)} height={6} rx={2} {...s} />
        <rect x={-2.5} y={f1(y0 + 7.5)} width={5} height={3.5} rx={1} fill="#FFFFFF" stroke={color} strokeWidth={1} />
      </>);
    case 'magnet':
      return (<>
        <rect x={f1(-r * 0.8)} y={f1(y0)} width={f1(r * 1.6)} height={5} rx={1} {...s} />
        <rect x={f1(-r)} y={f1(y0 + 5)} width={f1(r * 2)} height={4} rx={1} fill="#9AA5A2" stroke={color} strokeWidth={1.4} />
      </>);
    case 'mua':
    case 'bar':
      return (<>
        <path d={`M${f1(-r)},${f1(y0)} L${f1(-r * 0.55)},${f1(y0 + 8)} L${f1(r * 0.55)},${f1(y0 + 8)} L${f1(r)},${f1(y0)} Z`} {...s} />
        <rect x={f1(-r * 0.55)} y={f1(y0 + 8)} width={f1(r * 1.1)} height={4} rx={1} {...s} />
      </>);
    case 'stud':
      return (<>
        <rect x={f1(-r * 0.7)} y={f1(y0)} width={f1(r * 1.4)} height={6} rx={1} {...s} />
        <rect x={-3} y={f1(y0 + 6)} width={6} height={7} rx={3} {...s} />
      </>);
    default: {
      const h = Math.min(c * 0.55, 24);
      return <path d={`M${f1(-r)},${f1(y0)} L${f1(-r * 0.6)},${f1(y0 + h)} L${f1(r * 0.6)},${f1(y0 + h)} L${f1(r)},${f1(y0)} Z`} {...s} opacity={0.92} />;
    }
  }
}

const fixtureR = (b, imp) => b === 'implant' ? (parseFloat(imp?.diameter_mm) || 4) * PXMM / 2 : (b === 'zygomatic' ? 5.2 : 6);
const fixtureLen = imp => (parseFloat(imp?.length_mm) || 10) * PXMM;

/* ── the SVG plate ── */
function Plate({ model, toothConditions, selected, onSelect }) {
  const base = process.env.PUBLIC_URL || '';
  const { base: B, pontic, crownOf, att, bridges, fmrSpans, odSpans, impBy, abutBy } = model;

  const flange = (span, h, fill, stroke, opacity) => {
    const bottom = [], top = [];
    span.forEach(n => {
      const t = BY[n];
      bottom.push(toGlobal(t, -t.W / 2, -t.c), toGlobal(t, t.W / 2, -t.c));
      top.push(toGlobal(t, -t.W / 2, -t.c - h), toGlobal(t, t.W / 2, -t.c - h));
    });
    return <polygon points={pts([...bottom, ...top.reverse()])} fill={fill} stroke={stroke} strokeWidth={1} opacity={opacity} />;
  };

  const icons = [], teeth = [], specials = [], labels = [];
  TEETH.forEach(t => {
    const b = B[t.n], imp = impBy[t.n], pk = pontic.get(t.n), ck = crownOf.get(t.n);
    // A failed implant still in place is drawn as its own kind, in red.
    const failed = b === 'failed';
    const kind = failed ? model.failedAs[t.n] : b;
    const rec = failed ? model.failedBy[t.n] : imp;
    const iy = t.arch === 'U' ? -t.H : 0;
    const href = `${base}/opg-teeth/${t.n}.png`;
    const tf = `translate(${f1(t.x)},${f1(t.y)}) rotate(${t.a.toFixed(2)})`;
    const img = (props) => <image href={href} x={f1(-t.W / 2)} y={f1(iy)} width={f1(t.W)} height={f1(t.H)} {...props} />;
    const clip = `url(#opg-cp-${t.n})`;
    const standalone = (filterKey, opacity, ovate) => (
      <g filter={filterKey ? `url(#opg-f-${filterKey})` : undefined} opacity={opacity}>
        {img({ clipPath: clip })}
        <Margin t={t} r={isImp(b) && !ovate ? fixtureR(b, imp) : 0} />
      </g>
    );
    let body = null;
    if (b === 'present') body = <>{img({})}{ck && <g filter={`url(#opg-f-${ck})`}>{img({ clipPath: clip })}</g>}</>;
    else if (pk) body = standalone(`p-${pk}`);
    else if (b === 'missing') body = standalone(null, 0.28);
    else if (b === 'extracted') body = img({ opacity: 0.16 });
    else if (failed) body = standalone(null, 0.28, true);
    else if (att.has(t.n)) body = standalone('p-od', undefined, true);   // denture tooth over the attachment
    else if (ck) body = standalone(ck);
    icons.push(<g key={t.n} transform={tf}>{body}</g>);

    const flip = t.arch === 'L' ? ' scale(1,-1)' : '';
    const site = model.site[t.n];
    const r = fixtureR(kind, rec);
    // A ball/locator abutment record wins; otherwise the overdenture attachment; otherwise the abutment type.
    const aKind = abutBy[t.n] ? abutmentKind(abutBy[t.n].abutment_type) : null;
    const oKind = att.get(t.n) || null;
    const topKind = !isImp(b) ? null
      : (aKind === 'ball' || aKind === 'locator') ? aKind
      : oKind || aKind;
    const sel = selected === t.n;
    teeth.push(
      <g key={t.n} transform={tf + flip} style={{ cursor: 'pointer' }} data-testid={`opg-tooth-${t.n}`}
        role="button" tabIndex={0} aria-label={`Tooth ${t.n}`}
        onClick={() => onSelect(t.n)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(t.n); } }}>
        <rect x={f1(-t.W / 2 - 2)} y={f1(-t.H - 3)} width={f1(t.W + 4)} height={f1(t.H + 6)} rx={6}
          fill={sel ? 'rgba(95,127,119,0.08)' : 'transparent'}
          stroke={sel ? C.natural : 'none'} strokeWidth={1.6} strokeDasharray="4 3" />
        {failed && (
          <rect x={f1(-t.W / 2 - 1)} y={f1(-t.H - 2)} width={f1(t.W + 2)} height={f1(t.H + 4)} rx={6}
            fill="rgba(220,38,38,0.07)" stroke={C.failed} strokeWidth={2} strokeDasharray="6 3" style={{ pointerEvents: 'none' }} />
        )}
        {kind === 'implant' && <g transform={`translate(0,${f1(-t.c)})`}><Fixture L={fixtureLen(rec)} r={r} mode="full" stroke={failed ? C.failed : C.implant} /></g>}
        {topKind && <Attachment kind={topKind} r={r} c={t.c}
          color={abutBy[t.n] ? C.abut : C.od} fill={abutBy[t.n] ? '#F2CF7E' : '#DCCBFA'} />}
        {b === 'extracted' && !pk && site?.graft && (
          <path d={`M${f1(-t.W * 0.28)},${f1(-t.c)} L${f1(-t.W * 0.2)},${f1(-t.c - (t.H - t.c) * 0.7)} Q0,${f1(-t.c - (t.H - t.c) * 0.82)} ${f1(t.W * 0.2)},${f1(-t.c - (t.H - t.c) * 0.7)} L${f1(t.W * 0.28)},${f1(-t.c)} Z`}
            fill="url(#opg-graft)" stroke={C.graft} strokeWidth={1.2} strokeDasharray="2 2" />
        )}
        {b === 'extracted' && !pk && site?.planned && (
          <g transform={`translate(0,${f1(-t.c)})`}>
            <path d={`M-9,0 L-9,-44 Q-9,-52 0,-52 Q9,-52 9,-44 L9,0 Z`} fill="none" stroke={C.implant} strokeWidth={1.6} strokeDasharray="4 3" />
          </g>
        )}
      </g>
    );

    if (b === 'extracted' && !pk) {
      const q = toGlobal(t, 0, -t.c);
      labels.push(<path key={`x${t.n}`} d={`M${f1(q.x - 6)},${f1(q.y - 6)} L${f1(q.x + 6)},${f1(q.y + 6)} M${f1(q.x + 6)},${f1(q.y - 6)} L${f1(q.x - 6)},${f1(q.y + 6)}`}
        stroke={C.missing} strokeWidth={2.4} strokeLinecap="round" />);
    }
    const np = toGlobal(t, 0, 13);
    const badge = failed ? 'FAIL' : model.site[t.n]?.immediate ? 'IMM' : COND_BADGE[toothConditions[t.n]?.condition];
    labels.push(
      <text key={`n${t.n}`} x={f1(np.x)} y={f1(np.y)} textAnchor="middle" dominantBaseline="middle"
        fontFamily="'IBM Plex Mono',monospace" fontSize={10} fontWeight={600}
        fill={failed ? C.failed : isGone(b) && !pk ? '#8B8178' : OUTLINE} stroke="#FBF8F3" strokeWidth={3} paintOrder="stroke"
        style={{ pointerEvents: 'none' }}>{t.n}{badge ? ` ${badge}` : ''}</text>
    );

    if (kind === 'zygomatic' || kind === 'pterygoid') {
      const entry = toGlobal(t, 0, -t.c), apex = anchorFor(t, kind);
      const vx = apex.x - entry.x, vy = apex.y - entry.y, L = Math.hypot(vx, vy), th = Math.atan2(vx, -vy) * 180 / Math.PI;
      const col = failed ? C.failed : kind === 'zygomatic' ? C.zyg : C.ptg;
      specials.push(
        <g key={`s${t.n}`} transform={`translate(${f1(entry.x)},${f1(entry.y)}) rotate(${th.toFixed(2)})`} style={{ pointerEvents: 'none' }}>
          <Fixture L={L} r={r} mode={kind === 'zygomatic' ? 'apical' : 'full'} stroke={col} />
          <circle cx={0} cy={f1(-L)} r={9} fill="none" stroke={col} strokeWidth={1.6} strokeDasharray="3 2" />
        </g>
      );
      const fr = kind === 'pterygoid' ? 0.5 : (isAnteriorZyg(t) ? 0.38 : 0.74);
      const mx = entry.x + vx * fr, my = entry.y + vy * fr;
      let nx = vy / L, ny = -vx / L;
      if (Math.abs(mx + nx * 10 - MID) < Math.abs(mx - MID)) { nx = -nx; ny = -ny; }
      const len = rec?.length_mm ? ` ${parseFloat(rec.length_mm)}` : '';
      labels.push(
        <text key={`l${t.n}`} x={f1(mx + nx * 22)} y={f1(my + ny * 22)} textAnchor="middle" dominantBaseline="middle"
          fontFamily="'IBM Plex Mono',monospace" fontSize={11} fontWeight={600} letterSpacing="0.05em"
          fill={col} stroke="#FBF8F3" strokeWidth={4} paintOrder="stroke" style={{ pointerEvents: 'none' }}>
          {(kind === 'zygomatic' ? 'ZYG' : 'PTG') + len + (failed ? ' FAILED' : '')}
        </text>
      );
    }
  });

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} aria-label="FDI Dental Chart" role="img"
      style={{ display: 'block', width: '100%', minWidth: 720, height: 'auto' }}>
      <defs>
        <linearGradient id="opg-metal" x1="0" x2="1">
          <stop offset="0" stopColor="#8E9997" /><stop offset=".45" stopColor="#F1F4F3" /><stop offset="1" stopColor="#9AA5A2" />
        </linearGradient>
        <pattern id="opg-graft" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="#F3E3C3" />
          <circle cx="1.5" cy="1.5" r="1.1" fill={C.graft} /><circle cx="4.5" cy="4.2" r="0.9" fill={C.graft} />
        </pattern>
        <HaloFilter id="opg-f-crown" color={C.crown} />
        <HaloFilter id="opg-f-fpd" color={C.crown} />
        <HaloFilter id="opg-f-fmr" color={C.fmr} />
        <HaloFilter id="opg-f-p-fpd" color={C.crown} warm />
        <HaloFilter id="opg-f-p-fmr" color={C.fmr} warm />
        <HaloFilter id="opg-f-p-od" color={C.od} warm />
        {TEETH.map(t => (
          <clipPath key={t.n} id={`opg-cp-${t.n}`}>
            {t.arch === 'U'
              ? <rect x={f1(-t.W)} y={f1(-t.c)} width={f1(t.W * 2)} height={f1(t.c + 4)} />
              : <rect x={f1(-t.W)} y={-4} width={f1(t.W * 2)} height={f1(t.c + 4)} />}
          </clipPath>
        ))}
      </defs>
      <rect width={VW} height={VH} fill="#FBF8F3" />
      <Anatomy />
      <g>
        {Object.entries(fmrSpans).map(([a, span]) => <g key={`fm${a}`}>{flange(span, 14, '#DDA39B', '#B8736B', 0.75)}</g>)}
        {Object.entries(odSpans).map(([a, span]) => <g key={`od${a}`}>{flange(span, 18, '#CDBAF3', C.od, 0.6)}</g>)}
      </g>
      <g style={{ pointerEvents: 'none' }}>{icons}</g>
      <g>{teeth}</g>
      <g style={{ pointerEvents: 'none' }}>
        {Object.entries(fmrSpans).map(([a, span]) => (
          <polyline key={`bar${a}`} points={pts(span.map(n => toGlobal(BY[n], 0, -BY[n].c - 5)))}
            fill="none" stroke={C.fmr} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" opacity={0.75} />
        ))}
        {Object.entries(model.odBars).map(([a, span]) => {
          const p = span.map(n => toGlobal(BY[n], 0, -BY[n].c + 12));
          return (
            <g key={`odbar${a}`}>
              <polyline points={pts(p)} fill="none" stroke={C.od} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
              {p.slice(1).map((q, i) => {
                const m = { x: (q.x + p[i].x) / 2, y: (q.y + p[i].y) / 2 };
                return <rect key={i} x={f1(m.x - 6)} y={f1(m.y - 4)} width={12} height={8} rx={2} fill="#FFFFFF" stroke={C.od} strokeWidth={1.4} />;
              })}
            </g>
          );
        })}
        {bridges.map((span, i) => (
          <polyline key={`br${i}`} points={pts(span.map(n => toGlobal(BY[n], 0, -BY[n].c * 0.55)))}
            fill="none" stroke={C.crown} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
        ))}
      </g>
      <g>{specials}</g>
      <g>{labels}</g>
      <text x={24} y={676} fill={OUTLINE} fontFamily="'Work Sans',sans-serif" fontSize={20} fontWeight={600}>R</text>
      <text x={1146} y={676} fill={OUTLINE} textAnchor="end" fontFamily="'Work Sans',sans-serif" fontSize={20} fontWeight={600}>L</text>
      <text x={585} y={690} fill="#5E554C" opacity={0.7} textAnchor="middle" fontFamily="'IBM Plex Mono',monospace" fontSize={9} letterSpacing="0.2em">
        ILLUSTRATION · NOT A RADIOGRAPH · NOT TO SCALE
      </text>
    </svg>
  );
}

function Anatomy() {
  const bone = { fill: '#DDC6A6', stroke: OUTLINE, strokeWidth: 2.6, strokeLinejoin: 'round' };
  const ln = { fill: 'none', stroke: OUTLINE, strokeWidth: 2.2, strokeLinecap: 'round' };
  const dash = { fill: 'none', stroke: OUTLINE, strokeWidth: 2, strokeDasharray: '7 5' };
  const sides = [[1, 0], [-1, 1170]].map(([s, o]) => {
    const X = x => o + s * x;
    return (
      <g key={s}>
        <path {...ln} d={`M${X(265)},192 C${X(300)},226 ${X(340)},241 ${X(390)},243 C${X(420)},243 ${X(440)},233 ${X(448)},219`} />
        <path {...ln} d={`M${X(418)},168 C${X(406)},190 ${X(390)},205 ${X(360)},215`} />
        <path {...ln} d={`M${X(527)},88 C${X(500)},100 ${X(488)},150 ${X(492)},185 C${X(495)},205 ${X(510)},213 ${X(545)},213 C${X(558)},213 ${X(566)},205 ${X(568)},195`} />
        <path {...ln} d={`M${X(506)},116 C${X(525)},122 ${X(538)},150 ${X(540)},186`} />
        <path {...dash} d={`M${X(293)},42 C${X(280)},90 ${X(262)},150 ${X(264)},190`} />
        <path {...dash} d={`M${X(304)},42 C${X(296)},92 ${X(286)},160 ${X(305)},206`} />
        <path {...dash} d={`M${X(324)},42 C${X(318)},110 ${X(322)},170 ${X(346)},220`} />
      </g>
    );
  });
  return (
    <g style={{ pointerEvents: 'none' }}>
      <g transform="translate(0,3)">
        <path {...bone} d="M45,42 C95,80 150,112 200,112 C240,112 290,72 330,42 C345,95 400,150 470,150 C500,150 515,95 518,42 L652,42 C655,95 670,150 700,150 C770,150 825,95 840,42 C880,72 930,112 970,112 C1020,112 1075,80 1125,42 L1128,210 C1110,175 1090,160 1070,158 C1030,150 960,160 905,185 L908,240 C904,265 884,280 860,285 C760,300 690,318 640,332 C610,342 585,346 560,340 C510,325 420,305 300,285 C280,280 262,262 262,240 L262,185 C210,160 140,150 100,158 C80,162 62,172 45,182 Z" />
        {sides}
        <path {...ln} d="M578,42 L578,160 M592,42 L592,160" />
        <path {...ln} d="M568,195 C568,170 576,158 585,158 C594,158 602,170 602,195" />
      </g>
      <g transform="translate(0,-6)">
        <path {...bone} d="M82,262 C76,242 100,230 125,236 C140,240 142,255 145,265 C160,300 205,300 225,272 C232,262 240,255 250,262 C268,300 285,390 305,432 C360,470 460,497 585,497 C710,497 810,470 865,432 C885,390 902,300 920,262 C930,255 938,262 945,272 C965,300 1010,300 1025,265 C1028,255 1030,240 1045,236 C1070,230 1094,242 1088,262 C1075,310 1045,360 1040,420 L1040,490 C1030,500 1025,510 1005,515 C900,560 720,640 600,652 L585,660 L570,652 C450,640 270,560 165,515 C145,510 140,500 130,490 L130,420 C125,360 95,310 82,262 Z" />
      </g>
    </g>
  );
}

/* ── side panel pieces ── */
const pillStyle = (color, disabled) => ({
  border: `1.5px solid ${color}`, color, background: 'transparent',
  opacity: disabled ? 0.35 : 1, cursor: disabled ? 'not-allowed' : 'pointer',
});

function Pill({ color, disabled, onClick, testid, title, children }) {
  return (
    <button type="button" data-testid={testid} disabled={disabled} title={title} onClick={onClick}
      className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[#F4F4F2]"
      style={pillStyle(color, disabled)}>
      {children}
    </button>
  );
}

function RecordCard({ color, title, rows, action }) {
  const shown = rows.filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false);
  return (
    <div className="rounded-lg px-3 py-2 text-xs" style={{ borderLeft: `3px solid ${color}`, background: '#F9F9F8' }}>
      <div className="font-semibold text-[#2A2F35] mb-0.5">{title}</div>
      {shown.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[#5C6773]">
          {shown.map(([k, v]) => (
            <div key={k} className="contents"><dt>{k}</dt><dd className="text-[#2A2F35]">{v === true ? 'Yes' : String(v)}</dd></div>
          ))}
        </dl>
      )}
      {action && (
        <button type="button" onClick={action.onClick} data-testid={action.testid}
          className="mt-2 w-full rounded-md px-3 py-1.5 text-xs font-semibold text-white"
          style={{ background: color }}>
          {action.label}
        </button>
      )}
    </div>
  );
}

/* Whole-case counts — useful for multi-implant and full-arch cases */
function CaseSummary({ model, fpdRecords }) {
  const all = TEETH.map(t => t.n);
  const count = fn => all.filter(fn).length;
  const conv = count(n => model.base[n] === 'implant');
  const zyg = count(n => model.base[n] === 'zygomatic');
  const ptg = count(n => model.base[n] === 'pterygoid');
  const imm = count(n => model.site[n]?.immediate);
  const kinds = {};
  Object.values(model.abutBy).forEach(a => { const k = abutmentKind(a.abutment_type); kinds[k] = (kinds[k] || 0) + 1; });
  const KIND_LABEL = { ball: 'ball', locator: 'locator', mua: 'MUA', stock: 'stock' };
  const abutText = Object.entries(kinds).map(([k, v]) => `${v} ${KIND_LABEL[k]}`).join(', ');
  const singleCrowns = count(n => model.crownOf.get(n) === 'crown');
  const bridges = fpdRecords.filter(f => (f.tooth_numbers || []).length > 1).length;
  const missing = count(n => model.base[n] === 'missing' && !model.pontic.has(n));
  const extracted = count(n => model.base[n] === 'extracted' && !model.pontic.has(n));
  const grafted = count(n => model.site[n]?.graft);
  const failedWaiting = count(n => model.base[n] === 'failed');
  const waiting = count(n => model.site[n]?.planned);

  const archLine = arch => {
    const parts = [];
    if (model.fmrBy[arch]) parts.push(model.fmrBy[arch].rehab_type || 'Full mouth rehab');
    if (model.odBy[arch]) parts.push(`Overdenture (${model.odBy[arch].attachment_type || 'attachment'})`);
    const n = ORD[arch].filter(t => isImp(model.base[t])).length;
    if (n) parts.push(`${n} implant${n > 1 ? 's' : ''}`);
    return parts.length ? `${ARCH_NAME[arch]}: ${parts.join(' · ')}` : null;
  };
  const rows = [
    [C.implant, 'Implants', conv + zyg + ptg, [conv && `${conv} conventional`, zyg && `${zyg} zygomatic`, ptg && `${ptg} pterygoid`, imm && `${imm} immediate`].filter(Boolean).join(', ')],
    [C.abut, 'Abutments', Object.keys(model.abutBy).length, abutText],
    [C.crown, 'Single crowns', singleCrowns, ''],
    [C.crown, 'Bridges', bridges, model.pontic.size ? `${model.pontic.size} pontic${model.pontic.size > 1 ? 's' : ''} in all` : ''],
    ...(failedWaiting ? [[C.failed, 'Failed, awaiting removal', failedWaiting, '']] : []),
    [C.missing, 'Missing, not restored', missing, ''],
    [C.missing, 'Extracted, not restored', extracted, [grafted && `${grafted} grafted`, waiting && `${waiting} waiting for implant`].filter(Boolean).join(', ')],
  ];
  const lines = [archLine('U'), archLine('L')].filter(Boolean);
  return (
    <div className="border-t border-[#E5E5E2] pt-3" data-testid="opg-case-summary">
      <div className="text-[10px] uppercase tracking-wider text-[#8A949D] mb-1.5">This case</div>
      <ul className="flex flex-col gap-1">
        {rows.map(([c, label, n, sub]) => (
          <li key={label} className="text-xs text-[#2A2F35]">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
              {label}
              <span className="ml-auto font-semibold tabular-nums" style={{ fontFamily: "'IBM Plex Mono',monospace" }}>{n}</span>
            </div>
            {sub && n > 0 && <div className="pl-[18px] text-[11px] text-[#5C6773]">{sub}</div>}
          </li>
        ))}
      </ul>
      {lines.length > 0 && <p className="mt-2 text-[11px] text-[#5C6773]">{lines.map(l => <span key={l} className="block">{l}</span>)}</p>}
    </div>
  );
}

/* ── MAIN COMPONENT ── */
export default function OpgDentalChart({
  implants = [],
  fpdRecords = [],
  toothConditions = {},
  abutmentRecords = [],
  overdentureRecords = [],
  fullMouthRehabRecords = [],
  extractionRecords = [],
  onMarkMissing,
  onImplantLog,
  onEditImplant,
  onCrownLog,
  onAbutmentLog,
  onOverdentureLog,
  onFullMouthRehabLog,
  onExtractedTeethLog,
}) {
  const [selected, setSelected] = useState(16);
  const model = useChartModel({ implants, fpdRecords, toothConditions, abutmentRecords, overdentureRecords, fullMouthRehabRecords, extractionRecords });

  const t = BY[selected];
  const b = model.base[selected];
  const imp = model.impBy[selected];
  const abut = model.abutBy[selected];
  const fpd = model.fpdBy[selected];
  const ext = model.extractedBy[selected];
  const pk = model.pontic.get(selected);
  const cond = toothConditions[selected]?.condition;
  const fmrRec = model.fmrSpans[t.arch]?.includes(selected) ? model.fmrBy[t.arch] : null;
  const odRec = model.odSpans[t.arch]?.includes(selected) ? model.odBy[t.arch] : null;

  const status = pk ? `Pontic on the ${pk === 'fpd' ? 'bridge' : pk === 'fmr' ? 'full mouth rehab' : 'overdenture'}`
    : b === 'failed' ? 'Implant failed · waiting to be removed'
    : b === 'zygomatic' ? `Zygomatic implant · ${isAnteriorZyg(t) ? 'anterior' : 'posterior'} path`
    : b === 'pterygoid' ? 'Pterygoid implant'
    : b === 'implant' ? 'Implant'
    : b === 'extracted' ? 'Extracted'
    : b === 'missing' ? 'Missing'
    : COND_LABEL[cond] || 'Natural tooth';

  const records = [];
  const site = model.site[selected];
  const failedRec = model.failedBy[selected];
  if (failedRec) records.push(
    <RecordCard key="failed" color={C.failed} title="Failed implant — waiting to be removed"
      rows={[
        ['Brand', [failedRec.brand, failedRec.implant_system].filter(Boolean).join(' · ')],
        ['Size', failedRec.diameter_mm || failedRec.length_mm ? `${failedRec.diameter_mm || '–'} × ${failedRec.length_mm || '–'} mm` : ''],
        ['Placed', fmtDate(failedRec.surgery_date)],
      ]}
      action={onEditImplant ? { label: 'Record removal', testid: 'opg-record-removal', onClick: () => onEditImplant(failedRec) } : null} />
  );
  (model.removedBy[selected] || []).forEach(f => records.push(
    <RecordCard key={`rm-${f.id}`} color="#9CA3AF" title={`Failed implant — removed${f.removed_date ? '' : ' (replaced)'}`}
      rows={[
        ['Brand', [f.brand, f.implant_system].filter(Boolean).join(' · ')],
        ['Placed', fmtDate(f.surgery_date)],
        ['Removed', f.removed_date ? fmtDate(f.removed_date) : 'not recorded'],
      ]} />
  ));
  if (imp) records.push(
    <RecordCard key="imp" color={b === 'zygomatic' ? C.zyg : b === 'pterygoid' ? C.ptg : C.implant}
      title={(b === 'zygomatic' ? 'Zygomatic implant' : b === 'pterygoid' ? 'Pterygoid implant' : 'Implant')
        + (site?.immediate ? ' · immediate, into extraction socket' : '')}
      rows={[
        ['Brand', [imp.brand, imp.implant_system].filter(Boolean).join(' · ')],
        ['Size', imp.diameter_mm || imp.length_mm ? `${imp.diameter_mm || '–'} × ${imp.length_mm || '–'} mm` : ''],
        ['Torque', imp.insertion_torque ? `${imp.insertion_torque} Ncm` : ''],
        ['ISQ', imp.isq_value],
        ['Approach', imp.surgical_approach],
        ['Surgery', fmtDate(imp.surgery_date)],
        ['Loading', fmtDate(imp.prosthetic_loading_date)],
        ['Outcome', imp.implant_outcome],
      ]} />
  );
  if (abut) records.push(
    <RecordCard key="abut" color={C.abut} title="Abutment" rows={[
      ['Type', abut.abutment_type], ['Brand', abut.brand], ['Size', abut.size_label], ['Placed', fmtDate(abut.placement_date)],
    ]} />
  );
  if (fpd) records.push(
    <RecordCard key="fpd" color={C.crown}
      title={(fpd.tooth_numbers || []).length > 1 ? `Bridge ${fpd.tooth_numbers.join(', ')}${pk === 'fpd' ? ' · pontic' : ''}` : 'Crown'}
      rows={[
        ['Type', fpd.crown_type], ['Material', fpd.crown_material || fpd.material],
        ['Loading', fmtDate(fpd.prosthetic_loading_date)], ['Lab', fpd.lab_name],
      ]} />
  );
  if (fmrRec) records.push(
    <RecordCard key="fmr" color={C.fmr} title={fmrRec.rehab_type || 'Full mouth rehab'} rows={[['Loading', fmtDate(fmrRec.prosthetic_loading_date)]]} />
  );
  if (odRec) records.push(
    <RecordCard key="od" color={C.od} title="Overdenture" rows={[
      ['Attachment', odRec.attachment_type], ['Bar', odRec.has_bar ? (odRec.bar_material || 'Yes') : ''], ['Loading', fmtDate(odRec.prosthetic_loading_date)],
    ]} />
  );
  if (ext) records.push(
    <RecordCard key="ext" color={site?.graft ? C.graft : C.missing}
      title={imp ? 'Extracted, then implant placed' : site?.planned ? 'Extracted · waiting for implant' : 'Extracted'} rows={[
        ['Date', fmtDate(ext.extraction_date)], ['Bone graft', ext.bone_graft], ['Membrane', ext.membrane_used],
        ['Implant planned', !imp && ext.planned_future_implant],
        ['Implant due', !imp && site?.due ? `${fmtDate(site.due)} (${ext.reminder_days} days)` : ''],
      ]} />
  );
  if (!ext && cond === 'missing' && b === 'missing' && !model.removedBy[selected]) records.push(<RecordCard key="miss" color={C.missing} title="Marked missing" rows={[]} />);

  const zygOk = siteOk('zygomatic', selected), ptgOk = siteOk('pterygoid', selected);

  /* grid chip look */
  const chip = n => {
    const bb = model.base[n], p = model.pontic.get(n), ck = model.crownOf.get(n);
    if (bb === 'failed') return { color: C.failed, tag: 'FAIL' };
    if (p) return { color: p === 'fmr' ? C.fmr : p === 'od' ? C.od : C.crown, tag: 'PON' };
    if (bb === 'zygomatic') return { color: C.zyg, tag: 'ZYG' };
    if (bb === 'pterygoid') return { color: C.ptg, tag: 'PTG' };
    if (bb === 'implant') return { color: C.implant, tag: model.site[n]?.immediate ? 'IMM' : 'IMP' };
    if (bb === 'extracted') {
      const s = model.site[n] || {};
      return { color: s.graft ? C.graft : C.missing, tag: s.planned ? 'PLAN' : s.graft ? 'GRFT' : 'EXT', gone: true };
    }
    if (bb === 'missing') return { color: C.missing, tag: 'MISS', gone: true };
    if (ck) return { color: C.crown, tag: 'CRN' };
    return { color: 'transparent', tag: COND_BADGE[toothConditions[n]?.condition] || '' };
  };
  const gridBtn = n => {
    const s = chip(n), on = n === selected;
    return (
      <button key={n} type="button" data-testid={`opg-site-${n}`} onClick={() => setSelected(n)}
        aria-pressed={on} aria-label={`Tooth ${n}`}
        className="relative rounded-md text-xs font-semibold pt-2 pb-3.5 overflow-hidden"
        style={{
          fontFamily: "'IBM Plex Mono',monospace",
          border: `1px ${s.gone ? 'dashed' : 'solid'} ${on ? C.ink : C.line}`,
          boxShadow: on ? `inset 0 0 0 1px ${C.ink}` : 'none',
          background: s.gone ? 'transparent' : '#F1F2EF',
          color: s.gone ? '#8A949D' : C.ink,
        }}>
        {n}
        {s.tag && <span className="absolute left-1/2 -translate-x-1/2 bottom-1 text-[8.5px] leading-none" style={{ color: s.color === 'transparent' ? C.ink2 : s.color }}>{s.tag}</span>}
        <span className="absolute left-0 right-0 bottom-0 h-[3px]" style={{ background: s.color }} />
      </button>
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] items-start" data-testid="opg-chart">
      <div className="min-w-0">
        <div className="rounded-xl border border-[#E5E5E2] overflow-x-auto" style={{ background: '#FBF8F3' }}>
          <Plate model={model} toothConditions={toothConditions} selected={selected} onSelect={setSelected} />
        </div>

        <div className="mt-3 rounded-xl border border-[#E5E5E2] bg-white p-3">
          <div className="flex flex-wrap justify-between items-baseline gap-2 mb-2">
            <h3 className="text-sm font-semibold text-[#2A2F35]" style={{ fontFamily: "'Work Sans',sans-serif" }}>Tooth sites</h3>
            <span className="text-xs text-[#8A949D]">Tap a tooth here or on the chart</span>
          </div>
          <div className="overflow-x-auto">
            <div className="grid gap-1 min-w-[600px]" style={{ gridTemplateColumns: 'repeat(8,minmax(34px,1fr)) 10px repeat(8,minmax(34px,1fr))' }}>
              {ORD.U.slice(0, 8).map(gridBtn)}<div className="row-span-2 mx-auto w-0 border-l border-dashed border-[#E5E5E2]" />{ORD.U.slice(8).map(gridBtn)}
              {ORD.L.slice(0, 8).map(gridBtn)}{ORD.L.slice(8).map(gridBtn)}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#5C6773]">
            {[[C.failed, 'Failed — awaiting removal'], [C.missing, 'Missing / extracted'], [C.graft, 'Grafted socket'], [C.implant, 'Implant (dashed = planned)'], [C.zyg, 'Zygomatic'], [C.ptg, 'Pterygoid'], [C.crown, 'Crown / bridge'], [C.od, 'Overdenture'], [C.fmr, 'Full mouth rehab']].map(([c, l]) => (
              <span key={l} className="inline-flex items-center gap-1.5"><i className="inline-block w-3.5 h-[3px] rounded" style={{ background: c }} />{l}</span>
            ))}
          </div>
        </div>
      </div>

      <aside className="rounded-xl border border-[#E5E5E2] bg-white p-4 flex flex-col gap-3" data-testid="opg-side-panel">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-semibold text-[#2A2F35]" style={{ fontFamily: "'IBM Plex Mono',monospace" }}>{selected}</span>
          <div>
            <div className="text-sm font-semibold text-[#2A2F35]">{QUAD[t.q]} {NAMES[t.idx]}</div>
            <div className="text-xs text-[#5C6773]">{status}</div>
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wider text-[#8A949D] mb-1.5">Saved on this tooth</div>
          {records.length ? <div className="flex flex-col gap-1.5">{records}</div>
            : <p className="text-xs text-[#8A949D]">Nothing recorded yet.</p>}
          {records.length > 0 && <p className="mt-1.5 text-[11px] text-[#8A949D]">To edit or delete, use the record lists below the chart.</p>}
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wider text-[#8A949D] mb-1.5">Tooth</div>
          <div className="flex flex-wrap gap-1.5">
            <Pill color={C.missing} testid="opg-action-missing" onClick={() => onMarkMissing?.(selected)}>
              {cond === 'missing' ? 'Undo missing' : 'Missing'}
            </Pill>
            <Pill color={C.missing} testid="opg-action-extracted" onClick={() => onExtractedTeethLog?.(selected)}>Extracted</Pill>
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wider text-[#8A949D] mb-1.5">Implant</div>
          <div className="flex flex-wrap gap-1.5">
            <Pill color={C.implant} testid="opg-action-implant" onClick={() => onImplantLog?.(selected)}>Implant</Pill>
            <Pill color={C.zyg} testid="opg-action-zygomatic" disabled={!zygOk}
              title={zygOk ? '' : 'Zygomatic implants go at 12–16 or 22–26'}
              onClick={() => onImplantLog?.(selected, { is_zygomatic: true })}>Zygomatic</Pill>
            <Pill color={C.ptg} testid="opg-action-pterygoid" disabled={!ptgOk}
              title={ptgOk ? '' : 'Pterygoid implants go at 17, 18, 27 or 28'}
              onClick={() => onImplantLog?.(selected, { is_pterygoid: true })}>Pterygoid</Pill>
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wider text-[#8A949D] mb-1.5">Restoration</div>
          <div className="flex flex-wrap gap-1.5">
            <Pill color={C.abut} testid="opg-action-abutment" onClick={() => onAbutmentLog?.(selected)}>Abutment</Pill>
            <Pill color={C.crown} testid="opg-action-crown" onClick={() => onCrownLog?.(selected)}>Crown / Bridge</Pill>
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wider text-[#8A949D] mb-1.5">Whole arch</div>
          <div className="flex flex-wrap gap-1.5">
            <Pill color={C.od} testid="opg-action-overdenture" onClick={() => onOverdentureLog?.()}>Overdenture</Pill>
            <Pill color={C.fmr} testid="opg-action-full-mouth-rehab" onClick={() => onFullMouthRehabLog?.()}>Full mouth rehab</Pill>
          </div>
        </div>

        <CaseSummary model={model} fpdRecords={fpdRecords} />

        <p className="text-[11px] leading-relaxed text-[#8A949D] border-t border-[#E5E5E2] pt-2">
          Each button opens the same form as the classic chart, with tooth {selected} filled in where the form has a tooth.
          The chart redraws after you save. Illustration only, not a radiograph and not to scale.
        </p>
      </aside>
    </div>
  );
}
