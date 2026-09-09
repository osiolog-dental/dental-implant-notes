import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Envelope, Copy, CheckCircle } from '@phosphor-icons/react';

const SUPPORT_EMAIL = 'admin@osiolog.com';

export default function ContactModal({ open, onOpenChange }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopied(true);
      toast.success('Email address copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy — please select and copy the address manually');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Contact Us</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-[#5C6773] -mt-1">
          Have a question, need help, or found a bug? We'd love to hear from you.
        </p>

        <div className="flex items-center justify-between gap-2 mt-2 px-3 py-2.5 rounded-lg bg-[#F0F0EE] border border-[#E5E5E2]">
          <span className="flex items-center gap-2 text-sm font-medium text-[#2A2F35] truncate">
            <Envelope size={16} className="text-[#82A098] shrink-0" weight="fill" />
            {SUPPORT_EMAIL}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            data-testid="contact-copy-email-btn"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#5C6773] hover:bg-white border border-[#E5E5E2] transition-colors shrink-0"
          >
            {copied ? <CheckCircle size={13} weight="fill" className="text-emerald-600" /> : <Copy size={13} weight="bold" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <Button
          asChild
          data-testid="contact-open-email-btn"
          className="w-full mt-3 bg-[#82A098] hover:bg-[#6B8A82] text-white"
        >
          <a href={`mailto:${SUPPORT_EMAIL}?subject=Osiolog%20Support%20Request`}>
            Open in Email App
          </a>
        </Button>
        <p className="text-[11px] text-[#9CA3AF] text-center mt-2">
          If nothing opens, copy the address above and email us from your usual inbox (Gmail, etc.)
        </p>
      </DialogContent>
    </Dialog>
  );
}
