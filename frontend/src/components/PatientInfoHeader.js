import client from '../api/client';
import { toast } from 'sonner';
import { Camera, PencilSimple, FilePdf, ClockCounterClockwise } from '@phosphor-icons/react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function PatientInfoHeader({
  patient,
  patientId,
  editLog,
  showEditLog,
  onToggleEditLog,
  onEditPatient,
  onExportPDF,
  generatingPdf,
  pdfProgress,
  onPhotoUploaded,
}) {
  return (
    <div className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm mb-6">
      <div className="flex items-start gap-5">
        {/* Avatar — click to upload profile picture */}
        <label
          htmlFor="patient-pic-upload"
          data-testid="patient-avatar"
          className="relative w-24 h-24 rounded-full shrink-0 cursor-pointer group"
          title="Click to upload patient photo"
        >
          {patient.profile_picture ? (
            <img
              src={`${API_URL}/api/files/${patient.profile_picture}`}
              alt={patient.name}
              className="w-24 h-24 rounded-full object-cover border-2 border-[#E5E5E2]"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-[#82A098] flex items-center justify-center text-white font-semibold text-3xl">
              {patient.name.charAt(0)}
            </div>
          )}
          <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-all">
            <Camera size={22} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </label>
        <input
          id="patient-pic-upload"
          type="file"
          accept="image/*"
          className="hidden"
          data-testid="patient-pic-input"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const form = new FormData();
            form.append('file', file);
            try {
              const res = await client.post(`/api/patients/${patientId}/profile-picture`, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
              });
              onPhotoUploaded(res.data.profile_picture);
              toast.success('Profile photo updated');
            } catch {
              toast.error('Failed to upload photo');
            }
            e.target.value = '';
          }}
        />

        {/* Patient details */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl md:text-3xl font-semibold text-[#2A2F35] tracking-tight" data-testid="patient-name">
              {patient.name}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#5C6773]">
              <span>{patient.age} years</span>
              <span>•</span>
              <span>{patient.gender}</span>
            </div>
            <div className="flex gap-2 flex-wrap mt-1">
              <button
                data-testid="edit-patient-btn"
                onClick={onEditPatient}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#5C6773] border border-[#E5E5E2] rounded-lg hover:border-[#82A098] hover:text-[#82A098] transition-colors"
              >
                <PencilSimple size={13} weight="bold" /> Edit Details
              </button>
              <button
                data-testid="export-pdf-btn"
                onClick={onExportPDF}
                disabled={generatingPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#C27E70] hover:bg-[#A8685C] rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {generatingPdf
                  ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <FilePdf size={13} weight="bold" />}
                {generatingPdf ? (pdfProgress || 'Building PDF...') : 'Export PDF'}
              </button>
              <button
                data-testid="show-edit-log-btn"
                onClick={onToggleEditLog}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#5C6773] border border-[#E5E5E2] rounded-lg hover:border-[#C27E70] hover:text-[#C27E70] transition-colors"
              >
                <ClockCounterClockwise size={13} weight="bold" /> History ({editLog.length})
              </button>
            </div>
          </div>

          {/* Contact grid */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <div className="flex gap-2">
              <span className="text-[#9CA3AF] shrink-0">Phone</span>
              <span className="text-[#2A2F35] font-medium">{patient.phone}</span>
            </div>
            {patient.emergency_phone && (
              <div className="flex gap-2">
                <span className="text-[#9CA3AF] shrink-0">Emergency</span>
                <span className="text-[#2A2F35] font-medium">{patient.emergency_phone}</span>
              </div>
            )}
            {patient.email && (
              <div className="flex gap-2">
                <span className="text-[#9CA3AF] shrink-0">Email</span>
                <span className="text-[#2A2F35] truncate">{patient.email}</span>
              </div>
            )}
            {patient.alternate_email && (
              <div className="flex gap-2">
                <span className="text-[#9CA3AF] shrink-0">Alt. Email</span>
                <span className="text-[#2A2F35] truncate">{patient.alternate_email}</span>
              </div>
            )}
            {patient.address && (
              <div className="flex gap-2 sm:col-span-2">
                <span className="text-[#9CA3AF] shrink-0">Address</span>
                <span className="text-[#2A2F35]">{patient.address}</span>
              </div>
            )}
            {patient.medical_history && (
              <div className="flex gap-2 sm:col-span-2">
                <span className="text-[#9CA3AF] shrink-0">History</span>
                <span className="text-[#2A2F35]">{patient.medical_history}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit log panel */}
      {showEditLog && (
        <div className="mt-5 pt-4 border-t border-[#F0EDE8]">
          <p className="text-xs font-semibold text-[#C27E70] uppercase tracking-wide mb-3">Change History</p>
          {editLog.length === 0 ? (
            <p className="text-xs text-[#9CA3AF]">No changes recorded yet.</p>
          ) : (
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {editLog.map((entry, i) => (
                <div key={i} className="text-xs text-[#5C6773] flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#C27E70] mt-1 shrink-0" />
                  <div>
                    <span className="font-medium text-[#2A2F35] capitalize">{entry.action}</span>
                    {' · '}
                    <span>{new Date(entry.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
