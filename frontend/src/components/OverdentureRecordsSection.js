import { PencilSimple, Trash } from '@phosphor-icons/react';

export default function OverdentureRecordsSection({ overdentureRecords, onEdit, onDelete }) {
  if (overdentureRecords.length === 0) return null;
  return (
    <div className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm mb-6">
      <h2 className="text-lg font-medium mb-4" style={{ color: '#7C3AED' }}>
        Overdenture Records ({overdentureRecords.length})
      </h2>
      <div className="space-y-3">
        {overdentureRecords.map((rec) => (
          <div key={rec.id} data-testid={`overdenture-record-${rec.id}`} className="border rounded-lg p-4 transition-all" style={{ borderColor: '#C4B5FD' }}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-medium text-[#2A2F35] text-sm">
                  Overdenture — {rec.attachment_type}
                </h3>
                <p className="text-xs text-[#5C6773]">Teeth: {rec.tooth_numbers?.join(', ')}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  data-testid={`edit-overdenture-${rec.id}`}
                  onClick={() => onEdit(rec)}
                  className="p-1.5 rounded-md hover:bg-[#F0F0EE] text-[#5C6773] transition-colors"
                  title="Edit overdenture record"
                >
                  <PencilSimple size={15} weight="bold" />
                </button>
                <button
                  data-testid={`delete-overdenture-${rec.id}`}
                  onClick={() => onDelete({ type: 'overdenture', id: rec.id, label: `Overdenture — Teeth ${rec.tooth_numbers?.join(', ')}` })}
                  className="p-1.5 rounded-md hover:bg-red-50 text-[#5C6773] hover:text-red-500 transition-colors"
                  title="Delete overdenture record"
                >
                  <Trash size={15} weight="bold" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {rec.has_bar && (
                <div><span className="text-[#5C6773]">Bar:</span> <span className="font-medium" style={{ color: '#7C3AED' }}>{rec.bar_material || 'Yes'}</span></div>
              )}
              {rec.prosthetic_loading_date && (
                <div><span className="text-[#5C6773]">Loading:</span> <span className="font-medium text-[#2A2F35]">{rec.prosthetic_loading_date}</span></div>
              )}
              {rec.connected_implant_ids?.length > 0 && (
                <div><span className="text-[#5C6773]">Implants connected:</span> <span className="font-medium text-[#2A2F35]">{rec.connected_implant_ids.length}</span></div>
              )}
            </div>
            {rec.clinical_notes && <p className="mt-2 text-xs text-[#5C6773] italic">{rec.clinical_notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
