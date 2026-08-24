import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function FailedImplantDialog({ failedImplantConfirm, onClose, onConfirm }) {
  return (
    <Dialog open={!!failedImplantConfirm} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm" data-testid="failed-implant-confirm-dialog">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#2A2F35]">Implant Already Recorded</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-[#5C6773] mt-1">
          Tooth <strong>#{failedImplantConfirm.toothNumber}</strong> already has an implant on record.
          Did the previous implant fail? Add a new implant only if the old one was removed.
        </p>
        <div className="flex gap-3 mt-4">
          <button
            data-testid="failed-implant-cancel-btn"
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-[#E5E5E2] text-sm font-semibold text-[#5C6773] hover:bg-[#F9F9F8] transition-colors"
          >
            Cancel
          </button>
          <button
            data-testid="failed-implant-confirm-btn"
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-lg bg-[#C27E70] text-white text-sm font-semibold hover:bg-[#b06d60] transition-colors"
          >
            Yes, Add New Implant
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
