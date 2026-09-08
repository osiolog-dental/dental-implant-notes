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
const PHOTOS_BACKUP_FILENAME = 'osiolog_photos.zip';

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
  return uploadBlobToDrive(token, new Blob([jsonString], { type: 'application/json' }), BACKUP_FILENAME);
}

async function uploadBlobToDrive(token, blob, filename) {
  // Check if a backup already exists
  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${filename}'&fields=files(id,name,modifiedTime)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const listData = await listRes.json();
  const existing = listData.files?.[0];

  const metadata = { name: filename, parents: ['appDataFolder'] };

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

async function downloadBlobFromDrive(token, filename) {
  // Find the backup file
  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${filename}'&fields=files(id,name,modifiedTime)`,
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
  const blob = await dlRes.blob();
  return { blob, modifiedTime: file.modifiedTime };
}

async function downloadFromDrive(token) {
  const { blob, modifiedTime } = await downloadBlobFromDrive(token, BACKUP_FILENAME);
  return { content: await blob.text(), modifiedTime };
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
  const [loadingPhotosExport, setLoadingPhotosExport]   = useState(false);
  const [loadingPhotosDriveUp, setLoadingPhotosDriveUp] = useState(false);
  const [loadingPhotosRestoreFile, setLoadingPhotosRestoreFile] = useState(false);
  const [loadingPhotosRestoreDrive, setLoadingPhotosRestoreDrive] = useState(false);
  const [lastDriveBackup, setLastDriveBackup] = useState(null);
  const [restorePreview, setRestorePreview]   = useState(null); // parsed JSON before commit
  const fileInputRef = useRef();
  const photosFileInputRef = useRef();

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

  /* 1b. Download all Photo Vault images (ZIP) to local device */
  const handlePhotosExport = async () => {
    setLoadingPhotosExport(true);
    try {
      const res = await client.get(`/api/backup/photos`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `osiolog_photos_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Photos backup downloaded to your device');
    } catch {
      toast.error('Photos export failed — please try again');
    } finally {
      setLoadingPhotosExport(false);
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

  /* 2b. Back up Photo Vault images (ZIP) to Google Drive */
  const handlePhotosDriveBackup = async () => {
    setLoadingPhotosDriveUp(true);
    try {
      const token = await getGoogleToken();
      const res = await client.get(`/api/backup/photos`, { responseType: 'blob' });
      await uploadBlobToDrive(token, res.data, PHOTOS_BACKUP_FILENAME);
      toast.success('Photos backed up to Google Drive');
    } catch (err) {
      toast.error(err.message || 'Google Drive photos backup failed');
    } finally {
      setLoadingPhotosDriveUp(false);
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
      const total = Object.values(inserted).reduce((a, b) => a + b, 0);
      toast.success(
        `Restore complete — ${inserted.patients} patients, ${inserted.implants} implants, ${inserted.fpd_records} FPD records, and ${total - inserted.patients - inserted.implants - inserted.fpd_records} other records imported`
      );
      setRestorePreview(null);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Restore failed');
    } finally {
      setLoadingRestore(false);
    }
  };

  /* Shared: send a photos ZIP to the restore endpoint and report the result */
  const submitPhotosRestore = async (blob, setLoading) => {
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', blob, 'photos.zip');
      const res = await client.post(`/api/backup/photos/restore`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { restored, skipped_existing, skipped_no_case } = res.data;
      if (skipped_no_case > 0) {
        toast.warning(
          `${restored} photos restored, ${skipped_existing} already existed, ${skipped_no_case} skipped — their case wasn't found. Restore your data backup first, then try photos again.`
        );
      } else {
        toast.success(`${restored} photos restored${skipped_existing ? ` — ${skipped_existing} already existed and were skipped` : ''}`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Photos restore failed');
    } finally {
      setLoading(false);
    }
  };

  /* 6. Restore photos from a local ZIP file */
  const handlePhotosRestoreFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    submitPhotosRestore(file, setLoadingPhotosRestoreFile);
  };

  /* 7. Restore photos from the ZIP saved in Google Drive */
  const handlePhotosRestoreDrive = async () => {
    setLoadingPhotosRestoreDrive(true);
    try {
      const token = await getGoogleToken();
      const { blob } = await downloadBlobFromDrive(token, PHOTOS_BACKUP_FILENAME);
      await submitPhotosRestore(blob, setLoadingPhotosRestoreDrive);
    } catch (err) {
      toast.error(err.message || 'Failed to load photos from Google Drive');
      setLoadingPhotosRestoreDrive(false);
    }
  };

  const btnClass = (color) =>
    `flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed`;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#2A2F35] tracking-tight">Backup & Restore</h1>
        <p className="text-sm text-[#5C6773] mt-1">
          Keep your patient data and photos safe. Back up to your device or Google Drive — restore anytime.
        </p>
      </div>

      <div className="space-y-5">

        {/* ── LOCAL BACKUP ── */}
        <Card
          icon={DownloadSimple}
          iconColor="#2563EB"
          title="Download to Device"
          desc="Save a complete backup directly to your computer or phone"
        >
          <div className="flex flex-wrap gap-3">
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
            <button
              data-testid="local-photos-export-btn"
              onClick={handlePhotosExport}
              disabled={loadingPhotosExport}
              className={`${btnClass()} bg-[#2563EB]/80 hover:bg-[#2563EB]`}
            >
              {loadingPhotosExport
                ? <ArrowClockwise size={16} className="animate-spin" />
                : <DownloadSimple size={16} weight="bold" />}
              {loadingPhotosExport ? 'Zipping photos...' : 'Download Photos (ZIP)'}
            </button>
          </div>
          <p className="text-xs text-[#9CA3AF] mt-2">
            <strong>Download Backup</strong> includes all patients, implants, implant follow-ups,
            abutments, FPD/crown records, overdentures, full mouth rehabs, extracted teeth, and clinics.
            <strong> Download Photos</strong> includes every Photo Vault image and radiograph,
            bundled as a ZIP — for larger photo libraries this can take a minute.
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
            <button
              data-testid="gdrive-photos-backup-btn"
              onClick={handlePhotosDriveBackup}
              disabled={loadingPhotosDriveUp || !GOOGLE_CLIENT_ID}
              className={`${btnClass()} bg-[#EA4335]/80 hover:bg-[#EA4335] ${!GOOGLE_CLIENT_ID ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loadingPhotosDriveUp
                ? <ArrowClockwise size={16} className="animate-spin" />
                : <CloudArrowUp size={16} weight="bold" />}
              {loadingPhotosDriveUp ? 'Uploading photos...' : 'Backup Photos to Drive'}
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
            The photos backup is a separate ZIP file, so a photo-only backup never overwrites your data backup.
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

          <p className="text-xs font-semibold text-[#5C6773] uppercase tracking-wide mb-2">Then restore photos</p>
          <div className="flex flex-wrap gap-3 mb-4">
            <button
              data-testid="local-photos-restore-btn"
              onClick={() => photosFileInputRef.current?.click()}
              disabled={loadingPhotosRestoreFile}
              className={`${btnClass()} bg-[#82A098]/80 hover:bg-[#82A098]`}
            >
              {loadingPhotosRestoreFile
                ? <ArrowClockwise size={16} className="animate-spin" />
                : <UploadSimple size={16} weight="bold" />}
              {loadingPhotosRestoreFile ? 'Restoring photos...' : 'Restore Photos (ZIP)'}
            </button>
            <input
              ref={photosFileInputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              data-testid="restore-photos-file-input"
              onChange={handlePhotosRestoreFile}
            />
            <button
              data-testid="gdrive-photos-restore-btn"
              onClick={handlePhotosRestoreDrive}
              disabled={loadingPhotosRestoreDrive || !GOOGLE_CLIENT_ID}
              className={`${btnClass()} bg-[#5C6773]/80 hover:bg-[#5C6773] ${!GOOGLE_CLIENT_ID ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loadingPhotosRestoreDrive
                ? <ArrowClockwise size={16} className="animate-spin" />
                : <GoogleLogo size={16} weight="bold" />}
              {loadingPhotosRestoreDrive ? 'Loading...' : 'Restore Photos from Drive'}
            </button>
          </div>
          <p className="text-xs text-[#9CA3AF] -mt-2 mb-4">
            Restore your data backup above <strong>first</strong> — photos attach to cases, so if the
            case isn't there yet a photo can't be restored. Safe to run more than once.
          </p>

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
                  { label: 'Patients',          val: restorePreview.data.patients?.length          ?? 0 },
                  { label: 'Implants',          val: restorePreview.data.implants?.length          ?? 0 },
                  { label: 'Abutments',         val: restorePreview.data.abutments?.length         ?? 0 },
                  { label: 'FPD Records',       val: restorePreview.data.fpd_records?.length       ?? 0 },
                  { label: 'Overdentures',      val: restorePreview.data.overdentures?.length      ?? 0 },
                  { label: 'Full Mouth Rehabs', val: restorePreview.data.full_mouth_rehabs?.length ?? 0 },
                  { label: 'Extracted Teeth',   val: restorePreview.data.tooth_extractions?.length ?? 0 },
                  { label: 'Implant Follow-ups', val: restorePreview.data.implant_follow_ups?.length ?? 0 },
                  { label: 'Financial Line Items', val: restorePreview.data.financial_line_items?.length ?? 0 },
                  { label: 'Payments', val: restorePreview.data.patient_payments?.length ?? 0 },
                  { label: 'Clinics',           val: restorePreview.data.clinics?.length           ?? 0 },
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
          <p className="text-xs font-semibold text-[#82A098] uppercase tracking-wide mb-3">How to back up</p>
          <div className="space-y-2 text-xs text-[#5C6773] mb-5">
            <div className="flex gap-2"><span className="text-[#82A098] font-bold">1.</span> <span>Click <strong>Download Backup</strong> (or <strong>Backup to Google Drive</strong>) to save your patients, implants, and all other clinical records.</span></div>
            <div className="flex gap-2"><span className="text-[#82A098] font-bold">2.</span> <span>Click <strong>Download Photos (ZIP)</strong> (or <strong>Backup Photos to Drive</strong>) to save every Photo Vault image and radiograph. This is a separate file from step 1, so do both.</span></div>
            <div className="flex gap-2"><span className="text-[#82A098] font-bold">3.</span> <span>Repeat regularly — there's no harm in backing up often. Each backup fully replaces the previous one at the same location.</span></div>
          </div>

          <p className="text-xs font-semibold text-[#C27E70] uppercase tracking-wide mb-3">How to restore (e.g. new device, or after data loss)</p>
          <div className="space-y-2 text-xs text-[#5C6773]">
            <div className="flex gap-2"><span className="text-[#C27E70] font-bold">1.</span> <span>In the <strong>Restore Data</strong> card above, click <strong>Restore from File</strong> or <strong>Restore from Google Drive</strong> first. Review the preview, then <strong>Confirm Restore</strong> — this brings back your patients, implants, and other records.</span></div>
            <div className="flex gap-2"><span className="text-[#C27E70] font-bold">2.</span> <span>Only after that, click <strong>Restore Photos (ZIP)</strong> or <strong>Restore Photos from Drive</strong>. Photos attach to the cases restored in step 1, so doing this first won't work.</span></div>
            <div className="flex gap-2"><span className="text-[#C27E70] font-bold">3.</span> <span>Both steps only add what's missing — nothing already in the app gets overwritten or deleted, so it's safe to restore more than once.</span></div>
          </div>
        </div>

      </div>
    </div>
  );
}
