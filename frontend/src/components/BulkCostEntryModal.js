import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, Trash } from '@phosphor-icons/react';
import { toast } from 'sonner';
import client from '../api/client';
import { useLocale } from '../contexts/LocaleContext';
import { LINE_ITEM_CATEGORIES } from './FinancialLineItemModal';

const inputClass = "w-full px-2 py-1.5 bg-white border border-[#E5E5E2] rounded-md text-sm focus:ring-2 focus:ring-[#059669] focus:outline-none";
const num = (v) => (v === '' || v == null ? 0 : parseFloat(v) || 0);

const FREEFORM_CATEGORIES = LINE_ITEM_CATEGORIES.filter(([v]) => ['lab', 'consultant', 'other'].includes(v));

function implantLabel(imp) {
  const brandLine = [imp.brand, imp.implant_system].filter(Boolean).join(' ');
  const dims = imp.diameter_mm && imp.length_mm ? ` ${imp.diameter_mm}×${imp.length_mm}mm` : '';
  return `Tooth #${imp.tooth_number}${brandLine ? ` — ${brandLine}` : ''}${dims}`;
}

function buildRowsFromRecords({ implants, abutmentRecords, fpdRecords, lineItems }) {
  const findExisting = (sourceType, sourceId) =>
    (lineItems || []).find(li => li.source_type === sourceType && li.source_id === sourceId);

  const fromRecord = (sourceType, category, sourceId, label, date) => {
    const existing = findExisting(sourceType, sourceId);
    return {
      key: `${sourceType}_${sourceId}`,
      existingId: existing?.id || null,
      source_type: sourceType,
      source_id: sourceId,
      category,
      description: label,
      custom: false,
      provider_type: existing?.provider_type || 'clinic',
      consultant_charge: existing?.consultant_charge != null ? String(existing.consultant_charge) : '',
      material_cost: existing?.material_cost != null ? String(existing.material_cost) : '',
      other_expenses: existing?.other_expenses != null ? String(existing.other_expenses) : '',
      charged_amount: existing?.charged_amount != null ? String(existing.charged_amount) : '',
      item_date: existing?.item_date || date || '',
    };
  };

  const rows = [
    ...(implants || []).map(imp => fromRecord('implant', 'implant', imp.id, implantLabel(imp), imp.surgery_date)),
    ...(abutmentRecords || []).map(ab => fromRecord('abutment', 'abutment', ab.id, `Tooth #${ab.tooth_number ?? '—'} — ${ab.abutment_type || 'Abutment'}`, ab.placement_date)),
    ...(fpdRecords || []).map(fpd => fromRecord('fpd', 'crown', fpd.id, `Teeth ${fpd.tooth_numbers?.join(', ') || '—'} — ${fpd.crown_type || 'Crown'}${fpd.crown_material ? ` (${fpd.crown_material})` : ''}`, fpd.prosthetic_loading_date)),
  ];

  // Free-form entries (lab/consultant/other) that already exist but aren't tied to a record
  const freeform = (lineItems || [])
    .filter(li => !li.source_type)
    .map(li => ({
      key: `custom_${li.id}`,
      existingId: li.id,
      source_type: null,
      source_id: null,
      category: li.category,
      description: li.description || '',
      custom: true,
      provider_type: li.provider_type || 'clinic',
      consultant_charge: li.consultant_charge != null ? String(li.consultant_charge) : '',
      material_cost: li.material_cost != null ? String(li.material_cost) : '',
      other_expenses: li.other_expenses != null ? String(li.other_expenses) : '',
      charged_amount: li.charged_amount != null ? String(li.charged_amount) : '',
      item_date: li.item_date || '',
    }));

  return [...rows, ...freeform];
}

function RowCard({ row, onChange, onRemove }) {
  const isConsultant = row.provider_type === 'consultant';
  const rowCost = (isConsultant ? num(row.consultant_charge) : 0) + num(row.material_cost) + num(row.other_expenses);
  const rowProfit = num(row.charged_amount) - rowCost;
  const categoryLabel = LINE_ITEM_CATEGORIES.find(([v]) => v === row.category)?.[1] || row.category;

  return (
    <div className="border border-[#E5E5E2] rounded-lg p-3" data-testid={`bulk-row-${row.key}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-2 py-0.5 rounded-full bg-[#F0F0EE] text-[#5C6773] text-[10px] font-semibold uppercase tracking-wide shrink-0">
            {categoryLabel}
          </span>
          {row.custom ? (
            <select
              value={row.category}
              onChange={e => onChange({ category: e.target.value })}
              className={`${inputClass} py-1`}
            >
              {FREEFORM_CATEGORIES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          ) : (
            <span className="text-sm text-[#2A2F35] truncate">{row.description}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {[['clinic', 'Clinic'], ['consultant', 'Consultant']].map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange({ provider_type: v })}
              className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                row.provider_type === v ? 'bg-[#059669] text-white border-[#059669]' : 'border-[#E5E5E2] text-[#5C6773]'
              }`}
            >
              {label}
            </button>
          ))}
          {row.custom && (
            <button type="button" onClick={onRemove} className="p-1.5 rounded-md hover:bg-red-50 text-[#9CA3AF] hover:text-red-500 transition-colors" title="Remove row">
              <Trash size={14} weight="bold" />
            </button>
          )}
        </div>
      </div>

      {row.custom && (
        <input
          value={row.description}
          onChange={e => onChange({ description: e.target.value })}
          placeholder="Description"
          className={`${inputClass} mb-2`}
        />
      )}

      <div className={`grid gap-2 ${isConsultant ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {isConsultant && (
          <div>
            <label className="text-[10px] text-[#9CA3AF]">Consultant Charge</label>
            <input type="number" step="0.01" min="0" value={row.consultant_charge}
              onChange={e => onChange({ consultant_charge: e.target.value })}
              placeholder="0" className={inputClass} />
          </div>
        )}
        <div>
          <label className="text-[10px] text-[#9CA3AF]">Material Cost</label>
          <input type="number" step="0.01" min="0" value={row.material_cost}
            onChange={e => onChange({ material_cost: e.target.value })}
            placeholder="0" className={inputClass} />
        </div>
        <div>
          <label className="text-[10px] text-[#9CA3AF]">Other Expenses</label>
          <input type="number" step="0.01" min="0" value={row.other_expenses}
            onChange={e => onChange({ other_expenses: e.target.value })}
            placeholder="0" className={inputClass} />
        </div>
        <div>
          <label className="text-[10px] text-[#9CA3AF]">Charged to Patient</label>
          <input type="number" step="0.01" min="0" value={row.charged_amount}
            onChange={e => onChange({ charged_amount: e.target.value })}
            placeholder="0" className={inputClass} />
        </div>
        <div>
          <label className="text-[10px] text-[#9CA3AF]">Date</label>
          <input type="date" value={row.item_date}
            onChange={e => onChange({ item_date: e.target.value })}
            className={inputClass} />
        </div>
      </div>

      {(rowCost > 0 || num(row.charged_amount) > 0) && (
        <p className="text-[11px] text-[#5C6773] mt-1.5">
          Cost {rowCost.toFixed(2)} · <span className={rowProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}>Profit {rowProfit.toFixed(2)}</span>
        </p>
      )}
    </div>
  );
}

export default function BulkCostEntryModal({
  open,
  onOpenChange,
  patientId,
  implants,
  abutmentRecords,
  fpdRecords,
  lineItems,
  onSaved,
}) {
  const { formatCurrency } = useLocale();
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setRows(buildRowsFromRecords({ implants, abutmentRecords, fpdRecords, lineItems }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const updateRow = (key, changes) => {
    setRows(prev => prev.map(r => r.key === key ? { ...r, ...changes } : r));
  };

  const addCustomRow = () => {
    setRows(prev => [...prev, {
      key: `custom_new_${Date.now()}`,
      existingId: null,
      source_type: null,
      source_id: null,
      category: 'lab',
      description: '',
      custom: true,
      provider_type: 'clinic',
      consultant_charge: '',
      material_cost: '',
      other_expenses: '',
      charged_amount: '',
      item_date: '',
    }]);
  };

  const removeRow = (key) => setRows(prev => prev.filter(r => r.key !== key));

  const totals = useMemo(() => rows.reduce((acc, r) => {
    const rowCost = (r.provider_type === 'consultant' ? num(r.consultant_charge) : 0) + num(r.material_cost) + num(r.other_expenses);
    acc.material += num(r.material_cost);
    acc.other += num(r.other_expenses);
    acc.consultant += r.provider_type === 'consultant' ? num(r.consultant_charge) : 0;
    acc.cost += rowCost;
    acc.charged += num(r.charged_amount);
    return acc;
  }, { material: 0, other: 0, consultant: 0, cost: 0, charged: 0 }), [rows]);

  const hasAnyValue = (r) => num(r.material_cost) > 0 || num(r.other_expenses) > 0 || num(r.consultant_charge) > 0 || num(r.charged_amount) > 0;

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const toSave = rows.filter(r => r.existingId || hasAnyValue(r));
      if (toSave.length === 0) {
        toast.info('No costs entered');
        setSaving(false);
        return;
      }
      await Promise.all(toSave.map(r => {
        const consultantCharge = r.provider_type === 'consultant' ? num(r.consultant_charge) : 0;
        const materialCost = num(r.material_cost);
        const otherExpenses = num(r.other_expenses);
        const payload = {
          patient_id: patientId,
          category: r.category,
          description: r.description,
          source_type: r.source_type,
          source_id: r.source_id,
          provider_type: r.provider_type,
          consultant_charge: consultantCharge,
          material_cost: materialCost,
          other_expenses: otherExpenses,
          cost_amount: consultantCharge + materialCost + otherExpenses,
          charged_amount: num(r.charged_amount),
          item_date: r.item_date || null,
        };
        return r.existingId
          ? client.patch(`/api/financial-line-items/${r.existingId}`, payload)
          : client.post(`/api/financial-line-items`, payload);
      }));
      toast.success(`Saved ${toSave.length} cost ${toSave.length === 1 ? 'entry' : 'entries'}`);
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error('Some entries failed to save — please check and try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Log Costs & Charges</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-[#5C6773] -mt-2 mb-3">
          Every implant, abutment, and crown/FPD for this patient is listed below — fill in whichever ones you need, then save all at once.
        </p>

        <div className="space-y-3">
          {rows.map(row => (
            <RowCard
              key={row.key}
              row={row}
              onChange={(changes) => updateRow(row.key, changes)}
              onRemove={() => removeRow(row.key)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={addCustomRow}
          data-testid="bulk-add-row-button"
          className="mt-3 flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 border border-dashed border-emerald-300 hover:bg-emerald-50 rounded-lg transition-colors w-full justify-center"
        >
          <Plus size={13} weight="bold" /> Lab / Consultant / Other Charge
        </button>

        <div className="mt-4 p-3 rounded-lg bg-[#F0F0EE] text-xs space-y-1">
          <div className="flex justify-between"><span className="text-[#5C6773]">Total Material Cost</span><strong>{formatCurrency(totals.material)}</strong></div>
          {totals.consultant > 0 && <div className="flex justify-between"><span className="text-[#5C6773]">Total Consultant Charges</span><strong>{formatCurrency(totals.consultant)}</strong></div>}
          <div className="flex justify-between"><span className="text-[#5C6773]">Total Other Expenses</span><strong>{formatCurrency(totals.other)}</strong></div>
          <div className="flex justify-between border-t border-[#E5E5E2] pt-1"><span className="text-[#5C6773]">Total Charged to Patient</span><strong>{formatCurrency(totals.charged)}</strong></div>
          <div className="flex justify-between"><span className="text-emerald-700">Total Profit</span><strong className="text-emerald-700">{formatCurrency(totals.charged - totals.cost)}</strong></div>
        </div>

        <Button
          onClick={handleSaveAll}
          disabled={saving}
          data-testid="bulk-save-all-button"
          className="w-full mt-4 bg-[#059669] hover:bg-[#047857] text-white"
        >
          {saving ? 'Saving...' : 'Save All'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
