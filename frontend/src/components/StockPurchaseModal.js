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
import { ABUTMENT_TYPES } from './InventoryItemModal';

const selectClass = "w-full px-2 py-1.5 bg-white border border-[#E5E5E2] rounded-md text-xs focus:ring-2 focus:ring-[#059669] focus:outline-none";
const cellInputClass = "w-full px-2 py-1.5 bg-white border border-[#E5E5E2] rounded-md text-xs focus:ring-2 focus:ring-[#059669] focus:outline-none";
const num = (v) => (v === '' || v == null ? 0 : parseFloat(v) || 0);
const ROWS_TO_START = 20;

function blankRow(category) {
  return {
    key: `row_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    category,
    brand: '',
    implant_system: '',
    diameter_mm: '',
    length_mm: '',
    abutment_type: '',
    size_label: '',
    article_no: '',
    quantity: '',
    line_net_cost: '',
  };
}

function startingRows(category) {
  return Array.from({ length: ROWS_TO_START }, () => blankRow(category));
}

const norm = (v) => (v || '').trim().toLowerCase();

// Finds the stock item this row refers to, so quantity gets added onto it
// rather than creating a duplicate. Article number is the most reliable
// match (same SKU, whatever the brand text says); otherwise match on the
// same fields that make a size distinct for that category.
function findMatchingItem(row, inventoryItems) {
  const articleNo = norm(row.article_no);
  if (articleNo) {
    const byArticle = inventoryItems.find(it => norm(it.article_no) === articleNo);
    if (byArticle) return byArticle;
  }
  if (row.category === 'implant') {
    return inventoryItems.find(it =>
      it.category === 'implant' &&
      norm(it.brand) === norm(row.brand) &&
      norm(it.implant_system) === norm(row.implant_system) &&
      num(it.diameter_mm) === num(row.diameter_mm) &&
      num(it.length_mm) === num(row.length_mm)
    );
  }
  if (row.category === 'abutment') {
    return inventoryItems.find(it =>
      it.category === 'abutment' &&
      norm(it.brand) === norm(row.brand) &&
      it.abutment_type === row.abutment_type &&
      norm(it.size_label) === norm(row.size_label)
    );
  }
  return inventoryItems.find(it =>
    it.category === row.category &&
    norm(it.brand) === norm(row.brand) &&
    norm(it.size_label) === norm(row.size_label)
  );
}

// Looks up a permanently-saved catalogue reference by article number — used
// to fill in brand/system/dimension fields for a size never stocked before.
function findCatalogueMatch(articleNo, catalogueRefs) {
  const a = norm(articleNo);
  if (!a) return null;
  return catalogueRefs.find(r => norm(r.article_no) === a) || null;
}

function fieldsFromCatalogueRef(ref) {
  return {
    brand: ref.brand || '',
    implant_system: ref.implant_system || '',
    diameter_mm: ref.diameter_mm != null ? String(ref.diameter_mm) : '',
    length_mm: ref.length_mm != null ? String(ref.length_mm) : '',
    abutment_type: ABUTMENT_TYPES.includes(ref.abutment_type) ? ref.abutment_type : '',
    size_label: ref.size_label || '',
  };
}

function rowHasData(row) {
  if (row.category === 'implant') return !!(row.brand || row.implant_system || row.diameter_mm || row.length_mm);
  if (row.category === 'abutment') return !!(row.brand || row.abutment_type || row.size_label);
  return !!(row.brand || row.size_label);
}

// Turns one AI-extracted line into a table row.
function rowFromScan(raw) {
  return {
    ...blankRow(raw.category || 'implant'),
    brand: raw.brand || '',
    implant_system: raw.implant_system || '',
    diameter_mm: raw.diameter_mm != null ? String(raw.diameter_mm) : '',
    length_mm: raw.length_mm != null ? String(raw.length_mm) : '',
    abutment_type: ABUTMENT_TYPES.includes(raw.abutment_type) ? raw.abutment_type : '',
    size_label: raw.size_label || raw.raw_description || '',
    article_no: (raw.article_no || '').trim(),
    quantity: raw.quantity != null ? String(raw.quantity) : '',
    line_net_cost: raw.net_cost != null ? String(raw.net_cost) : '',
  };
}

function RowsTable({ category, title, rows, setRows, inventoryItems, catalogueRefs = [], formatCurrency }) {
  const updateRow = (key, changes) => setRows(prev => prev.map(r => r.key === key ? { ...r, ...changes } : r));
  const removeRow = (key) => setRows(prev => prev.filter(r => r.key !== key));
  const addRows = (n) => setRows(prev => [...prev, ...Array.from({ length: n }, () => blankRow(category))]);

  // Typing an article/catalogue number fills in the rest of the row
  // automatically — first checked against stock you've already registered
  // (so quantity adds onto the right item), then against the saved
  // catalogue library for a size never stocked before.
  const handleArticleNoChange = (row, value) => {
    const stockMatch = value.trim() ? inventoryItems.find(it => norm(it.article_no) === norm(value)) : null;
    if (stockMatch) {
      updateRow(row.key, {
        article_no: value,
        brand: stockMatch.brand || row.brand,
        implant_system: stockMatch.implant_system || row.implant_system,
        diameter_mm: stockMatch.diameter_mm != null ? String(stockMatch.diameter_mm) : row.diameter_mm,
        length_mm: stockMatch.length_mm != null ? String(stockMatch.length_mm) : row.length_mm,
        abutment_type: stockMatch.abutment_type || row.abutment_type,
        size_label: stockMatch.size_label || row.size_label,
      });
      return;
    }
    const catalogueMatch = findCatalogueMatch(value, catalogueRefs);
    if (catalogueMatch) {
      updateRow(row.key, { article_no: value, ...fieldsFromCatalogueRef(catalogueMatch) });
      return;
    }
    updateRow(row.key, { article_no: value });
  };

  return (
    <div>
      <Label className="text-xs">{title}</Label>
      <div className="mt-1.5 overflow-x-auto border border-[#E5E5E2] rounded-lg max-h-80 overflow-y-auto">
        <table className="w-full text-xs min-w-[820px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#F0F0EE] text-[#5C6773] text-left">
              <th className="px-2 py-2 font-medium w-10">S.No.</th>
              <th className="px-2 py-2 font-medium w-44">Brand</th>
              <th className={`px-2 py-2 font-medium ${category === 'implant' ? 'w-24' : 'w-44'}`}>{category === 'implant' ? 'Product Line' : category === 'abutment' ? 'Type of Abutment' : 'Description'}</th>
              <th className="px-2 py-2 font-medium w-44">Dimension{category === 'abutment' ? ' (GH)' : ''}</th>
              <th className="px-2 py-2 font-medium w-16">Qty</th>
              <th className="px-2 py-2 font-medium w-20">Total Available</th>
              <th className="px-2 py-2 font-medium w-24">Net Cost</th>
              <th className="px-2 py-2 font-medium w-20">Cost/Unit</th>
              <th className="px-2 py-2 font-medium w-24">Article No.</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const match = rowHasData(row) ? findMatchingItem(row, inventoryItems) : null;
              const totalAfter = (match ? match.available_quantity : 0) + num(row.quantity);
              return (
                <tr key={row.key} className="border-t border-[#F0F0EE] align-top" data-testid={`purchase-row-${row.key}`}>
                  <td className="px-2 py-2 text-[#9CA3AF]">{idx + 1}</td>
                  <td className="px-2 py-2">
                    <Input value={row.brand} onChange={e => updateRow(row.key, { brand: e.target.value })} className={cellInputClass} />
                  </td>
                  <td className="px-2 py-2">
                    {category === 'abutment' ? (
                      <select value={row.abutment_type} onChange={e => updateRow(row.key, { abutment_type: e.target.value })} className={selectClass}>
                        <option value="">—</option>
                        {ABUTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    ) : category === 'implant' ? (
                      <Input value={row.implant_system} onChange={e => updateRow(row.key, { implant_system: e.target.value })} className={cellInputClass} />
                    ) : (
                      <Input value={row.size_label} onChange={e => updateRow(row.key, { size_label: e.target.value })} className={cellInputClass} />
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {category === 'implant' ? (
                      <div className="flex items-center gap-1">
                        <Input type="number" step="0.01" placeholder="⌀mm" value={row.diameter_mm} onChange={e => updateRow(row.key, { diameter_mm: e.target.value })} className={`${cellInputClass} w-20`} />
                        <span className="text-[#9CA3AF]">×</span>
                        <Input type="number" step="0.01" placeholder="Lmm" value={row.length_mm} onChange={e => updateRow(row.key, { length_mm: e.target.value })} className={`${cellInputClass} w-20`} />
                      </div>
                    ) : (
                      <Input placeholder={category === 'abutment' ? 'e.g. 2.5mm' : ''} value={row.size_label} onChange={e => updateRow(row.key, { size_label: e.target.value })} className={cellInputClass} />
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <Input type="number" min="0" value={row.quantity} onChange={e => updateRow(row.key, { quantity: e.target.value })} className={cellInputClass} data-testid={`row-qty-${row.key}`} />
                  </td>
                  <td className={`px-2 py-2 text-base font-bold ${rowHasData(row) && num(row.quantity) > 0 ? 'text-emerald-700' : 'text-[#D1D5DB]'}`}>
                    {rowHasData(row) && num(row.quantity) > 0 ? totalAfter : '—'}
                  </td>
                  <td className="px-2 py-2">
                    <Input type="number" step="0.01" min="0" value={row.line_net_cost} onChange={e => updateRow(row.key, { line_net_cost: e.target.value })} className={cellInputClass} />
                  </td>
                  <td className="px-2 py-2 text-[#5C6773] whitespace-nowrap">
                    {num(row.quantity) > 0 && num(row.line_net_cost) > 0 ? formatCurrency(num(row.line_net_cost) / num(row.quantity)) : '—'}
                  </td>
                  <td className="px-2 py-2">
                    <Input value={row.article_no} onChange={e => handleArticleNoChange(row, e.target.value)} className={cellInputClass} />
                  </td>
                  <td className="px-2 py-2">
                    <button type="button" onClick={() => removeRow(row.key)} className="p-1 rounded-md hover:bg-red-50 text-[#9CA3AF] hover:text-red-500 transition-colors">
                      <Trash size={13} weight="bold" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={() => addRows(10)} className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 border border-dashed border-emerald-300 hover:bg-emerald-50 rounded-lg transition-colors w-full justify-center">
        <Plus size={13} weight="bold" /> Add 10 More Rows
      </button>
    </div>
  );
}

export default function StockPurchaseModal({ open, onOpenChange, inventoryItems, catalogueRefs = [], onCatalogueUpdated, onSaved }) {
  const { formatCurrency } = useLocale();
  const [header, setHeader] = useState({ purchase_date: '', supplier_name: '', order_ref: '', total_amount: '', notes: '' });
  const [billFile, setBillFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [implantRows, setImplantRows] = useState([]);
  const [abutmentRows, setAbutmentRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [catalogueFile, setCatalogueFile] = useState(null);
  const [scanningCatalogue, setScanningCatalogue] = useState(false);

  useEffect(() => {
    if (open) {
      setHeader({ purchase_date: new Date().toISOString().slice(0, 10), supplier_name: '', order_ref: '', total_amount: '', notes: '' });
      setBillFile(null);
      setImplantRows(startingRows('implant'));
      setAbutmentRows(startingRows('abutment'));
    }
  }, [open]);

  const updateHeader = (field, value) => setHeader(prev => ({ ...prev, [field]: value }));

  const allRows = useMemo(() => [...implantRows, ...abutmentRows], [implantRows, abutmentRows]);
  const linesTotal = useMemo(() => allRows.reduce((sum, r) => sum + num(r.line_net_cost), 0), [allRows]);

  // A reference number typed in that doesn't match anything already stocked
  // OR anything in the saved catalogue library — the scan box appears so it
  // can be identified instead of typed in by hand.
  const unknownArticleNos = useMemo(() => {
    const seen = new Set();
    return allRows
      .filter(r => r.article_no.trim() && !findMatchingItem(r, inventoryItems) && !findCatalogueMatch(r.article_no, catalogueRefs))
      .map(r => r.article_no.trim())
      .filter(a => (seen.has(a.toLowerCase()) ? false : (seen.add(a.toLowerCase()), true)));
  }, [allRows, inventoryItems, catalogueRefs]);

  const handleScanCatalogue = async () => {
    if (!catalogueFile) return;
    setScanningCatalogue(true);
    try {
      const formData = new FormData();
      formData.append('file', catalogueFile);
      const res = await client.post('/api/catalogue-references/scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { entries, warnings } = res.data;
      if (entries.length > 0) onCatalogueUpdated?.(entries);

      const applyMatches = (rows) => rows.map(row => {
        if (!row.article_no.trim()) return row;
        const found = entries.find(e => norm(e.article_no) === norm(row.article_no));
        if (!found) return row;
        return {
          ...row,
          brand: found.brand || row.brand,
          implant_system: found.implant_system || row.implant_system,
          diameter_mm: found.diameter_mm != null ? String(found.diameter_mm) : row.diameter_mm,
          length_mm: found.length_mm != null ? String(found.length_mm) : row.length_mm,
          abutment_type: ABUTMENT_TYPES.includes(found.abutment_type) ? found.abutment_type : row.abutment_type,
          size_label: found.size_label || row.size_label,
        };
      });

      const matchedCount = allRows.filter(r => r.article_no.trim() && entries.some(e => norm(e.article_no) === norm(r.article_no))).length;
      setImplantRows(prev => applyMatches(prev));
      setAbutmentRows(prev => applyMatches(prev));

      if (matchedCount > 0) {
        toast.success(`Matched ${matchedCount} reference number${matchedCount === 1 ? '' : 's'} from the catalogue`);
      } else {
        toast.warning("Couldn't find those reference numbers in this catalogue — try a different page or brand");
      }
      if (warnings?.length) warnings.forEach(w => toast.warning(w));
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not read this catalogue');
    } finally {
      setScanningCatalogue(false);
    }
  };

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
        const scannedImplants = scannedLines.filter(l => (l.category || 'implant') === 'implant').map(rowFromScan);
        const scannedAbutments = scannedLines.filter(l => l.category === 'abutment').map(rowFromScan);
        const scannedOther = scannedLines.filter(l => l.category && !['implant', 'abutment'].includes(l.category)).map(rowFromScan);
        setImplantRows([...scannedImplants, ...scannedOther, ...startingRows('implant').slice(0, 5)]);
        setAbutmentRows([...scannedAbutments, ...startingRows('abutment').slice(0, 5)]);
        toast.success(`Read ${scannedLines.length} line item${scannedLines.length === 1 ? '' : 's'} from the bill — review before saving`);
      } else {
        toast.warning('Could not find any line items on this bill — you can still add them manually below');
      }
      if (warnings?.length) {
        warnings.forEach(w => toast.warning(w));
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not read this bill — try a clearer photo, or fill in the rows manually');
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validRows = allRows.filter(r => rowHasData(r) && num(r.quantity) > 0);
    if (validRows.length === 0) {
      toast.error('Fill in at least one row with a quantity');
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
      let knownItems = inventoryItems;

      for (const row of validRows) {
        let item = findMatchingItem(row, knownItems);
        if (!item) {
          const itemRes = await client.post('/api/inventory-items', {
            category: row.category,
            brand: row.brand || null,
            implant_system: row.category === 'implant' ? (row.implant_system || null) : null,
            diameter_mm: row.category === 'implant' && row.diameter_mm ? parseFloat(row.diameter_mm) : null,
            length_mm: row.category === 'implant' && row.length_mm ? parseFloat(row.length_mm) : null,
            abutment_type: row.category === 'abutment' ? (row.abutment_type || null) : null,
            size_label: row.size_label || null,
            article_no: row.article_no || null,
          });
          item = { ...itemRes.data, available_quantity: 0 };
          knownItems = [...knownItems, item];
        }

        await client.post(`/api/inventory-items/${item.id}/transactions`, {
          transaction_type: 'in',
          quantity: parseInt(row.quantity, 10),
          purchase_id: purchase.id,
          line_net_cost: row.line_net_cost ? parseFloat(row.line_net_cost) : null,
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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Log a Purchase</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-[#5C6773] -mt-2 mb-3">
          Upload the bill to auto-fill the tables below, or fill them in yourself. "Total Available" previews what stock will be after saving.
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

          <RowsTable category="implant" title="Implants" rows={implantRows} setRows={setImplantRows} inventoryItems={inventoryItems} catalogueRefs={catalogueRefs} formatCurrency={formatCurrency} />
          <RowsTable category="abutment" title="Abutments" rows={abutmentRows} setRows={setAbutmentRows} inventoryItems={inventoryItems} catalogueRefs={catalogueRefs} formatCurrency={formatCurrency} />

          {unknownArticleNos.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-medium text-amber-800 mb-2">
                Couldn't recognize reference number{unknownArticleNos.length === 1 ? '' : 's'}: {unknownArticleNos.join(', ')} — upload your catalogue to look {unknownArticleNos.length === 1 ? 'it' : 'them'} up.
              </p>
              <div className="flex items-end gap-2">
                <Input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => setCatalogueFile(e.target.files?.[0] || null)} data-testid="catalogue-file-input" className="mt-1 bg-white flex-1" />
                <Button type="button" onClick={handleScanCatalogue} disabled={!catalogueFile || scanningCatalogue} data-testid="scan-catalogue-button" className="bg-amber-600 hover:bg-amber-700 text-white shrink-0">
                  <MagicWand size={16} weight="bold" className="mr-1.5" /> {scanningCatalogue ? 'Reading catalogue...' : 'Scan Catalogue'}
                </Button>
              </div>
            </div>
          )}

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
