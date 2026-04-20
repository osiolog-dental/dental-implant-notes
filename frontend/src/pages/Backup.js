import { useState, useRef } from 'react';
import client from '../api/client';
import { toast } from 'sonner';
import {
  CloudArrowUp, CloudArrowDown, DownloadSimple,
  UploadSimple, GoogleLogo, CheckCircle, ArrowClockwise,
} from '@phosphor-icons/react';

/* ── Google OAuth2 config ──
   Fill REACT_APP_GOOGLE_CLIENT_ID in frontend/.env
   Scopes: drive.appdata (hidden app folder, not visible in user's Drive)
*/
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const BACKUP_FILENAME = 'osiolog_backup.json';

/* ── Helpers ── */
function getGoogleToken() {
  return new Promise((resolve, reject) => {
    if (!GOOGLE_CLIENT_ID) {
      reject(new Error('Google Client ID not configured. Add REACT_APP_GOOGLE_CLIENT_ID to your .env file.'));
      return;
    }
    // Load Google Identity Services on demand
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => {
      window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: DRIVE_SCOPE,
        callback: (resp) => {
          if (resp.error) reject(new Error(resp.error));
          else resolve(resp.access_token);
        },
      }).requestAccessToken();
    };
    script.onerror = () => reject(new Error('Failed to load Google Sign-In'));
    document.head.appendChild(script);
  });
}

async function uploadToDrive(token, jsonString) {
  // Check if a backup already exists
  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${BACKUP_FILENAME}'&fields=files(id,name,modifiedTime)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const listData = await listRes.json();
  const existing = listData.files?.[0];

  const blob = new Blob([jsonString], { type: 'application/json' });
  const metadata = { name: BACKUP_FILENAME, parents: ['appDataFolder'] };

  let url, method;
  if (existing) {
    // Update existing file
    url = `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart`;
    method = 'PATCH';
  } else {
    // Create new file
    url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    method = 'POST';
  }

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);

  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Drive upload failed: ${res.statusText}`);
  return await res.json();
}

async function downloadFromDrive(token) {
  // Find the backup file
  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${BACKUP_FILENAME}'&fields=files(id,name,modifiedTime)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const listData = await listRes.json();
  const file = listData.files?.[0];
  if (!file) throw new Error('No backup found in your Google Drive.');

  const dlRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!dlRes.ok) throw new Error('Failed to download backup from Drive.');
  const text = await dlRes.text();
  return { content: text, modifiedTime: file.modifiedTime };
}

/* ── Card component ── */
function Card({ icon: Icon, iconColor, title, desc, children }) {
  return (
    <div className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center`}
          style={{ background: iconColor + '18' }}>
          <Icon size={22} weight="duotone" color={iconColor} />
        </div>
        <div>
          <h3 className="font-semibold text-[#2A2F35] text-sm">{title}</h3>
          <p className="text-xs text-[#5C6773]">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

/* ── Main Component ── */
export default function Backup() {
  const [loadingExport, setLoadingExport]     = useState(false);
  const [loadingDriveUp, setLoadingDriveUp]   = useState(false);
  const [loadingDriveDl, setLoadingDriveDl]   = useState(false);
  const [loadingRestore, setLoadingRestore]   = useState(false);
  const [lastDriveBackup, setLastDriveBackup] = useState(null);
  const [restorePreview, setRestorePreview]   = useState(null); // parsed JSON before commit
  const fileInputRef = useRef();

  /* 1. Download backup JSON to local device */
  const handleLocalExport = async () => {
    setLoadingExport(true);
    try {
      const res = await client.get(`/api/backup/export`);
      const json = JSON.stringify(res.data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `osiolog_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup downloaded to your device');
    } catch {
      toast.error('Export failed — please try again');
    } finally {
      setLoadingExport(false);
    }
  };

  /* 2. Backup to Google Drive */
  const handleDriveBackup = async () => {
    setLoadingDriveUp(true);
    try {
      const token = await getGoogleToken();
      const res = await client.get(`/api/backup/export`);
      const json = JSON.stringify(res.data, null, 2);
      await uploadToDrive(token, json);
      const now = new Date().toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
      setLastDriveBackup(now);
      toast.success('Backup saved to Google Drive');
    } catch (err) {
      toast.error(err.message || 'Google Drive backup failed');
    } finally {
      setLoadingDriveUp(false);
    }
  };

  /* 3. Restore preview from Google Drive */
  const handleDriveRestore = async () => {
    setLoadingDriveDl(true);
    try {
      const token = await getGoogleToken();
      const { content, modifiedTime } = await downloadFromDrive(token);
      const parsed = JSON.parse(content);
      setRestorePreview({ data: parsed, source: 'Google Drive', modifiedTime });
      toast.success('Backup loaded — review below and confirm restore');
    } catch (err) {
      toast.error(err.message || 'Failed to load from Google Drive');
    } finally {
      setLoadingDriveDl(false);
    }
  };

  /* 4. Restore preview from local file */
  const handleFileRestore = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed.version) throw new Error('Not a valid OSIOLOG backup file');
        setRestorePreview({ data: parsed, source: file.name, modifiedTime: parsed.exported_at });
        toast.success('Backup loaded — review below and confirm restore');
      } catch {
        toast.error('Invalid backup file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  /* 5. Commit restore to server */
  const handleConfirmRestore = async () => {
    if (!restorePreview) return;
    setLoadingRestore(true);
    try {
      const res = await client.post(`/api/backup/restore`, restorePreview.data);
      const { inserted } = res.data;
      toast.success(
        `Restore complete — ${inserted.patients} patients, ${inserted.implants} implants, ${inserted.fpd_records} FPD records imported`
      );
      setRestorePreview(null);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Restore failed');
    } finally {
      setLoadingRestore(false);
    }
  };

  const btnClass = (color) =>
    `flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed`;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#2A2F35] tracking-tight">Backup & Restore</h1>
        <p className="text-sm text-[#5C6773] mt-1">
          Keep your patient data safe. Back up to your device or Google Drive — restore anytime.
        </p>
      </div>

      <div className="space-y-5">

        {/* ── LOCAL BACKUP ── */}
        <Card
          icon={DownloadSimple}
          iconColor="#2563EB"
          title="Download to Device"
          desc="Save a complete backup JSON file directly to your computer or phone"
        >
          <button
            data-testid="local-export-btn"
            onClick={handleLocalExport}
            disabled={loadingExport}
            className={`${btnClass()} bg-[#2563EB] hover:bg-[#1D4ED8]`}
          >
            {loadingExport
              ? <ArrowClockwise size={16} className="animate-spin" />
              : <DownloadSimple size={16} weight="bold" />}
            {loadingExport ? 'Preparing...' : 'Download Backup'}
          </button>
          <p className="text-xs text-[#9CA3AF] mt-2">
            Includes all patients, implants, FPD records, clinics, and change history.
          </p>
        </Card>

        {/* ── GOOGLE DRIVE BACKUP ── */}
        <Card
          icon={GoogleLogo}
          iconColor="#EA4335"
          title="Backup to Google Drive"
          desc="Securely save your backup to a private hidden folder in your Google account"
        >
          <div className="flex flex-wrap gap-3">
            <button
              data-testid="gdrive-backup-btn"
              onClick={handleDriveBackup}
              disabled={loadingDriveUp || !GOOGLE_CLIENT_ID}
              className={`${btnClass()} bg-[#EA4335] hover:bg-[#C5372C] ${!GOOGLE_CLIENT_ID ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loadingDriveUp
                ? <ArrowClockwise size={16} className="animate-spin" />
                : <CloudArrowUp size={16} weight="bold" />}
              {loadingDriveUp ? 'Uploading...' : 'Backup to Google Drive'}
            </button>
          </div>
          {lastDriveBackup && (
            <div className="flex items-center gap-2 mt-3 text-xs text-[#16A34A]">
              <CheckCircle size={14} weight="fill" />
              Last backed up: {lastDriveBackup}
            </div>
          )}
          {!GOOGLE_CLIENT_ID && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <strong>Coming soon:</strong> Google Drive backup will be enabled in the next update.
              Use <strong>Download to Device</strong> above to save your backup now.
            </div>
          )}
          <p className="text-xs text-[#9CA3AF] mt-2">
            Stored in your Drive's private App Data folder — not visible in your regular Google Drive files.
          </p>
        </Card>

        {/* ── RESTORE ── */}
        <Card
          icon={CloudArrowDown}
          iconColor="#82A098"
          title="Restore Data"
          desc="Restore from a previous backup — from your device or Google Drive"
        >
          <div className="flex flex-wrap gap-3 mb-4">
            {/* From local file */}
            <button
              data-testid="local-restore-btn"
              onClick={() => fileInputRef.current?.click()}
              className={`${btnClass()} bg-[#82A098] hover:bg-[#6B8A82]`}
            >
              <UploadSimple size={16} weight="bold" />
              Restore from File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              data-testid="restore-file-input"
              onChange={handleFileRestore}
            />

            {/* From Google Drive */}
            <button
              data-testid="gdrive-restore-btn"
              onClick={handleDriveRestore}
              disabled={loadingDriveDl || !GOOGLE_CLIENT_ID}
              className={`${btnClass()} bg-[#5C6773] hover:bg-[#3F4A53] ${!GOOGLE_CLIENT_ID ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loadingDriveDl
                ? <ArrowClockwise size={16} className="animate-spin" />
                : <GoogleLogo size={16} weight="bold" />}
              {loadingDriveDl ? 'Loading...' : 'Restore from Google Drive'}
            </button>
          </div>

          {/* Restore preview card */}
          {restorePreview && (
            <div className="border border-[#82A098] rounded-xl p-4 bg-[#EEF4F3]">
              <p className="text-sm font-semibold text-[#2A2F35] mb-1">Backup Preview</p>
              <p className="text-xs text-[#5C6773] mb-3">
                Source: <strong>{restorePreview.source}</strong> &nbsp;·&nbsp;
                Exported: <strong>{new Date(restorePreview.modifiedTime || restorePreview.data.exported_at).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</strong>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Patients',    val: restorePreview.data.patients?.length    ?? 0 },
                  { label: 'Implants',    val: restorePreview.data.implants?.length    ?? 0 },
                  { label: 'FPD Records', val: restorePreview.data.fpd_records?.length ?? 0 },
                  { label: 'Clinics',     val: restorePreview.data.clinics?.length     ?? 0 },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-white rounded-lg p-3 text-center border border-[#E5E5E2]">
                    <div className="text-xl font-bold text-[#82A098]">{val}</div>
                    <div className="text-xs text-[#5C6773]">{label}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  data-testid="confirm-restore-btn"
                  onClick={handleConfirmRestore}
                  disabled={loadingRestore}
                  className={`${btnClass()} bg-[#82A098] hover:bg-[#6B8A82]`}
                >
                  {loadingRestore
                    ? <ArrowClockwise size={16} className="animate-spin" />
                    : <CheckCircle size={16} weight="bold" />}
                  {loadingRestore ? 'Restoring...' : 'Confirm Restore'}
                </button>
                <button
                  onClick={() => setRestorePreview(null)}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium border border-[#E5E5E2] text-[#5C6773] hover:bg-[#F0F0EE] transition-colors"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-[#9CA3AF] mt-3">
                Restore only <strong>adds missing records</strong> — it will not overwrite or delete existing data.
              </p>
            </div>
          )}
        </Card>

        {/* ── HOW IT WORKS ── */}
        <div className="bg-[#F9F9F8] border border-[#E5E5E2] rounded-xl p-5">
          <p className="text-xs font-semibold text-[#82A098] uppercase tracking-wide mb-3">How it works</p>
          <div className="space-y-2 text-xs text-[#5C6773]">
            <div className="flex gap-2"><span className="text-[#82A098] font-bold">1.</span> <span><strong>Download to Device</strong> — saves a complete <code>.json</code> file you can store anywhere (USB, email, another cloud).</span></div>
            <div className="flex gap-2"><span className="text-[#82A098] font-bold">2.</span> <span><strong>Google Drive</strong> — stores the backup in a private hidden folder in your Google account. Not visible in your regular Drive files. Requires a one-time Google sign-in.</span></div>
            <div className="flex gap-2"><span className="text-[#82A098] font-bold">3.</span> <span><strong>Restore</strong> — restores only records that don't already exist. Safe to run multiple times. Never deletes your current data.</span></div>
          </div>
        </div>

      </div>
    </div>
  );
}
