import { useState, useEffect } from 'react';
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
import client from '../api/client';

const selectClass = "w-full px-3 py-2 bg-white border border-[#E5E5E2] rounded-md text-sm focus:ring-2 focus:ring-[#059669] focus:outline-none";

export default function StockUsageModal({ open, onOpenChange, item, patients, onSaved }) {
  const [quantity, setQuantity] = useState('1');
  const [date, setDate] = useState('');
  const [patientId, setPatientId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setQuantity('1');
      setDate(new Date().toISOString().slice(0, 10));
      setPatientId('');
      setNotes('');
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!item) return;
    setSaving(true);
    try {
      await client.post(`/api/inventory-items/${item.id}/transactions`, {
        transaction_type: 'out',
        quantity: parseInt(quantity, 10),
        patient_id: patientId || null,
        transaction_date: date,
        notes: notes || null,
      });
      toast.success('Usage logged');
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not log this usage');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Log Usage</DialogTitle>
        </DialogHeader>
        {item && (
          <p className="text-sm text-[#5C6773] -mt-2">
            {item.brand} {item.implant_system || item.abutment_type || ''} {item.diameter_mm && item.length_mm ? `${item.diameter_mm}×${item.length_mm}mm` : item.size_label || ''}
            <span className="block text-xs text-[#9CA3AF] mt-0.5">Currently {item.available_quantity} in stock</span>
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          <div>
            <Label className="text-xs">Quantity Used *</Label>
            <Input type="number" min="1" max={item?.available_quantity || undefined} required value={quantity} onChange={e => setQuantity(e.target.value)} data-testid="usage-quantity-input" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Date *</Label>
            <Input type="date" required value={date} onChange={e => setDate(e.target.value)} data-testid="usage-date-input" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Patient</Label>
            <select value={patientId} onChange={e => setPatientId(e.target.value)} className={`mt-1 ${selectClass}`} data-testid="usage-patient-select">
              <option value="">Not linked to a patient</option>
              {patients.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`mt-1 ${selectClass}`} data-testid="usage-notes-input" />
          </div>
          <Button type="submit" disabled={saving} data-testid="submit-usage-button" className="w-full bg-[#059669] hover:bg-[#047857] text-white">
            {saving ? 'Saving...' : 'Log Usage'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
