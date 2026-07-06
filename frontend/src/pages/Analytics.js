import { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendUp, Users, Tooth, CurrencyDollar, Plus, Trash, PencilSimple, Check, X, Tag, Package, Stethoscope } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { getAnalyticsOverview, getAnalyticsFinancial } from '../api/dashboard';
import { useLocale } from '../contexts/LocaleContext';
import { usePricing } from '../contexts/PricingContext';

/* ── Inline editable number cell ── */
function EditablePrice({ value, onSave, prefix = '' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  if (editing) return (
    <span className="flex items-center gap-1">
      <span className="text-xs text-[#5C6773]">{prefix}</span>
      <input
        autoFocus
        type="number"
        min="0"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { onSave(draft); setEditing(false); } if (e.key === 'Escape') setEditing(false); }}
        className="w-24 px-2 py-0.5 border border-[#82A098] rounded text-sm focus:outline-none"
      />
      <button onClick={() => { onSave(draft); setEditing(false); }} className="text-[#82A098]"><Check size={14} /></button>
      <button onClick={() => setEditing(false)} className="text-[#9CA3AF]"><X size={14} /></button>
    </span>
  );
  return (
    <button onClick={() => { setDraft(value); setEditing(true); }}
      className="flex items-center gap-1 text-sm font-medium text-[#2A2F35] hover:text-[#82A098] group">
      {prefix}{Number(value).toLocaleString()}
      <PencilSimple size={12} className="opacity-0 group-hover:opacity-100 text-[#82A098]" />
    </button>
  );
}

/* ── Procedures tab ── */
function ProceduresTab() {
  const { procedures, updateProcedure, addProcedure, deleteProcedure } = usePricing();
  const { formatCurrency } = useLocale();
  const [newLabel, setNewLabel] = useState('');
  const [newFee, setNewFee] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = () => {
    if (!newLabel.trim() || !newFee) { toast.error('Enter procedure name and fee'); return; }
    addProcedure(newLabel.trim(), newFee);
    setNewLabel(''); setNewFee(''); setAdding(false);
    toast.success('Procedure added');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[#2A2F35]" style={{ fontFamily: 'Work Sans, sans-serif' }}>Procedure Fees</h3>
          <p className="text-xs text-[#5C6773] mt-0.5">Set your standard fee for each procedure. Click any price to edit it.</p>
        </div>
        <button
          data-testid="add-procedure-btn"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#82A098] text-white text-xs font-medium rounded-lg hover:bg-[#6B8A82] transition-colors"
        >
          <Plus size={14} /> Add Procedure
        </button>
      </div>

      <div className="rounded-xl border border-[#E5E5E2] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F9F9F8] border-b border-[#E5E5E2]">
              <th className="px-4 py-2.5 text-left font-semibold text-[#5C6773]">Procedure</th>
              <th className="px-4 py-2.5 text-right font-semibold text-[#5C6773]">Fee (tap to edit)</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {procedures.map((p, i) => (
              <tr key={p.id} className={`border-b border-[#F0F0EE] ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF9]'}`}>
                <td className="px-4 py-3 text-[#2A2F35]">{p.label}</td>
                <td className="px-4 py-3 text-right">
                  <EditablePrice value={p.fee} onSave={v => updateProcedure(p.id, v)} />
                </td>
                <td className="px-2 py-3 text-right">
                  <button onClick={() => deleteProcedure(p.id)} data-testid={`delete-proc-${p.id}`}
                    className="text-[#9CA3AF] hover:text-red-500 transition-colors p-1">
                    <Trash size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding && (
        <div className="p-4 bg-[#F9F9F8] rounded-xl border border-[#E5E5E2] flex flex-col sm:flex-row gap-3">
          <input
            autoFocus
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            placeholder="Procedure name"
            className="flex-1 px-3 py-2 border border-[#E5E5E2] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#82A098]"
          />
          <input
            type="number"
            value={newFee}
            onChange={e => setNewFee(e.target.value)}
            placeholder="Fee amount"
            className="w-36 px-3 py-2 border border-[#E5E5E2] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#82A098]"
          />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-4 py-2 bg-[#82A098] text-white text-sm font-medium rounded-lg hover:bg-[#6B8A82]">Add</button>
            <button onClick={() => setAdding(false)} className="px-4 py-2 border border-[#E5E5E2] text-[#2A2F35] text-sm rounded-lg hover:bg-[#F0F0EE]">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Materials tab ── */
function MaterialsTab() {
  const { materials, addMaterial, updateMaterial, deleteMaterial, materialCategories, addMaterialCategory, deleteMaterialCategory } = usePricing();
  const [activeCategory, setActiveCategory] = useState(materialCategories[0]?.id || 'implant');
  const [adding, setAdding] = useState(false);
  const [newMat, setNewMat] = useState({ name: '', cost: '', price: '' });
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');

  const filtered = materials.filter(m => m.category === activeCategory);
  const activeCat = materialCategories.find(c => c.id === activeCategory);

  const handleAdd = () => {
    if (!newMat.name.trim()) { toast.error('Enter material name'); return; }
    addMaterial({ ...newMat, category: activeCategory, cost: Number(newMat.cost) || 0, price: Number(newMat.price) || 0 });
    setNewMat({ name: '', cost: '', price: '' });
    setAdding(false);
    toast.success('Material added');
  };

  const handleAddCategory = () => {
    if (!newCatLabel.trim()) { toast.error('Enter a category name'); return; }
    addMaterialCategory(newCatLabel.trim());
    setNewCatLabel('');
    setAddingCategory(false);
    toast.success(`Category "${newCatLabel.trim()}" added`);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-[#2A2F35]" style={{ fontFamily: 'Work Sans, sans-serif' }}>Material Costs & Prices</h3>
        <p className="text-xs text-[#5C6773] mt-0.5">Track what each material costs you to acquire vs. what you charge the patient. Margin = Price − Cost.</p>
      </div>

      {/* Category tabs + add category */}
      <div className="flex gap-2 flex-wrap items-center">
        {materialCategories.map(cat => (
          <div key={cat.id} className="relative group">
            <button
              onClick={() => { setActiveCategory(cat.id); setAdding(false); }}
              data-testid={`mat-cat-${cat.id}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors pr-${cat.custom ? '7' : '3'} ${
                activeCategory === cat.id
                  ? 'bg-[#82A098] text-white border-[#82A098]'
                  : 'bg-white text-[#5C6773] border-[#E5E5E2] hover:border-[#82A098]'
              }`}
            >{cat.label}</button>
            {cat.custom && (
              <button
                onClick={() => {
                  deleteMaterialCategory(cat.id);
                  setActiveCategory(materialCategories[0]?.id || 'implant');
                }}
                data-testid={`delete-cat-${cat.id}`}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] items-center justify-center hidden group-hover:flex"
                title="Delete category"
              >×</button>
            )}
          </div>
        ))}

        {addingCategory ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={newCatLabel}
              onChange={e => setNewCatLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); if (e.key === 'Escape') { setAddingCategory(false); setNewCatLabel(''); } }}
              placeholder="Category name…"
              className="px-2 py-1.5 border border-[#82A098] rounded-lg text-xs focus:outline-none w-36"
            />
            <button onClick={handleAddCategory} className="text-[#82A098]"><Check size={14} /></button>
            <button onClick={() => { setAddingCategory(false); setNewCatLabel(''); }} className="text-[#9CA3AF]"><X size={14} /></button>
          </div>
        ) : (
          <button
            data-testid="add-category-btn"
            onClick={() => setAddingCategory(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 border border-dashed border-[#82A098] text-[#82A098] text-xs font-medium rounded-lg hover:bg-[#F0F5F4] transition-colors"
          >
            <Plus size={12} /> New Category
          </button>
        )}
      </div>

      <div className="rounded-xl border border-[#E5E5E2] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F9F9F8] border-b border-[#E5E5E2]">
              <th className="px-4 py-2.5 text-left font-semibold text-[#5C6773]">Material / Brand</th>
              <th className="px-4 py-2.5 text-right font-semibold text-[#5C6773]">Cost to Acquire</th>
              <th className="px-4 py-2.5 text-right font-semibold text-[#5C6773]">Price to Patient</th>
              <th className="px-4 py-2.5 text-right font-semibold text-[#5C6773]">Margin</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-[#9CA3AF]">No materials yet — add one below</td></tr>
            )}
            {filtered.map((m, i) => {
              const margin = (m.price || 0) - (m.cost || 0);
              return (
                <tr key={m.id} className={`border-b border-[#F0F0EE] ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF9]'}`}>
                  <td className="px-4 py-3 text-[#2A2F35] font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-right text-[#5C6773]">
                    <EditablePrice value={m.cost} onSave={v => updateMaterial(m.id, { cost: Number(v) })} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <EditablePrice value={m.price} onSave={v => updateMaterial(m.id, { price: Number(v) })} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${margin >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      {margin >= 0 ? '+' : ''}{margin.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-right">
                    <button onClick={() => deleteMaterial(m.id)} data-testid={`delete-mat-${m.id}`}
                      className="text-[#9CA3AF] hover:text-red-500 transition-colors p-1">
                      <Trash size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {adding ? (
        <div className="p-4 bg-[#F9F9F8] rounded-xl border border-[#E5E5E2] space-y-3">
          <p className="text-xs font-semibold text-[#5C6773] uppercase tracking-wide">New {activeCat?.label || 'Material'}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              autoFocus value={newMat.name}
              onChange={e => setNewMat(p => ({ ...p, name: e.target.value }))}
              placeholder="Brand / product name"
              className="flex-1 px-3 py-2 border border-[#E5E5E2] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#82A098]"
            />
            <input
              type="number" value={newMat.cost}
              onChange={e => setNewMat(p => ({ ...p, cost: e.target.value }))}
              placeholder="Your cost"
              className="w-32 px-3 py-2 border border-[#E5E5E2] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#82A098]"
            />
            <input
              type="number" value={newMat.price}
              onChange={e => setNewMat(p => ({ ...p, price: e.target.value }))}
              placeholder="Patient price"
              className="w-32 px-3 py-2 border border-[#E5E5E2] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#82A098]"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-4 py-2 bg-[#82A098] text-white text-sm font-medium rounded-lg hover:bg-[#6B8A82]">Add</button>
            <button onClick={() => setAdding(false)} className="px-4 py-2 border border-[#E5E5E2] text-[#2A2F35] text-sm rounded-lg hover:bg-[#F0F0EE]">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          data-testid="add-material-btn"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-[#82A098] text-[#82A098] text-xs font-medium rounded-lg hover:bg-[#F0F5F4] transition-colors"
        >
          <Plus size={14} /> Add {activeCat?.label.replace(/s$/, '') || 'Material'}
        </button>
      )}
    </div>
  );
}

/* ── Discounts tab ── */
function DiscountsTab({ patients }) {
  const { patientDiscounts, addDiscount, updateDiscount, deleteDiscount } = usePricing();
  const { formatCurrency } = useLocale();
  const [adding, setAdding] = useState(false);
  const [newDisc, setNewDisc] = useState({ patientId: '', patientName: '', type: 'percent', value: '', note: '' });

  const handleAdd = () => {
    if (!newDisc.patientName.trim() || !newDisc.value) { toast.error('Select patient and enter discount value'); return; }
    addDiscount({ ...newDisc, value: Number(newDisc.value) });
    setNewDisc({ patientId: '', patientName: '', type: 'percent', value: '', note: '' });
    setAdding(false);
    toast.success('Discount saved');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[#2A2F35]" style={{ fontFamily: 'Work Sans, sans-serif' }}>Patient Discounts</h3>
          <p className="text-xs text-[#5C6773] mt-0.5">Apply a percentage or fixed discount for specific patients.</p>
        </div>
        <button
          data-testid="add-discount-btn"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C27E70] text-white text-xs font-medium rounded-lg hover:bg-[#a8685c] transition-colors"
        >
          <Plus size={14} /> Add Discount
        </button>
      </div>

      {patientDiscounts.length === 0 && !adding && (
        <div className="text-center py-10 text-sm text-[#9CA3AF]">
          No patient discounts yet
        </div>
      )}

      {patientDiscounts.length > 0 && (
        <div className="rounded-xl border border-[#E5E5E2] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F9F9F8] border-b border-[#E5E5E2]">
                <th className="px-4 py-2.5 text-left font-semibold text-[#5C6773]">Patient</th>
                <th className="px-4 py-2.5 text-center font-semibold text-[#5C6773]">Discount</th>
                <th className="px-4 py-2.5 text-left font-semibold text-[#5C6773]">Note</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {patientDiscounts.map((d, i) => (
                <tr key={d.id} className={`border-b border-[#F0F0EE] ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF9]'}`}>
                  <td className="px-4 py-3 font-medium text-[#2A2F35]">{d.patientName}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF3F0] text-[#C27E70] text-xs font-semibold">
                      <Tag size={10} />
                      {d.type === 'percent' ? `${d.value}%` : formatCurrency(d.value)} off
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#5C6773]">{d.note || '—'}</td>
                  <td className="px-2 py-3 text-right">
                    <button onClick={() => deleteDiscount(d.id)} data-testid={`delete-disc-${d.id}`}
                      className="text-[#9CA3AF] hover:text-red-500 transition-colors p-1">
                      <Trash size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding && (
        <div className="p-4 bg-[#F9F9F8] rounded-xl border border-[#E5E5E2] space-y-3">
          <p className="text-xs font-semibold text-[#5C6773] uppercase tracking-wide">New Discount</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {patients.length > 0 ? (
              <select
                value={newDisc.patientId}
                onChange={e => {
                  const p = patients.find(pt => pt.id === e.target.value);
                  setNewDisc(prev => ({ ...prev, patientId: e.target.value, patientName: p?.name || '' }));
                }}
                className="px-3 py-2 border border-[#E5E5E2] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#82A098] bg-white"
              >
                <option value="">Select patient…</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            ) : (
              <input
                value={newDisc.patientName}
                onChange={e => setNewDisc(p => ({ ...p, patientName: e.target.value }))}
                placeholder="Patient name"
                className="px-3 py-2 border border-[#E5E5E2] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#82A098]"
              />
            )}
            <div className="flex gap-2">
              <select
                value={newDisc.type}
                onChange={e => setNewDisc(p => ({ ...p, type: e.target.value }))}
                className="px-3 py-2 border border-[#E5E5E2] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#82A098] bg-white"
              >
                <option value="percent">% Percent</option>
                <option value="fixed">Fixed Amount</option>
              </select>
              <input
                type="number" min="0"
                value={newDisc.value}
                onChange={e => setNewDisc(p => ({ ...p, value: e.target.value }))}
                placeholder={newDisc.type === 'percent' ? '10' : '5000'}
                className="w-28 px-3 py-2 border border-[#E5E5E2] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#82A098]"
              />
            </div>
          </div>
          <input
            value={newDisc.note}
            onChange={e => setNewDisc(p => ({ ...p, note: e.target.value }))}
            placeholder="Reason / note (optional)"
            className="w-full px-3 py-2 border border-[#E5E5E2] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#82A098]"
          />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-4 py-2 bg-[#C27E70] text-white text-sm font-medium rounded-lg hover:bg-[#a8685c]">Save</button>
            <button onClick={() => setAdding(false)} className="px-4 py-2 border border-[#E5E5E2] text-[#2A2F35] text-sm rounded-lg hover:bg-[#F0F0EE]">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Analytics page ── */
const Analytics = () => {
  const { formatCurrency, country } = useLocale();
  const { procedures, getFee } = usePricing();
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [financial, setFinancial] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [overviewData, financialData] = await Promise.all([
        getAnalyticsOverview(),
        getAnalyticsFinancial(),
      ]);
      setOverview(overviewData);
      setFinancial(financialData);
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  /* Compute revenue from user's own prices */
  const implantFee = getFee('implant_surgery');
  const estimatedRevenue = (overview?.total_implants || 0) * implantFee;

  const TABS = [
    { id: 'overview',  label: 'Overview',  icon: TrendUp    },
    { id: 'pricing',   label: 'Procedures',icon: Stethoscope},
    { id: 'materials', label: 'Materials',  icon: Package    },
    { id: 'discounts', label: 'Discounts',  icon: Tag        },
  ];

  if (loading) return (
    <div className="p-4 md:p-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-[#E5E5E2] rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-[#E5E5E2] rounded-xl"></div>)}
        </div>
      </div>
    </div>
  );

  const COLORS = ['#82A098', '#C27E70', '#7B9EBB', '#E8A76C'];
  const implantTypeData = overview?.implant_types?.map((type, index) => ({
    name: type._id || 'Unknown', value: type.count, color: COLORS[index % COLORS.length],
  })) || [];

  return (
    <div className="p-4 md:p-8" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
      <div className="mb-6">
        <h1 className="text-4xl font-semibold text-[#2A2F35] tracking-tight" style={{ fontFamily: 'Work Sans, sans-serif' }}>Analytics</h1>
        <p className="text-[#5C6773] mt-1">Practice performance and financial settings</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-[#F0F0EE] rounded-xl mb-6 overflow-x-auto" data-testid="analytics-tabs">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              data-testid={`tab-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center ${
                tab === t.id
                  ? 'bg-white text-[#2A2F35] shadow-sm'
                  : 'text-[#5C6773] hover:text-[#2A2F35]'
              }`}
            >
              <Icon size={15} weight={tab === t.id ? 'fill' : 'regular'} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div data-testid="total-patients-card" className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-[#5C6773] mb-1">Total Patients</p>
                  <p className="text-3xl font-semibold text-[#2A2F35]">{overview?.total_patients || 0}</p>
                </div>
                <div className="w-12 h-12 bg-[#82A098]/10 rounded-lg flex items-center justify-center">
                  <Users size={24} weight="fill" className="text-[#82A098]" />
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm text-[#82A098]">
                <TrendUp size={16} /><span>Active practice</span>
              </div>
            </div>

            <div data-testid="total-implants-card" className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-[#5C6773] mb-1">Total Implants</p>
                  <p className="text-3xl font-semibold text-[#2A2F35]">{overview?.total_implants || 0}</p>
                </div>
                <div className="w-12 h-12 bg-[#C27E70]/10 rounded-lg flex items-center justify-center">
                  <Tooth size={24} weight="fill" className="text-[#C27E70]" />
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm text-[#C27E70]">
                <span>{overview?.pending_osseointegration || 0} healing</span>
              </div>
            </div>

            <div data-testid="revenue-card" className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-[#5C6773] mb-1">Est. Revenue</p>
                  <p className="text-3xl font-semibold text-[#2A2F35]">{formatCurrency(estimatedRevenue)}</p>
                </div>
                <div className="w-12 h-12 bg-[#7B9EBB]/10 rounded-lg flex items-center justify-center">
                  <CurrencyDollar size={24} weight="fill" className="text-[#7B9EBB]" />
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm text-[#7B9EBB]">
                <span>Avg: {formatCurrency(implantFee)}/implant</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {implantTypeData.length > 0 && (
              <div className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-medium text-[#2A2F35] mb-6" style={{ fontFamily: 'Work Sans, sans-serif' }}>Implant Types</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={implantTypeData} cx="50%" cy="50%" labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100} dataKey="value">
                      {implantTypeData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {implantTypeData.length > 0 && (
              <div className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-medium text-[#2A2F35] mb-6" style={{ fontFamily: 'Work Sans, sans-serif' }}>Implant Count by Type</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={implantTypeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E2" />
                    <XAxis dataKey="name" tick={{ fill: '#5C6773' }} />
                    <YAxis tick={{ fill: '#5C6773' }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#82A098" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="mt-6 bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-medium text-[#2A2F35] mb-4" style={{ fontFamily: 'Work Sans, sans-serif' }}>Financial Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border-l-4 border-[#82A098] pl-4">
                <p className="text-sm text-[#5C6773] mb-1">Total Revenue</p>
                <p className="text-2xl font-semibold text-[#2A2F35]">{formatCurrency(estimatedRevenue)}</p>
              </div>
              <div className="border-l-4 border-[#C27E70] pl-4">
                <p className="text-sm text-[#5C6773] mb-1">Total Procedures</p>
                <p className="text-2xl font-semibold text-[#2A2F35]">{overview?.total_implants || 0}</p>
              </div>
              <div className="border-l-4 border-[#7B9EBB] pl-4">
                <p className="text-sm text-[#5C6773] mb-1">Average per Procedure</p>
                <p className="text-2xl font-semibold text-[#2A2F35]">{formatCurrency(implantFee)}</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-[#F9F9F8] rounded-lg">
              <p className="text-xs text-[#5C6773] italic">
                Revenue shown in {country.currency} ({country.flag} {country.name}) using your procedure prices from the Procedures tab.
                <button onClick={() => setTab('pricing')} className="ml-1 text-[#82A098] underline">Edit prices →</button>
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── PRICING TAB ── */}
      {tab === 'pricing' && (
        <div className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm">
          <ProceduresTab />
        </div>
      )}

      {/* ── MATERIALS TAB ── */}
      {tab === 'materials' && (
        <div className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm">
          <MaterialsTab />
        </div>
      )}

      {/* ── DISCOUNTS TAB ── */}
      {tab === 'discounts' && (
        <div className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm">
          <DiscountsTab patients={patients} />
        </div>
      )}
    </div>
  );
};

export default Analytics;
