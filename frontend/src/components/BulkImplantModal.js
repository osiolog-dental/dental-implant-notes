import { useState } from 'react';
import client from '../api/client';
import { toast } from 'sonner';
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

const UPPER_TEETH = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
const LOWER_TEETH = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

const INITIAL_SHARED = {
  implant_type: 'Single',
  brand: '',
  implant_system: '',
  diameter_mm: '',
  length_mm: '',
  insertion_torque: '',
  isq_value: '',
  connection_type: 'Internal Hex',
  surgical_approach: 'Immediate Placement',
  bone_graft: '',
  sinus_lift_type: '',
  cover_screw: false,
  healing_abutment: false,
  membrane_used: false,
  surgery_date: '',
  surgeon_name: '',
  consultant_surgeon: '',
  clinic_id: '',
  implant_outcome: 'Pending',
  clinical_notes: '',
};

/*
  Set implant specs once (brand, size, torque, etc.), then tap every tooth
  that's getting the same implant. One submit fans out into N individual
  POST /api/implants calls — only tooth_number (and derived arch/jaw_region)
  differs per record.
*/
export default function BulkImplantModal({ open, onOpenChange, patientId, clinics, onSaved }) {
  const [shared, setShared] = useState({ ...INITIAL_SHARED });
  const [selectedTeeth, setSelectedTeeth] = useState([]);
  const [saving, setSaving] = useState(false);

  const updateField = (field, value) => setShared(prev => ({ ...prev, [field]: value }));

  const toggleTooth = (tn) => {
    setSelectedTeeth(prev =>
      prev.includes(tn) ? prev.filter(t => t !== tn) : [...prev, tn].sort((a, b) => a - b)
    );
  };

  const reset = () => {
    setShared({ ...INITIAL_SHARED });
    setSelectedTeeth([]);
  };

  const handleClose = (next) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const deriveArch = (tn) => {
    const arch = tn <= 28 ? 'Upper' : 'Lower';
    const tens = Math.floor(tn / 10);
    const jaw_region = ([1, 2, 3, 4].includes(tens) && (tn % 10) <= 3) ? 'Anterior' : 'Posterior';
    return { arch, jaw_region };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedTeeth.length === 0) {
      toast.error('Select at least one tooth');
      return;
    }
    if (!shared.brand) {
      toast.error('Brand is required');
      return;
    }
    setSaving(true);
    try {
      const results = await Promise.allSettled(
        selectedTeeth.map((tn) => {
          const { arch, jaw_region } = deriveArch(tn);
          const payload = {
            ...shared,
            patient_id: patientId,
            tooth_number: tn,
            arch,
            jaw_region,
            insertion_torque: shared.insertion_torque ? parseFloat(shared.insertion_torque) : null,
            diameter_mm: shared.diameter_mm ? parseFloat(shared.diameter_mm) : null,
            length_mm: shared.length_mm ? parseFloat(shared.length_mm) : null,
            isq_value: shared.isq_value ? parseFloat(shared.isq_value) : null,
            bone_graft: shared.bone_graft || null,
            sinus_lift_type: shared.sinus_lift_type || null,
            clinic_id: shared.clinic_id || null,
            implant_system: shared.implant_system || null,
            surgeon_name: shared.surgeon_name || null,
          };
          return client.post('/api/implants', payload);
        })
      );
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.length - succeeded;
      if (succeeded > 0) {
        toast.success(`${succeeded} implant${succeeded > 1 ? 's' : ''} added`);
      }
      if (failed > 0) {
        toast.error(`${failed} implant${failed > 1 ? 's' : ''} failed to save`);
      }
      if (succeeded > 0) {
        handleClose(false);
        onSaved?.();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add Multiple Implants</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <p className="text-xs text-[#5C6773]">
            Set the implant details once, then select every tooth getting this same implant. Each tooth becomes its own implant record.
          </p>

          {/* Tooth multi-select */}
          <div className="p-3 bg-[#F9F9F8] rounded-lg border border-[#E5E5E2]">
            <div className="mb-2">
              <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide mb-1">Upper Arch</p>
              <div className="flex flex-wrap gap-1.5">
                {UPPER_TEETH.map(tn => (
                  <button
                    key={tn}
                    type="button"
                    data-testid={`bulk-tooth-${tn}`}
                    onClick={() => toggleTooth(tn)}
                    className={`w-9 h-9 text-xs font-medium rounded-md border transition-colors ${
                      selectedTeeth.includes(tn)
                        ? 'bg-[#82A098] text-white border-[#82A098]'
                        : 'bg-white text-[#2A2F35] border-[#E5E5E2] hover:border-[#82A098]'
                    }`}
                  >{tn}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide mb-1">Lower Arch</p>
              <div className="flex flex-wrap gap-1.5">
                {LOWER_TEETH.map(tn => (
                  <button
                    key={tn}
                    type="button"
                    data-testid={`bulk-tooth-${tn}`}
                    onClick={() => toggleTooth(tn)}
                    className={`w-9 h-9 text-xs font-medium rounded-md border transition-colors ${
                      selectedTeeth.includes(tn)
                        ? 'bg-[#82A098] text-white border-[#82A098]'
                        : 'bg-white text-[#2A2F35] border-[#E5E5E2] hover:border-[#82A098]'
                    }`}
                  >{tn}</button>
                ))}
              </div>
            </div>
            {selectedTeeth.length > 0 && (
              <p className="mt-2 text-xs text-[#5C6773]">
                Selected ({selectedTeeth.length}): <span className="font-medium text-[#2A2F35]">{selectedTeeth.join(', ')}</span>
              </p>
            )}
          </div>

          {/* Shared specs */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Implant Type</Label>
              <select value={shared.implant_type} onChange={(e) => updateField('implant_type', e.target.value)} className={`mt-1 ${selectClass}`}>
                <option>Single</option><option>Bridge</option><option>Full Mouth</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Brand *</Label>
              <Input value={shared.brand} onChange={(e) => updateField('brand', e.target.value)} required data-testid="bulk-brand-input" placeholder="e.g., Nobel, Straumann" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Implant System</Label>
              <Input value={shared.implant_system} onChange={(e) => updateField('implant_system', e.target.value)} placeholder="Product line" className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Diameter (mm)</Label>
              <Input type="number" step="0.1" value={shared.diameter_mm} onChange={(e) => updateField('diameter_mm', e.target.value)} placeholder="4.5" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Length (mm)</Label>
              <Input type="number" step="0.1" value={shared.length_mm} onChange={(e) => updateField('length_mm', e.target.value)} placeholder="10.0" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Insertion Torque (Ncm)</Label>
              <Input type="number" step="0.1" value={shared.insertion_torque} onChange={(e) => updateField('insertion_torque', e.target.value)} placeholder="35" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">ISQ Value</Label>
              <Input type="number" step="0.1" value={shared.isq_value} onChange={(e) => updateField('isq_value', e.target.value)} placeholder="70" className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Connection Type</Label>
              <select value={shared.connection_type} onChange={(e) => updateField('connection_type', e.target.value)} className={`mt-1 ${selectClass}`}>
                <option>Internal Hex</option><option>External Hex</option><option>Conical</option><option>Morse Taper</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Surgical Approach</Label>
              <select value={shared.surgical_approach} onChange={(e) => updateField('surgical_approach', e.target.value)} className={`mt-1 ${selectClass}`}>
                <option>Immediate Placement</option><option>Delayed Placement</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Surgery Date</Label>
              <Input type="date" value={shared.surgery_date} onChange={(e) => updateField('surgery_date', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Outcome</Label>
              <select value={shared.implant_outcome} onChange={(e) => updateField('implant_outcome', e.target.value)} className={`mt-1 ${selectClass}`}>
                <option>Pending</option><option>Success</option><option>Failed</option><option>Complications</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Bone Graft</Label>
              <Input value={shared.bone_graft} onChange={(e) => updateField('bone_graft', e.target.value)} placeholder="Xenograft, Allograft..." className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Sinus Lift Type</Label>
              <select value={shared.sinus_lift_type} onChange={(e) => updateField('sinus_lift_type', e.target.value)} className={`mt-1 ${selectClass}`}>
                <option value="">None</option><option>Direct</option><option>Indirect</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Clinic</Label>
              <select value={shared.clinic_id} onChange={(e) => updateField('clinic_id', e.target.value)} className={`mt-1 ${selectClass}`}>
                <option value="">Select clinic</option>
                {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Surgeon Name</Label>
              <Input value={shared.surgeon_name} onChange={(e) => updateField('surgeon_name', e.target.value)} placeholder="In-house surgeon" className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Consultant / Visiting Surgeon</Label>
              <Input value={shared.consultant_surgeon} onChange={(e) => updateField('consultant_surgeon', e.target.value)} placeholder="Dr. Name, Specialization" className="mt-1" />
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 py-2">
            {[
              ['cover_screw', 'Cover Screw'],
              ['healing_abutment', 'Healing Abutment'],
              ['membrane_used', 'Membrane Used'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-1.5 text-sm text-[#2A2F35]">
                <input type="checkbox" checked={shared[key]} onChange={(e) => updateField(key, e.target.checked)} className={checkboxClass} />
                {label}
              </label>
            ))}
          </div>

          <div>
            <Label className="text-xs">Clinical Notes <span className="text-[#9CA3AF]">(applied to all selected teeth)</span></Label>
            <textarea value={shared.clinical_notes} onChange={(e) => updateField('clinical_notes', e.target.value)} rows={3} className={`mt-1 ${selectClass}`} placeholder="Clinical observations..." />
          </div>

          <Button type="submit" disabled={saving} data-testid="submit-bulk-implant-button" className="w-full bg-[#82A098] hover:bg-[#6B8A82] text-white">
            {saving ? 'Saving…' : selectedTeeth.length > 0 ? `Add ${selectedTeeth.length} Implant Record${selectedTeeth.length > 1 ? 's' : ''}` : 'Add Implant Records'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
