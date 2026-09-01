import { PencilSimple, Trash } from '@phosphor-icons/react';

const EXTRACTION_COLOR = '#2563EB';

export default function ExtractedTeethRecordsSection({ extractionRecords, onEdit, onDelete }) {
  if (extractionRecords.length === 0) return null;
  return (
    <div className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm mb-6">
      <h2 className="text-lg font-medium mb-4" style={{ color: EXTRACTION_COLOR }}>
        Extraction Records ({extractionRecords.length})
      </h2>
      <div className="space-y-3">
        {extractionRecords.map((rec) => (
          <div key={rec.id} data-testid={`extraction-record-${rec.id}`} className="border rounded-lg p-4 transition-all" style={{ borderColor: '#BFDBFE' }}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-medium text-[#2A2F35] text-sm">
                  Extracted — Teeth {rec.tooth_numbers?.join(', ')}
                </h3>
                <p className="text-xs text-[#5C6773]">{rec.extraction_date}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  data-testid={`edit-extraction-${rec.id}`}
                  onClick={() => onEdit(rec)}
                  className="p-1.5 rounded-md hover:bg-[#F0F0EE] text-[#5C6773] transition-colors"
                  title="Edit extraction record"
                >
                  <PencilSimple size={15} weight="bold" />
                </button>
                <button
                  data-testid={`delete-extraction-${rec.id}`}
                  onClick={() => onDelete({ type: 'tooth_extraction', id: rec.id, label: `Extraction — Teeth ${rec.tooth_numbers?.join(', ')}` })}
                  className="p-1.5 rounded-md hover:bg-red-50 text-[#5C6773] hover:text-red-500 transition-colors"
                  title="Delete extraction record"
                >
                  <Trash size={15} weight="bold" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {rec.bone_graft && (
                <div><span className="text-[#5C6773]">Graft:</span> <span className="font-medium text-[#2A2F35]">{rec.bone_graft}</span></div>
              )}
              {rec.membrane_used && (
                <div><span className="text-[#5C6773]">Membrane:</span> <span className="font-medium text-[#2A2F35]">Yes</span></div>
              )}
              {rec.planned_future_implant && (
                <div><span className="text-[#5C6773]">Implant planned:</span> <span className="font-medium" style={{ color: EXTRACTION_COLOR }}>after {rec.reminder_days} days</span></div>
              )}
            </div>
            {rec.clinical_notes && <p className="mt-2 text-xs text-[#5C6773] italic">{rec.clinical_notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
