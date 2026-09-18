/*
 * Shared grouping for clinical reminders — used by the header bell
 * (NotificationBell.js) and the Dashboard reminder sections.
 *
 * One row per patient, not per implant: a patient with eleven implants due for
 * second stage is one reminder listing eleven teeth, not eleven reminders.
 *
 * Lives here rather than in either caller so the two cannot drift apart. They
 * showed the same records to the same dentist and disagreeing about how to
 * count them would be its own bug.
 */

/**
 * @param items   records from a "due" feed, each carrying patient_id / patient_name
 * @param teethOf pulls tooth numbers out of one record — implant feeds carry a
 *                single `tooth_number`, extraction records carry `tooth_numbers`
 * @param rank    urgency of one record, lower being more urgent
 *
 * Each group is ranked by its most urgent member, and `lead` is that member, so
 * a caller can read its other fields (healing period, extraction date) without
 * re-deriving which record won. Taking the most urgent rather than the average
 * or the newest is deliberate: it is the only choice that cannot hide an overdue
 * tooth behind a comfortable one.
 */
export function groupRemindersByPatient(items, teethOf, rank) {
  const groups = new Map();

  for (const item of items) {
    let g = groups.get(item.patient_id);
    if (!g) {
      g = {
        patient_id: item.patient_id,
        patient_name: item.patient_name,
        teeth: [],
        count: 0,
        urgency: Infinity,
        lead: item,
      };
      groups.set(item.patient_id, g);
    }

    const teeth = teethOf(item).filter((t) => t !== null && t !== undefined);
    g.teeth.push(...teeth);
    // Count what would actually be treated: teeth where they are known,
    // otherwise the record itself, so a missing tooth number never reads as zero.
    g.count += teeth.length || 1;

    const r = rank(item);
    if (r < g.urgency) {
      g.urgency = r;
      g.lead = item;
    }
  }

  return [...groups.values()].sort((a, b) => a.urgency - b.urgency);
}

export function toothList(teeth) {
  return teeth.length ? teeth.join(', ') : 'Tooth not recorded';
}

/* Ranking helpers, so callers state urgency once rather than re-inventing the sign. */
export const byDaysUntil = (item) => item.days_until;        // negative = overdue
export const byDaysElapsed = (item) => -item.days_elapsed;   // more elapsed = more urgent
