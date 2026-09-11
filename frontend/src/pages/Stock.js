import { useState, useEffect, useMemo } from 'react';
import { Plus, Package, PencilSimple, Trash, Warning, ClockCounterClockwise, Receipt } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import client from '../api/client';
import { useLocale } from '../contexts/LocaleContext';
import InventoryItemModal, { CATEGORIES } from '../components/InventoryItemModal';
import StockPurchaseModal from '../components/StockPurchaseModal';
import StockUsageModal from '../components/StockUsageModal';

function itemTitle(item) {
  if (item.category === 'implant') {
    const dims = item.diameter_mm && item.length_mm ? `${item.diameter_mm}×${item.length_mm}mm` : '';
    return [item.brand, item.implant_system, dims].filter(Boolean).join(' ');
  }
  if (item.category === 'abutment') {
    return [item.brand, item.abutment_type, item.size_label].filter(Boolean).join(' — ');
  }
  return [item.brand, item.size_label].filter(Boolean).join(' — ') || 'Item';
}

export default function Stock() {
  const { formatCurrency } = useLocale();
  const [items, setItems] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('items'); // 'items' | 'purchases'

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [usageItem, setUsageItem] = useState(null);
  const [historyItem, setHistoryItem] = useState(null);
  const [historyTxns, setHistoryTxns] = useState([]);

  const fetchAll = async () => {
    try {
      const [itemsRes, purchasesRes, patientsRes] = await Promise.all([
        client.get('/api/inventory-items'),
        client.get('/api/stock-purchases'),
        client.get('/api/patients'),
      ]);
      setItems(itemsRes.data);
      setPurchases(purchasesRes.data);
      setPatients(patientsRes.data.items ?? patientsRes.data);
    } catch {
      toast.error('Failed to load stock data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const grouped = useMemo(() => {
    const byCategory = {};
    for (const item of items) {
      (byCategory[item.category] = byCategory[item.category] || []).push(item);
    }
    return byCategory;
  }, [items]);

  // Implants are tracked primarily by size — the same 4.2×10mm slot often
  // gets restocked with whichever brand was available at the time — so
  // group by implant system, then by exact size, merging brands that share
  // a size into one row-group rather than scattering them as separate cards.
  const implantSystems = useMemo(() => {
    const implants = grouped.implant || [];
    const bySystem = new Map();
    for (const item of implants) {
      const systemKey = item.implant_system || item.brand || 'Other';
      if (!bySystem.has(systemKey)) bySystem.set(systemKey, new Map());
      const sizeKey = `${item.diameter_mm ?? '?'}x${item.length_mm ?? '?'}`;
      const sizes = bySystem.get(systemKey);
      if (!sizes.has(sizeKey)) sizes.set(sizeKey, { diameter_mm: item.diameter_mm, length_mm: item.length_mm, items: [] });
      sizes.get(sizeKey).items.push(item);
    }
    return Array.from(bySystem.entries()).map(([system, sizesMap]) => {
      const sizes = Array.from(sizesMap.values()).sort((a, b) => (a.diameter_mm - b.diameter_mm) || (a.length_mm - b.length_mm));
      const total = sizes.reduce((sum, s) => sum + s.items.reduce((s2, it) => s2 + it.available_quantity, 0), 0);
      return { system, sizes, total };
    }).sort((a, b) => a.system.localeCompare(b.system));
  }, [grouped]);

  const lowStockCount = items.filter(i => i.available_quantity <= i.low_stock_threshold).length;
  const totalUnits = items.reduce((sum, i) => sum + i.available_quantity, 0);
  const totalImplants = (grouped.implant || []).reduce((sum, i) => sum + i.available_quantity, 0);
  const totalAbutments = (grouped.abutment || []).reduce((sum, i) => sum + i.available_quantity, 0);

  const openHistory = async (item) => {
    setHistoryItem(item);
    try {
      const res = await client.get(`/api/inventory-items/${item.id}/transactions`);
      setHistoryTxns(res.data);
    } catch {
      toast.error('Could not load history for this item');
    }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Delete "${itemTitle(item)}" and its full stock history? This can't be undone.`)) return;
    try {
      await client.delete(`/api/inventory-items/${item.id}`);
      toast.success('Item deleted');
      fetchAll();
    } catch {
      toast.error('Could not delete this item');
    }
  };

  const handleDeletePurchase = async (purchase) => {
    if (!window.confirm('Delete this purchase and everything it added to stock? This can\'t be undone.')) return;
    try {
      await client.delete(`/api/stock-purchases/${purchase.id}`);
      toast.success('Purchase deleted');
      fetchAll();
    } catch {
      toast.error('Could not delete this purchase');
    }
  };

  return (
    <div className="p-4 md:p-8" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
      {/* Headline totals — the numbers that matter most, right at the top */}
      <div className="grid grid-cols-2 gap-3 mb-5 max-w-md">
        <div className="bg-white border-2 border-emerald-200 rounded-xl p-4 text-center" data-testid="total-available-implants">
          <div className="text-3xl font-bold text-emerald-700">{totalImplants}</div>
          <div className="text-xs text-[#5C6773] mt-0.5">Total Available Implants</div>
        </div>
        <div className="bg-white border-2 border-emerald-200 rounded-xl p-4 text-center" data-testid="total-available-abutments">
          <div className="text-3xl font-bold text-emerald-700">{totalAbutments}</div>
          <div className="text-xs text-[#5C6773] mt-0.5">Total Available Abutments</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-4xl font-semibold text-[#2A2F35] tracking-tight" style={{ fontFamily: 'Work Sans, sans-serif' }}>
            Stock Availability
          </h1>
          <p className="text-[#5C6773] mt-2">Implants, abutments, and kits bought in bulk — what's on hand today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsItemModalOpen(true)} variant="outline" data-testid="add-item-button">
            <Plus size={18} weight="bold" className="mr-1.5" /> Add Item
          </Button>
          <Button onClick={() => setIsPurchaseModalOpen(true)} data-testid="add-purchase-button" className="bg-[#059669] hover:bg-[#047857] text-white">
            <Plus size={18} weight="bold" className="mr-1.5" /> Log Purchase
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6 max-w-lg">
        <div className="bg-white border border-[#E5E5E2] rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-[#2A2F35]">{items.length}</div>
          <div className="text-xs text-[#5C6773]">Stocked Sizes</div>
        </div>
        <div className="bg-white border border-[#E5E5E2] rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-[#2A2F35]">{totalUnits}</div>
          <div className="text-xs text-[#5C6773]">Units On Hand</div>
        </div>
        <div className={`rounded-xl p-4 text-center border ${lowStockCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-[#E5E5E2]'}`}>
          <div className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-amber-600' : 'text-[#2A2F35]'}`}>{lowStockCount}</div>
          <div className={`text-xs ${lowStockCount > 0 ? 'text-amber-600' : 'text-[#5C6773]'}`}>Running Low</div>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-5 border-b border-[#E5E5E2]">
        {[['items', 'Stock Items'], ['purchases', 'Purchase History']].map(([v, label]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            data-testid={`stock-view-${v}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              view === v ? 'border-[#059669] text-[#059669]' : 'border-transparent text-[#5C6773] hover:text-[#2A2F35]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#82A098] mx-auto"></div>
        </div>
      ) : view === 'items' ? (
        items.length === 0 ? (
          <div className="text-center py-12 bg-white border border-[#E5E5E2] rounded-xl">
            <Package size={64} className="mx-auto text-[#E5E5E2] mb-4" weight="duotone" />
            <p className="text-[#5C6773] mb-4">No stock items yet</p>
            <Button onClick={() => setIsPurchaseModalOpen(true)} className="bg-[#059669] hover:bg-[#047857] text-white">
              <Plus size={20} weight="bold" className="mr-2" /> Log Your First Purchase
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {implantSystems.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[#2A2F35] mb-3 uppercase tracking-wide">Implants</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {implantSystems.map(({ system, sizes, total }) => (
                    <div key={system} className="bg-white rounded-xl border border-[#E5E5E2] overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E2] bg-[#F9F9F8]">
                        <span className="text-sm font-medium text-[#2A2F35]">{system}</span>
                        <span className="text-xl font-bold text-[#2A2F35] border-2 border-emerald-300 rounded-md px-2.5 py-0.5" data-testid={`system-total-${system}`}>{total}</span>
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-[11px] text-[#9CA3AF] uppercase tracking-wide">
                            <th className="px-4 py-1.5 font-medium">Size</th>
                            <th className="px-2 py-1.5 font-medium">Brand</th>
                            <th className="px-2 py-1.5 font-medium text-right">Available</th>
                            <th className="w-20"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {sizes.map(sizeGroup => sizeGroup.items.map((item, idx) => {
                            const low = item.available_quantity <= item.low_stock_threshold;
                            return (
                              <tr key={item.id} data-testid={`stock-item-${item.id}`} className="border-t border-[#F0F0EE]">
                                {idx === 0 && (
                                  <td className="px-4 py-2 font-medium text-[#2A2F35] align-top" rowSpan={sizeGroup.items.length}>
                                    {sizeGroup.diameter_mm}×{sizeGroup.length_mm}mm
                                  </td>
                                )}
                                <td className="px-2 py-2 text-[#5C6773] truncate max-w-[110px]">{item.brand || '—'}</td>
                                <td className={`px-2 py-2 text-right font-semibold ${item.available_quantity === 0 ? 'text-[#9CA3AF]' : low ? 'text-amber-600' : 'text-emerald-700'}`}>
                                  {item.available_quantity}
                                  {low && item.available_quantity > 0 && <Warning size={11} weight="fill" className="inline ml-1 mb-0.5" />}
                                </td>
                                <td className="px-2 py-2">
                                  <div className="flex items-center justify-end gap-0.5">
                                    <button onClick={() => setUsageItem(item)} disabled={item.available_quantity <= 0} className="p-1.5 rounded-md hover:bg-[#F0F0EE] text-[#5C6773] hover:text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="Log usage" data-testid={`use-item-${item.id}`}>
                                      <Package size={14} weight="bold" />
                                    </button>
                                    <button onClick={() => openHistory(item)} className="p-1.5 rounded-md hover:bg-[#F0F0EE] text-[#5C6773] hover:text-emerald-600 transition-colors" title="History">
                                      <ClockCounterClockwise size={14} />
                                    </button>
                                    <button onClick={() => { setEditingItem(item); setIsItemModalOpen(true); }} className="p-1.5 rounded-md hover:bg-[#F0F0EE] text-[#5C6773] hover:text-emerald-600 transition-colors" title="Edit">
                                      <PencilSimple size={14} weight="bold" />
                                    </button>
                                    <button onClick={() => handleDeleteItem(item)} className="p-1.5 rounded-md hover:bg-red-50 text-[#5C6773] hover:text-red-500 transition-colors" title="Delete">
                                      <Trash size={14} weight="bold" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          }))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {CATEGORIES.filter(([cat]) => cat !== 'implant').map(([cat, label]) => {
              const catItems = grouped[cat];
              if (!catItems || catItems.length === 0) return null;
              return (
                <div key={cat}>
                  <h3 className="text-sm font-semibold text-[#2A2F35] mb-3 uppercase tracking-wide">{label}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {catItems.map(item => {
                      const low = item.available_quantity <= item.low_stock_threshold;
                      return (
                        <div key={item.id} data-testid={`stock-item-${item.id}`} className={`bg-white rounded-xl border p-4 ${low ? 'border-amber-300' : 'border-[#E5E5E2]'}`}>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[#2A2F35] truncate">{itemTitle(item)}</p>
                              {item.article_no && <p className="text-[11px] text-[#9CA3AF]">{item.article_no}</p>}
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button onClick={() => { setEditingItem(item); setIsItemModalOpen(true); }} className="p-1.5 rounded-md hover:bg-[#F0F0EE] text-[#5C6773] hover:text-emerald-600 transition-colors" title="Edit">
                                <PencilSimple size={14} weight="bold" />
                              </button>
                              <button onClick={() => handleDeleteItem(item)} className="p-1.5 rounded-md hover:bg-red-50 text-[#5C6773] hover:text-red-500 transition-colors" title="Delete">
                                <Trash size={14} weight="bold" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-end justify-between">
                            <div>
                              <div className={`text-2xl font-bold ${low ? 'text-amber-600' : 'text-[#2A2F35]'}`}>{item.available_quantity}</div>
                              <div className="text-[11px] text-[#5C6773]">available</div>
                            </div>
                            {low && (
                              <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600">
                                <Warning size={13} weight="fill" /> Low stock
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            <Button size="sm" variant="outline" onClick={() => setUsageItem(item)} disabled={item.available_quantity <= 0} data-testid={`use-item-${item.id}`} className="flex-1 text-xs">
                              Log Usage
                            </Button>
                            <button onClick={() => openHistory(item)} className="p-2 rounded-md border border-[#E5E5E2] hover:border-emerald-400 text-[#5C6773] hover:text-emerald-600 transition-colors" title="History">
                              <ClockCounterClockwise size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        purchases.length === 0 ? (
          <div className="text-center py-12 bg-white border border-[#E5E5E2] rounded-xl">
            <Receipt size={64} className="mx-auto text-[#E5E5E2] mb-4" weight="duotone" />
            <p className="text-[#5C6773]">No purchases logged yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {purchases.map(p => (
              <div key={p.id} data-testid={`purchase-${p.id}`} className="bg-white border border-[#E5E5E2] rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#2A2F35]">
                    {p.supplier_name || 'Purchase'} {p.order_ref && <span className="text-[#9CA3AF] font-normal">· {p.order_ref}</span>}
                  </p>
                  <p className="text-xs text-[#5C6773]">{p.purchase_date}{p.notes ? ` · ${p.notes}` : ''}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold text-[#2A2F35]">{formatCurrency(p.total_amount || 0)}</span>
                  {p.bill_image_url && (
                    <a href={p.bill_image_url} target="_blank" rel="noreferrer" className="p-2 rounded-md border border-[#E5E5E2] hover:border-emerald-400 text-[#5C6773] hover:text-emerald-600 transition-colors" title="View bill">
                      <Receipt size={16} />
                    </a>
                  )}
                  <button onClick={() => handleDeletePurchase(p)} className="p-2 rounded-md hover:bg-red-50 text-[#5C6773] hover:text-red-500 transition-colors" title="Delete">
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {historyItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setHistoryItem(null)}>
          <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#2A2F35] mb-1">{itemTitle(historyItem)}</h3>
            <p className="text-xs text-[#5C6773] mb-4">Stock history</p>
            {historyTxns.length === 0 ? (
              <p className="text-sm text-[#9CA3AF]">No transactions yet.</p>
            ) : (
              <div className="space-y-2">
                {historyTxns.map(t => (
                  <div key={t.id} className="flex items-center justify-between border border-[#E5E5E2] rounded-lg p-2.5 text-sm">
                    <div>
                      <span className={`font-medium ${t.transaction_type === 'in' ? 'text-emerald-700' : 'text-red-600'}`}>
                        {t.transaction_type === 'in' ? '+' : '−'}{t.quantity}
                      </span>
                      <span className="text-[#5C6773] ml-2">{t.transaction_date}</span>
                    </div>
                    {t.line_net_cost != null && <span className="text-xs text-[#9CA3AF]">{formatCurrency(t.line_net_cost)}</span>}
                  </div>
                ))}
              </div>
            )}
            <Button onClick={() => setHistoryItem(null)} className="w-full mt-4" variant="outline">Close</Button>
          </div>
        </div>
      )}

      <InventoryItemModal
        open={isItemModalOpen}
        onOpenChange={(o) => { setIsItemModalOpen(o); if (!o) setEditingItem(null); }}
        editingItem={editingItem}
        onSaved={fetchAll}
      />
      <StockPurchaseModal
        open={isPurchaseModalOpen}
        onOpenChange={setIsPurchaseModalOpen}
        inventoryItems={items}
        onSaved={fetchAll}
      />
      <StockUsageModal
        open={!!usageItem}
        onOpenChange={(o) => { if (!o) setUsageItem(null); }}
        item={usageItem}
        patients={patients}
        onSaved={fetchAll}
      />
    </div>
  );
}
