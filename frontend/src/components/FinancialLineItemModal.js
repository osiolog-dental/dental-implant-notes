import { useMemo, useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const selectClass = "w-full px-3 py-2 bg-white border border-[#E5E5E2] rounded-md text-sm focus:ring-2 focus:ring-[#059669] focus:outline-none";

export const LINE_ITEM_CATEGORIES = [
  ['implant', 'Implant'],
  ['abutment', 'Abutment'],
  ['crown', 'Crown / FPD'],
  ['full_mouth_rehab', 'Full Mouth Rehab'],
  ['overdenture', 'Overdenture'],
  ['graft', 'Bone Graft'],
  ['membrane', 'Membrane'],
  ['lab', 'Lab Charges'],
  ['consultant', 'Consultant Charges'],
  ['other', 'Other'],
];

const num = (v) => (v === '' || v == null ? 0 : parseFloat(v) || 0);

/* Build the "quick-fill from existing record" options for the current category */
function buildSourceOptions(category, { implants, abutmentRecords, fpdRecords }) {
  if (category === 'implant') {
    return (implants || []).map(imp => {
      const brandLine = [imp.brand, imp.implant_system].filter(Boolean).join(' ');
      const dims = imp.diameter_mm && imp.length_mm ? ` ${imp.diameter_mm}×${imp.length_mm}mm` : '';
      return {
        id: imp.id,
        sourceType: 'implant',
        label: `Tooth #${imp.tooth_number}${brandLine ? ` — ${brandLine}` : ''}${dims}`,
        date: imp.surgery_date || '',
      };
    });
  }
  if (category === 'abutment') {
    return (abutmentRecords || []).map(ab => ({
      id: ab.id,
      sourceType: 'abutment',
      label: `Tooth #${ab.tooth_number ?? '—'} — ${ab.abutment_type || 'Abutment'}`,
      date: ab.placement_date || '',
    }));
  }
  if (category === 'crown') {
    return (fpdRecords || []).map(fpd => ({
      id: fpd.id,
      sourceType: 'fpd',
      label: `Teeth ${fpd.tooth_numbers?.join(', ') || '—'} — ${fpd.crown_type || 'Crown'}${fpd.crown_material ? ` (${fpd.crown_material})` : ''}`,
      date: fpd.prosthetic_loading_date || '',
    }));
  }
  return [];
}

export default function FinancialLineItemModal({
  open,
  onOpenChange,
  lineItemData,
  setLineItemData,
  onSubmit,
  editingLineItemId,
  implants,
  abutmentRecords,
  fpdRecords,
}) {
  const updateField = (field, value) => setLineItemData(prev => ({ ...prev, [field]: value }));

  const sourceOptions = useMemo(
    () => buildSourceOptions(lineItemData.category, { implants, abutmentRecords, fpdRecords }),
    [lineItemData.category, implants, abutmentRecords, fpdRecords]
  );
  const [selectedSourceId, setSelectedSourceId] = useState('');

  // Reset the quick-fill picker whenever the category changes or the modal reopens
  useEffect(() => { setSelectedSourceId(''); }, [lineItemData.category, open]);

  const applySource = (sourceId) => {
    setSelectedSourceId(sourceId);
    if (!sourceId) {
      setLineItemData(prev => ({ ...prev, source_type: null, source_id: null }));
      return;
    }
    const source = sourceOptions.find(o => o.id === sourceId);
    if (!source) return;
    setLineItemData(prev => ({
      ...prev,
      description: source.label,
      item_date: prev.item_date || source.date,
      source_type: source.sourceType,
      source_id: source.id,
    }));
  };

  const isConsultant = lineItemData.provider_type === 'consultant';
  const totalCost = (isConsultant ? num(lineItemData.consultant_charge) : 0)
    + num(lineItemData.material_cost) + num(lineItemData.other_expenses);
  const profit = num(lineItemData.charged_amount) - totalCost;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {editingLineItemId ? 'Edit Expense / Charge' : 'Add Expense / Charge'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-2">
          <div>
            <Label className="text-xs">Category *</Label>
            <select
              value={lineItemData.category}
              onChange={e => setLineItemData(prev => ({ ...prev, category: e.target.value, source_type: null, source_id: null }))}
              required
              data-testid="lineitem-category-select"
              className={`mt-1 ${selectClass}`}
            >
              {LINE_ITEM_CATEGORIES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </div>

          {sourceOptions.length > 0 && (
            <div>
              <Label className="text-xs">Quick-fill from Patient's Records</Label>
              <select
                value={selectedSourceId}
                onChange={e => applySource(e.target.value)}
                data-testid="lineitem-source-select"
                className={`mt-1 ${selectClass}`}
              >
                <option value="">Select an existing record (optional)</option>
                {sourceOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              <p className="text-[10px] text-[#9CA3AF] mt-1">Fills in the description and date below — you can still edit them</p>
            </div>
          )}

          <div>
            <Label className="text-xs">Description</Label>
            <Input
              value={lineItemData.description}
              onChange={e => updateField('description', e.target.value)}
              placeholder="e.g. Nobel Active implant — Tooth #16"
              data-testid="lineitem-description-input"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Performed By *</Label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {[['clinic', 'Clinic (In-house)'], ['consultant', 'Consultant']].map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  data-testid={`provider-type-${v}`}
                  onClick={() => {
                    if (v === lineItemData.provider_type) return;
                    setLineItemData(prev => ({
                      ...prev,
                      provider_type: v,
                      // Clinic and consultant costs are entirely separate —
                      // switching starts blank rather than carrying over the
                      // other side's material cost, expenses, fee, or charge,
                      // which would otherwise silently attribute one party's
                      // costs to the other.
                      consultant_charge: '',
                      material_cost: '',
                      other_expenses: '',
                      charged_amount: '',
                    }));
                  }}
                  className={`py-2 rounded-md text-sm font-medium border transition-colors ${
                    lineItemData.provider_type === v
                      ? 'bg-[#059669] text-white border-[#059669]'
                      : 'border-[#E5E5E2] text-[#5C6773] hover:border-[#059669]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[#9CA3AF] mt-1">Was this procedure done by you (the clinic owner) or by a visiting consultant?</p>
          </div>

          {isConsultant && (
            <div>
              <Label className="text-xs">Consultant Charge (from clinic) *</Label>
              <Input
                type="number" step="0.01" min="0"
                value={lineItemData.consultant_charge}
                onChange={e => updateField('consultant_charge', e.target.value)}
                required
                data-testid="lineitem-consultant-charge-input"
                placeholder="0"
                className="mt-1"
              />
              <p className="text-[10px] text-[#9CA3AF] mt-1">What the clinic pays the consultant for this case</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Material Cost *</Label>
              <Input
                type="number" step="0.01" min="0"
                value={lineItemData.material_cost}
                onChange={e => updateField('material_cost', e.target.value)}
                required
                data-testid="lineitem-material-cost-input"
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Other Expenses</Label>
              <Input
                type="number" step="0.01" min="0"
                value={lineItemData.other_expenses}
                onChange={e => updateField('other_expenses', e.target.value)}
                data-testid="lineitem-other-expenses-input"
                placeholder="0"
                className="mt-1"
              />
              <p className="text-[10px] text-[#9CA3AF] mt-1">Physiodispenser use, kit wear & tear, travel...</p>
            </div>
          </div>

          {!isConsultant && (
            <div>
              <Label className="text-xs">Charged to Patient *</Label>
              <Input
                type="number" step="0.01" min="0"
                value={lineItemData.charged_amount}
                onChange={e => updateField('charged_amount', e.target.value)}
                required
                data-testid="lineitem-charged-input"
                placeholder="0"
                className="mt-1"
              />
            </div>
          )}

          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#F0F0EE] text-sm">
            <span className="text-[#5C6773]">Total Cost: <strong className="text-[#2A2F35]">{totalCost.toFixed(2)}</strong></span>
            {isConsultant ? (
              <span className="text-[11px] text-[#9CA3AF]">Consultant fee — no patient charge on this line</span>
            ) : (
              <span className={profit >= 0 ? 'text-emerald-700 font-semibold' : 'text-red-600 font-semibold'}>
                Profit: {profit.toFixed(2)}
              </span>
            )}
          </div>

          <div>
            <Label className="text-xs">Date</Label>
            <Input
              type="date"
              value={lineItemData.item_date}
              onChange={e => updateField('item_date', e.target.value)}
              data-testid="lineitem-date-input"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <textarea
              value={lineItemData.notes}
              onChange={e => updateField('notes', e.target.value)}
              rows={2}
              className={`mt-1 ${selectClass}`}
              placeholder="Brand change, negotiated discount, etc."
              data-testid="lineitem-notes"
            />
          </div>

          <Button type="submit" data-testid="submit-lineitem-button" className="w-full bg-[#059669] hover:bg-[#047857] text-white">
            {editingLineItemId ? 'Save Changes' : 'Add Line Item'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
