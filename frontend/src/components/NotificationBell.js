import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ArrowsClockwise, WarningCircle } from '@phosphor-icons/react';
import { getDueForFollowUp, getDueForSecondStage, getDueForImplant } from '../api/dashboard';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';

/*
 * Reminder bell in the top header.
 *
 * Reads the three clinical "due" feeds that already exist — it stores nothing
 * and has no read/unread state, so the count is always simply what is due right
 * now. An item leaves the list when the clinical record is updated (outcome
 * recorded, second stage logged, implant placed), not when it is clicked.
 */

/* Overdue reads as an error, still-upcoming as a warning — design_guidelines status tokens. */
const OVERDUE = '#C27E70';
const UPCOMING = '#E8A76C';
const INFO = '#7B9EBB';

function followUpTiming(days) {
  if (days < 0) {
    const late = Math.abs(days);
    return { text: `Overdue by ${late} day${late > 1 ? 's' : ''}`, color: OVERDUE, urgent: true };
  }
  if (days === 0) return { text: 'Due today', color: OVERDUE, urgent: true };
  return { text: `Due in ${days} day${days > 1 ? 's' : ''}`, color: UPCOMING, urgent: false };
}

function Row({ testId, badge, badgeColor, title, timing, timingColor, onClick }) {
  return (
    <DropdownMenuItem
      data-testid={testId}
      onClick={onClick}
      className="cursor-pointer gap-3 px-3 py-2.5 focus:bg-[#F0F0EE]"
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
        style={{ backgroundColor: badgeColor }}
      >
        {badge}
      </div>
      <p className="min-w-0 flex-1 text-sm font-medium text-[#2A2F35] truncate">{title}</p>
      <span className="text-[11px] font-semibold shrink-0" style={{ color: timingColor }}>
        {timing}
      </span>
    </DropdownMenuItem>
  );
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [followUps, setFollowUps] = useState([]);
  const [secondStage, setSecondStage] = useState([]);
  const [extractions, setExtractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      getDueForFollowUp(),
      getDueForSecondStage(),
      getDueForImplant(),
    ]);
    const [f, s, e] = results;
    setFollowUps(f.status === 'fulfilled' ? f.value : []);
    setSecondStage(s.status === 'fulfilled' ? s.value : []);
    setExtractions(e.status === 'fulfilled' ? e.value : []);
    // Rule 4 — a failed fetch must be visible, not a silently empty bell.
    setError(results.some(r => r.status === 'rejected')
      ? "Couldn't load some reminders. Check your connection and try again."
      : '');
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const total = followUps.length + secondStage.length + extractions.length;

  const goToPatient = (patientId) => {
    setOpen(false);
    navigate(`/patients/${patientId}`);
  };

  return (
    <DropdownMenu open={open} onOpenChange={(o) => { setOpen(o); if (o) load(); }}>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="notification-bell-trigger"
          aria-label={total > 0 ? `Notifications, ${total} due` : 'Notifications'}
          className="relative flex items-center justify-center h-9 w-9 rounded-lg hover:bg-[#F0F0EE] transition-colors duration-150 outline-none"
        >
          <Bell size={20} weight={total > 0 ? 'fill' : 'regular'} className="text-[#5C6773]" />
          {total > 0 && (
            <span
              data-testid="notification-bell-badge"
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#C27E70] text-white text-[10px] font-semibold flex items-center justify-center"
            >
              {total > 99 ? '99+' : total}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[330px] max-h-[70vh] overflow-y-auto p-0"
        data-testid="notification-panel"
      >
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#E5E5E2] sticky top-0 bg-white z-10">
          <p className="text-sm font-semibold text-[#2A2F35]" style={{ fontFamily: 'Work Sans, sans-serif' }}>
            Reminders
          </p>
          {total > 0 && (
            <span className="bg-[#C27E70] text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
              {total}
            </span>
          )}
          <button
            data-testid="notification-refresh-btn"
            aria-label="Refresh reminders"
            onClick={(ev) => { ev.preventDefault(); load(); }}
            className="ml-auto p-1 rounded-md hover:bg-[#F0F0EE] text-[#5C6773] transition-colors"
          >
            <ArrowsClockwise size={15} weight="regular" />
          </button>
        </div>

        {error && (
          <div
            data-testid="notification-error"
            className="flex items-start gap-2 px-3 py-2.5 bg-[#FDF5F3] border-b border-[#E5E5E2]"
          >
            <WarningCircle size={15} weight="fill" className="text-[#C27E70] mt-0.5 shrink-0" />
            <p className="text-xs text-[#5C6773]">{error}</p>
          </div>
        )}

        {loading && total === 0 && (
          <p className="px-3 py-6 text-center text-xs text-[#5C6773]">Loading reminders…</p>
        )}

        {!loading && total === 0 && !error && (
          <div className="px-3 py-8 text-center" data-testid="notification-empty">
            <Bell size={26} weight="regular" className="text-[#A1A9B3] mx-auto mb-2" />
            <p className="text-sm text-[#2A2F35] font-medium">Nothing due</p>
            <p className="text-xs text-[#5C6773] mt-0.5">
              Follow-ups, second stages and healed extraction sites appear here.
            </p>
          </div>
        )}

        {followUps.length > 0 && (
          <>
            <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-[#5C6773] font-semibold px-3 pt-3 pb-1">
              Implant follow-ups
            </DropdownMenuLabel>
            {followUps.map((item) => {
              const t = followUpTiming(item.days_until);
              return (
                <Row
                  key={item.implant_id}
                  testId={`notification-followup-${item.implant_id}`}
                  badge={item.tooth_number ?? '—'}
                  badgeColor={t.color}
                  title={item.patient_name}
                  timing={t.text}
                  timingColor={t.color}
                  onClick={() => goToPatient(item.patient_id)}
                />
              );
            })}
          </>
        )}

        {secondStage.length > 0 && (
          <>
            {followUps.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-[#5C6773] font-semibold px-3 pt-3 pb-1">
              Ready for second stage
            </DropdownMenuLabel>
            {secondStage.map((item) => (
              <Row
                key={item.implant_id}
                testId={`notification-second-stage-${item.implant_id}`}
                badge={item.tooth_number ?? '—'}
                badgeColor={OVERDUE}
                title={item.patient_name}
                timing={`Day ${item.days_elapsed}`}
                timingColor={OVERDUE}
                onClick={() => goToPatient(item.patient_id)}
              />
            ))}
          </>
        )}

        {extractions.length > 0 && (
          <>
            {(followUps.length > 0 || secondStage.length > 0) && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-[#5C6773] font-semibold px-3 pt-3 pb-1">
              Ready for implant placement
            </DropdownMenuLabel>
            {extractions.map((item) => (
              <Row
                key={item.extraction_id}
                testId={`notification-extraction-${item.extraction_id}`}
                badge={item.tooth_numbers?.length > 1 ? item.tooth_numbers.length : (item.tooth_numbers?.[0] ?? '—')}
                badgeColor={INFO}
                title={item.patient_name}
                timing={`Day ${item.days_elapsed}`}
                timingColor={INFO}
                onClick={() => goToPatient(item.patient_id)}
              />
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
