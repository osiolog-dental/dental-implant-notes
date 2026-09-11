import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Buildings, Users, Tooth, Envelope, PaperPlaneTilt, ChartLine, GlobeHemisphereWest, Fingerprint } from '@phosphor-icons/react';
import client from '../api/client';
import SendEmailModal from '../components/SendEmailModal';

const PLAN_OPTIONS = ['free', 'basic', 'pro', 'clinic', 'enterprise'];

function PlanBadge({ plan }) {
  const colors = {
    free: 'bg-[#F0F0EE] text-[#5C6773]',
    basic: 'bg-blue-50 text-blue-700',
    pro: 'bg-[#EEF4F3] text-[#82A098]',
    clinic: 'bg-[#FDF6F4] text-[#C27E70]',
    enterprise: 'bg-purple-50 text-purple-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${colors[plan] || colors.free}`}>
      {plan}
    </span>
  );
}

function GrowthChart({ data }) {
  if (!data || data.length === 0) return <p className="text-sm text-[#9CA3AF] p-4">No signups yet.</p>;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-2 h-32 px-4 pt-4">
      {data.map(d => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <span className="text-[10px] font-semibold text-[#2A2F35]">{d.count}</span>
          <div className="w-full bg-[#82A098] rounded-t-sm" style={{ height: `${Math.max((d.count / max) * 80, 3)}px` }} />
          <span className="text-[9px] text-[#9CA3AF] truncate w-full text-center">{d.month.slice(2)}</span>
        </div>
      ))}
    </div>
  );
}

function OrgRow({ org, onPlanChanged, selected, onToggleSelect }) {
  const [plan, setPlan] = useState(org.plan);
  const [notes, setNotes] = useState(org.plan_notes || '');
  const [saving, setSaving] = useState(false);
  const dirty = plan !== org.plan || notes !== (org.plan_notes || '');

  const handleSave = async () => {
    setSaving(true);
    try {
      await client.patch(`/api/admin/organizations/${org.id}/plan`, { plan, notes: notes || null });
      toast.success(`${org.name} set to ${plan}`);
      onPlanChanged();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not update plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="border-t border-[#F0F0EE]" data-testid={`admin-org-${org.id}`}>
      <td className="px-3 py-3">
        <input type="checkbox" checked={selected} onChange={() => onToggleSelect(org)} disabled={!org.owner_email} data-testid={`admin-org-select-${org.id}`} />
      </td>
      <td className="px-3 py-3">
        <p className="text-sm font-medium text-[#2A2F35]">{org.name}</p>
        <p className="text-xs text-[#9CA3AF]">{org.owner_name}{org.owner_email ? ` · ${org.owner_email}` : ''}{org.owner_country ? ` · ${org.owner_country}` : ''}</p>
      </td>
      <td className="px-3 py-3 text-center text-sm">{org.patient_count}</td>
      <td className="px-3 py-3 text-center text-sm">{org.implant_count}</td>
      <td className="px-3 py-3">
        <select value={plan} onChange={e => setPlan(e.target.value)} className="px-2 py-1 border border-[#E5E5E2] rounded-md text-xs" data-testid={`admin-plan-select-${org.id}`}>
          {PLAN_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </td>
      <td className="px-3 py-3">
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. paid via UPI, valid till Dec" className="w-full px-2 py-1 border border-[#E5E5E2] rounded-md text-xs" />
      </td>
      <td className="px-3 py-3 text-xs text-[#9CA3AF] whitespace-nowrap">{new Date(org.created_at).toLocaleDateString()}</td>
      <td className="px-3 py-3">
        {dirty && (
          <button onClick={handleSave} disabled={saving} data-testid={`admin-save-plan-${org.id}`} className="px-3 py-1 bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium rounded-md disabled:opacity-60">
            {saving ? 'Saving...' : 'Save'}
          </button>
        )}
      </td>
    </tr>
  );
}

export default function Admin() {
  const [overview, setOverview] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [firebaseUsers, setFirebaseUsers] = useState([]);
  const [firebaseError, setFirebaseError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrgIds, setSelectedOrgIds] = useState(new Set());
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailPrefill, setEmailPrefill] = useState([]);

  const fetchAll = async () => {
    try {
      const [overviewRes, orgsRes, messagesRes] = await Promise.all([
        client.get('/api/admin/overview'),
        client.get('/api/admin/organizations'),
        client.get('/api/admin/contact-messages'),
      ]);
      setOverview(overviewRes.data);
      setOrgs(orgsRes.data);
      setMessages(messagesRes.data);
    } catch {
      toast.error('Failed to load admin data — you may not have admin access');
    } finally {
      setLoading(false);
    }

    try {
      const firebaseRes = await client.get('/api/admin/firebase-users');
      setFirebaseUsers(firebaseRes.data);
      setFirebaseError(null);
    } catch (err) {
      setFirebaseError(err?.response?.data?.detail || 'Could not load Firebase accounts');
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const toggleSelect = (org) => {
    setSelectedOrgIds(prev => {
      const next = new Set(prev);
      if (next.has(org.id)) next.delete(org.id); else next.add(org.id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const selectable = orgs.filter(o => o.owner_email);
    setSelectedOrgIds(prev => prev.size === selectable.length ? new Set() : new Set(selectable.map(o => o.id)));
  };

  const selectedEmails = useMemo(
    () => orgs.filter(o => selectedOrgIds.has(o.id) && o.owner_email).map(o => o.owner_email),
    [orgs, selectedOrgIds]
  );

  const openBulkEmail = () => {
    if (selectedEmails.length === 0) {
      toast.error('Select at least one organization first');
      return;
    }
    setEmailPrefill(selectedEmails);
    setEmailModalOpen(true);
  };

  const openSingleEmail = (email) => {
    setEmailPrefill([email]);
    setEmailModalOpen(true);
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#82A098] mx-auto"></div>
      </div>
    );
  }

  if (!overview) {
    return <div className="p-8 text-center text-[#5C6773]">Could not load admin data.</div>;
  }

  return (
    <div className="p-4 md:p-8" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-4xl font-semibold text-[#2A2F35] tracking-tight" style={{ fontFamily: 'Work Sans, sans-serif' }}>
          Admin
        </h1>
        <button onClick={() => { setEmailPrefill([]); setEmailModalOpen(true); }} data-testid="admin-compose-button" className="flex items-center gap-1.5 px-4 py-2 bg-[#82A098] hover:bg-[#6B8A82] text-white text-sm font-medium rounded-lg transition-colors">
          <PaperPlaneTilt size={16} weight="bold" /> Compose Email
        </button>
      </div>
      <p className="text-[#5C6773] mb-8">System health — no patient or clinical data is shown here.</p>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-[#E5E5E2] rounded-xl p-5 flex items-center gap-3">
          <Buildings size={24} className="text-[#82A098]" weight="fill" />
          <div>
            <div className="text-2xl font-bold text-[#2A2F35]">{overview.total_organizations}</div>
            <div className="text-xs text-[#5C6773]">Organizations</div>
          </div>
        </div>
        <div className="bg-white border border-[#E5E5E2] rounded-xl p-5 flex items-center gap-3">
          <Users size={24} className="text-[#2563EB]" weight="fill" />
          <div>
            <div className="text-2xl font-bold text-[#2A2F35]">{overview.total_users}</div>
            <div className="text-xs text-[#5C6773]">Registered users</div>
          </div>
        </div>
        <div className="bg-white border border-[#E5E5E2] rounded-xl p-5 flex items-center gap-3">
          <Users size={24} className="text-[#7C3AED]" weight="fill" />
          <div>
            <div className="text-2xl font-bold text-[#2A2F35]">{overview.total_patients}</div>
            <div className="text-xs text-[#5C6773]">Patients (platform-wide)</div>
          </div>
        </div>
        <div className="bg-white border border-[#E5E5E2] rounded-xl p-5 flex items-center gap-3">
          <Tooth size={24} className="text-[#C27E70]" weight="fill" />
          <div>
            <div className="text-2xl font-bold text-[#2A2F35]">{overview.total_implants}</div>
            <div className="text-xs text-[#5C6773]">Implants logged</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {Object.entries(overview.plan_breakdown).map(([plan, count]) => (
          <div key={plan} className="flex items-center gap-1.5 bg-white border border-[#E5E5E2] rounded-lg px-3 py-1.5">
            <PlanBadge plan={plan} />
            <span className="text-sm font-semibold text-[#2A2F35]">{count}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="bg-white border border-[#E5E5E2] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E5E2] flex items-center gap-2">
            <ChartLine size={16} className="text-[#82A098]" />
            <h3 className="text-sm font-semibold text-[#2A2F35]">Signups by Month</h3>
          </div>
          <GrowthChart data={overview.signups_by_month} />
        </div>
        <div className="bg-white border border-[#E5E5E2] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E5E2] flex items-center gap-2">
            <GlobeHemisphereWest size={16} className="text-[#82A098]" />
            <h3 className="text-sm font-semibold text-[#2A2F35]">Users by Country</h3>
          </div>
          <div className="p-4 space-y-2 max-h-32 overflow-y-auto">
            {overview.users_by_country.map(c => (
              <div key={c.country} className="flex items-center justify-between text-sm">
                <span className="text-[#2A2F35]">{c.country}</span>
                <span className="font-semibold text-[#5C6773]">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-[#2A2F35]">Organizations</h2>
        {selectedOrgIds.size > 0 && (
          <button onClick={openBulkEmail} data-testid="admin-bulk-email-button" className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium rounded-md">
            <PaperPlaneTilt size={14} weight="bold" /> Email {selectedOrgIds.size} Selected
          </button>
        )}
      </div>
      <div className="bg-white border border-[#E5E5E2] rounded-xl overflow-hidden mb-8 overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="bg-[#F9F9F8] text-left text-[11px] text-[#9CA3AF] uppercase tracking-wide">
              <th className="px-3 py-2 font-medium">
                <input type="checkbox" onChange={toggleSelectAll} checked={selectedOrgIds.size > 0 && selectedOrgIds.size === orgs.filter(o => o.owner_email).length} data-testid="admin-select-all" />
              </th>
              <th className="px-3 py-2 font-medium">Organization</th>
              <th className="px-3 py-2 font-medium text-center">Patients</th>
              <th className="px-3 py-2 font-medium text-center">Implants</th>
              <th className="px-3 py-2 font-medium">Plan</th>
              <th className="px-3 py-2 font-medium">Notes</th>
              <th className="px-3 py-2 font-medium">Joined</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {orgs.map(org => (
              <OrgRow key={org.id} org={org} onPlanChanged={fetchAll} selected={selectedOrgIds.has(org.id)} onToggleSelect={toggleSelect} />
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-lg font-semibold text-[#2A2F35] mb-1 flex items-center gap-2">
        <Fingerprint size={18} /> Firebase Logins
      </h2>
      <p className="text-xs text-[#9CA3AF] mb-3">
        Everyone who has ever signed in via Firebase, not just those who finished registering in the app.
      </p>
      <div className="bg-white border border-[#E5E5E2] rounded-xl overflow-hidden mb-8 overflow-x-auto">
        {firebaseError ? (
          <p className="p-4 text-sm text-amber-700 bg-amber-50">{firebaseError}</p>
        ) : firebaseUsers.length === 0 ? (
          <p className="p-4 text-sm text-[#9CA3AF]">No Firebase accounts found.</p>
        ) : (
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-[#F9F9F8] text-left text-[11px] text-[#9CA3AF] uppercase tracking-wide">
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Provider</th>
                <th className="px-3 py-2 font-medium">Signed Up</th>
                <th className="px-3 py-2 font-medium">Last Login</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {firebaseUsers.map(u => (
                <tr key={u.uid} className="border-t border-[#F0F0EE]" data-testid={`admin-firebase-user-${u.uid}`}>
                  <td className="px-3 py-2.5 text-[#2A2F35]">{u.email || '—'}</td>
                  <td className="px-3 py-2.5 text-[#5C6773] text-xs">{(u.provider || '—').replace('.com', '')}</td>
                  <td className="px-3 py-2.5 text-[#5C6773] text-xs whitespace-nowrap">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                  <td className="px-3 py-2.5 text-[#5C6773] text-xs whitespace-nowrap">{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${u.registered_in_app ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {u.registered_in_app ? 'Registered' : 'Signed up only'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2 className="text-lg font-semibold text-[#2A2F35] mb-3 flex items-center gap-2">
        <Envelope size={18} /> Contact Messages
      </h2>
      <div className="bg-white border border-[#E5E5E2] rounded-xl divide-y divide-[#F0F0EE]">
        {messages.length === 0 ? (
          <p className="p-4 text-sm text-[#9CA3AF]">No messages yet.</p>
        ) : messages.map(m => (
          <div key={m.id} className="p-4" data-testid={`admin-contact-${m.id}`}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-sm font-medium text-[#2A2F35]">{m.name || 'Unknown'} <span className="text-[#9CA3AF] font-normal">&lt;{m.email}&gt;</span></p>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${m.email_sent ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {m.email_sent ? 'Emailed' : 'Not emailed'}
                </span>
                <button onClick={() => openSingleEmail(m.email)} data-testid={`admin-reply-${m.id}`} className="p-1 rounded-md hover:bg-[#F0F0EE] text-[#5C6773] hover:text-[#82A098]" title="Reply by email">
                  <PaperPlaneTilt size={14} weight="bold" />
                </button>
              </div>
            </div>
            {m.subject && <p className="text-xs text-[#5C6773] font-medium">{m.subject}</p>}
            <p className="text-sm text-[#2A2F35] mt-1">{m.message}</p>
            <p className="text-[11px] text-[#9CA3AF] mt-1">{new Date(m.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>

      <SendEmailModal open={emailModalOpen} onOpenChange={setEmailModalOpen} initialRecipients={emailPrefill} />
    </div>
  );
}
