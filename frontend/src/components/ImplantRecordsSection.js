import { Tag, PencilSimple, Trash } from '@phosphor-icons/react';
import ImplantProgressTracker from './ImplantProgressTracker';

const getDaysRemaining = (osseoDate) => {
  if (!osseoDate) return 0;
  const days = Math.ceil((new Date(osseoDate) - new Date()) / (1000 * 60 * 60 * 24));
  return days > 0 ? days : 0;
};

const isFailed = (i) => (i.implant_outcome || '').toLowerCase() === 'failed';
const fmtDate = (d) => {
  const dt = new Date(d);
  return isNaN(dt) ? String(d) : dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};
// Same rule as the chart: a failed implant counts as removed once a removal date
// is recorded, or when a newer implant has already been logged on that tooth.
const failedState = (implant, all) => {
  if (!isFailed(implant)) return null;
  if (implant.removed_date) return { removed: true, text: `Failed — removed on ${fmtDate(implant.removed_date)}` };
  const stamp = (i) => String(i.created_at || i.surgery_date || '');
  const replaced = all.some(o => o.id !== implant.id && o.tooth_number === implant.tooth_number && !isFailed(o) && stamp(o) > stamp(implant));
  if (replaced) return { removed: true, text: 'Failed — removed (replaced by a new implant)' };
  return { removed: false, text: 'Failed — waiting to be removed' };
};

export default function ImplantRecordsSection({ implants, onEdit, onDelete, onUpdate }) {
  if (implants.length === 0) return null;
  // FDI numbering already sorts 1st quadrant (11-18) through 4th quadrant (41-48)
  // in ascending order — just sort by tooth number.
  const sortedImplants = [...implants].sort((a, b) => (a.tooth_number || 0) - (b.tooth_number || 0));
  return (
    <div className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm mb-6">
      <h2 className="text-lg font-medium text-[#2A2F35] mb-4">
        Implant Records ({implants.length})
      </h2>
      <div className="space-y-3">
        {sortedImplants.map((implant) => {
          const failed = failedState(implant, implants);
          // A failed implant isn't healing — no countdown, no stage tracker.
          const daysRemaining = failed ? 0 : getDaysRemaining(implant.osseointegration_date);
          return (
            <div key={implant.id} data-testid={`implant-record-${implant.id}`} className={`border rounded-lg p-4 transition-all ${failed ? 'border-red-300 bg-red-50/40' : 'border-[#E5E5E2] hover:border-[#82A098]'}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${failed ? 'bg-[#DC2626]' : 'bg-[#82A098]'} rounded-lg flex items-center justify-center text-white font-medium text-sm flex-shrink-0`}>
                    {implant.tooth_number}
                  </div>
                  <div>
                    <h3 className="font-medium text-[#2A2F35] text-sm">{implant.implant_type} Implant</h3>
                    <p className="text-xs text-[#5C6773]">{implant.brand}{implant.implant_system ? ` - ${implant.implant_system}` : ''}</p>
                    {implant.case_number && <p className="text-xs text-[#5C6773]">Case: {implant.case_number}</p>}
                    {failed && (
                      <p className="text-xs font-semibold text-[#DC2626] mt-0.5" data-testid={`implant-failed-status-${implant.id}`}>{failed.text}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3 flex-shrink-0 ml-2">
                  <button
                    data-testid={`edit-implant-${implant.id}`}
                    onClick={() => onEdit(implant)}
                    className="p-1.5 rounded-md hover:bg-[#F0F0EE] text-[#5C6773] hover:text-[#82A098] transition-colors"
                    title="Edit implant record"
                  >
                    <PencilSimple size={15} weight="bold" />
                  </button>
                  <button
                    data-testid={`delete-implant-${implant.id}`}
                    onClick={() => onDelete({ type: 'implant', id: implant.id, label: `Implant — Tooth #${implant.tooth_number}` })}
                    className="p-1.5 rounded-md hover:bg-red-50 text-[#5C6773] hover:text-red-500 transition-colors"
                    title="Delete implant record"
                  >
                    <Trash size={15} weight="bold" />
                  </button>
                  {/* Tag image thumbnail */}
                  {implant.tag_image ? (
                    <div className="relative group" data-testid={`tag-thumb-${implant.id}`}>
                      <img
                        src={implant.tag_image}
                        alt="Implant tag"
                        className="w-14 h-14 object-cover rounded-lg border border-[#E5E5E2] shadow-sm cursor-pointer"
                        onClick={() => window.open(implant.tag_image, '_blank')}
                        title="Click to view full tag"
                      />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#82A098] rounded-full flex items-center justify-center shadow">
                        <Tag size={10} className="text-white" weight="fill" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-lg border border-dashed border-[#E5E5E2] flex items-center justify-center" title="No tag image">
                      <Tag size={16} className="text-[#E5E5E2]" />
                    </div>
                  )}
                  {daysRemaining > 0 && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-[#E8A76C]">{daysRemaining} days</p>
                      <p className="text-xs text-[#5C6773]">until osseointegration</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div><span className="text-[#5C6773]">Diameter:</span> <span className="font-medium text-[#2A2F35]">{implant.diameter_mm ? `${implant.diameter_mm} mm` : '—'}</span></div>
                <div><span className="text-[#5C6773]">Length:</span> <span className="font-medium text-[#2A2F35]">{implant.length_mm ? `${implant.length_mm} mm` : '—'}</span></div>
                <div><span className="text-[#5C6773]">Torque:</span> <span className="font-medium text-[#2A2F35]">{implant.insertion_torque || 'N/A'} Ncm</span></div>
                <div><span className="text-[#5C6773]">Connection:</span> <span className="font-medium text-[#2A2F35]">{implant.connection_type}</span></div>
                {implant.surgeon_name && <div><span className="text-[#5C6773]">Surgeon:</span> <span className="font-medium text-[#2A2F35]">{implant.surgeon_name}</span></div>}
                {implant.consultant_surgeon && <div><span className="text-[#5C6773]">Consultant:</span> <span className="font-medium text-[#C27E70]">{implant.consultant_surgeon}</span></div>}
              </div>
              {implant.notes && <p className="mt-2 text-xs text-[#5C6773] italic">{implant.notes}</p>}
              {!failed && <ImplantProgressTracker implant={implant} onUpdate={onUpdate} />}
              {failed && !failed.removed && (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    data-testid={`record-removal-${implant.id}`}
                    onClick={() => onEdit(implant)}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] transition-colors"
                  >
                    Record removal
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
