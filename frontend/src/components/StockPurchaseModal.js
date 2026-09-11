import { useState, useEffect, useMemo } from 'react';
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
import { Plus, Trash, Paperclip, MagicWand } from '@phosphor-icons/react';
import client from '../api/client';
import { useLocale } from '../contexts/LocaleContext';
import { CATEGORIES, ABUTMENT_TYPES } from './InventoryItemModal';

const selectClass = "w-full px-2 py-1.5 bg-white border border-[#E5E5E2] rounded-md text-xs focus:ring-2 focus:ring-[#059669] focus:outline-none";
const cellInputClass = "w-full px-2 py-1.5 bg-white border border-[#E5E5E2] rounded-md text-xs focus:ring-2 focus:ring-[#059669] focus:outline-none";
const num = (v) => (v === '' || v == null ? 0 : parseFloat(v) || 0);
const NEW_ITEM = '__new__';

function itemLabel(item) {
  if (item.category === 'implant') {
    const dims = item.diameter_mm && item.length_mm ? ` ${item.diameter_mm}×${item.length_mm}mm` : '';
    return `${item.brand || 'Implant'}${item.implant_system ? ` ${item.implant_system}` : ''}${dims}`;
  }
  if (item.category === 'abutment') {
    return `${item.brand || 'Abutment'} — ${item.abutment_type || ''}${item.size_label ? ` ${item.size_label}` : ''}`;
  }
  return `${item.brand || ''} ${item.size_label || item.category}`.trim();
}

function blankNewItem() {
  return { category: 'implant', brand: '', implant_system: '', diameter_mm: '', length_mm: '', abutment_type: ABUTMENT_TYPES[0], size_label: '', article_no: '' };
}

function newLine() {
  return {
    key: `line_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    itemId: '',
    isNew: false,
    newItem: blankNewItem(),
    quantity: '',
    line_net_cost: '',
  };
}

// Turns one AI-extracted line into a row — matches it to an existing item by
// article number when one already exists, so scanning a repeat order never
// creates a duplicate stock item.
function lineFromScan(raw, inventoryItems) {
  const articleNo = (raw.article_no || '').trim();
  const existing = articleNo
    ? inventoryItems.find(it => (it.article_no || '').trim().toLowerCase() === articleNo.toLowerCase())
    : null;

  return {
    key: `line_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    itemId: existing ? existing.id : '',
    isNew: !existing,
    newItem: {
      category: raw.category || 'implant',
      brand: raw.brand || '',
      implant_system: raw.implant_system || '',
      diameter_mm: raw.diameter_mm != null ? String(raw.diameter_mm) : '',
      length_mm: raw.length_mm != null ? String(raw.length_mm) : '',
      abutment_type: ABUTMENT_TYPES.includes(raw.abutment_type) ? raw.abutment_type : ABUTMENT_TYPES[0],
      size_label: raw.size_label || raw.raw_description || '',
      article_no: articleNo,
    },
    quantity: raw.quantity != null ? String(raw.quantity) : '',
    line_net_cost: raw.net_cost != null ? String(raw.net_cost) : '',
  };
}

export default function StockPurchaseModal({ open, onOpenChange, inventoryItems, onSaved }) {
  const { formatCurrency } = useLocale();
  const [header, setHeader] = useState({ purchase_date: '', supplier_name: '', order_ref: '', total_amount: '', notes: '' });
  const [billFile, setBillFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [lines, setLines] = useState([newLine()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setHeader({ purchase_date: new Date().toISOString().slice(0, 10), supplier_name: '', order_ref: '', total_amount: '', notes: '' });
      setBillFile(null);
      setLines([newLine()]);
    }
  }, [open]);

  const linesTotal = useMemo(() => lines.reduce((sum, l) => sum + num(l.line_net_cost), 0), [lines]);

  const updateHeader = (field, value) => setHeader(prev => ({ ...prev, [field]: value }));
  const updateLine = (key, changes) => setLines(prev => prev.map(l => l.key === key ? { ...l, ...changes } : l));
  const updateNewItemField = (key, field, value) => setLines(prev => prev.map(l => l.key === key ? { ...l, newItem: { ...l.newItem, [field]: value } } : l));
  const addLine = () => setLines(prev => [...prev, newLine()]);
  const removeLine = (key) => setLines(prev => prev.filter(l => l.key !== key));

  const handleScanBill = async () => {
    if (!billFile) return;
    setScanning(true);
    try {
      const formData = new FormData();
      formData.append('file', billFile);
      const res = await client.post('/api/stock-purchases/scan-bill', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { purchase, lines: scannedLines, warnings } = res.data;

      setHeader(prev => ({
        purchase_date: purchase.purchase_date || prev.purchase_date,
        supplier_name: purchase.supplier_name || prev.supplier_name,
        order_ref: purchase.order_ref || prev.order_ref,
        total_amount: purchase.total_amount != null ? String(purchase.total_amount) : prev.total_amount,
        notes: prev.notes,
      }));

      if (scannedLines.length > 0) {
        setLines(scannedLines.map(l => lineFromScan(l, inventoryItems)));
        toast.success(`Read ${scannedLines.length} line item${scannedLines.length === 1 ? '' : 's'} from the bill — review before saving`);
      } else {
        toast.warning('Could not find any line items on this bill — you can still add them manually below');
      }
      if (warnings?.length) {
        warnings.forEach(w => toast.warning(w));
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not read this bill — try a clearer photo, or fill in the lines manually');
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validLines = lines.filter(l => num(l.quantity) > 0 && ((l.itemId && l.itemId !== NEW_ITEM) || l.isNew));
    if (validLines.length === 0) {
      toast.error('Add at least one line item with a quantity');
      return;
    }
    setSaving(true);
    try {
      const purchaseRes = await client.post('/api/stock-purchases', {
        purchase_date: header.purchase_date,
        supplier_name: header.supplier_name || null,
        order_ref: header.order_ref || null,
        total_amount: header.total_amount ? parseFloat(header.total_amount) : linesTotal,
        notes: header.notes || null,
      });
      const purchase = purchaseRes.data;

      for (const line of lines) {
        if (!line.itemId && !line.isNew) continue;
        if (num(line.quantity) <= 0) continue;

        let itemId = line.itemId;
        if (line.isNew) {
          const ni = line.newItem;
          const itemRes = await client.post('/api/inventory-items', {
            category: ni.category,
            brand: ni.brand || null,
            implant_system: ni.category === 'implant' ? (ni.implant_system || null) : null,
            diameter_mm: ni.category === 'implant' && ni.diameter_mm ? parseFloat(ni.diameter_mm) : null,
            length_mm: ni.category === 'implant' && ni.length_mm ? parseFloat(ni.length_mm) : null,
            abutment_type: ni.category === 'abutment' ? ni.abutment_type : null,
            size_label: ni.size_label || null,
            article_no: ni.article_no || null,
          });
          itemId = itemRes.data.id;
        }

        await client.post(`/api/inventory-items/${itemId}/transactions`, {
          transaction_type: 'in',
          quantity: parseInt(line.quantity, 10),
          purchase_id: purchase.id,
          line_net_cost: line.line_net_cost ? parseFloat(line.line_net_cost) : null,
          transaction_date: header.purchase_date,
        });
      }

      if (billFile) {
        const formData = new FormData();
        formData.append('file', billFile);
        await client.post(`/api/stock-purchases/${purchase.id}/bill-image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      toast.success('Purchase logged');
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not save this purchase — please check the entries and try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Log a Purchase</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-[#5C6773] -mt-2 mb-3">
          Upload the bill to auto-fill the table below, or fill it in yourself.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-end gap-2 bg-[#F9F9F8] border border-[#E5E5E2] rounded-lg p-3">
            <div className="flex-1">
              <Label className="text-xs flex items-center gap-1.5"><Paperclip size={13} /> Bill Photo / PDF</Label>
              <Input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => setBillFile(e.target.files?.[0] || null)} data-testid="purchase-bill-file-input" className="mt-1 bg-white" />
            </div>
            <Button type="button" onClick={handleScanBill} disabled={!billFile || scanning} data-testid="scan-bill-button" className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white shrink-0">
              <MagicWand size={16} weight="bold" className="mr-1.5" /> {scanning ? 'Reading bill...' : 'Scan Bill'}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Purchase Date *</Label>
              <Input type="date" required value={header.purchase_date} onChange={e => updateHeader('purchase_date', e.target.value)} data-testid="purchase-date-input" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Supplier</Label>
              <Input value={header.supplier_name} onChange={e => updateHeader('supplier_name', e.target.value)} placeholder="e.g. Nobel Biocare" data-testid="purchase-supplier-input" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Order / Invoice No.</Label>
              <Input value={header.order_ref} onChange={e => updateHeader('order_ref', e.target.value)} data-testid="purchase-order-ref-input" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Total Amount Paid</Label>
              <Input type="number" step="0.01" min="0" value={header.total_amount} onChange={e => updateHeader('total_amount', e.target.value)} placeholder={linesTotal ? linesTotal.toFixed(2) : '0'} data-testid="purchase-total-input" className="mt-1" />
              <p className="text-[10px] text-[#9CA3AF] mt-1">Leave blank to use the sum of line costs below ({formatCurrency(linesTotal)}).</p>
            </div>
          </div>

          <div>
            <Label className="text-xs">Line Items *</Label>
            <div className="mt-1.5 overflow-x-auto border border-[#E5E5E2] rounded-lg">
              <table className="w-full text-xs min-w-[720px]">
                <thead>
                  <tr className="bg-[#F0F0EE] text-[#5C6773] text-left">
                    <th className="px-2 py-2 font-medium w-16">Category</th>
                    <th className="px-2 py-2 font-medium">Item</th>
                    <th className="px-2 py-2 font-medium w-24">Article No.</th>
                    <th className="px-2 py-2 font-medium w-20">Qty</th>
                    <th className="px-2 py-2 font-medium w-28">Net Cost</th>
                    <th className="px-2 py-2 font-medium w-24">₹/Unit</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map(line => {
                    const perUnit = num(line.quantity) > 0 && num(line.line_net_cost) > 0 ? num(line.line_net_cost) / num(line.quantity) : null;
                    return (
                      <tr key={line.key} className="border-t border-[#E5E5E2] align-top" data-testid={`purchase-line-${line.key}`}>
                        <td className="px-2 py-2">
                          {line.isNew ? (
                            <select value={line.newItem.category} onChange={e => updateNewItemField(line.key, 'category', e.target.value)} className={selectClass}>
                              {CATEGORIES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                            </select>
                          ) : (
                            <span className="text-[#9CA3AF]">—</span>
                          )}
                        </td>
                        <td className="px-2 py-2 min-w-[220px]">
                          <select
                            value={line.isNew ? NEW_ITEM : line.itemId}
                            onChange={e => {
                              const v = e.target.value;
                              if (v === NEW_ITEM) updateLine(line.key, { isNew: true, itemId: '', newItem: line.newItem.brand ? line.newItem : blankNewItem() });
                              else updateLine(line.key, { isNew: false, itemId: v });
                            }}
                            className={`${selectClass} mb-1`}
                          >
                            <option value="">Select existing item...</option>
                            {inventoryItems.map(it => (
                              <option key={it.id} value={it.id}>{itemLabel(it)}{it.article_no ? ` (${it.article_no})` : ''}</option>
                            ))}
                            <option value={NEW_ITEM}>+ New item</option>
                          </select>
                          {line.isNew && (
                            <div className="flex flex-wrap gap-1">
                              <Input placeholder="Brand" value={line.newItem.brand} onChange={e => updateNewItemField(line.key, 'brand', e.target.value)} className={`${cellInputClass} w-24`} />
                              {line.newItem.category === 'implant' && (
                                <>
                                  <Input placeholder="System" value={line.newItem.implant_system} onChange={e => updateNewItemField(line.key, 'implant_system', e.target.value)} className={`${cellInputClass} w-20`} />
                                  <Input type="number" step="0.01" placeholder="⌀mm" value={line.newItem.diameter_mm} onChange={e => updateNewItemField(line.key, 'diameter_mm', e.target.value)} className={`${cellInputClass} w-16`} />
                                  <Input type="number" step="0.01" placeholder="Lmm" value={line.newItem.length_mm} onChange={e => updateNewItemField(line.key, 'length_mm', e.target.value)} className={`${cellInputClass} w-16`} />
                                </>
                              )}
                              {line.newItem.category === 'abutment' && (
                                <>
                                  <select value={line.newItem.abutment_type} onChange={e => updateNewItemField(line.key, 'abutment_type', e.target.value)} className={`${selectClass} w-40`}>
                                    {ABUTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                  <Input placeholder="Size/Height" value={line.newItem.size_label} onChange={e => updateNewItemField(line.key, 'size_label', e.target.value)} className={`${cellInputClass} w-24`} />
                                </>
                              )}
                              {(line.newItem.category === 'kit' || line.newItem.category === 'other') && (
                                <Input placeholder="Description" value={line.newItem.size_label} onChange={e => updateNewItemField(line.key, 'size_label', e.target.value)} className={`${cellInputClass} w-40`} />
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {line.isNew ? (
                            <Input value={line.newItem.article_no} onChange={e => updateNewItemField(line.key, 'article_no', e.target.value)} className={cellInputClass} />
                          ) : (
                            <span className="text-[#9CA3AF]">{inventoryItems.find(it => it.id === line.itemId)?.article_no || '—'}</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <Input type="number" min="1" value={line.quantity} onChange={e => updateLine(line.key, { quantity: e.target.value })} className={cellInputClass} data-testid={`line-qty-${line.key}`} />
                        </td>
                        <td className="px-2 py-2">
                          <Input type="number" step="0.01" min="0" value={line.line_net_cost} onChange={e => updateLine(line.key, { line_net_cost: e.target.value })} className={cellInputClass} data-testid={`line-cost-${line.key}`} />
                        </td>
                        <td className="px-2 py-2 text-[#5C6773] whitespace-nowrap">{perUnit != null ? formatCurrency(perUnit) : '—'}</td>
                        <td className="px-2 py-2">
                          {lines.length > 1 && (
                            <button type="button" onClick={() => removeLine(line.key)} className="p-1 rounded-md hover:bg-red-50 text-[#9CA3AF] hover:text-red-500 transition-colors">
                              <Trash size={13} weight="bold" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={addLine} data-testid="purchase-add-line-button" className="mt-2 flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 border border-dashed border-emerald-300 hover:bg-emerald-50 rounded-lg transition-colors w-full justify-center">
              <Plus size={13} weight="bold" /> Add Another Line
            </button>
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <textarea value={header.notes} onChange={e => updateHeader('notes', e.target.value)} rows={2} className={`mt-1 ${selectClass} text-sm py-2`} />
          </div>

          <Button type="submit" disabled={saving} data-testid="submit-purchase-button" className="w-full bg-[#059669] hover:bg-[#047857] text-white">
            {saving ? 'Saving...' : 'Save Purchase'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
