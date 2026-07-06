import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChatCircleDots, X, PaperPlaneTilt, Robot, User, ArrowSquareOut, Spinner } from '@phosphor-icons/react';
import client from '../api/client';
import { toast } from 'sonner';

const SUGGESTIONS = [
  'Add patient Ramesh, 55 male, hypertensive',
  'Log implant tooth 36, Nobel 4.5×10mm, today',
  'Summarise this patient\'s history',
  'What is the healing time after sinus lift?',
];

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isUser ? 'bg-[#82A098]' : 'bg-[#F0EDE8] border border-[#E5E5E2]'}`}>
        {isUser
          ? <User size={14} weight="fill" className="text-white" />
          : <Robot size={14} weight="fill" className="text-[#82A098]" />
        }
      </div>
      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
        isUser
          ? 'bg-[#82A098] text-white rounded-tr-sm'
          : 'bg-white border border-[#E5E5E2] text-[#2A2F35] rounded-tl-sm'
      }`}>
        {msg.content}
        {msg.action && <ActionChip action={msg.action} />}
      </div>
    </div>
  );
}

function ActionChip({ action }) {
  const navigate = useNavigate();
  if (!action) return null;

  if (action.type === 'patient_created') {
    return (
      <button
        onClick={() => navigate(`/patients/${action.patient_id}`)}
        className="mt-2 flex items-center gap-1 text-xs text-[#82A098] bg-[#F0F5F4] px-2 py-1 rounded-lg hover:bg-[#E0EDEA] transition-colors"
      >
        <ArrowSquareOut size={12} /> Open {action.name}'s record
      </button>
    );
  }
  if (action.type === 'implant_logged') {
    return (
      <button
        onClick={() => navigate(`/patients/${action.patient_id}`)}
        className="mt-2 flex items-center gap-1 text-xs text-[#82A098] bg-[#F0F5F4] px-2 py-1 rounded-lg hover:bg-[#E0EDEA] transition-colors"
      >
        <ArrowSquareOut size={12} /> View patient chart
      </button>
    );
  }
  return null;
}

export default function AIChatBox() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: 'Hi! I\'m your OSIOLOG assistant. I can help you add patients, log implants, look up clinical info, or summarise a patient\'s history.\n\nWhat would you like to do?',
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const location = useLocation();

  // Extract patient_id from URL if on a patient page
  const patientIdMatch = location.pathname.match(/\/patients\/([^/]+)/);
  const contextPatientId = patientIdMatch ? patientIdMatch[1] : null;

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, messages]);

  const send = async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const res = await client.post('/api/chat', {
        messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
        patient_id: contextPatientId,
      });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.content,
        action: res.data.action,
      }]);
    } catch (err) {
      toast.error('Chat failed — please try again');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* Floating button */}
      <button
        data-testid="ai-chat-toggle"
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-20 right-4 md:bottom-6 z-50 w-13 h-13 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          open ? 'bg-[#2A2F35] rotate-0' : 'bg-[#82A098] hover:bg-[#6B8A82]'
        }`}
        style={{ width: 52, height: 52 }}
        title="OSIOLOG AI Assistant"
      >
        {open
          ? <X size={22} weight="bold" className="text-white" />
          : <ChatCircleDots size={24} weight="fill" className="text-white" />
        }
      </button>

      {/* Chat panel */}
      {open && (
        <div
          data-testid="ai-chat-panel"
          className="fixed bottom-36 right-4 md:bottom-20 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm bg-white rounded-2xl shadow-2xl border border-[#E5E5E2] flex flex-col overflow-hidden"
          style={{ height: 480 }}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 bg-[#82A098] flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Robot size={18} weight="fill" className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white leading-tight">OSIOLOG Assistant</p>
              <p className="text-[10px] text-white/70">
                {contextPatientId ? 'Viewing patient context' : 'Ask me anything'}
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white p-1">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
            {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
            {loading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-[#F0EDE8] border border-[#E5E5E2] flex items-center justify-center flex-shrink-0">
                  <Robot size={14} weight="fill" className="text-[#82A098]" />
                </div>
                <div className="bg-white border border-[#E5E5E2] rounded-2xl rounded-tl-sm px-4 py-2.5 flex items-center gap-1.5">
                  <Spinner size={14} className="text-[#82A098] animate-spin" />
                  <span className="text-xs text-[#9CA3AF]">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions — only show if just the initial message */}
          {messages.length === 1 && (
            <div className="px-3 pb-2 flex flex-col gap-1.5">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => send(s)}
                  className="text-left text-xs px-3 py-2 bg-[#F9F9F8] border border-[#E5E5E2] rounded-xl text-[#5C6773] hover:border-[#82A098] hover:text-[#2A2F35] transition-colors">
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-2.5 border-t border-[#E5E5E2] flex gap-2 flex-shrink-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a message…"
              rows={1}
              disabled={loading}
              data-testid="ai-chat-input"
              className="flex-1 resize-none px-3 py-2 text-sm bg-[#F9F9F8] border border-[#E5E5E2] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#82A098] disabled:opacity-50 text-[#2A2F35]"
              style={{ maxHeight: 80 }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              data-testid="ai-chat-send"
              className="w-9 h-9 self-end rounded-xl bg-[#82A098] disabled:opacity-40 flex items-center justify-center hover:bg-[#6B8A82] transition-colors flex-shrink-0"
            >
              <PaperPlaneTilt size={16} weight="fill" className="text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
