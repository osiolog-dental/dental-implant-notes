import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import client from '../api/client';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import BulkImport from '../components/BulkImport';
import {
  ArrowLeft, User, Envelope, Phone, MapPin, Certificate,
  GraduationCap, Stethoscope, PencilSimple, FloppyDisk,
  ShareNetwork, ArrowSquareOut, X, Warning,
} from '@phosphor-icons/react';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

export default function Account() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [retainData, setRetainData] = useState(true);
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    country: user?.country || '',
    registration_number: user?.registration_number || '',
    specialization: user?.specialization || '',
    college: user?.college || '',
    college_place: user?.college_place || '',
    bio: user?.bio || '',
  });

  const rawName = user?.name || 'Doctor';
  const displayName = rawName.startsWith('Dr.') || rawName.startsWith('Dr ') ? rawName : `Dr. ${rawName}`;
  const initials = rawName
    .replace(/^Dr\.?\s*/i, '')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const doctorId = user?._id || user?.id;
  const profileUrl = doctorId ? `${window.location.origin}/profile/${doctorId}` : '';

  const handleSave = async () => {
    setSaving(true);
    try {
      await client.patch('/api/users/me', form);
      toast.success('Profile updated');
      setEditing(false);
      window.location.reload();
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      name: user?.name || '',
      phone: user?.phone || '',
      country: user?.country || '',
      registration_number: user?.registration_number || '',
      specialization: user?.specialization || '',
      college: user?.college || '',
      college_place: user?.college_place || '',
      bio: user?.bio || '',
    });
    setEditing(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      await client.delete('/api/users/me');
      await logout();
      navigate('/login');
      toast.success('Your account has been deleted.');
    } catch {
      toast.error('Failed to delete account. Please try again.');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    }
  };

  const Field = ({ label, value, icon: Icon }) => (
    <div className="flex items-center gap-4 px-6 py-4">
      <div className="w-9 h-9 rounded-lg bg-[#F0F0EE] flex items-center justify-center shrink-0">
        <Icon size={18} className="text-[#5C6773]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[#5C6773]">{label}</p>
        <p className="text-sm font-medium text-[#2A2F35] truncate">{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10" data-testid="account-page">

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-[#E5E5E2] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#82A098] to-[#5C8077] p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-white/30">
              {user?.profile_picture && <AvatarImage src={user.profile_picture} alt={user?.name} />}
              <AvatarFallback className="bg-white/20 text-white text-lg font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-semibold text-white" data-testid="account-doctor-name">{displayName}</h1>
              <p className="text-sm text-white/70">{user?.specialization || 'Dental Surgeon'}</p>
            </div>
          </div>
          {!editing && (
            <button
              data-testid="edit-profile-btn"
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-colors"
            >
              <PencilSimple size={14} /> Edit Profile
            </button>
          )}
        </div>

        {/* View mode */}
        {!editing ? (
          <div className="divide-y divide-[#E5E5E2]">
            <Field label="Full Name"          value={user?.name}                icon={User} />
            <Field label="Email"              value={user?.email}               icon={Envelope} />
            <Field label="Phone"              value={user?.phone}               icon={Phone} />
            <Field label="Country"            value={user?.country}             icon={MapPin} />
            <Field label="Registration No."   value={user?.registration_number} icon={Certificate} />
            <Field label="Specialization"     value={user?.specialization}      icon={Stethoscope} />
            <Field label="College / University" value={user?.college}           icon={GraduationCap} />
            <Field label="College City"       value={user?.college_place}       icon={MapPin} />
            {user?.bio && (
              <div className="px-6 py-4">
                <p className="text-xs text-[#5C6773] mb-1">About / Bio</p>
                <p className="text-sm text-[#2A2F35]">{user.bio}</p>
              </div>
            )}
            <div className="px-6 py-4 bg-[#F9F9F8]">
              <p className="text-xs text-[#5C6773]">
                Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
              </p>
            </div>
          </div>
        ) : (
          /* Edit mode */
          <div className="p-6 space-y-4">
            {[
              { label: 'Full Name',           key: 'name',                placeholder: 'Dr. Your Name' },
              { label: 'Phone',               key: 'phone',               placeholder: '+91 98765 43210' },
              { label: 'Country',             key: 'country',             placeholder: 'India' },
              { label: 'Registration No.',    key: 'registration_number', placeholder: 'e.g. DCI12345' },
              { label: 'Specialization',      key: 'specialization',      placeholder: 'Implantology' },
              { label: 'College / University',key: 'college',             placeholder: 'College name' },
              { label: 'College City',        key: 'college_place',       placeholder: 'City / Place' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-[#5C6773] mb-1">{label}</label>
                <Input
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  data-testid={`edit-${key}`}
                  className="text-sm"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-[#5C6773] mb-1">About / Bio</label>
              <textarea
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="Brief professional bio shown on your public profile..."
                data-testid="edit-bio"
                rows={3}
                className="w-full text-sm px-3 py-2 border border-[#E5E5E2] rounded-lg focus:ring-2 focus:ring-[#82A098] focus:outline-none resize-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                data-testid="save-profile-btn"
                className="bg-[#82A098] hover:bg-[#6B8A82] text-white"
              >
                <FloppyDisk size={15} className="mr-1.5" />
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
              <Button onClick={handleCancel} variant="ghost" data-testid="cancel-edit-btn">
                <X size={15} className="mr-1" /> Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Share Profile Card */}
      {doctorId && (
        <div className="bg-white rounded-xl border border-[#E5E5E2] mt-5 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E5E2] flex items-center gap-2">
            <ShareNetwork size={18} className="text-[#82A098]" />
            <h2 className="font-semibold text-[#2A2F35]" style={{ fontFamily: 'Work Sans, sans-serif' }}>Share Your Profile</h2>
          </div>
          <div className="p-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="shrink-0 p-3 bg-white border border-[#E5E5E2] rounded-xl shadow-sm">
              <QRCodeSVG
                value={profileUrl}
                size={120}
                fgColor="#2A2F35"
                bgColor="#FFFFFF"
                level="M"
                data-testid="account-qr-code"
              />
              <p className="text-[10px] text-[#9CA3AF] text-center mt-2">Scan for digital profile</p>
            </div>
            <div className="flex-1 min-w-0 w-full">
              <p className="text-xs text-[#5C6773] mb-1">Your public profile link</p>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 bg-[#F9F9F8] border border-[#E5E5E2] rounded-lg px-3 py-2 text-xs text-[#2A2F35] truncate font-mono">
                  {profileUrl}
                </div>
                <button
                  data-testid="copy-profile-link-account"
                  onClick={() => { navigator.clipboard.writeText(profileUrl); toast.success('Link copied!'); }}
                  className="shrink-0 px-3 py-2 bg-[#82A098] text-white text-xs font-semibold rounded-lg hover:bg-[#6B8A82] transition-colors"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#9CA3AF] mb-4">
                Share this on visiting cards, email signatures, or social media. Anyone with the link can view your professional profile and case statistics.
              </p>
              <a
                data-testid="view-public-profile-btn"
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-semibold text-[#82A098] hover:text-[#6B8A82] transition-colors"
              >
                <ArrowSquareOut size={16} />
                Preview your public profile
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import */}
      <BulkImport />

      {/* Danger Zone */}
      <div className="mt-5 bg-white rounded-xl border border-red-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-red-100 flex items-center gap-2">
          <Warning size={18} className="text-red-500" />
          <h2 className="font-semibold text-[#2A2F35]" style={{ fontFamily: 'Work Sans, sans-serif' }}>Danger Zone</h2>
        </div>
        <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#2A2F35]">Delete Account</p>
            <p className="text-xs text-[#5C6773] mt-0.5">Permanently delete your account and all patient data. This cannot be undone.</p>
          </div>
          <button
            data-testid="delete-account-btn"
            onClick={() => setShowDeleteConfirm(true)}
            className="shrink-0 px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Warning size={20} className="text-red-500" />
              </div>
              <h3 className="font-semibold text-[#2A2F35]" style={{ fontFamily: 'Work Sans, sans-serif' }}>Delete Account?</h3>
            </div>
            <p className="text-sm text-[#5C6773] mb-4">
              This will delete your account and sign you out. <strong>This cannot be undone.</strong>
            </p>

            {/* 30-day retain option */}
            <div className="mb-4 p-3 bg-[#F9F9F8] rounded-lg border border-[#E5E5E2]">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={retainData}
                  onChange={e => setRetainData(e.target.checked)}
                  data-testid="retain-data-checkbox"
                  className="mt-0.5 accent-[#82A098]"
                />
                <div>
                  <p className="text-sm font-medium text-[#2A2F35]">Retain my data for 30 days</p>
                  <p className="text-xs text-[#5C6773] mt-0.5">Your patient records and photos will be kept for 30 days before permanent deletion. Contact support within this window to restore your account.</p>
                </div>
              </label>
            </div>

            <p className="text-xs font-medium text-[#2A2F35] mb-2">Type <span className="font-mono font-bold">DELETE</span> to confirm:</p>
            <input
              data-testid="delete-confirm-input"
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full text-sm px-3 py-2 border border-[#E5E5E2] rounded-lg focus:ring-2 focus:ring-red-400 focus:outline-none mb-4 font-mono"
            />
            <div className="flex gap-3">
              <button
                data-testid="confirm-delete-btn"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deleting}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {deleting ? 'Deleting…' : 'Delete My Account'}
              </button>
              <button
                data-testid="cancel-delete-btn"
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                className="flex-1 py-2 rounded-lg border border-[#E5E5E2] text-[#2A2F35] text-sm font-semibold hover:bg-[#F9F9F8] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
