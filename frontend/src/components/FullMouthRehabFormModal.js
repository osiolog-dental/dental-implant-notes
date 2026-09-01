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

export default function FullMouthRehabFormModal({
  open,
  onOpenChange,
  rehabData,
  setRehabData,
  onSubmit,
  editingRehabId,
  implants,
}) {
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

          {/* Connected implants */}
          {implants.length > 0 && (
            <div>
              <Label className="text-xs">Connected Implant(s)</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {implants.map(imp => (
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
