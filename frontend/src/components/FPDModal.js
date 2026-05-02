import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import DentalChart from './DentalChart';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const selectClass = "w-full px-3 py-2 bg-white border border-[#E5E5E2] rounded-md text-sm focus:ring-2 focus:ring-[#82A098] focus:outline-none";
const checkboxClass = "w-4 h-4 text-[#82A098] border-[#E5E5E2] rounded focus:ring-[#82A098]";

export const INITIAL_FPD = {
  tooth_numbers: [],
  prosthetic_loading_date: '',
  crown_count: 'Single',
  connected_implant_ids: [],
  crown_type: 'Screw Retained',
  crown_material: 'Zirconia',
  clinical_notes: '',
  consultant_prosthodontist: '',
  lab_name: '',
  warranty_image: null,
};

const FPDModal = ({
  isOpen,
  onOpenChange,
  fpdData,
  setFpdData,
  editingFpdId,
  warrantyFile,
  setWarrantyFile,
  implants,
  fpdRecords,
  onSubmit,
  onToothToggle,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {editingFpdId ? 'Edit FPD Record' : 'FPD Log Sheet'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-2">
          <div>
            <Label className="text-xs mb-2 block">Select Teeth — click to toggle</Label>
            <DentalChart
              implants={implants}
              fpdRecords={fpdRecords}
              selectedTeeth={fpdData.tooth_numbers}
              onToothToggle={onToothToggle}
              mode="fpd"
            />
            {fpdData.tooth_numbers.length > 0 && (
              <p className="mt-2 text-xs text-[#2A2F35] font-medium text-center">
                Selected: {fpdData.tooth_numbers.join(', ')}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Prosthetic Loading Date</Label>
              <Input type="date" value={fpdData.prosthetic_loading_date} onChange={(e) => setFpdData({ ...fpdData, prosthetic_loading_date: e.target.value })} data-testid="fpd-loading-date" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Crown Count</Label>
              <select value={fpdData.crown_count} onChange={(e) => setFpdData({ ...fpdData, crown_count: e.target.value })} data-testid="fpd-crown-count" className={`mt-1 ${selectClass}`}>
                <option>Single</option><option>Multiple</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Crown Type</Label>
              <select value={fpdData.crown_type} onChange={(e) => setFpdData({ ...fpdData, crown_type: e.target.value })} data-testid="fpd-crown-type" className={`mt-1 ${selectClass}`}>
                <option>Cement Retained</option><option>Screw Retained</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Crown Material</Label>
              <select value={fpdData.crown_material} onChange={(e) => setFpdData({ ...fpdData, crown_material: e.target.value })} data-testid="fpd-crown-material" className={`mt-1 ${selectClass}`}>
                <option>Metal</option><option>Porcelain fused to metal</option><option>Zirconia</option>
              </select>
            </div>
          </div>

          {implants.length > 0 && (
            <div>
              <Label className="text-xs">Connected Implants</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {implants.map(imp => (
                  <label key={imp.id} className="flex items-center gap-1.5 text-sm border border-[#E5E5E2] rounded-md px-2.5 py-1.5 cursor-pointer hover:border-[#82A098] transition-colors">
                    <input
                      type="checkbox"
                      checked={fpdData.connected_implant_ids.includes(imp.id)}
                      onChange={(e) => {
                        setFpdData(prev => ({
                          ...prev,
                          connected_implant_ids: e.target.checked
                            ? [...prev.connected_implant_ids, imp.id]
                            : prev.connected_implant_ids.filter(x => x !== imp.id),
                        }));
                      }}
                      className={checkboxClass}
                    />
                    <span>#{imp.tooth_number} ({imp.brand})</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Consultant / Visiting Prosthodontist <span className="text-[#9CA3AF]">(optional)</span></Label>
              <Input value={fpdData.consultant_prosthodontist} onChange={(e) => setFpdData({ ...fpdData, consultant_prosthodontist: e.target.value })} placeholder="Dr. Name" className="mt-1" data-testid="fpd-consultant" />
            </div>
            <div>
              <Label className="text-xs">Dental Lab <span className="text-[#9CA3AF]">(crown fabrication)</span></Label>
              <Input value={fpdData.lab_name} onChange={(e) => setFpdData({ ...fpdData, lab_name: e.target.value })} placeholder="Lab name" className="mt-1" data-testid="fpd-lab-name" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Warranty Card Photo <span className="text-[#9CA3AF]">(optional)</span></Label>
            <div className="mt-1 flex items-center gap-3">
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[#E5E5E2] hover:border-[#82A098] hover:bg-[#F0F8F6] cursor-pointer text-xs text-[#5C6773] transition-colors" data-testid="fpd-warranty-upload-label">
                <input type="file" accept="image/*" className="hidden" data-testid="fpd-warranty-input"
                  onChange={e => { if (e.target.files?.[0]) setWarrantyFile(e.target.files[0]); }} />
                📷 {warrantyFile ? warrantyFile.name : 'Upload warranty photo'}
              </label>
              {fpdData.warranty_image && !warrantyFile && (
                <a href={`${API_URL}/api/files/${fpdData.warranty_image}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-[#82A098] underline">View existing</a>
              )}
              {warrantyFile && (
                <button type="button" onClick={() => setWarrantyFile(null)} className="text-xs text-red-400 hover:text-red-600">✕ Remove</button>
              )}
            </div>
          </div>

          <div>
            <Label className="text-xs">Clinical Notes</Label>
            <textarea value={fpdData.clinical_notes} onChange={(e) => setFpdData({ ...fpdData, clinical_notes: e.target.value })} data-testid="fpd-clinical-notes" rows={3} className={`mt-1 ${selectClass}`} placeholder="Prosthetic observations, adjustments..." />
          </div>

          <Button type="submit" data-testid="submit-fpd-button" className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white">
            {editingFpdId ? 'Save Changes' : 'Add FPD Record'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FPDModal;
