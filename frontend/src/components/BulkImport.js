import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import client from '../api/client';
import { toast } from 'sonner';

function downloadTemplate() {
  const XLSX2 = XLSX;
  const wb = XLSX2.utils.book_new();

  const headers = [
    'Patient Name', 'Date of Surgery', 'Surgeon', 'Tooth / Site #',
    'Arch', 'Jaw Region', 'Implant Brand', 'Implant System',
    'Implant Diameter (mm)', 'Implant Length (mm)', 'Cover Screw',
    'Healing Abutment', 'Bone Graft Used', 'Membrane Used',
    'Torque Value (Ncm)', 'ISQ Value', 'Follow-up Date',
    'Clinic Name', 'Clinic Address', 'Notes / Complications',
  ];

  const example = [
    'John Smith', '15-01-2024', 'Dr. Midhilesh', '36',
    'Lower', 'Posterior', 'Straumann', 'BL Roxolid',
    '4.1', '10', 'Yes',
    'No', 'Yes', 'No',
    '35', '68', '15-04-2024',
    'City Dental Clinic', '123 Main St', 'Good primary stability',
  ];
  const example2 = [
    'John Smith', '15-01-2024', 'Dr. Midhilesh', '46',
    'Lower', 'Posterior', 'Straumann', 'BL Roxolid',
    '4.1', '10', 'Yes',
    'No', 'No', 'No',
    '38', '70', '15-04-2024',
    'City Dental Clinic', '123 Main St', '',
  ];
  const example3 = [
    'Jane Doe', '20-02-2024', 'Dr. Midhilesh', '14',
    'Upper', 'Posterior', 'Nobel', 'Active CC',
    '3.5', '11.5', 'Yes',
    'Yes', 'No', 'No',
    '32', '65', '20-05-2024',
    'City Dental Clinic', '123 Main St', '',
  ];

  const ws = XLSX2.utils.aoa_to_sheet([headers, example, example2, example3]);

  // Column widths
  ws['!cols'] = headers.map((h, i) => ({
    wch: [20, 16, 18, 14, 8, 12, 16, 16, 20, 20, 12, 16, 14, 14, 16, 10, 16, 20, 22, 24][i],
  }));

  XLSX2.utils.book_append_sheet(wb, ws, 'Patient Log');

  // Instructions sheet
  const instrHeaders = ['Instructions'];
  const instrRows = [
    ['OSIOLOG Bulk Import — Patient Log Sheet'],
    [''],
    ['RULES:'],
    ['• Each row = one implant. One patient with 3 implants = 3 rows.'],
    ['• For multiple implants on the same patient, leave Patient Name blank after the first row — the app will carry it forward.'],
    ['• Date format: DD-MM-YYYY (e.g. 15-01-2024)'],
    ['• Arch: Upper or Lower'],
    ['• Jaw Region: Anterior or Posterior'],
    ['• Cover Screw / Healing Abutment / Bone Graft Used / Membrane Used: Yes or No'],
    ['• Tooth / Site #: FDI notation without # symbol (e.g. 36, 14, 21)'],
    ['• Clinic Name and Clinic Address: will be created automatically if not found'],
    [''],
    ['COLUMNS:'],
    ['A - Patient Name'],
    ['B - Date of Surgery (DD-MM-YYYY)'],
    ['C - Surgeon'],
    ['D - Tooth / Site # (e.g. 36)'],
    ['E - Arch (Upper / Lower)'],
    ['F - Jaw Region (Anterior / Posterior)'],
    ['G - Implant Brand'],
    ['H - Implant System'],
    ['I - Implant Diameter (mm)'],
    ['J - Implant Length (mm)'],
    ['K - Cover Screw (Yes / No)'],
    ['L - Healing Abutment (Yes / No)'],
    ['M - Bone Graft Used (Yes / No)'],
    ['N - Membrane Used (Yes / No)'],
    ['O - Torque Value (Ncm)'],
    ['P - ISQ Value'],
    ['Q - Follow-up Date (DD-MM-YYYY)'],
    ['R - Clinic Name'],
    ['S - Clinic Address'],
    ['T - Notes / Complications'],
  ];
  const wsInstr = XLSX2.utils.aoa_to_sheet([instrHeaders, ...instrRows]);
  wsInstr['!cols'] = [{ wch: 70 }];
  XLSX2.utils.book_append_sheet(wb, wsInstr, 'Instructions');

  XLSX2.writeFile(wb, 'OSIOLOG_Import_Template.xlsx');
}

export default function BulkImport() {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await client.post('/api/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      toast.success(`Import complete — ${res.data.created.patients} patients, ${res.data.created.implants} implants added`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Import failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E2] mt-5 overflow-hidden">
      <div className="px-6 py-4 border-b border-[#E5E5E2] flex items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#82A098" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>
        </svg>
        <h2 className="font-semibold text-[#2A2F35]" style={{ fontFamily: 'Work Sans, sans-serif' }}>
          Bulk Import from Excel
        </h2>
      </div>

      <div className="p-6">
        <p className="text-sm text-[#5C6773] mb-5">
          Download the template, fill in your patient and implant data, then upload it here.
        </p>

        {/* Step 1 — Download */}
        <div className="flex items-start gap-4 mb-5">
          <div className="w-7 h-7 rounded-full bg-[#82A098] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#2A2F35] mb-1">Download the template</p>
            <p className="text-xs text-[#5C6773] mb-3">
              Includes sample rows and an Instructions sheet. Each row = one implant.
              For the same patient with multiple implants, leave Patient Name blank after the first row.
            </p>
            <button
              data-testid="download-template-btn"
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#EEF4F3] text-[#82A098] border border-[#C8DCD8] hover:bg-[#DDF0EC] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download OSIOLOG_Import_Template.xlsx
            </button>
          </div>
        </div>

        {/* Step 2 — Upload */}
        <div className="flex items-start gap-4">
          <div className="w-7 h-7 rounded-full bg-[#C27E70] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#2A2F35] mb-1">Upload your filled file</p>
            <p className="text-xs text-[#5C6773] mb-3">Existing patients are matched by name — no duplicates will be created.</p>
            <label
              data-testid="upload-import-label"
              className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-[#E5E5E2] hover:border-[#C27E70] hover:bg-[#FDF8F6] cursor-pointer transition-all group"
            >
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }}
                disabled={uploading}
                data-testid="bulk-import-file-input"
              />
              {uploading ? (
                <>
                  <svg className="animate-spin text-[#C27E70]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  <span className="text-sm text-[#C27E70] font-medium">Importing…</span>
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-[#C27E70] transition-colors">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <span className="text-sm text-[#5C6773] group-hover:text-[#C27E70] transition-colors">
                    Click to select your filled Excel file
                  </span>
                </>
              )}
            </label>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="mt-5 p-4 rounded-xl bg-[#F0FBF6] border border-[#A7DFC0]">
            <div className="flex items-center gap-2 mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#16A34A">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5l-4-4 1.41-1.41L10 13.67l6.59-6.59L18 8.5l-8 8z"/>
              </svg>
              <span className="text-sm font-semibold text-[#15803D]">Import successful</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[
                { label: 'Patients added', value: result.created.patients },
                { label: 'Implants added', value: result.created.implants },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white rounded-lg border border-[#A7DFC0] p-3 text-center">
                  <p className="text-xl font-bold text-[#2A2F35]">{value}</p>
                  <p className="text-xs text-[#5C6773]">{label}</p>
                </div>
              ))}
            </div>
            {result.errors?.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#D97706">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                  </svg>
                  <span className="text-xs font-semibold text-[#D97706]">{result.errors.length} row(s) skipped</span>
                </div>
                <ul className="space-y-0.5 max-h-32 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <li key={i} className="text-xs text-[#B45309]">• {e}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
