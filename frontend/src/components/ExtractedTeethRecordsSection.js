import { PencilSimple, Trash } from '@phosphor-icons/react';

const EXTRACTION_COLOR = '#2563EB';

const teethLabel = (list) => `${list.length === 1 ? 'Tooth' : 'Teeth'} ${list.join(', ')}`;
// After an implant is removed there's no tooth, only the site it was placed in.
const siteLabel = (list) => `${list.length === 1 ? 'Tooth site' : 'Tooth sites'} ${list.join(', ')}`;

// A record logged when a failed implant was removed shares the implant's removal
// date and tooth — label those teeth as an implant removal, not an extraction.
function splitTeeth(rec, implants) {
  const removedTeeth = new Set(
    implants
      .filter(i => (i.implant_outcome || '').toLowerCase() === 'failed' && i.removed_date && i.removed_date === rec.extraction_date)
      .map(i => i.tooth_number)
  );
  const teeth = rec.tooth_numbers || [];
  return { removed: teeth.filter(t => removedTeeth.has(t)), extracted: teeth.filter(t => !removedTeeth.has(t)) };
}

export default function ExtractedTeethRecordsSection({ extractionRecords, onEdit, onDelete, implants = [] }) {
  if (extractionRecords.length === 0) return null;
  const anyRemoval = extractionRecords.some(r => splitTeeth(r, implants).removed.length > 0);
  return (
    <div className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm mb-6">
      <h2 className="text-lg font-medium mb-4" style={{ color: EXTRACTION_COLOR }}>
        {anyRemoval ? 'Extraction & Implant Removal Records' : 'Extraction Records'} ({extractionRecords.length})
      </h2>
      <div className="space-y-3">
        {extractionRecords.map((rec) => {
          const { removed, extracted } = splitTeeth(rec, implants);
          const title = [
            removed.length ? `Failed implant removed — ${siteLabel(removed)}` : null,
            extracted.length ? `Extracted — ${teethLabel(extracted)}` : null,
          ].filter(Boolean).join(' · ') || `Extracted — ${teethLabel(rec.tooth_numbers || [])}`;
          return (
          <div key={rec.id} data-testid={`extraction-record-${rec.id}`} className="border rounded-lg p-4 transition-all" style={{ borderColor: '#BFDBFE' }}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-medium text-[#2A2F35] text-sm" data-testid={`extraction-title-${rec.id}`}>
                  {title}
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
                  onClick={() => onDelete({ type: 'tooth_extraction', id: rec.id, label: removed.length && !extracted.length ? `Implant removal — ${siteLabel(rec.tooth_numbers || [])}` : `Extraction — ${teethLabel(rec.tooth_numbers || [])}` })}
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
                <div><span className="text-[#5C6773]">{removed.length && !extracted.length ? 'New implant planned:' : 'Implant planned:'}</span> <span className="font-medium" style={{ color: EXTRACTION_COLOR }}>after {rec.reminder_days} days</span></div>
              )}
            </div>
            {rec.clinical_notes && <p className="mt-2 text-xs text-[#5C6773] italic">{rec.clinical_notes}</p>}
          </div>
          );
        })}
      </div>
    </div>
  );
}
