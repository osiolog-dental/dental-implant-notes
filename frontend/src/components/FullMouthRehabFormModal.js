import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const selectClass = "w-full px-3 py-2 bg-white border border-[#E5E5E2] rounded-md text-sm focus:ring-2 focus:ring-[#82A098] focus:outline-none";
const REHAB_COLOR = '#4F46E5';

const REHAB_TYPES = [
  'Upper FMR',
  'Lower FMR',
  'Both U/L FMR',
  'Hybrid Denture',
  'Malo Bridge',
];

const UPPER_TEETH = [11,12,13,14,15,16,17,18,21,22,23,24,25,26,27,28];
const LOWER_TEETH = [31,32,33,34,35,36,37,38,41,42,43,44,45,46,47,48];

// FMR of an arch implies that arch's natural teeth are gone — Upper/Lower/Both
// FMR name the arch outright; Hybrid Denture/Malo Bridge don't, so we leave
// arch undetermined for those rather than guess.
export function archForRehabType(rehabType) {
  if (rehabType === 'Upper FMR') return 'upper';
  if (rehabType === 'Lower FMR') return 'lower';
  if (rehabType === 'Both U/L FMR') return 'both';
  return null;
}

function archTeeth(arch) {
  if (arch === 'upper') return UPPER_TEETH;
  if (arch === 'lower') return LOWER_TEETH;
  if (arch === 'both') return [...UPPER_TEETH, ...LOWER_TEETH];
  return [];
}

export default function FullMouthRehabFormModal({
  open,
  onOpenChange,
  rehabData,
  setRehabData,
  onSubmit,
  editingRehabId,
  implants,
}) {
  const arch = archForRehabType(rehabData.rehab_type);
  const archLabel = arch === 'upper' ? 'upper' : arch === 'lower' ? 'lower' : arch === 'both' ? 'upper and lower' : null;
  const teethForArch = archTeeth(arch);
  // When the arch is known, only show implants actually in that arch — that's
  // the "multiple implants in the upper arch" the FMR is meant to cover.
  const visibleImplants = arch
    ? implants.filter(imp => teethForArch.includes(imp.tooth_number))
    : implants;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold" style={{ color: REHAB_COLOR }}>
            {editingRehabId ? 'Edit Full Mouth Rehab Record' : 'Full Mouth Rehab Log'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-2">
          <div>
            <Label className="text-xs">Type *</Label>
            <select
              value={rehabData.rehab_type}
              onChange={e => setRehabData(p => ({ ...p, rehab_type: e.target.value }))}
              data-testid="full-mouth-rehab-type"
              className={`mt-1 ${selectClass}`}
              required
            >
              {REHAB_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          {arch && (
            <label className="flex items-start gap-2 text-xs bg-[#EEF2FF] border border-[#C7D2FE] rounded-lg p-3 cursor-pointer">
              <input type="checkbox"
                checked={rehabData.mark_missing}
                onChange={e => setRehabData(p => ({ ...p, mark_missing: e.target.checked }))}
                data-testid="full-mouth-rehab-mark-missing"
                className="w-4 h-4 mt-0.5 text-[#4F46E5] border-[#E5E5E2] rounded focus:ring-[#4F46E5]"
              />
              <span>
                <span className="font-medium text-[#3730A3]">Mark all {archLabel} teeth as missing</span>
                <span className="block text-[#5C6773] mt-0.5">A {rehabData.rehab_type} means the natural {archLabel} teeth are gone — this updates the chart to match, on save.</span>
              </span>
            </label>
          )}

          {/* Connected implants — filtered to the FMR's arch when known */}
          {visibleImplants.length > 0 ? (
            <div>
              <Label className="text-xs">Connected Implant(s){arch ? ` — ${archLabel} arch` : ''}</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {visibleImplants.map(imp => (
                  <label key={imp.id} className="flex items-center gap-1.5 text-sm border border-[#E5E5E2] rounded-md px-2.5 py-1.5 cursor-pointer hover:border-[#4F46E5] transition-colors">
                    <input type="checkbox"
                      checked={rehabData.connected_implant_ids.includes(imp.id)}
                      onChange={e => setRehabData(prev => ({
                        ...prev,
                        connected_implant_ids: e.target.checked
                          ? [...prev.connected_implant_ids, imp.id]
                          : prev.connected_implant_ids.filter(x => x !== imp.id)
                      }))}
                      className="w-4 h-4 text-[#4F46E5] border-[#E5E5E2] rounded focus:ring-[#4F46E5]"
                    />
                    <span>#{imp.tooth_number} ({imp.brand})</span>
                  </label>
                ))}
              </div>
            </div>
          ) : arch && (
            <p className="text-xs text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] rounded-lg p-2.5">
              No implants logged in the {archLabel} arch yet — log those on the chart first if this rehab is implant-supported.
            </p>
          )}

          <div>
            <Label className="text-xs">Prosthetic Loading Date</Label>
            <Input type="date" value={rehabData.prosthetic_loading_date} onChange={e => setRehabData(p => ({ ...p, prosthetic_loading_date: e.target.value }))} data-testid="full-mouth-rehab-loading-date" className="mt-1" />
          </div>

          <div>
            <Label className="text-xs">Clinical Notes</Label>
            <textarea value={rehabData.clinical_notes} onChange={e => setRehabData(p => ({ ...p, clinical_notes: e.target.value }))} data-testid="full-mouth-rehab-notes" rows={3} className={`mt-1 ${selectClass}`} placeholder="Occlusal scheme, framework material, patient adaptation notes..." />
          </div>

          <Button type="submit" data-testid="submit-full-mouth-rehab-button" className="w-full text-white" style={{ backgroundColor: REHAB_COLOR }}>
            {editingRehabId ? 'Save Changes' : 'Add Full Mouth Rehab Record'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
