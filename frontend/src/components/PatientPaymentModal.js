import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const selectClass = "w-full px-3 py-2 bg-white border border-[#E5E5E2] rounded-md text-sm focus:ring-2 focus:ring-[#2563EB] focus:outline-none";

const PAYMENT_METHODS = ['', 'Cash', 'Card', 'UPI', 'Bank Transfer', 'Other'];

export default function PatientPaymentModal({
  open,
  onOpenChange,
  paymentData,
  setPaymentData,
  onSubmit,
  editingPaymentId,
}) {
  const updateField = (field, value) => setPaymentData(prev => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {editingPaymentId ? 'Edit Payment' : 'Record Payment'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-2">
          <div>
            <Label className="text-xs">Amount Received *</Label>
            <Input
              type="number" step="0.01" min="0"
              value={paymentData.amount}
              onChange={e => updateField('amount', e.target.value)}
              required
              data-testid="payment-amount-input"
              placeholder="0"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Date *</Label>
            <Input
              type="date"
              value={paymentData.payment_date}
              onChange={e => updateField('payment_date', e.target.value)}
              required
              data-testid="payment-date-input"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Method</Label>
            <select
              value={paymentData.method}
              onChange={e => updateField('method', e.target.value)}
              data-testid="payment-method-select"
              className={`mt-1 ${selectClass}`}
            >
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m || 'Not specified'}</option>)}
            </select>
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <textarea
              value={paymentData.notes}
              onChange={e => updateField('notes', e.target.value)}
              rows={2}
              className={`mt-1 ${selectClass}`}
              placeholder="Receipt number, installment note, etc."
              data-testid="payment-notes"
            />
          </div>

          <Button type="submit" data-testid="submit-payment-button" className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white">
            {editingPaymentId ? 'Save Changes' : 'Record Payment'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
