import { PencilSimple, Trash } from '@phosphor-icons/react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function FpdRecordsSection({ fpdRecords, onEdit, onDelete }) {
  if (fpdRecords.length === 0) return null;
  return (
    <div className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm mb-6">
      <h2 className="text-lg font-medium text-[#2A2F35] mb-4">
        FPD Records ({fpdRecords.length})
      </h2>
      <div className="space-y-3">
        {fpdRecords.map((fpd) => (
          <div key={fpd.id} data-testid={`fpd-record-${fpd.id}`} className="border border-[#E5E5E2] rounded-lg p-4 hover:border-[#3B82F6] transition-all">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-medium text-[#2A2F35] text-sm">
                  FPD - Teeth: {fpd.tooth_numbers?.join(', ')}
                </h3>
                <p className="text-xs text-[#5C6773]">{fpd.case_number}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  data-testid={`edit-fpd-${fpd.id}`}
                  onClick={() => onEdit(fpd)}
                  className="p-1.5 rounded-md hover:bg-[#F0F0EE] text-[#5C6773] hover:text-[#3B82F6] transition-colors"
                  title="Edit FPD record"
                >
                  <PencilSimple size={15} weight="bold" />
                </button>
                <button
                  data-testid={`delete-fpd-${fpd.id}`}
                  onClick={() => onDelete({ type: 'fpd', id: fpd.id, label: `FPD — Teeth ${fpd.tooth_numbers?.join(', ')}` })}
                  className="p-1.5 rounded-md hover:bg-red-50 text-[#5C6773] hover:text-red-500 transition-colors"
                  title="Delete FPD record"
                >
                  <Trash size={15} weight="bold" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div><span className="text-[#5C6773]">Crown:</span> <span className="font-medium text-[#2A2F35]">{fpd.crown_count}</span></div>
              <div><span className="text-[#5C6773]">Type:</span> <span className="font-medium text-[#2A2F35]">{fpd.crown_type}</span></div>
              <div><span className="text-[#5C6773]">Material:</span> <span className="font-medium text-[#2A2F35]">{fpd.crown_material}</span></div>
              {fpd.prosthetic_loading_date && (
                <div><span className="text-[#5C6773]">Loading:</span> <span className="font-medium text-[#2A2F35]">{fpd.prosthetic_loading_date}</span></div>
              )}
              {fpd.consultant_prosthodontist && (
                <div><span className="text-[#5C6773]">Consultant:</span> <span className="font-medium text-[#2A2F35]">{fpd.consultant_prosthodontist}</span></div>
              )}
              {fpd.lab_name && (
                <div><span className="text-[#5C6773]">Lab:</span> <span className="font-medium text-[#2A2F35]">{fpd.lab_name}</span></div>
              )}
            </div>
            {fpd.clinical_notes && <p className="mt-2 text-xs text-[#5C6773] italic">{fpd.clinical_notes}</p>}
            {fpd.warranty_image && (
              <div className="mt-2">
                <a href={`${API_URL}/api/files/${fpd.warranty_image}`} target="_blank" rel="noopener noreferrer">
                  <img src={`${API_URL}/api/files/${fpd.warranty_image}`} alt="Warranty card"
                    className="h-16 w-auto rounded border border-[#E5E5E2] object-cover hover:opacity-80 transition-opacity cursor-pointer" />
                </a>
                <p className="text-[10px] text-[#9CA3AF] mt-0.5">Warranty card</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
