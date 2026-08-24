import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function MissingTeethDialog({ missingConfirm, onToggleTooth, onConfirm, onClose }) {
  return (
    <Dialog open={!!missingConfirm} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#2A2F35]">
            {missingConfirm?.action === 'mark' ? '⚠️ Mark Teeth as Missing' : '↩️ Restore Teeth'}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <p className="text-xs text-[#5C6773] mb-3">
            {missingConfirm?.action === 'mark'
              ? 'Select all teeth to mark as missing. They will be saved to the patient record.'
              : 'Select all missing teeth to restore to healthy status.'}
          </p>
          {/* Upper arch teeth */}
          <div className="mb-2">
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide mb-1">Upper Arch</p>
            <div className="flex flex-wrap gap-1.5">
              {[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28].map(tn => (
                <button
                  key={tn}
                  type="button"
                  data-testid={`missing-tooth-${tn}`}
                  onClick={() => onToggleTooth(tn)}
                  className={`w-9 h-9 text-xs font-medium rounded-md border transition-colors ${
                    missingConfirm?.selectedTeeth?.includes(tn)
                      ? missingConfirm.action === 'mark'
                        ? 'bg-red-500 text-white border-red-500'
                        : 'bg-[#82A098] text-white border-[#82A098]'
                      : 'bg-white text-[#2A2F35] border-[#E5E5E2] hover:border-[#82A098]'
                  }`}
                >{tn}</button>
              ))}
            </div>
          </div>
          {/* Lower arch teeth */}
          <div>
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide mb-1">Lower Arch</p>
            <div className="flex flex-wrap gap-1.5">
              {[48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38].map(tn => (
                <button
                  key={tn}
                  type="button"
                  data-testid={`missing-tooth-${tn}`}
                  onClick={() => onToggleTooth(tn)}
                  className={`w-9 h-9 text-xs font-medium rounded-md border transition-colors ${
                    missingConfirm?.selectedTeeth?.includes(tn)
                      ? missingConfirm.action === 'mark'
                        ? 'bg-red-500 text-white border-red-500'
                        : 'bg-[#82A098] text-white border-[#82A098]'
                      : 'bg-white text-[#2A2F35] border-[#E5E5E2] hover:border-[#82A098]'
                  }`}
                >{tn}</button>
              ))}
            </div>
          </div>
          {missingConfirm?.selectedTeeth?.length > 0 && (
            <p className="mt-2 text-xs text-[#5C6773]">
              Selected: <span className="font-medium text-[#2A2F35]">{missingConfirm.selectedTeeth.join(', ')}</span>
            </p>
          )}
        </div>
        <div className="flex gap-3 pt-1">
          <Button
            data-testid="confirm-missing-btn"
            onClick={onConfirm}
            disabled={!missingConfirm?.selectedTeeth?.length}
            className={`flex-1 text-white ${missingConfirm?.action === 'mark' ? 'bg-red-500 hover:bg-red-600' : 'bg-[#82A098] hover:bg-[#6B8A82]'}`}
          >
            {missingConfirm?.action === 'mark'
              ? `Mark ${missingConfirm?.selectedTeeth?.length || 0} as Missing`
              : `Restore ${missingConfirm?.selectedTeeth?.length || 0} Teeth`}
          </Button>
          <Button
            data-testid="cancel-missing-btn"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
