import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import client from '../api/client';

const selectClass = "w-full px-3 py-2 bg-white border border-[#E5E5E2] rounded-md text-sm focus:ring-2 focus:ring-[#82A098] focus:outline-none";

/*
 * Shown right after a scan-based or bulk save creates several implants at
 * once, so stock can be linked for the whole batch in one sitting instead
 * of reopening each implant individually from the single-implant form.
 *
 * The implants are already saved by the time this opens — closing without
 * linking anything is always safe, matching the single-implant form's own
 * "never blocks the record" rule (see ImplantFormModal.js / D-015). Every
 * row starts unlinked; nothing is pre-matched from typed brand/size text,
 * for the same reason ImplantFormModal.js's picker isn't either — a doctor
 * explicitly confirms every deduction.
 *
 * Fetches its own stock list rather than taking one as a prop, since the
 * two callers (BulkImplantModal.js inside a patient page, PatientImplantLogForm.js
 * on the Account page across many new patients) don't share a common parent
 * that already has it loaded.
 */
export default function LinkImplantStockModal({ open, onOpenChange, implants = [], onLinked }) {
  const [stockItems, setStockItems] = useState([]);
  const [picks, setPicks] = useState({}); // { [implantId]: inventoryItemId }
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPicks({});
    client.get('/api/inventory-items')
      .then(res => setStockItems((res.data || []).filter(i => i.category === 'implant')))
      .catch(() => setStockItems([]));
  }, [open]);

  if (!open || implants.length === 0) return null;

  const handleSave = async () => {
    const entries = Object.entries(picks).filter(([, itemId]) => itemId);
    if (entries.length === 0) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    try {
      const results = await Promise.allSettled(
        entries.map(([implantId, itemId]) =>
          client.patch(`/api/implants/${implantId}`, { inventory_item_id: itemId })
        )
      );
      const linked = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.length - linked;
      const warnings = results
        .filter(r => r.status === 'fulfilled' && r.value.data?.stock_warning)
        .map(r => r.value.data.stock_warning);

      if (linked > 0) toast.success(`Linked stock for ${linked} implant${linked > 1 ? 's' : ''}`);
      if (failed > 0) toast.error(`Couldn't link ${failed} implant${failed > 1 ? 's' : ''} — try again from the implant's own edit form`);
      warnings.forEach(w => toast.warning(w));

      onOpenChange(false);
      if (linked > 0) onLinked?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Link Stock for These Implants</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-[#5C6773] -mt-2">
          {implants.length} implant{implants.length > 1 ? 's were' : ' was'} just saved. Pick a stock item for
          any of them to deduct it automatically — leave the rest as "Not linked" and skip them for now.
        </p>

        <div className="space-y-3 mt-1">
          {implants.map(imp => (
            <div key={imp.id} className="flex items-start gap-3 border border-[#E5E5E2] rounded-lg p-3">
              <div className="w-16 shrink-0 text-sm font-medium text-[#2A2F35] pt-2">
                Tooth {imp.tooth_number ?? '—'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#5C6773] truncate mb-1">
                  {[imp.brand, imp.implant_system].filter(Boolean).join(' ') || 'No brand recorded'}
                  {imp.diameter_mm && imp.length_mm ? ` · ${imp.diameter_mm}×${imp.length_mm}mm` : ''}
                </p>
                <select
                  value={picks[imp.id] || ''}
                  onChange={(e) => setPicks(p => ({ ...p, [imp.id]: e.target.value }))}
                  data-testid={`link-stock-select-${imp.id}`}
                  className={selectClass}
                >
                  <option value="">Not linked to stock</option>
                  {stockItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {[item.brand, item.implant_system].filter(Boolean).join(' ')}
                      {item.diameter_mm && item.length_mm ? ` ${item.diameter_mm}×${item.length_mm}mm` : ''}
                      {' — '}{item.available_quantity} in stock
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            data-testid="skip-link-stock-button"
          >
            Skip for now
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            data-testid="save-link-stock-button"
            className="bg-[#82A098] hover:bg-[#6B8A82] text-white"
          >
            {saving ? 'Linking…' : 'Link Stock'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
