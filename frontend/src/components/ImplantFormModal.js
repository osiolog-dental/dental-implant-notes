import ImplantTagScanner from './ImplantTagScanner';
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
const checkboxClass = "w-4 h-4 text-[#82A098] border-[#E5E5E2] rounded focus:ring-[#82A098]";

export default function ImplantFormModal({
  open,
  onOpenChange,
  formData,
  updateField,
  onSubmit,
  onTagAutoFill,
  editingImplantId,
  selectedTooth,
  clinics,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {editingImplantId ? `Edit Implant Record${selectedTooth ? ` - Tooth #${selectedTooth}` : ''}` : (selectedTooth ? `Add Implant - Tooth #${selectedTooth}` : 'Add Implant Record')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-2">
          {/* Implant Tag Scanner */}
          <ImplantTagScanner
            tagImage={formData.tag_image}
            onAutoFill={onTagAutoFill}
            onImageCapture={(img) => updateField('tag_image', img)}
          />

          {/* Row 1: Tooth, Type, Brand */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Tooth Number *</Label>
              <Input type="number" value={formData.tooth_number} onChange={(e) => updateField('tooth_number', e.target.value)} required data-testid="tooth-number-input" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Implant Type *</Label>
              <select value={formData.implant_type} onChange={(e) => updateField('implant_type', e.target.value)} data-testid="implant-type-select" className={`mt-1 ${selectClass}`}>
                <option>Single</option><option>Bridge</option><option>Full Mouth</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Brand *</Label>
              <Input value={formData.brand} onChange={(e) => updateField('brand', e.target.value)} required data-testid="brand-input" placeholder="e.g., Alpha, Straumann" className="mt-1" />
            </div>
          </div>

          {/* Row 2: Diameter, Length */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Diameter (mm) *</Label>
              <Input type="number" step="0.1" value={formData.diameter_mm} onChange={(e) => updateField('diameter_mm', e.target.value)} required data-testid="diameter-input" placeholder="e.g. 4.5" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Length (mm) *</Label>
              <Input type="number" step="0.1" value={formData.length_mm} onChange={(e) => updateField('length_mm', e.target.value)} required data-testid="length-input" placeholder="e.g. 10.0" className="mt-1" />
            </div>
          </div>

          {/* Row 3: Torque, ISQ, Connection, Surgical Approach */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Insertion Torque (Ncm)</Label>
              <Input type="number" step="0.1" value={formData.insertion_torque} onChange={(e) => updateField('insertion_torque', e.target.value)} data-testid="torque-input" placeholder="35" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">ISQ Value</Label>
              <Input type="number" step="0.1" value={formData.isq_value} onChange={(e) => updateField('isq_value', e.target.value)} data-testid="isq-input" placeholder="70" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Connection Type *</Label>
              <select value={formData.connection_type} onChange={(e) => updateField('connection_type', e.target.value)} data-testid="connection-type-select" className={`mt-1 ${selectClass}`}>
                <option>Internal Hex</option><option>External Hex</option><option>Conical</option><option>Morse Taper</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Surgical Approach *</Label>
              <select value={formData.surgical_approach} onChange={(e) => updateField('surgical_approach', e.target.value)} data-testid="surgical-approach-select" className={`mt-1 ${selectClass}`}>
                <option>Immediate Placement</option><option>Delayed Placement</option>
              </select>
            </div>
          </div>

          {/* Row 4: Arch, Jaw Region, Implant System, Outcome */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Arch</Label>
              <select value={formData.arch} onChange={(e) => updateField('arch', e.target.value)} className={`mt-1 ${selectClass}`}>
                <option>Upper</option><option>Lower</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Jaw Region</Label>
              <select value={formData.jaw_region} onChange={(e) => updateField('jaw_region', e.target.value)} className={`mt-1 ${selectClass}`}>
                <option>Anterior</option><option>Posterior</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Implant System</Label>
              <Input value={formData.implant_system} onChange={(e) => updateField('implant_system', e.target.value)} placeholder="Product line" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Outcome</Label>
              <select value={formData.implant_outcome} onChange={(e) => updateField('implant_outcome', e.target.value)} className={`mt-1 ${selectClass}`}>
                <option>Pending</option><option>Success</option><option>Failed</option><option>Complications</option>
              </select>
            </div>
          </div>

          {/* Row 5: Surgery Date, Follow-up, Prosthetic Loading, Surgeon */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Surgery Date</Label>
              <Input type="date" value={formData.surgery_date} onChange={(e) => updateField('surgery_date', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Follow-up Date</Label>
              <Input type="date" value={formData.follow_up_date} onChange={(e) => updateField('follow_up_date', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Surgeon Name</Label>
              <Input value={formData.surgeon_name} onChange={(e) => updateField('surgeon_name', e.target.value)} placeholder="In-house surgeon" className="mt-1" />
            </div>
          </div>

          {/* Consultant surgeon */}
          <div>
            <Label className="text-xs">Consultant / Visiting Surgeon <span className="text-[#9CA3AF]">(if different from treating doctor)</span></Label>
            <Input value={formData.consultant_surgeon || ''} onChange={(e) => updateField('consultant_surgeon', e.target.value)} placeholder="Dr. Name, Specialization" className="mt-1" data-testid="implant-consultant-surgeon" />
          </div>

          {/* Row 6: Bone Graft, Sinus Lift, Clinic */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Bone Graft</Label>
              <Input value={formData.bone_graft} onChange={(e) => updateField('bone_graft', e.target.value)} data-testid="bone-graft-input" placeholder="Xenograft, Allograft..." className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Sinus Lift Type</Label>
              <select value={formData.sinus_lift_type} onChange={(e) => updateField('sinus_lift_type', e.target.value)} data-testid="sinus-lift-select" className={`mt-1 ${selectClass}`}>
                <option value="">None</option><option>Direct</option><option>Indirect</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Clinic</Label>
              <select value={formData.clinic_id} onChange={(e) => updateField('clinic_id', e.target.value)} className={`mt-1 ${selectClass}`}>
                <option value="">Select clinic</option>
                {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 py-2">
            {[
              ['cover_screw', 'Cover Screw'],
              ['healing_abutment', 'Healing Abutment'],
              ['membrane_used', 'Membrane Used'],
              ['is_pterygoid', 'Pterygoid'],
              ['is_zygomatic', 'Zygomatic'],
              ['is_subperiosteal', 'Sub-periosteal'],
              ['osseointegration_success', 'Osseointegration Success'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-1.5 text-sm text-[#2A2F35]">
                <input type="checkbox" checked={formData[key]} onChange={(e) => updateField(key, e.target.checked)} className={checkboxClass} data-testid={`${key}-checkbox`} />
                {label}
              </label>
            ))}
          </div>

          {/* Peri-implant Health — string select, not checkbox */}
          <div>
            <Label className="text-xs">Peri-implant Health</Label>
            <select value={formData.peri_implant_health} onChange={(e) => updateField('peri_implant_health', e.target.value)} className={`mt-1 ${selectClass}`} data-testid="peri-implant-health-select">
              <option value="">Not assessed</option>
              <option value="Healthy">Healthy</option>
              <option value="Mild Inflammation">Mild Inflammation</option>
              <option value="Moderate Inflammation">Moderate Inflammation</option>
              <option value="Severe (Peri-implantitis)">Severe (Peri-implantitis)</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs">Clinical Notes</Label>
            <textarea value={formData.clinical_notes} onChange={(e) => updateField('clinical_notes', e.target.value)} rows={3} className={`mt-1 ${selectClass}`} placeholder="Clinical observations, complications, remarks..." data-testid="notes-input" />
          </div>

          <Button type="submit" data-testid="submit-implant-button" className="w-full bg-[#82A098] hover:bg-[#6B8A82] text-white">
            {editingImplantId ? 'Save Changes' : 'Add Implant Record'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
