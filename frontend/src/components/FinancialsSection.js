import { useState } from 'react';
import {
  CurrencyDollar, CaretDown, CaretUp, Plus, PencilSimple, Trash, TrendUp,
} from '@phosphor-icons/react';
import { useLocale } from '../contexts/LocaleContext';
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
  onAddLineItem,
  onEditLineItem,
  onDeleteLineItem,
  onAddPayment,
  onEditPayment,
  onDeletePayment,
}) {
  const { formatCurrency } = useLocale();
  const [expanded, setExpanded] = useState(false);

  const totalCost = lineItems.reduce((sum, i) => sum + (Number(i.cost_amount) || 0), 0);
  const totalCharged = lineItems.reduce((sum, i) => sum + (Number(i.charged_amount) || 0), 0);
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const balance = totalCharged - totalPaid;
  const profit = totalCharged - totalCost;

  return (
    <div className="bg-white border border-[#E5E5E2] rounded-xl shadow-sm mb-6 overflow-hidden">
      <button
        data-testid="financials-toggle"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between p-6 hover:bg-[#F9F9F8] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-50">
            <CurrencyDollar size={20} className="text-emerald-600" weight="fill" />
          </div>
          <div className="text-left">
            <h2 className="text-lg font-medium text-[#2A2F35]">Financials</h2>
            <p className="text-xs text-[#5C6773]">
              {formatCurrency(totalCharged)} billed · {formatCurrency(totalPaid)} paid ·{' '}
              <span className={balance > 0 ? 'text-amber-600 font-medium' : 'text-emerald-600 font-medium'}>
                {formatCurrency(Math.abs(balance))} {balance > 0 ? 'due' : balance < 0 ? 'credit' : 'settled'}
              </span>
            </p>
          </div>
        </div>
        {expanded ? <CaretUp size={18} className="text-[#5C6773]" /> : <CaretDown size={18} className="text-[#5C6773]" />}
      </button>

      {expanded && (
        <div className="px-6 pb-6">
          {/* Summary tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            <StatTile label="Total Charged" value={totalCharged} color="#2A2F35" formatCurrency={formatCurrency} />
            <StatTile label="Total Cost" value={totalCost} color="#5C6773" formatCurrency={formatCurrency} />
            <StatTile label="Amount Paid" value={totalPaid} color="#2563EB" formatCurrency={formatCurrency} />
            <StatTile label="Balance Due" value={Math.max(balance, 0)} color={balance > 0 ? '#D97706' : '#16A34A'} formatCurrency={formatCurrency} />
            <div className="bg-emerald-50 rounded-lg p-3 text-center border border-emerald-200">
              <div className="flex items-center justify-center gap-1 text-lg font-bold text-emerald-700">
                <TrendUp size={15} weight="bold" /> {formatCurrency(profit)}
              </div>
              <div className="text-[11px] text-emerald-700">Clinic Profit</div>
            </div>
          </div>

          {/* Line items */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#2A2F35]">
                Expenses & Charges {lineItems.length > 0 && `(${lineItems.length})`}
              </h3>
              <button
                data-testid="add-lineitem-button"
                onClick={onAddLineItem}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
              >
                <Plus size={13} weight="bold" /> Expense / Charge
              </button>
            </div>
            {lineItems.length === 0 ? (
              <p className="text-xs text-[#9CA3AF]">No expenses or charges logged yet.</p>
            ) : (
              <div className="space-y-2">
                {lineItems.map(item => (
                  <div key={item.id} data-testid={`lineitem-${item.id}`} className="flex items-center justify-between border border-[#E5E5E2] rounded-lg p-3 hover:border-emerald-400 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full bg-[#F0F0EE] text-[#5C6773] text-[10px] font-semibold uppercase tracking-wide">
                          {categoryLabel(item.category)}
                        </span>
                        {item.item_date && <span className="text-[11px] text-[#9CA3AF]">{item.item_date}</span>}
                      </div>
                      {item.description && <p className="text-sm text-[#2A2F35] mt-1 truncate">{item.description}</p>}
                      <p className="text-xs text-[#5C6773] mt-0.5">
                        Cost {formatCurrency(item.cost_amount)} · Charged {formatCurrency(item.charged_amount)}
                      </p>
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

          {/* Payments */}
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
        </div>
      )}
    </div>
  );
}
