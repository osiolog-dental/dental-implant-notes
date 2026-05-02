import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const selectClass = "w-full px-3 py-2 bg-white border border-[#E5E5E2] rounded-md text-sm focus:ring-2 focus:ring-[#82A098] focus:outline-none";
const checkboxClass = "w-4 h-4 text-[#82A098] border-[#E5E5E2] rounded focus:ring-[#82A098]";

export const ABUTMENT_TYPES = [
  'Stock Abutment Straight',
  'Stock Abutment Angled 15°',
  'Stock Abutment Angled 17°',
  'Stock Abutment Angled 25°',
  'Multi-Unit Abutment (MUA) Straight',
  'MUA Angled 15°',
  'MUA Angled 17°',
  'MUA Angled 25°',
  'MUA Angled 30°',
  'MUA Angled 35°',
  'MUA Angled 40°',
  'MUA Angled 45°',
  'MUA Angled 50°',
  'MUA Angled 60°',
  'Ball Abutment',
  'Locator Abutment',
  'Custom Milled Abutment',
  'UCLA Abutment',
  'Ti Base',
];

export const INITIAL_ABUTMENT = {
  tooth_number: '',
  abutment_type: 'Stock Abutment Straight',
  connected_implant_ids: [],
  placement_date: '',
  clinical_notes: '',
  clinic_id: '',
};

const AbutmentModal = ({
  isOpen,
  onOpenChange,
  abutmentData,
  setAbutmentData,
  editingAbutmentId,
  implants,
  onSubmit,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {editingAbutmentId ? 'Edit Abutment Record' : 'Abutment Log'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tooth Number *</Label>
              <Input type="number" value={abutmentData.tooth_number} onChange={e => setAbutmentData(p => ({ ...p, tooth_number: e.target.value }))} required data-testid="abutment-tooth-number" className="mt-1" placeholder="e.g. 16" />
            </div>
            <div>
              <Label className="text-xs">Placement Date</Label>
              <Input type="date" value={abutmentData.placement_date} onChange={e => setAbutmentData(p => ({ ...p, placement_date: e.target.value }))} data-testid="abutment-placement-date" className="mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Abutment Type *</Label>
            <select value={abutmentData.abutment_type} onChange={e => setAbutmentData(p => ({ ...p, abutment_type: e.target.value }))} data-testid="abutment-type-select" className={`mt-1 ${selectClass}`} required>
              {ABUTMENT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          {implants.length > 0 && (
            <div>
              <Label className="text-xs">Connected Implant(s)</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {implants.map(imp => (
                  <label key={imp.id} className="flex items-center gap-1.5 text-sm border border-[#E5E5E2] rounded-md px-2.5 py-1.5 cursor-pointer hover:border-[#E8A76C] transition-colors">
                    <input
                      type="checkbox"
                      checked={abutmentData.connected_implant_ids.includes(imp.id)}
                      onChange={e => setAbutmentData(prev => ({
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
            <Label className="text-xs">Clinical Notes</Label>
            <textarea value={abutmentData.clinical_notes} onChange={e => setAbutmentData(p => ({ ...p, clinical_notes: e.target.value }))} data-testid="abutment-notes" rows={3} className={`mt-1 ${selectClass}`} placeholder="Torque values, angulation notes..." />
          </div>

          <Button type="submit" data-testid="submit-abutment-button" className="w-full bg-[#E8A76C] hover:bg-[#D4925A] text-white">
            {editingAbutmentId ? 'Save Changes' : 'Add Abutment Record'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AbutmentModal;
