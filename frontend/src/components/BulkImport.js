import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { toast } from 'sonner';
import {
  DownloadSimple, UploadSimple, FileXls, CheckCircle,
  WarningCircle, Spinner,
} from '@phosphor-icons/react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/* ── Column definitions for each sheet ── */
const PATIENT_COLS = [
  { header: 'Patient Name',    note: 'Full name (required)' },
  { header: 'Age',             note: 'Number (required)' },
  { header: 'Gender',          note: 'Male / Female / Other' },
  { header: 'Phone',           note: 'Primary phone number' },
  { header: 'Emergency Phone', note: 'Emergency contact number' },
  { header: 'Email',           note: 'Primary email' },
  { header: 'Alternate Email', note: 'Alternate email' },
  { header: 'Address',         note: 'Full address' },
  { header: 'Medical History', note: 'Allergies, conditions, medications etc.' },
];

const IMPLANT_COLS = [
  { header: 'Patient Name',            note: 'Must match exactly a name in Patients sheet (required)' },
  { header: 'Tooth Number',            note: 'FDI number e.g. 11, 16, 36 (required)' },
  { header: 'Implant Type',            note: 'Single / Multiple / Full Arch' },
  { header: 'Brand',                   note: 'e.g. Straumann, Nobel Biocare' },
  { header: 'Size (Diameter mm)',      note: 'e.g. 3.3' },
  { header: 'Length (mm)',             note: 'e.g. 10' },
  { header: 'Insertion Torque (Ncm)',  note: 'Number e.g. 35' },
  { header: 'Connection Type',         note: 'e.g. Internal Hex, Conical' },
  { header: 'Surgical Approach',       note: 'Flapless / Flap' },
  { header: 'Arch',                    note: 'Upper / Lower' },
  { header: 'Jaw Region',              note: 'Anterior / Posterior' },
  { header: 'Implant System',          note: 'Product line / system name' },
  { header: 'Bone Graft',              note: 'e.g. Autograft, Xenograft, None' },
  { header: 'Sinus Lift Type',         note: 'Lateral / Crestal / None' },
  { header: 'Pterygoid',               note: 'Yes / No' },
  { header: 'Zygomatic',               note: 'Yes / No' },
  { header: 'Subperiosteal',           note: 'Yes / No' },
  { header: 'Cover Screw',             note: 'Yes / No' },
  { header: 'Healing Abutment',        note: 'Yes / No' },
  { header: 'Membrane Used',           note: 'Yes / No' },
  { header: 'ISQ Value',               note: 'Implant Stability Quotient (number)' },
  { header: 'Surgery Date',            note: 'YYYY-MM-DD' },
  { header: 'Prosthetic Loading Date', note: 'YYYY-MM-DD' },
  { header: 'Follow Up Date',          note: 'YYYY-MM-DD' },
  { header: 'Surgeon Name',            note: 'Operating surgeon' },
  { header: 'Outcome',                 note: 'Pending / Success / Failed' },
  { header: 'Osseointegration Success',note: 'Yes / No' },
  { header: 'Peri-Implant Health',     note: 'Yes / No' },
  { header: 'Case Number',             note: 'Your internal case reference' },
  { header: 'Consultant Surgeon',      note: 'Visiting/consultant surgeon who performed surgery (if different from treating doctor)' },
  { header: 'Clinical Notes',          note: 'Any additional clinical notes' },
  { header: 'Notes',                   note: 'General notes' },
];

const FPD_COLS = [
  { header: 'Patient Name',            note: 'Must match exactly a name in Patients sheet (required)' },
  { header: 'Tooth Numbers',           note: 'Comma-separated FDI numbers e.g. 13,14,15 (required)' },
  { header: 'Crown Count',             note: 'Single / Multiple' },
  { header: 'Crown Type',              note: 'Screw Retained / Cement Retained' },
  { header: 'Crown Material',              note: 'Zirconia / Porcelain fused to metal / Metal / PFZ / Emax' },
  { header: 'Prosthetic Loading Date',     note: 'YYYY-MM-DD' },
  { header: 'Consultant Prosthodontist',   note: 'Visiting/consultant prosthodontist who did this case (if different from treating doctor)' },
  { header: 'Dental Lab',                  note: 'Name of lab that fabricated the crowns' },
  { header: 'Clinical Notes',              note: 'Any clinical observations or adjustments' },
];

/* Sample data rows for each sheet */
const PATIENT_SAMPLE = [
  ['John Doe', 45, 'Male', '9876543210', '9876543211', 'john@email.com', '', '123 Main St, Chennai', 'Hypertension, Metformin'],
  ['Priya Sharma', 32, 'Female', '9123456780', '', 'priya@email.com', 'priya2@work.com', 'Block 5, Bengaluru', 'No known allergies'],
];

const IMPLANT_SAMPLE = [
  ['John Doe', 16, 'Single', 'Straumann', '4.1', '10', 35, 'Internal Hex', 'Flapless', 'Upper', 'Posterior', 'BLT', 'None', 'None', 'No', 'No', 'No', 'No', 'Yes', 'No', 72, '2025-01-15', '2025-04-20', '2025-07-15', 'Dr. Suresh', 'Success', 'Yes', 'Yes', 'CN-001', 'Dr. Ramesh (Oral Surgeon)', 'Uneventful healing', ''],
  ['Priya Sharma', 46, 'Single', 'Nobel Biocare', '3.5', '11.5', 30, 'Conical', 'Flap', 'Lower', 'Posterior', 'Active', 'Xenograft', 'None', 'No', 'No', 'No', 'Yes', 'No', 'No', 68, '2025-03-10', '', '2025-09-10', 'Dr. Suresh', 'Pending', 'No', 'No', 'CN-002', '', '', 'Watch bone graft site'],
];

const FPD_SAMPLE = [
  ['John Doe', '13,14,15', 'Multiple', 'Screw Retained', 'Zirconia', '2025-05-01', 'Dr. Anita (Prosthodontist)', 'Precision Dental Lab', 'Patient satisfied with aesthetics'],
  ['Priya Sharma', '35', 'Single', 'Cement Retained', 'Porcelain fused to metal', '2025-06-15', '', 'City Ceramics Lab', ''],
];

function downloadTemplate() {
  const wb = XLSX.utils.book_new();

  const makeSheet = (cols, sampleRows) => {
    const headers = cols.map(c => c.header);
    const notes = cols.map(c => c.note);
    const data = [headers, notes, [], ...sampleRows];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Column widths
    ws['!cols'] = cols.map(() => ({ wch: 22 }));

    // Style header row (row 0) — bold teal
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = range.s.c; C <= range.e.c; C++) {
      const hCell = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws[hCell]) continue;
      ws[hCell].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '82A098' } },
        alignment: { wrapText: true, vertical: 'center' },
        border: {
          bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right:  { style: 'thin', color: { rgb: 'CCCCCC' } },
        },
      };
      // Note row style (row 1) — light grey italic
      const nCell = XLSX.utils.encode_cell({ r: 1, c: C });
      if (ws[nCell]) {
        ws[nCell].s = {
          font: { italic: true, color: { rgb: '888888' }, sz: 9 },
          fill: { fgColor: { rgb: 'F5F5F3' } },
          alignment: { wrapText: true },
        };
      }
    }

    // Freeze header + note rows
    ws['!freeze'] = { xSplit: 0, ySplit: 2 };
    return ws;
  };

  XLSX.utils.book_append_sheet(wb, makeSheet(PATIENT_COLS, PATIENT_SAMPLE), 'Patients');
  XLSX.utils.book_append_sheet(wb, makeSheet(IMPLANT_COLS, IMPLANT_SAMPLE), 'Implants');
  XLSX.utils.book_append_sheet(wb, makeSheet(FPD_COLS, FPD_SAMPLE), 'FPD');

  // Instructions sheet
  const instrData = [
    ['OSIOLOG — Bulk Import Template'],
    [''],
    ['HOW TO USE THIS FILE'],
    ['1. Fill in the "Patients" sheet first — one row per patient.'],
    ['2. Fill "Implants" sheet — one row per implant. Patient Name must exactly match the Patients sheet.'],
    ['3. Fill "FPD" sheet — one row per FPD/crown record. Patient Name must exactly match.'],
    ['4. Row 1 = column headers (do not edit). Row 2 = field notes (you may delete before uploading).'],
    ['5. Sample data in rows 3-4 show the format — replace with your real data.'],
    ['6. Upload this file from the Account page → Bulk Import section.'],
    [''],
    ['IMPORTANT NOTES'],
    ['• Patient Name must be identical across Patients, Implants, and FPD sheets.'],
    ['• Dates must be in YYYY-MM-DD format (e.g. 2025-03-15).'],
    ['• Yes/No fields: type Yes or No (not TRUE/FALSE).'],
    ['• FPD Tooth Numbers: comma-separated (e.g. 13,14,15).'],
    ['• Consultant Surgeon / Prosthodontist: leave blank if not applicable.'],
    ['• Dental Lab: name of the lab that made the crowns (FPD sheet only).'],
    ['• Warranty card photos must be uploaded manually from the FPD record after import.'],
    ['• Photos must be uploaded manually from the patient page after import.'],
    ['• You can upload this file multiple times — duplicate patients are NOT re-created.'],
  ];
  const instrWs = XLSX.utils.aoa_to_sheet(instrData);
  instrWs['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, instrWs, 'Instructions');

  XLSX.writeFile(wb, 'OSIOLOG_Import_Template.xlsx');
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
      const res = await axios.post(`${API_URL}/api/bulk-import`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      toast.success(`Import complete — ${res.data.created.patients} patients, ${res.data.created.implants} implants, ${res.data.created.fpd} FPD records added`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Import failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E2] mt-5 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#E5E5E2] flex items-center gap-2">
        <FileXls size={18} className="text-[#82A098]" />
        <h2 className="font-semibold text-[#2A2F35]" style={{ fontFamily: 'Work Sans, sans-serif' }}>
          Bulk Import from Excel
        </h2>
      </div>

      <div className="p-6">
        <p className="text-sm text-[#5C6773] mb-5">
          Download the template, fill in your existing patient, implant, and FPD data, then upload it here.
          Photos must be added manually from each patient's page after import.
        </p>

        {/* Step 1 — Download */}
        <div className="flex items-start gap-4 mb-5">
          <div className="w-7 h-7 rounded-full bg-[#82A098] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#2A2F35] mb-1">Download the template</p>
            <p className="text-xs text-[#5C6773] mb-3">3 sheets: Patients · Implants · FPD. Includes sample rows and field instructions.</p>
            <button
              data-testid="download-template-btn"
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#EEF4F3] text-[#82A098] border border-[#C8DCD8] hover:bg-[#DDF0EC] transition-colors"
            >
              <DownloadSimple size={16} weight="bold" />
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
                  <Spinner size={20} className="text-[#C27E70] animate-spin" />
                  <span className="text-sm text-[#C27E70] font-medium">Importing…</span>
                </>
              ) : (
                <>
                  <UploadSimple size={20} className="text-[#9CA3AF] group-hover:text-[#C27E70] transition-colors" weight="bold" />
                  <span className="text-sm text-[#5C6773] group-hover:text-[#C27E70] transition-colors">
                    Click to select your filled Excel file
                  </span>
                </>
              )}
            </label>
          </div>
        </div>

        {/* Result summary */}
        {result && (
          <div className="mt-5 p-4 rounded-xl bg-[#F0FBF6] border border-[#A7DFC0]">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={18} weight="fill" color="#16A34A" />
              <span className="text-sm font-semibold text-[#15803D]">Import successful</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[
                { label: 'Patients added',  value: result.created.patients },
                { label: 'Implants added',  value: result.created.implants },
                { label: 'FPD records',     value: result.created.fpd },
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
                  <WarningCircle size={14} color="#D97706" />
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
