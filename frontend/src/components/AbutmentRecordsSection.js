import { PencilSimple, Trash } from '@phosphor-icons/react';

export default function AbutmentRecordsSection({ abutmentRecords, implants, onEdit, onDelete }) {
  if (abutmentRecords.length === 0) return null;
  return (
    <div className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm mb-6">
      <h2 className="text-lg font-medium text-[#2A2F35] mb-4" style={{ color: '#D4925A' }}>
        Abutment Records ({abutmentRecords.length})
      </h2>
      <div className="space-y-3">
        {abutmentRecords.map((rec) => (
          <div key={rec.id} data-testid={`abutment-record-${rec.id}`} className="border border-[#E5E5E2] rounded-lg p-4 hover:border-[#E8A76C] transition-all">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-medium text-sm flex-shrink-0" style={{ backgroundColor: '#E8A76C' }}>
                  {rec.tooth_number}
                </div>
                <div>
                  <h3 className="font-medium text-[#2A2F35] text-sm">{rec.abutment_type}</h3>
                  {rec.placement_date && <p className="text-xs text-[#5C6773]">Placed: {rec.placement_date}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  data-testid={`edit-abutment-${rec.id}`}
                  onClick={() => onEdit(rec)}
                  className="p-1.5 rounded-md hover:bg-[#F0F0EE] text-[#5C6773] hover:text-[#E8A76C] transition-colors"
                  title="Edit abutment record"
                >
                  <PencilSimple size={15} weight="bold" />
                </button>
                <button
                  data-testid={`delete-abutment-${rec.id}`}
                  onClick={() => onDelete({ type: 'abutment', id: rec.id, label: `Abutment — Tooth #${rec.tooth_number}` })}
                  className="p-1.5 rounded-md hover:bg-red-50 text-[#5C6773] hover:text-red-500 transition-colors"
                  title="Delete abutment record"
                >
                  <Trash size={15} weight="bold" />
                </button>
              </div>
            </div>
            {rec.connected_implant_ids?.length > 0 && (
              <p className="text-xs text-[#5C6773] mb-1">
                Connected to implant{rec.connected_implant_ids.length > 1 ? 's' : ''}: {rec.connected_implant_ids.map(iid => {
                  const imp = implants.find(i => i.id === iid);
                  return imp ? `Tooth #${imp.tooth_number}${imp.brand ? ` (${imp.brand})` : ''}` : null;
                }).filter(Boolean).join(', ')}
              </p>
            )}
            {rec.clinical_notes && <p className="text-xs text-[#5C6773] italic">{rec.clinical_notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
