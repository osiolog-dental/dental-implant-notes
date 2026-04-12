/*
  ToothActionModal
  ─────────────────
  Step 1: Select tooth CONDITION
    • Healthy, Missing, Root Stump, Grossly Decayed, Fractured

  Step 2: Select TREATMENT (only shown for actionable conditions)
    • Implant Log      → opens ImplantModal
    • Crown Log        → opens CrownModal (FPD)
    • Crown on Implant → opens ImplantModal (with crown flag)

  Usage:
    <ToothActionModal
      toothNumber={13}
      isOpen={true}
      onClose={() => {}}
      onImplantLog={(toothNum) => {}}
      onCrownLog={(toothNum) => {}}
      onCrownOnImplant={(toothNum) => {}}
      toothConditions={toothConditions}
      onConditionChange={(toothNum, condition) => {}}
    />
*/

const CONDITIONS = [
  {
    key: 'healthy',
    label: 'Healthy',
    icon: '🦷',
    desc: 'Normal tooth — no pathology',
    color: '#82A098',
    bg: '#EEF4F3',
    border: '#82A098',
  },
  {
    key: 'missing',
    label: 'Missing',
    icon: '○',
    desc: 'Tooth absent / extracted',
    color: '#6B7280',
    bg: '#F3F4F6',
    border: '#9CA3AF',
  },
  {
    key: 'rootStump',
    label: 'Root Stump',
    icon: '↓',
    desc: 'Root retained after crown loss',
    color: '#B45309',
    bg: '#FEF3C7',
    border: '#D97706',
  },
  {
    key: 'grosslyDecayed',
    label: 'Grossly Decayed',
    icon: '⬛',
    desc: 'Extensive caries / unrestorable',
    color: '#6B3A0A',
    bg: '#FDE8D0',
    border: '#C27E70',
  },
  {
    key: 'fractured',
    label: 'Fractured',
    icon: '✕',
    desc: 'Crown or root fracture',
    color: '#DC2626',
    bg: '#FEE2E2',
    border: '#EF4444',
  },
];

const TREATMENTS = [
  {
    key: 'implant',
    label: 'Implant Log',
    icon: '🔩',
    desc: 'Record a dental implant placement',
    color: '#0284C7',
    bg: '#E0F2FE',
    border: '#0284C7',
  },
  {
    key: 'crown',
    label: 'Crown / FPD Log',
    icon: '👑',
    desc: 'Single crown or fixed bridge',
    color: '#4F46E5',
    bg: '#EEF2FF',
    border: '#4F46E5',
  },
  {
    key: 'crownOnImplant',
    label: 'Crown on Implant',
    icon: '🔩👑',
    desc: 'Implant + prosthetic crown together',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#7C3AED',
  },
];

/* Conditions that allow treatment selection */
const TREATABLE = ['missing', 'rootStump', 'grosslyDecayed', 'fractured'];

export default function ToothActionModal({
  toothNumber,
  isOpen,
  onClose,
  onImplantLog,
  onCrownLog,
  onCrownOnImplant,
  toothConditions = {},
  onConditionChange,
}) {
  if (!isOpen || !toothNumber) return null;

  const current   = toothConditions[toothNumber] || {};
  const condition = current.condition || 'healthy';
  const isUp      = toothNumber <= 28;
  const toothSrc  = `/teeth/tooth_${toothNumber}.png`;

  const handleCondition = (key) => {
    onConditionChange?.(toothNumber, key);
  };

  const handleTreatment = (key) => {
    if (key === 'implant')        onImplantLog?.(toothNumber);
    else if (key === 'crown')     onCrownLog?.(toothNumber);
    else if (key === 'crownOnImplant') onCrownOnImplant?.(toothNumber);
    onClose();
  };

  const showTreatments = TREATABLE.includes(condition);

  return (
    /* Backdrop */
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(30,35,42,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      {/* Panel */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          fontFamily: 'IBM Plex Sans, sans-serif',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '18px 20px 14px',
          borderBottom: '1px solid #F0EDE8',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <img src={toothSrc} alt={`Tooth ${toothNumber}`}
            style={{ width: 44, height: 64, objectFit: 'contain' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#2A2F35' }}>
              Tooth {toothNumber}
            </div>
            <div style={{ fontSize: 12, color: '#5C6773', marginTop: 2 }}>
              {isUp ? 'Maxillary' : 'Mandibular'} arch
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              cursor: 'pointer', fontSize: 20, color: '#9CA3AF',
              lineHeight: 1, padding: 4,
            }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px 20px', overflowY: 'auto', maxHeight: '70vh' }}>

          {/* ── STEP 1: CONDITION ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
              color: '#82A098', textTransform: 'uppercase', marginBottom: 10,
            }}>
              Tooth Condition
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {CONDITIONS.map(c => {
                const active = condition === c.key;
                return (
                  <button
                    key={c.key}
                    data-testid={`condition-${c.key}`}
                    onClick={() => handleCondition(c.key)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '10px 12px',
                      background: active ? c.bg : '#FAFAF9',
                      border: `1.5px solid ${active ? c.border : '#E5E5E2'}`,
                      borderRadius: 10,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.12s',
                    }}
                  >
                    <span style={{ fontSize: 18, lineHeight: 1.2 }}>{c.icon}</span>
                    <span>
                      <div style={{
                        fontSize: 13, fontWeight: active ? 700 : 500,
                        color: active ? c.color : '#2A2F35',
                      }}>{c.label}</div>
                      <div style={{ fontSize: 11, color: '#7B8794', marginTop: 1 }}>{c.desc}</div>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── STEP 2: TREATMENT (only if condition needs treatment) ── */}
          {showTreatments && (
            <div>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                color: '#C27E70', textTransform: 'uppercase', marginBottom: 10,
              }}>
                Treatment Plan
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {TREATMENTS.map(t => (
                  <button
                    key={t.key}
                    data-testid={`treatment-${t.key}`}
                    onClick={() => handleTreatment(t.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px',
                      background: t.bg,
                      border: `1.5px solid ${t.border}`,
                      borderRadius: 10,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.12s',
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{t.icon}</span>
                    <span style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: t.color }}>{t.label}</div>
                      <div style={{ fontSize: 11, color: '#7B8794', marginTop: 1 }}>{t.desc}</div>
                    </span>
                    <span style={{ fontSize: 18, color: t.color, opacity: 0.7 }}>›</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* If healthy — note */}
          {!showTreatments && condition === 'healthy' && (
            <div style={{
              background: '#EEF4F3', borderRadius: 8, padding: '10px 14px',
              fontSize: 12, color: '#5C6773', textAlign: 'center',
            }}>
              Tooth is marked healthy — select a condition above to add a treatment
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid #F0EDE8',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button
            data-testid="tooth-modal-close"
            onClick={onClose}
            style={{
              padding: '8px 18px', borderRadius: 8, border: '1px solid #E5E5E2',
              background: '#FFF', fontSize: 13, color: '#5C6773', cursor: 'pointer',
            }}
          >Done</button>
        </div>
      </div>
    </div>
  );
}
