import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const selectClass = "w-full px-3 py-2 bg-white border border-[#E5E5E2] rounded-md text-sm focus:ring-2 focus:ring-[#82A098] focus:outline-none";
const checkboxClass = "w-4 h-4 text-[#82A098] border-[#E5E5E2] rounded focus:ring-[#82A098]";

export const OVERDENTURE_ATTACHMENTS = [
  'Ball Attachment',
  'Locator / LOCATOR R-Tx',
  'Bar Clip (Dolder Bar)',
  'Bar Clip (Hader Bar)',
  'Magnetic Attachment',
  'ERA Attachment',
  'Ceka Attachment',
  'Custom Bar',
];

export const INITIAL_OVERDENTURE = {
  tooth_numbers: [],
  attachment_type: 'Ball Attachment',
  connected_implant_ids: [],
  has_bar: false,
  bar_material: '',
  prosthetic_loading_date: '',
  clinical_notes: '',
  clinic_id: '',
};

const OverdentureModal = ({
  isOpen,
  onOpenChange,
  overdentureData,
  setOverdentureData,
  editingOverdentureId,
  implants,
  onSubmit,
  onToothToggle,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold" style={{ color: '#7C3AED' }}>
            {editingOverdentureId ? 'Edit Overdenture Record' : 'Overdenture Log'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-2">
          <div>
            <Label className="text-xs mb-2 block">Implant Sites (select teeth covered by overdenture)</Label>
            <div className="space-y-2">
              <div>
                <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide mb-1">Upper Arch</p>
                <div className="flex flex-wrap gap-1.5">
                  {[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28].map(tn => (
                    <button key={tn} type="button"
                      onClick={() => onToothToggle(tn)}
                      className={`w-9 h-9 text-xs font-medium rounded-md border transition-colors ${
                        overdentureData.tooth_numbers.includes(tn)
                          ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
                          : 'bg-white text-[#2A2F35] border-[#E5E5E2] hover:border-[#7C3AED]'
                      }`}
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
                        overdentureData.tooth_numbers.includes(tn)
                          ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
                          : 'bg-white text-[#2A2F35] border-[#E5E5E2] hover:border-[#7C3AED]'
                      }`}
                    >{tn}</button>
                  ))}
                </div>
              </div>
            </div>
            {overdentureData.tooth_numbers.length > 0 && (
              <p className="mt-1 text-xs text-[#5C6773]">Selected: <span className="font-medium text-[#7C3AED]">{overdentureData.tooth_numbers.join(', ')}</span></p>
            )}
          </div>

          <div>
            <Label className="text-xs">Overdenture Attachment Type *</Label>
            <select value={overdentureData.attachment_type} onChange={e => setOverdentureData(p => ({ ...p, attachment_type: e.target.value }))} data-testid="overdenture-attachment-type" className={`mt-1 ${selectClass}`} required>
              {OVERDENTURE_ATTACHMENTS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div className="border border-[#E5E5E2] rounded-lg p-3 space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-[#2A2F35]">
              <input type="checkbox" checked={overdentureData.has_bar} onChange={e => setOverdentureData(p => ({ ...p, has_bar: e.target.checked, bar_material: e.target.checked ? p.bar_material : '' }))} className={checkboxClass} data-testid="overdenture-has-bar" />
              Implant Bar (connecting implants)
            </label>
            {overdentureData.has_bar && (
              <div>
                <Label className="text-xs">Bar Material</Label>
                <select value={overdentureData.bar_material} onChange={e => setOverdentureData(p => ({ ...p, bar_material: e.target.value }))} data-testid="overdenture-bar-material" className={`mt-1 ${selectClass}`}>
                  <option value="">Select material</option>
                  <option>Titanium</option>
                  <option>Cobalt Chromium</option>
                  <option>Gold Alloy</option>
                  <option>PEEK</option>
                  <option>Zirconia</option>
                </select>
              </div>
            )}
          </div>

          {implants.length > 0 && (
            <div>
              <Label className="text-xs">Connected Implant(s)</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {implants.map(imp => (
                  <label key={imp.id} className="flex items-center gap-1.5 text-sm border border-[#E5E5E2] rounded-md px-2.5 py-1.5 cursor-pointer hover:border-[#7C3AED] transition-colors">
                    <input
                      type="checkbox"
                      checked={overdentureData.connected_implant_ids.includes(imp.id)}
                      onChange={e => setOverdentureData(prev => ({
                        ...prev,
                        connected_implant_ids: e.target.checked
                          ? [...prev.connected_implant_ids, imp.id]
                          : prev.connected_implant_ids.filter(x => x !== imp.id),
                      }))}
                      className={checkboxClass}
                    />
                    <span>#{imp.tooth_number} ({imp.brand})</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs">Prosthetic Loading Date</Label>
            <Input type="date" value={overdentureData.prosthetic_loading_date} onChange={e => setOverdentureData(p => ({ ...p, prosthetic_loading_date: e.target.value }))} data-testid="overdenture-loading-date" className="mt-1" />
          </div>

          <div>
            <Label className="text-xs">Clinical Notes</Label>
            <textarea value={overdentureData.clinical_notes} onChange={e => setOverdentureData(p => ({ ...p, clinical_notes: e.target.value }))} data-testid="overdenture-notes" rows={3} className={`mt-1 ${selectClass}`} placeholder="Retention, occlusion, patient comfort notes..." />
          </div>

          <Button type="submit" data-testid="submit-overdenture-button" className="w-full text-white" style={{ backgroundColor: '#7C3AED' }}>
            {editingOverdentureId ? 'Save Changes' : 'Add Overdenture Record'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default OverdentureModal;
