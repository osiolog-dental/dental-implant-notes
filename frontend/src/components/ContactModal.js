import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import client from '../api/client';

const selectClass = "w-full px-3 py-2 bg-white border border-[#E5E5E2] rounded-md text-sm focus:ring-2 focus:ring-[#82A098] focus:outline-none";

const INITIAL = { name: '', email: '', subject: '', message: '' };

export default function ContactModal({ open, onOpenChange, defaultName = '', defaultEmail = '', defaultSubject = '', defaultMessage = '' }) {
  const [form, setForm] = useState({ ...INITIAL, name: defaultName, email: defaultEmail, subject: defaultSubject, message: defaultMessage });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ ...INITIAL, name: defaultName, email: defaultEmail, subject: defaultSubject, message: defaultMessage });
      setSent(false);
    }
  }, [open, defaultName, defaultEmail, defaultSubject, defaultMessage]);

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      // Public endpoint — plain axios-via-client works whether or not the
      // user is logged in; client.js only attaches a token if one exists.
      await client.post('/api/contact', form);
      setSent(true);
      toast.success('Message sent — we\'ll get back to you soon');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not send your message — please try again');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Contact Us</DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="text-center py-4">
            <p className="text-sm text-[#2A2F35] font-medium mb-1">Thanks — your message is on its way!</p>
            <p className="text-xs text-[#5C6773]">We usually reply within a day or two.</p>
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full mt-4 bg-[#82A098] hover:bg-[#6B8A82] text-white"
            >
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <p className="text-sm text-[#5C6773] -mt-1">
              Have a question, need help, or found a bug? Send us a message.
            </p>

            <div>
              <Label className="text-xs">Your Name</Label>
              <Input
                value={form.name}
                onChange={e => updateField('name', e.target.value)}
                placeholder="Dr. Jane Doe"
                data-testid="contact-name-input"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => updateField('email', e.target.value)}
                required
                placeholder="you@example.com"
                data-testid="contact-email-input"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Subject</Label>
              <Input
                value={form.subject}
                onChange={e => updateField('subject', e.target.value)}
                placeholder="What's this about?"
                data-testid="contact-subject-input"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Message *</Label>
              <textarea
                value={form.message}
                onChange={e => updateField('message', e.target.value)}
                required
                rows={5}
                className={`mt-1 ${selectClass}`}
                placeholder="Tell us what's on your mind..."
                data-testid="contact-message-input"
              />
            </div>

            <Button
              type="submit"
              disabled={sending}
              data-testid="contact-send-button"
              className="w-full bg-[#82A098] hover:bg-[#6B8A82] text-white"
            >
              {sending ? 'Sending...' : 'Send Message'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
