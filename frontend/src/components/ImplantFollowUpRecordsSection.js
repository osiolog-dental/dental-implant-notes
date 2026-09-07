import { PencilSimple, Trash, Plus, Warning, CheckCircle } from '@phosphor-icons/react';

export default function ImplantFollowUpRecordsSection({ followUpRecords, implants, onAdd, onEdit, onDelete }) {
  return (
    <div className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-[#2A2F35]">
          Implant Follow-ups {followUpRecords.length > 0 && `(${followUpRecords.length})`}
        </h2>
        <button
          data-testid="add-followup-button"
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg transition-colors"
        >
          <Plus size={13} weight="bold" /> Follow-up
        </button>
      </div>

      {followUpRecords.length === 0 ? (
        <p className="text-xs text-[#9CA3AF]">
          No follow-ups logged yet. Add one to record osseointegration and peri-implant health at each check-up.
        </p>
      ) : (
        <div className="space-y-3">
          {followUpRecords.map((rec) => {
            const imp = implants.find(i => i.id === rec.implant_id);
            const guarded = rec.prognosis === 'Guarded';
            return (
              <div
                key={rec.id}
                data-testid={`followup-record-${rec.id}`}
                className={`border rounded-lg p-4 transition-all ${guarded ? 'border-amber-300 bg-amber-50' : 'border-[#E5E5E2] hover:border-[#3B82F6]'}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-[#2A2F35] text-sm">
                      Tooth #{imp?.tooth_number ?? '—'}{imp?.brand ? ` — ${imp.brand}` : ''}
                    </h3>
                    <p className="text-xs text-[#5C6773]">Follow-up: {rec.follow_up_date}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      data-testid={`edit-followup-${rec.id}`}
                      onClick={() => onEdit(rec)}
                      className="p-1.5 rounded-md hover:bg-[#F0F0EE] text-[#5C6773] hover:text-[#3B82F6] transition-colors"
                      title="Edit follow-up"
                    >
                      <PencilSimple size={15} weight="bold" />
                    </button>
                    <button
                      data-testid={`delete-followup-${rec.id}`}
                      onClick={() => onDelete({ type: 'follow_up', id: rec.id, label: `Follow-up — Tooth #${imp?.tooth_number ?? ''} (${rec.follow_up_date})` })}
                      className="p-1.5 rounded-md hover:bg-red-50 text-[#5C6773] hover:text-red-500 transition-colors"
                      title="Delete follow-up"
                    >
                      <Trash size={15} weight="bold" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${rec.osseointegration_success ? 'bg-emerald-100 text-emerald-700' : 'bg-[#F0F0EE] text-[#5C6773]'}`}>
                    <CheckCircle size={11} weight="fill" /> Osseointegration {rec.osseointegration_success ? 'Success' : 'Not confirmed'}
                  </span>
                  {rec.peri_implant_health && (
                    <span className="px-2 py-0.5 rounded-full bg-[#F0F0EE] text-[#5C6773] font-medium">
                      {rec.peri_implant_health}
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${guarded ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'}`}>
                    {guarded && <Warning size={11} weight="fill" />} {rec.prognosis} Prognosis
                  </span>
                </div>
                {rec.clinical_notes && <p className="mt-2 text-xs text-[#5C6773] italic">{rec.clinical_notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
