import { useState } from 'react';
import {
  CurrencyDollar, CaretDown, CaretUp, Plus, PencilSimple, Trash, TrendUp,
} from '@phosphor-icons/react';
import { useLocale } from '../contexts/LocaleContext';
import { useFinanceView } from '../contexts/FinanceViewContext';
import { LINE_ITEM_CATEGORIES } from './FinancialLineItemModal';

const categoryLabel = (cat) => LINE_ITEM_CATEGORIES.find(([v]) => v === cat)?.[1] || cat;

function StatTile({ label, value, color, formatCurrency }) {
  return (
    <div className="bg-white rounded-lg p-3 text-center border border-[#E5E5E2]">
      <div className="text-lg font-bold" style={{ color }}>{formatCurrency(value)}</div>
      <div className="text-[11px] text-[#5C6773]">{label}</div>
    </div>
  );
}

export default function FinancialsSection({
  lineItems,
  payments,
  providerFilter,
  onProviderFilterChange,
  onAddLineItem,
  onEditLineItem,
  onDeleteLineItem,
  onAddPayment,
  onEditPayment,
  onDeletePayment,
  patientClinic,
}) {
  const { formatCurrency } = useLocale();
  const { view } = useFinanceView();
  const [expanded, setExpanded] = useState(false);

  // Each line belongs to one side (worked out on the server — see
  // backend services/finance_sides.py): 'owner' = your own clinic's business,
  // 'consultant' = your own consulting work at a clinic you've marked Consultant.
  // At your own clinic a 'Consultant' line is a VISITING consultant you paid,
  // so it stays on the owner side as a cost.
  const sideOf = (i) => i.finance_side || (i.provider_type === 'consultant' ? 'consultant' : 'owner');
  // The patient's clinic decides first: your own clinic → clinic side only; a
  // clinic you consult at → consultant side only. A patient with no clinic
  // follows the account-wide view (beside the bell), then the per-patient buttons.
  const clinicSide = patientClinic ? (patientClinic.my_role === 'consultant' ? 'consultant' : 'owner') : null;
  const sideFilter = clinicSide ? clinicSide
    : view === 'clinic' ? 'owner'
    : view === 'consultant' ? 'consultant'
    : providerFilter === 'clinic' ? 'owner'
    : providerFilter === 'consultant' ? 'consultant'
    : null;

  const ownerItems = lineItems.filter(i => sideOf(i) === 'owner');
  const myItems = lineItems.filter(i => sideOf(i) === 'consultant');

  const totalCharged = ownerItems.reduce((sum, i) => sum + (Number(i.charged_amount) || 0), 0);
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const balance = totalCharged - totalPaid;

  // A visiting consultant is paid one flat fee by the clinic and covers their
  // own materials and expenses out of that fee — none of that is a clinic
  // expense. The clinic's only cost on a consultant-performed item is the fee
  // itself. Clinic-performed items still carry their own material/other cost.
  const clinicCost = ownerItems.reduce((sum, i) => {
    if (i.provider_type === 'consultant') {
      return sum + (Number(i.consultant_charge) || 0);
    }
    return sum + (Number(i.cost_amount) || 0);
  }, 0);
  // Based on money actually collected, not billed — Amount Paid is the one
  // revenue figure that's always real, whoever performed the work.
  const profit = totalPaid - clinicCost;
  const paidToVisiting = ownerItems
    .filter(i => i.provider_type === 'consultant')
    .reduce((sum, i) => sum + (Number(i.consultant_charge) || 0), 0);

  // Your own consulting: the clinic pays you a fee; your materials/expenses come out of it.
  const myFees = myItems.reduce((sum, i) => sum + (Number(i.consultant_charge) || 0), 0);
  const myCosts = myItems.reduce((sum, i) => sum + (Number(i.material_cost) || 0) + (Number(i.other_expenses) || 0), 0);
  const myProfit = myFees - myCosts;

  const visibleItems = sideFilter ? lineItems.filter(i => sideOf(i) === sideFilter) : lineItems;
  const showClinicTiles = sideFilter !== 'consultant';
  const showConsultantTiles = sideFilter === 'consultant' || (sideFilter !== 'owner' && myItems.length > 0);
  // Patients pay the clinic, not the consultant — payments belong to the owner side only.
  const showPayments = sideFilter !== 'consultant';

  return (
    <div className="bg-white border border-[#E5E5E2] rounded-xl shadow-sm mb-6 overflow-hidden">
      <div className="w-full flex items-center justify-between p-6 hover:bg-[#F9F9F8] transition-colors">
        <button
          data-testid="financials-toggle"
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-3 flex-1 text-left min-w-0"
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-50 shrink-0">
            <CurrencyDollar size={20} className="text-emerald-600" weight="fill" />
          </div>
          <div className="text-left min-w-0">
            <h2 className="text-lg font-medium text-[#2A2F35]">Financials</h2>
            {sideFilter === 'consultant' ? (
              <p className="text-xs text-[#5C6773]">
                {formatCurrency(myFees)} your fees ·{' '}
                <span className="text-purple-700 font-medium">{formatCurrency(myProfit)} your profit</span>
              </p>
            ) : (
              <p className="text-xs text-[#5C6773]">
                {formatCurrency(totalCharged)} billed · {formatCurrency(totalPaid)} paid ·{' '}
                <span className={balance > 0 ? 'text-amber-600 font-medium' : 'text-emerald-600 font-medium'}>
                  {formatCurrency(Math.abs(balance))} {balance > 0 ? 'due' : balance < 0 ? 'credit' : 'settled'}
                </span>
              </p>
            )}
          </div>
        </button>

        {expanded && clinicSide && (
          <span className="mx-3 shrink-0 text-[11px] text-[#8A949D]" data-testid="financials-view-note">
            {clinicSide === 'consultant' ? `You consult at ${patientClinic.name}` : `${patientClinic.name} · your clinic`}
          </span>
        )}
        {expanded && !clinicSide && view !== 'both' && (
          <span className="mx-3 shrink-0 text-[11px] text-[#8A949D]" data-testid="financials-view-note">
            {view === 'consultant' ? 'Consultant view' : 'Clinic owner view'} · change beside the bell
          </span>
        )}
        {expanded && !clinicSide && view === 'both' && (
          <div className="flex items-center gap-1.5 mx-3 shrink-0">
            {[['clinic', 'Clinic'], ['consultant', 'Consultant']].map(([v, label]) => (
              <button
                key={v}
                type="button"
                data-testid={`financials-filter-${v}`}
                onClick={() => onProviderFilterChange(providerFilter === v ? null : v)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  providerFilter === v
                    ? 'bg-[#059669] text-white border-[#059669]'
                    : 'border-[#E5E5E2] text-[#5C6773] hover:border-[#059669]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <button
          data-testid="financials-toggle-chevron"
          onClick={() => setExpanded(e => !e)}
          className="shrink-0"
        >
          {expanded ? <CaretUp size={18} className="text-[#5C6773]" /> : <CaretDown size={18} className="text-[#5C6773]" />}
        </button>
      </div>

      {expanded && (
        <div className="px-6 pb-6">
          {/* Summary tiles — Clinic filter shows only the clinic's own boxes, Consultant only theirs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {showClinicTiles && (
              <>
                <StatTile label="Total Charged" value={totalCharged} color="#2A2F35" formatCurrency={formatCurrency} />
                <StatTile label="Clinic Cost" value={clinicCost} color="#5C6773" formatCurrency={formatCurrency} />
                <StatTile label="Amount Paid" value={totalPaid} color="#2563EB" formatCurrency={formatCurrency} />
                <StatTile label="Balance Due" value={Math.max(balance, 0)} color={balance > 0 ? '#D97706' : '#16A34A'} formatCurrency={formatCurrency} />
                <div className="bg-emerald-50 rounded-lg p-3 text-center border border-emerald-200">
                  <div className="flex items-center justify-center gap-1 text-lg font-bold text-emerald-700">
                    <TrendUp size={15} weight="bold" /> {formatCurrency(profit)}
                  </div>
                  <div className="text-[11px] text-emerald-700">Clinic Profit</div>
                </div>
                {paidToVisiting > 0 && (
                  <StatTile label="Paid to Visiting Consultants" value={paidToVisiting} color="#5C6773" formatCurrency={formatCurrency} />
                )}
              </>
            )}
            {showConsultantTiles && (
              <>
                <StatTile label="Your Consultant Fees" value={myFees} color="#7C3AED" formatCurrency={formatCurrency} />
                <StatTile label="Your Costs" value={myCosts} color="#5C6773" formatCurrency={formatCurrency} />
                <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-200">
                  <div className="flex items-center justify-center gap-1 text-lg font-bold text-purple-700">
                    <TrendUp size={15} weight="bold" /> {formatCurrency(myProfit)}
                  </div>
                  <div className="text-[11px] text-purple-700">Your Consultant Profit</div>
                </div>
              </>
            )}
          </div>

          {/* Line items */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#2A2F35]">
                Expenses & Charges {visibleItems.length > 0 && `(${visibleItems.length})`}
              </h3>
              <button
                data-testid="add-lineitem-button"
                onClick={onAddLineItem}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
              >
                <Plus size={13} weight="bold" /> Log Costs
              </button>
            </div>
            {visibleItems.length === 0 ? (
              <p className="text-xs text-[#9CA3AF]">
                {sideFilter === 'consultant' ? 'No consulting work logged for this patient yet.'
                  : sideFilter === 'owner' ? 'No clinic expenses or charges logged yet.'
                  : 'No expenses or charges logged yet.'}
              </p>
            ) : (
              <div className="space-y-2">
                {visibleItems.map(item => (
                  <div key={item.id} data-testid={`lineitem-${item.id}`} className="flex items-center justify-between border border-[#E5E5E2] rounded-lg p-3 hover:border-emerald-400 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full bg-[#F0F0EE] text-[#5C6773] text-[10px] font-semibold uppercase tracking-wide">
                          {categoryLabel(item.category)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                          sideOf(item) === 'consultant' ? 'bg-purple-100 text-purple-700'
                            : item.provider_type === 'consultant' ? 'bg-[#F0F0EE] text-[#5C6773]'
                            : 'bg-blue-50 text-blue-700'}`}>
                          {sideOf(item) === 'consultant' ? 'My consulting' : item.provider_type === 'consultant' ? 'Visiting consultant' : 'Clinic'}
                        </span>
                        {item.item_date && <span className="text-[11px] text-[#9CA3AF]">{item.item_date}</span>}
                      </div>
                      {item.description && <p className="text-sm text-[#2A2F35] mt-1 truncate">{item.description}</p>}
                      <p className="text-xs text-[#5C6773] mt-0.5">
                        {sideOf(item) === 'consultant' ? (
                          <>
                            Fee you receive {formatCurrency(item.consultant_charge)} ·{' '}
                            <span className="text-purple-700 font-medium">
                              Your profit {formatCurrency((Number(item.consultant_charge) || 0) - (Number(item.material_cost) || 0) - (Number(item.other_expenses) || 0))}
                            </span>
                          </>
                        ) : item.provider_type === 'consultant' ? (
                          <>Paid to visiting consultant {formatCurrency(item.consultant_charge)}</>
                        ) : (
                          <>
                            Cost {formatCurrency(item.cost_amount)} · Charged {formatCurrency(item.charged_amount)} ·{' '}
                            <span className="text-emerald-700 font-medium">
                              Profit {formatCurrency((Number(item.charged_amount) || 0) - (Number(item.cost_amount) || 0))}
                            </span>
                          </>
                        )}
                      </p>
                      {(Number(item.material_cost) > 0 || Number(item.other_expenses) > 0) && (
                        <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                          Material {formatCurrency(item.material_cost)}
                          {Number(item.other_expenses) > 0 && ` · Other ${formatCurrency(item.other_expenses)}`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <button onClick={() => onEditLineItem(item)} className="p-1.5 rounded-md hover:bg-[#F0F0EE] text-[#5C6773] hover:text-emerald-600 transition-colors" title="Edit">
                        <PencilSimple size={14} weight="bold" />
                      </button>
                      <button
                        onClick={() => onDeleteLineItem({ type: 'financial_line_item', id: item.id, label: `${categoryLabel(item.category)} charge` })}
                        className="p-1.5 rounded-md hover:bg-red-50 text-[#5C6773] hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash size={14} weight="bold" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payments — owner side only: the patient pays the clinic, not the consultant */}
          {showPayments && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#2A2F35]">
                Payments Received {payments.length > 0 && `(${payments.length})`}
              </h3>
              <button
                data-testid="add-payment-button"
                onClick={onAddPayment}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors"
              >
                <Plus size={13} weight="bold" /> Payment
              </button>
            </div>
            {payments.length === 0 ? (
              <p className="text-xs text-[#9CA3AF]">No payments recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {payments.map(p => (
                  <div key={p.id} data-testid={`payment-${p.id}`} className="flex items-center justify-between border border-[#E5E5E2] rounded-lg p-3 hover:border-blue-400 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-[#2A2F35]">{formatCurrency(p.amount)}</p>
                      <p className="text-xs text-[#5C6773]">
                        {p.payment_date}{p.method ? ` · ${p.method}` : ''}
                      </p>
                      {p.notes && <p className="text-xs text-[#9CA3AF] italic mt-0.5">{p.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <button onClick={() => onEditPayment(p)} className="p-1.5 rounded-md hover:bg-[#F0F0EE] text-[#5C6773] hover:text-blue-600 transition-colors" title="Edit">
                        <PencilSimple size={14} weight="bold" />
                      </button>
                      <button
                        onClick={() => onDeletePayment({ type: 'payment', id: p.id, label: `Payment of ${formatCurrency(p.amount)}` })}
                        className="p-1.5 rounded-md hover:bg-red-50 text-[#5C6773] hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash size={14} weight="bold" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}
        </div>
      )}
    </div>
  );
}
