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
import { useFinanceView } from '../contexts/FinanceViewContext';

const inputClass = "w-full px-2 py-1.5 bg-white border border-[#E5E5E2] rounded-md text-sm focus:ring-2 focus:ring-[#059669] focus:outline-none";
const num = (v) => (v === '' || v == null ? 0 : parseFloat(v) || 0);

const FREEFORM_CATEGORIES = LINE_ITEM_CATEGORIES.filter(([v]) => ['lab', 'consultant', 'other'].includes(v));

function implantLabel(imp) {
  const brandLine = [imp.brand, imp.implant_system].filter(Boolean).join(' ');
  const dims = imp.diameter_mm && imp.length_mm ? ` ${imp.diameter_mm}×${imp.length_mm}mm` : '';
  return `Tooth #${imp.tooth_number}${brandLine ? ` — ${brandLine}` : ''}${dims}`;
}

/*
  Which side a row belongs to — same rule as the server (services/finance_sides.py):
  a row at a clinic you've marked Consultant is YOUR consulting work; at your own
  clinic it's the clinic's business (a 'consultant' row there = a visiting
  consultant you paid); a row with no clinic goes by its Clinic/Consultant label.
*/
function rowSide(row, roles) {
  const role = row.clinic_id ? roles[row.clinic_id] : null;
  if (role) return role === 'consultant' ? 'consultant' : 'owner';
  return row.provider_type === 'consultant' ? 'consultant' : 'owner';
}

function buildRowsFromRecords({ implants, abutmentRecords, fpdRecords, lineItems, sideFilter, roles }) {
  // Only a clinic id that belongs to this practice is kept (older implants can
  // hold free text in clinic_id) — anything else is treated as "no clinic".
  const known = (id) => (id && roles[String(id)] ? String(id) : '');
  const defaultProvider = (clinicId) => {
    if (clinicId) return roles[clinicId] === 'consultant' ? 'consultant' : 'clinic';
    return sideFilter === 'consultant' ? 'consultant' : 'clinic';
  };
  const claimedIds = new Set();

  // Entries saved before source_type/source_id existed (or via a manually
  // typed description matching a quick-fill label) won't match by ID —
  // fall back to matching on category + exact description text so they
  // don't show up a second time as an unrelated free-form row.
  const findExisting = (sourceType, sourceId, category, label) => {
    const byId = (lineItems || []).find(li => li.source_type === sourceType && li.source_id === sourceId);
    if (byId) { claimedIds.add(byId.id); return byId; }
    const byLabel = (lineItems || []).find(li =>
      !li.source_type && !claimedIds.has(li.id) && li.category === category && li.description === label
    );
    if (byLabel) claimedIds.add(byLabel.id);
    return byLabel;
  };

  const fromRecord = (sourceType, category, sourceId, label, date, sourceClinicId) => {
    const existing = findExisting(sourceType, sourceId, category, label);
    const clinicId = known(existing?.clinic_id) || known(sourceClinicId);
    return {
      clinic_id: clinicId,
      key: `${sourceType}_${sourceId}`,
      existingId: existing?.id || null,
      source_type: sourceType,
      source_id: sourceId,
      category,
      description: label,
      custom: false,
      // A record already saved keeps its true provider — only a never-logged
      // procedure defaults from its clinic (Consultant clinic → your consulting).
      provider_type: existing?.provider_type || defaultProvider(clinicId),
      consultant_charge: existing?.consultant_charge != null ? String(existing.consultant_charge) : '',
      material_cost: existing?.material_cost != null ? String(existing.material_cost) : '',
      other_expenses: existing?.other_expenses != null ? String(existing.other_expenses) : '',
      charged_amount: existing?.charged_amount != null ? String(existing.charged_amount) : '',
      item_date: existing?.item_date || date || '',
    };
  };

  const rows = [
    ...(implants || []).map(imp => fromRecord('implant', 'implant', imp.id, implantLabel(imp), imp.surgery_date, imp.clinic_id)),
    ...(abutmentRecords || []).map(ab => fromRecord('abutment', 'abutment', ab.id, `Tooth #${ab.tooth_number ?? '—'} — ${ab.abutment_type || 'Abutment'}`, ab.placement_date, ab.clinic_id)),
    ...(fpdRecords || []).map(fpd => fromRecord('fpd', 'crown', fpd.id, `Teeth ${fpd.tooth_numbers?.join(', ') || '—'} — ${fpd.crown_type || 'Crown'}${fpd.crown_material ? ` (${fpd.crown_material})` : ''}`, fpd.prosthetic_loading_date)),
  ];

  // Free-form entries (lab/consultant/other) that already exist but aren't tied to a record
  // — excluding any that were just claimed above via the description fallback match.
  const freeform = (lineItems || [])
    .filter(li => !li.source_type && !claimedIds.has(li.id))
    .map(li => ({
      key: `custom_${li.id}`,
      existingId: li.id,
      clinic_id: known(li.clinic_id),
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

  // Remember each row's side as it was when the window opened, so editing a
  // row's clinic doesn't make it vanish from a filtered view mid-edit.
  return [...rows, ...freeform].map(r => ({ ...r, initialSide: rowSide(r, roles) }));
}

function RowCard({ row, onChange, onRemove, clinics, roles }) {
  const isConsultant = row.provider_type === 'consultant';
  const mine = rowSide(row, roles) === 'consultant';   // your own consulting work
  const atConsultantClinic = !!row.clinic_id && roles[row.clinic_id] === 'consultant';
  const reset = { consultant_charge: '', material_cost: '', other_expenses: '', charged_amount: '' };
  const changeClinic = (clinicId) => {
    const role = clinicId ? roles[clinicId] : null;
    if (role === 'consultant' && !isConsultant) onChange({ clinic_id: clinicId, provider_type: 'consultant', ...reset });
    else if (atConsultantClinic && role !== 'consultant') onChange({ clinic_id: clinicId, provider_type: 'clinic', ...reset });
    else onChange({ clinic_id: clinicId });
  };
  const rowCost = (isConsultant ? num(row.consultant_charge) : 0) + num(row.material_cost) + num(row.other_expenses);
  const rowProfit = num(row.charged_amount) - rowCost;
  // The consultant is paid a flat fee by the clinic and never sees what the
  // patient was charged — their own profit is just that fee minus whatever
  // materials/expenses came out of it.
  const consultantProfit = num(row.consultant_charge) - num(row.material_cost) - num(row.other_expenses);
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
          {atConsultantClinic && (
            <span className="px-2 py-1 rounded-md text-[11px] font-medium bg-purple-100 text-purple-700">My consulting</span>
          )}
          {!atConsultantClinic && [['clinic', 'Clinic'], ['consultant', row.clinic_id ? 'Visiting consultant' : 'Consultant']].map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                if (v === row.provider_type) return;
                onChange({
                  provider_type: v,
                  // Clinic and consultant costs are entirely separate —
                  // switching starts blank rather than carrying over the
                  // other side's material cost, expenses, fee, or charge.
                  consultant_charge: '',
                  material_cost: '',
                  other_expenses: '',
                  charged_amount: '',
                });
              }}
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

      <div className="flex items-center gap-2 mb-2">
        <label className="text-[10px] text-[#9CA3AF] shrink-0">Clinic</label>
        <select
          value={row.clinic_id || ''}
          onChange={e => changeClinic(e.target.value)}
          data-testid={`bulk-row-clinic-${row.key}`}
          className={`${inputClass} py-1`}
        >
          <option value="">No clinic</option>
          {clinics.map(c => (
            <option key={c.id} value={String(c.id)}>{c.name}{c.my_role === 'consultant' ? ' — I consult here' : ''}</option>
          ))}
        </select>
      </div>

      {row.custom && (
        <input
          value={row.description}
          onChange={e => onChange({ description: e.target.value })}
          placeholder="Description"
          className={`${inputClass} mb-2`}
        />
      )}

      <div className={`grid gap-2 ${isConsultant ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {isConsultant && (
          <div>
            <label className="text-[10px] text-[#9CA3AF]">{mine ? 'Fee You Receive' : 'Consultant Charge'}</label>
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
        {!isConsultant && (
          <div>
            <label className="text-[10px] text-[#9CA3AF]">Charged to Patient</label>
            <input type="number" step="0.01" min="0" value={row.charged_amount}
              onChange={e => onChange({ charged_amount: e.target.value })}
              placeholder="0" className={inputClass} />
          </div>
        )}
        <div>
          <label className="text-[10px] text-[#9CA3AF]">Date</label>
          <input type="date" value={row.item_date}
            onChange={e => onChange({ item_date: e.target.value })}
            className={inputClass} />
        </div>
      </div>

      {isConsultant ? (
        num(row.consultant_charge) > 0 && (
          mine ? (
            <p className="text-[11px] text-[#5C6773] mt-1.5">
              Fee you receive {num(row.consultant_charge).toFixed(2)} ·{' '}
              <span className={consultantProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}>Your profit {consultantProfit.toFixed(2)}</span>
            </p>
          ) : (
            <p className="text-[11px] text-[#5C6773] mt-1.5">
              Paid to visiting consultant {num(row.consultant_charge).toFixed(2)}
            </p>
          )
        )
      ) : (
        (rowCost > 0 || num(row.charged_amount) > 0) && (
          <p className="text-[11px] text-[#5C6773] mt-1.5">
            Cost {rowCost.toFixed(2)} · <span className={rowProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}>Profit {rowProfit.toFixed(2)}</span>
          </p>
        )
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
  providerFilter,
  onSaved,
}) {
  const { formatCurrency } = useLocale();
  const { view } = useFinanceView();
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [clinics, setClinics] = useState([]);

  // The account-wide view (beside the bell) wins; on 'Both' the per-patient filter applies.
  const sideFilter = view === 'clinic' ? 'owner'
    : view === 'consultant' ? 'consultant'
    : providerFilter === 'clinic' ? 'owner'
    : providerFilter === 'consultant' ? 'consultant'
    : null;
  const roles = useMemo(() => Object.fromEntries(clinics.map(c => [String(c.id), c.my_role || 'owner'])), [clinics]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    client.get('/api/clinics')
      .then(res => res.data || [])
      .catch(() => { toast.error('Could not load your clinics — rows will show without a clinic'); return []; })
      .then(list => {
        if (cancelled) return;
        const r = Object.fromEntries(list.map(c => [String(c.id), c.my_role || 'owner']));
        setClinics(list);
        setRows(buildRowsFromRecords({ implants, abutmentRecords, fpdRecords, lineItems, sideFilter, roles: r }));
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Mirrors whichever side is being shown — a procedure already saved on the
  // other side still keeps its own data, it's just not shown while filtered.
  const visibleRows = sideFilter ? rows.filter(r => r.initialSide === sideFilter) : rows;

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
      clinic_id: '',
      initialSide: sideFilter || 'owner',
      provider_type: sideFilter === 'consultant' ? 'consultant' : 'clinic',
      consultant_charge: '',
      material_cost: '',
      other_expenses: '',
      charged_amount: '',
      item_date: '',
    }]);
  };

  const removeRow = (key) => setRows(prev => prev.filter(r => r.key !== key));

  const totals = useMemo(() => visibleRows.reduce((acc, r) => {
    const rowCost = (r.provider_type === 'consultant' ? num(r.consultant_charge) : 0) + num(r.material_cost) + num(r.other_expenses);
    acc.material += num(r.material_cost);
    acc.other += num(r.other_expenses);
    acc.consultant += r.provider_type === 'consultant' ? num(r.consultant_charge) : 0;
    acc.cost += rowCost;
    acc.charged += num(r.charged_amount);
    if (r.provider_type === 'consultant') {
      acc.consultantProfit += num(r.consultant_charge) - num(r.material_cost) - num(r.other_expenses);
    }
    return acc;
  }, { material: 0, other: 0, consultant: 0, cost: 0, charged: 0, consultantProfit: 0 }), [visibleRows]);

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
          clinic_id: r.clinic_id && roles[r.clinic_id] ? r.clinic_id : null,
          provider_type: r.provider_type,
          consultant_charge: consultantCharge,
          material_cost: materialCost,
          other_expenses: otherExpenses,
          cost_amount: consultantCharge + materialCost + otherExpenses,
          // A consultant is paid by the clinic only — no patient-charge figure on this line.
          charged_amount: r.provider_type === 'consultant' ? 0 : num(r.charged_amount),
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
        {sideFilter && (
          <p className="text-xs text-emerald-700 -mt-2 mb-3 font-medium">
            Showing {sideFilter === 'consultant' ? 'your consulting work' : "your clinic's costs"} only — matches the finance view you've selected.
          </p>
        )}

        <div className="space-y-3">
          {visibleRows.map(row => (
            <RowCard
              key={row.key}
              row={row}
              clinics={clinics}
              roles={roles}
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
          {totals.consultant > 0 && (
            <div className="flex justify-between">
              <span className="text-[#5C6773]">Total Consultant Profit</span>
              <strong className={totals.consultantProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}>{formatCurrency(totals.consultantProfit)}</strong>
            </div>
          )}
          <p className="text-[10px] text-[#9CA3AF] pt-1">
            Clinic Profit is shown on the Financials summary once payments are recorded — it's based on what's actually been paid, minus consultant fees paid out. A consultant's own material and other expenses come out of their fee above and never count as a clinic cost.
          </p>
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
