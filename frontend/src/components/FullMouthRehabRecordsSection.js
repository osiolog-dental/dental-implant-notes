import { PencilSimple, Trash } from '@phosphor-icons/react';

const REHAB_COLOR = '#4F46E5';

export default function FullMouthRehabRecordsSection({ rehabRecords, onEdit, onDelete }) {
  if (rehabRecords.length === 0) return null;
  return (
    <div className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm mb-6">
      <h2 className="text-lg font-medium mb-4" style={{ color: REHAB_COLOR }}>
        Full Mouth Rehab Records ({rehabRecords.length})
      </h2>
      <div className="space-y-3">
        {rehabRecords.map((rec) => (
          <div key={rec.id} data-testid={`full-mouth-rehab-record-${rec.id}`} className="border rounded-lg p-4 transition-all" style={{ borderColor: '#C7D2FE' }}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-medium text-[#2A2F35] text-sm">
                  Full Mouth Rehab — {rec.rehab_type}
                </h3>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  data-testid={`edit-full-mouth-rehab-${rec.id}`}
                  onClick={() => onEdit(rec)}
                  className="p-1.5 rounded-md hover:bg-[#F0F0EE] text-[#5C6773] transition-colors"
                  title="Edit full mouth rehab record"
                >
                  <PencilSimple size={15} weight="bold" />
                </button>
                <button
                  data-testid={`delete-full-mouth-rehab-${rec.id}`}
                  onClick={() => onDelete({ type: 'full_mouth_rehab', id: rec.id, label: `Full Mouth Rehab — ${rec.rehab_type}` })}
                  className="p-1.5 rounded-md hover:bg-red-50 text-[#5C6773] hover:text-red-500 transition-colors"
                  title="Delete full mouth rehab record"
                >
                  <Trash size={15} weight="bold" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
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
