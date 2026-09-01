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
const checkboxClass = "w-4 h-4 text-[#2563EB] border-[#E5E5E2] rounded focus:ring-[#2563EB]";
const EXTRACTION_COLOR = '#2563EB';

const GRAFT_OPTIONS = ['No Graft', 'Allograft', 'Xenograft', 'Autograft', 'Alloplast (Synthetic)'];

export default function ExtractedTeethFormModal({
  open,
  onOpenChange,
  extractionData,
  setExtractionData,
  onSubmit,
  editingExtractionId,
  onToothToggle,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold" style={{ color: EXTRACTION_COLOR }}>
            {editingExtractionId ? 'Edit Extraction Record' : 'Extracted Teeth Log'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-2">
          <div>
            <Label className="text-xs">Extraction Date *</Label>
            <Input type="date" value={extractionData.extraction_date} onChange={e => setExtractionData(p => ({ ...p, extraction_date: e.target.value }))} data-testid="extraction-date" className="mt-1" required />
          </div>

          <div>
            <Label className="text-xs mb-2 block">Teeth Extracted On This Date</Label>
            <div className="space-y-2">
              <div>
                <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide mb-1">Upper Arch</p>
                <div className="flex flex-wrap gap-1.5">
                  {[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28].map(tn => (
                    <button key={tn} type="button"
                      onClick={() => onToothToggle(tn)}
                      className={`w-9 h-9 text-xs font-medium rounded-md border transition-colors ${
                        extractionData.tooth_numbers.includes(tn)
                          ? 'text-white border-[#2563EB]' : 'bg-white text-[#2A2F35] border-[#E5E5E2] hover:border-[#2563EB]'
                      }`}
                      style={extractionData.tooth_numbers.includes(tn) ? { backgroundColor: EXTRACTION_COLOR } : undefined}
                    >{tn}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide mb-1">Lower Arch</p>
                <div className="flex flex-wrap gap-1.5">
                  {[48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38].map(tn => (
                    <button key={tn} type="button"
                      onClick={() => onToothToggle(tn)}
                      className={`w-9 h-9 text-xs font-medium rounded-md border transition-colors ${
                        extractionData.tooth_numbers.includes(tn)
                          ? 'text-white border-[#2563EB]' : 'bg-white text-[#2A2F35] border-[#E5E5E2] hover:border-[#2563EB]'
                      }`}
                      style={extractionData.tooth_numbers.includes(tn) ? { backgroundColor: EXTRACTION_COLOR } : undefined}
                    >{tn}</button>
                  ))}
                </div>
              </div>
            </div>
            {extractionData.tooth_numbers.length > 0 && (
              <p className="mt-1 text-xs text-[#5C6773]">Selected: <span className="font-medium" style={{ color: EXTRACTION_COLOR }}>{extractionData.tooth_numbers.join(', ')}</span></p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Bone Graft Placed</Label>
              <select value={extractionData.bone_graft} onChange={e => setExtractionData(p => ({ ...p, bone_graft: e.target.value }))} data-testid="extraction-bone-graft" className={`mt-1 ${selectClass}`}>
                {GRAFT_OPTIONS.map(g => <option key={g} value={g === 'No Graft' ? '' : g}>{g}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-[#2A2F35]">
                <input type="checkbox" checked={extractionData.membrane_used} onChange={e => setExtractionData(p => ({ ...p, membrane_used: e.target.checked }))} data-testid="extraction-membrane" className={checkboxClass} />
                Membrane Used
              </label>
            </div>
          </div>

          <div className="border border-[#E5E5E2] rounded-lg p-3 space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-[#2A2F35]">
              <input type="checkbox"
                checked={extractionData.planned_future_implant}
                onChange={e => setExtractionData(p => ({ ...p, planned_future_implant: e.target.checked, reminder_days: e.target.checked ? p.reminder_days : '' }))}
                data-testid="extraction-planned-implant"
                className={checkboxClass}
              />
              Implant planned here later (site being allowed to heal first)
            </label>
            {extractionData.planned_future_implant && (
              <div>
                <Label className="text-xs">Remind me to plan the implant after (days)</Label>
                <Input type="number" min="1" value={extractionData.reminder_days} onChange={e => setExtractionData(p => ({ ...p, reminder_days: e.target.value }))} data-testid="extraction-reminder-days" className="mt-1" placeholder="e.g. 120" />
                <p className="mt-1 text-xs text-[#5C6773]">This patient will count as an active case, and show up on the Dashboard as a reminder once this many days have passed.</p>
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs">Clinical Notes</Label>
            <textarea value={extractionData.clinical_notes} onChange={e => setExtractionData(p => ({ ...p, clinical_notes: e.target.value }))} data-testid="extraction-notes" rows={3} className={`mt-1 ${selectClass}`} placeholder="Reason for extraction, socket condition, healing instructions..." />
          </div>

          <Button type="submit" data-testid="submit-extraction-button" className="w-full text-white" style={{ backgroundColor: EXTRACTION_COLOR }}>
            {editingExtractionId ? 'Save Changes' : 'Add Extraction Record'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
