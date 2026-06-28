import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Warning } from '@phosphor-icons/react';

/*
  Generic "are you sure" dialog for destructive deletes. Pass `open` as either
  a boolean or the record being deleted (truthy) — onOpenChange receives false
  to close, true is ignored since this dialog has no trigger of its own.
*/
export default function ConfirmDeleteDialog({ open, onOpenChange, onConfirm, title, description, confirmLabel = 'Delete', deleting = false, testIdPrefix = 'confirm-delete' }) {
  return (
    <Dialog open={!!open} onOpenChange={(next) => { if (!next) onOpenChange(false); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <Warning size={20} className="text-red-500" />
            </div>
            <DialogTitle className="text-base font-semibold text-[#2A2F35]">{title}</DialogTitle>
          </div>
        </DialogHeader>
        <p className="text-sm text-[#5C6773] py-2">{description}</p>
        <div className="flex gap-3 pt-1">
          <Button
            data-testid={`${testIdPrefix}-confirm`}
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white"
          >
            {deleting ? 'Deleting…' : confirmLabel}
          </Button>
          <Button
            data-testid={`${testIdPrefix}-cancel`}
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
