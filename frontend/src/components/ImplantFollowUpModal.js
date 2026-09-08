import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const selectClass = "w-full px-3 py-2 bg-white border border-[#E5E5E2] rounded-md text-sm focus:ring-2 focus:ring-[#3B82F6] focus:outline-none";
const checkboxClass = "w-4 h-4 text-[#3B82F6] border-[#E5E5E2] rounded focus:ring-[#3B82F6]";

const PERI_IMPLANT_HEALTH_OPTIONS = [
  ['', 'Not assessed'],
  ['Healthy', 'Healthy'],
  ['Mild Inflammation', 'Mild Inflammation'],
  ['Moderate Inflammation', 'Moderate Inflammation'],
  ['Severe (Peri-implantitis)', 'Severe (Peri-implantitis)'],
];

// A worsening health reading or a failed osseointegration check suggests a
// guarded prognosis by default — the dentist can still override it either way.
function suggestPrognosis(osseointegrationSuccess, periImplantHealth) {
  if (osseointegrationSuccess === false) return 'Guarded';
  if (['Moderate Inflammation', 'Severe (Peri-implantitis)'].includes(periImplantHealth)) return 'Guarded';
  return 'Good';
}

export default function ImplantFollowUpModal({
  open,
  onOpenChange,
  followUpData,
  setFollowUpData,
  onSubmit,
  editingFollowUpId,
  implants,
}) {
  const updateField = (field, value) => {
    setFollowUpData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'osseointegration_success' || field === 'peri_implant_health') {
        next.prognosis = suggestPrognosis(
          field === 'osseointegration_success' ? value : prev.osseointegration_success,
          field === 'peri_implant_health' ? value : prev.peri_implant_health,
        );
      }
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {editingFollowUpId ? 'Edit Follow-up' : 'Implant Follow-up'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-2">
          <div>
            <Label className="text-xs">Implant *</Label>
            <select
              value={followUpData.implant_id}
              onChange={e => updateField('implant_id', e.target.value)}
              required
              data-testid="followup-implant-select"
              className={`mt-1 ${selectClass}`}
            >
              <option value="">Select implant</option>
              {implants.map(imp => (
                <option key={imp.id} value={imp.id}>
                  Tooth #{imp.tooth_number}{imp.brand ? ` — ${imp.brand}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs">Follow-up Date *</Label>
            <Input
              type="date"
              value={followUpData.follow_up_date}
              onChange={e => updateField('follow_up_date', e.target.value)}
              required
              data-testid="followup-date-input"
              className="mt-1"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-[#2A2F35]">
            <input
              type="checkbox"
              checked={followUpData.osseointegration_success}
              onChange={e => updateField('osseointegration_success', e.target.checked)}
              className={checkboxClass}
              data-testid="followup-osseointegration-checkbox"
            />
            Osseointegration Success
          </label>

          <div>
            <Label className="text-xs">Peri-implant Health</Label>
            <select
              value={followUpData.peri_implant_health}
              onChange={e => updateField('peri_implant_health', e.target.value)}
              className={`mt-1 ${selectClass}`}
              data-testid="followup-peri-health-select"
            >
              {PERI_IMPLANT_HEALTH_OPTIONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </div>

          <div>
            <Label className="text-xs">Prognosis *</Label>
            <select
              value={followUpData.prognosis}
              onChange={e => updateField('prognosis', e.target.value)}
              required
              data-testid="followup-prognosis-select"
              className={`mt-1 ${selectClass} ${followUpData.prognosis === 'Guarded' ? 'border-amber-400 text-amber-700 font-medium' : ''}`}
            >
              <option value="Good">Good</option>
              <option value="Guarded">Guarded — needs close monitoring</option>
            </select>
            <p className="text-[11px] text-[#9CA3AF] mt-1">
              Guarded prognosis shows this implant under Dashboard → Guarded Prognosis until a later
              follow-up marks it Good again.
            </p>
          </div>

          <div>
            <Label className="text-xs">Clinical Notes</Label>
            <textarea
              value={followUpData.clinical_notes}
              onChange={e => updateField('clinical_notes', e.target.value)}
              rows={3}
              className={`mt-1 ${selectClass}`}
              placeholder="Findings, probing depth, bleeding on probing, radiographic bone loss..."
              data-testid="followup-notes"
            />
          </div>

          <Button type="submit" data-testid="submit-followup-button" className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white">
            {editingFollowUpId ? 'Save Changes' : 'Add Follow-up'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
