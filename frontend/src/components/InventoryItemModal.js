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
import { useLocale } from '../contexts/LocaleContext';

const selectClass = "w-full px-3 py-2 bg-white border border-[#E5E5E2] rounded-md text-sm focus:ring-2 focus:ring-[#059669] focus:outline-none";

export const CATEGORIES = [
  ['implant', 'Implant'],
  ['abutment', 'Abutment'],
  ['kit', 'Surgical Kit'],
  ['other', 'Other'],
];

// Must match AbutmentFormModal.js's abutment_type options
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
];

export const INITIAL_ITEM = {
  category: 'implant',
  brand: '',
  implant_system: '',
  diameter_mm: '',
  length_mm: '',
  abutment_type: ABUTMENT_TYPES[0],
  size_label: '',
  article_no: '',
  low_stock_threshold: '5',
  usage_threshold: '100',
  notes: '',
  current_quantity: '',
  per_unit_price: '',
};

const num = (v) => (v === '' || v == null ? 0 : parseFloat(v) || 0);

export default function InventoryItemModal({ open, onOpenChange, editingItem, onSaved }) {
  const { formatCurrency } = useLocale();
  const [form, setForm] = useState({ ...INITIAL_ITEM });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(editingItem ? {
        category: editingItem.category || 'implant',
        brand: editingItem.brand || '',
        implant_system: editingItem.implant_system || '',
        diameter_mm: editingItem.diameter_mm != null ? String(editingItem.diameter_mm) : '',
        length_mm: editingItem.length_mm != null ? String(editingItem.length_mm) : '',
        abutment_type: editingItem.abutment_type || ABUTMENT_TYPES[0],
        size_label: editingItem.size_label || '',
        article_no: editingItem.article_no || '',
        low_stock_threshold: editingItem.low_stock_threshold != null ? String(editingItem.low_stock_threshold) : '5',
        usage_threshold: editingItem.usage_threshold != null ? String(editingItem.usage_threshold) : '100',
        notes: editingItem.notes || '',
      } : { ...INITIAL_ITEM });
    }
  }, [open, editingItem]);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const isImplant = form.category === 'implant';
  const isAbutment = form.category === 'abutment';
  const isKit = form.category === 'kit';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        category: form.category,
        brand: form.brand || null,
        implant_system: isImplant ? (form.implant_system || null) : null,
        diameter_mm: isImplant && form.diameter_mm ? parseFloat(form.diameter_mm) : null,
        length_mm: isImplant && form.length_mm ? parseFloat(form.length_mm) : null,
        abutment_type: isAbutment ? form.abutment_type : null,
        size_label: form.size_label || null,
        article_no: form.article_no || null,
        low_stock_threshold: form.low_stock_threshold ? parseInt(form.low_stock_threshold, 10) : 5,
        usage_threshold: isKit && form.usage_threshold ? parseInt(form.usage_threshold, 10) : null,
        notes: form.notes || null,
      };
      const res = editingItem
        ? await client.patch(`/api/inventory-items/${editingItem.id}`, payload)
        : await client.post('/api/inventory-items', payload);

      const startingQty = !editingItem && form.current_quantity ? parseInt(form.current_quantity, 10) : 0;
      if (startingQty > 0) {
        await client.post(`/api/inventory-items/${res.data.id}/transactions`, {
          transaction_type: 'in',
          quantity: startingQty,
          unit_cost: form.per_unit_price ? parseFloat(form.per_unit_price) : null,
          transaction_date: new Date().toISOString().slice(0, 10),
          notes: 'Starting stock count',
        });
      }

      toast.success(editingItem ? 'Item updated' : 'Item added to stock list');
      onOpenChange(false);
      onSaved(res.data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not save this item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{editingItem ? 'Edit Stock Item' : 'Add Stock Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label className="text-xs">Category *</Label>
            <select value={form.category} onChange={e => update('category', e.target.value)} className={`mt-1 ${selectClass}`} data-testid="item-category-select">
              {CATEGORIES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </div>

          <div>
            <Label className="text-xs">Brand</Label>
            <Input value={form.brand} onChange={e => update('brand', e.target.value)} placeholder="e.g. Alpha Bio Tech" data-testid="item-brand-input" className="mt-1" />
          </div>

          {isImplant && (
            <>
              <div>
                <Label className="text-xs">Implant System</Label>
                <Input value={form.implant_system} onChange={e => update('implant_system', e.target.value)} placeholder="e.g. Spiral" data-testid="item-system-input" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Diameter (mm)</Label>
                  <Input type="number" step="0.01" min="0" value={form.diameter_mm} onChange={e => update('diameter_mm', e.target.value)} placeholder="4.65" data-testid="item-diameter-input" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Length (mm)</Label>
                  <Input type="number" step="0.01" min="0" value={form.length_mm} onChange={e => update('length_mm', e.target.value)} placeholder="10" data-testid="item-length-input" className="mt-1" />
                </div>
              </div>
            </>
          )}

          {isAbutment && (
            <>
              <div>
                <Label className="text-xs">Abutment Type</Label>
                <select value={form.abutment_type} onChange={e => update('abutment_type', e.target.value)} className={`mt-1 ${selectClass}`} data-testid="item-abutment-type-select">
                  {ABUTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">Size / Height</Label>
                <Input value={form.size_label} onChange={e => update('size_label', e.target.value)} placeholder="e.g. H2.5mm" data-testid="item-size-input" className="mt-1" />
              </div>
            </>
          )}

          {!isImplant && !isAbutment && (
            <div>
              <Label className="text-xs">Size / Description</Label>
              <Input value={form.size_label} onChange={e => update('size_label', e.target.value)} placeholder="e.g. Surgical Kit A" data-testid="item-size-input" className="mt-1" />
            </div>
          )}

          {isKit && (
            <div>
              <Label className="text-xs">Replace Drill Bits After (implant cases)</Label>
              <Input type="number" min="0" value={form.usage_threshold} onChange={e => update('usage_threshold', e.target.value)} placeholder="100" data-testid="item-usage-threshold-input" className="mt-1" />
              <p className="text-[10px] text-[#9CA3AF] mt-1">Every implant logged from now on counts as one use of this kit — you'll get a reminder once it reaches this many.</p>
            </div>
          )}

          {!editingItem && (
            <div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Current Quantity On Hand</Label>
                  <Input type="number" min="0" value={form.current_quantity} onChange={e => update('current_quantity', e.target.value)} placeholder="0" data-testid="item-current-quantity-input" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Purchase Price / Unit</Label>
                  <Input type="number" step="0.01" min="0" value={form.per_unit_price} onChange={e => update('per_unit_price', e.target.value)} placeholder="0" data-testid="item-unit-price-input" className="mt-1" />
                </div>
              </div>
              <p className="text-[10px] text-[#9CA3AF] mt-1">
                {num(form.current_quantity) > 0 && num(form.per_unit_price) > 0
                  ? `Total: ${formatCurrency(num(form.current_quantity) * num(form.per_unit_price))} — leave blank if you don't have any yet`
                  : "How many of these you already have — leave blank if you don't have any yet"}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Article No.</Label>
              <Input value={form.article_no} onChange={e => update('article_no', e.target.value)} placeholder="e.g. ABT1300" data-testid="item-article-no-input" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Low Stock Alert Below</Label>
              <Input type="number" min="0" value={form.low_stock_threshold} onChange={e => update('low_stock_threshold', e.target.value)} data-testid="item-threshold-input" className="mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={2} className={`mt-1 ${selectClass}`} data-testid="item-notes-input" />
          </div>

          <Button type="submit" disabled={saving} data-testid="submit-item-button" className="w-full bg-[#059669] hover:bg-[#047857] text-white">
            {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Item'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
