import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import client from '../api/client';

const selectClass = "w-full px-3 py-2 bg-white border border-[#E5E5E2] rounded-md text-sm focus:ring-2 focus:ring-[#82A098] focus:outline-none";

const TEMPLATES = [
  {
    key: 'maintenance',
    label: 'Maintenance Notice',
    subject: 'Scheduled maintenance — Osiolog',
    message: "Hi,\n\nOsiolog will be undergoing scheduled maintenance on [date] from [start time] to [end time] ([timezone]). The app may be briefly unavailable during this window.\n\nWe apologize for any inconvenience — thanks for your patience.\n\n— Osiolog Team",
  },
  {
    key: 'promo',
    label: 'Promotional Offer',
    subject: 'A special offer for you — Osiolog',
    message: "Hi,\n\nWe wanted to let you know about [offer details] available until [date].\n\n[Call to action]\n\n— Osiolog Team",
  },
  {
    key: 'support',
    label: 'Support Follow-up',
    subject: 'Following up on your Osiolog issue',
    message: "Hi,\n\nFollowing up on the issue you reported — [describe resolution/status].\n\nLet us know if you're still seeing any trouble.\n\n— Osiolog Team",
  },
];

export default function SendEmailModal({ open, onOpenChange, initialRecipients = [], onSent }) {
  const [recipientsText, setRecipientsText] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setRecipientsText(initialRecipients.join(', '));
      setSubject('');
      setMessage('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const applyTemplate = (tpl) => {
    setSubject(tpl.subject);
    setMessage(tpl.message);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const recipients = recipientsText.split(',').map(r => r.trim()).filter(Boolean);
    if (recipients.length === 0) {
      toast.error('Add at least one recipient');
      return;
    }
    setSending(true);
    try {
      const res = await client.post('/api/admin/send-email', { recipients, subject, message });
      const { sent, failed } = res.data;
      if (sent.length > 0) toast.success(`Sent to ${sent.length} recipient${sent.length === 1 ? '' : 's'}`);
      if (failed.length > 0) toast.error(`Failed for: ${failed.join(', ')}`);
      onSent?.();
      if (failed.length === 0) onOpenChange(false);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not send');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Send Email</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATES.map(tpl => (
            <button key={tpl.key} type="button" onClick={() => applyTemplate(tpl)} className="px-2.5 py-1 text-xs font-medium border border-[#E5E5E2] rounded-full text-[#5C6773] hover:border-[#82A098] hover:text-[#2A2F35] transition-colors">
              {tpl.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSend} className="space-y-4 mt-1">
          <div>
            <Label className="text-xs">Recipients (comma-separated) *</Label>
            <textarea
              value={recipientsText}
              onChange={e => setRecipientsText(e.target.value)}
              rows={2}
              required
              className={`mt-1 ${selectClass}`}
              placeholder="doctor1@example.com, doctor2@example.com"
              data-testid="send-email-recipients"
            />
          </div>
          <div>
            <Label className="text-xs">Subject *</Label>
            <input value={subject} onChange={e => setSubject(e.target.value)} required className={`mt-1 ${selectClass}`} data-testid="send-email-subject" />
          </div>
          <div>
            <Label className="text-xs">Message *</Label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={8}
              required
              className={`mt-1 ${selectClass}`}
              data-testid="send-email-message"
            />
          </div>
          <Button type="submit" disabled={sending} data-testid="send-email-submit" className="w-full bg-[#82A098] hover:bg-[#6B8A82] text-white">
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
