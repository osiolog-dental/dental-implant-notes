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

export default function EditPatientModal({ open, onOpenChange, editPatientData, setEditPatientData, onSubmit }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Edit Patient Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Full Name *</Label>
              <Input value={editPatientData.name || ''} onChange={e => setEditPatientData(p => ({ ...p, name: e.target.value }))} required data-testid="edit-patient-name" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Age *</Label>
              <Input type="number" value={editPatientData.age || ''} onChange={e => setEditPatientData(p => ({ ...p, age: e.target.value }))} required data-testid="edit-patient-age" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Gender *</Label>
              <select value={editPatientData.gender || 'Male'} onChange={e => setEditPatientData(p => ({ ...p, gender: e.target.value }))} data-testid="edit-patient-gender" className={`mt-1 ${selectClass}`}>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Primary Phone <span className="text-[#9CA3AF] font-normal">(optional)</span></Label>
              <Input value={editPatientData.phone || ''} onChange={e => setEditPatientData(p => ({ ...p, phone: e.target.value }))} data-testid="edit-patient-phone" className="mt-1" placeholder="+91 98765 43210" />
            </div>
            <div>
              <Label className="text-xs">Emergency / Alternate Phone</Label>
              <Input value={editPatientData.emergency_phone || ''} onChange={e => setEditPatientData(p => ({ ...p, emergency_phone: e.target.value }))} data-testid="edit-patient-emergency-phone" className="mt-1" placeholder="+91 99999 00000" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={editPatientData.email || ''} onChange={e => setEditPatientData(p => ({ ...p, email: e.target.value }))} data-testid="edit-patient-email" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Alternate Email</Label>
              <Input type="email" value={editPatientData.alternate_email || ''} onChange={e => setEditPatientData(p => ({ ...p, alternate_email: e.target.value }))} data-testid="edit-patient-alt-email" className="mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Address</Label>
            <textarea value={editPatientData.address || ''} onChange={e => setEditPatientData(p => ({ ...p, address: e.target.value }))} rows={2} data-testid="edit-patient-address" className={`mt-1 ${selectClass}`} placeholder="Street, City, State, PIN" />
          </div>

          <div>
            <Label className="text-xs">Medical History / Allergies</Label>
            <textarea value={editPatientData.medical_history || ''} onChange={e => setEditPatientData(p => ({ ...p, medical_history: e.target.value }))} rows={3} data-testid="edit-patient-history" className={`mt-1 ${selectClass}`} placeholder="Diabetes, hypertension, blood thinners..." />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="submit" data-testid="save-patient-btn" className="flex-1 bg-[#82A098] hover:bg-[#6B8A82] text-white">
              Save Changes
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
