import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import client from '../api/client';
import { getClinics, createClinic } from '../api/clinics';
import { createPatient } from '../api/patients';

const SHEET_NAME = 'Patient & Implant Log';

const fieldInput = "mt-1 w-full px-3 py-2 bg-white border border-[#E5E5E2] rounded-md text-sm focus:ring-2 focus:ring-[#82A098] focus:outline-none";
const cellInput = "w-full px-2 py-1.5 bg-white border border-[#E5E5E2] rounded-md text-xs focus:ring-2 focus:ring-[#82A098] focus:outline-none";

// ─────────────────────────────────────────────────────────────────────────
// Excel template (download / upload)
// ─────────────────────────────────────────────────────────────────────────

// Row/column layout here MUST match backend/app/api/routes/implant_log_import.py
function buildTemplateRows() {
  const rows = [];
  rows[0] = ['OSIOLOG — Patient & Implant Log'];
  rows[1] = [];
  rows[2] = ['Patient Name *', ''];              // row 3 → B3
  rows[3] = ['Age', ''];                          // row 4 → B4
  rows[4] = ['Gender (Male/Female/Other)', ''];   // row 5 → B5
  rows[5] = ['Phone', ''];                        // row 6 → B6
  rows[6] = ['Email', ''];                        // row 7 → B7
  rows[7] = ['Address', ''];                      // row 8 → B8
  rows[8] = ['Medical History', ''];              // row 9 → B9
  rows[9] = ['Clinic Name', ''];                  // row 10 → B10
  rows[10] = ['Surgeon', ''];                     // row 11 → B11
  rows[11] = [];
  rows[12] = [                                    // row 13 — implant table header
    'Tooth #', 'Type', 'Brand', 'Diameter (mm)', 'Length (mm)', 'Torque (Ncm)',
    'Connection', 'Approach', 'Arch', 'Region', 'Surgery Date (DD-MM-YYYY)',
    'Cover Screw (Y/N)', 'Healing Abutment (Y/N)', 'Notes',
  ];
  for (let i = 0; i < 12; i++) rows[13 + i] = [];  // rows 14–25 — blank implant rows
  return rows;
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(buildTemplateRows());
  ws['!cols'] = [
    { wch: 26 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
    { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 22 },
    { wch: 16 }, { wch: 18 }, { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, SHEET_NAME);

  const instrRows = [
    ['OSIOLOG — Patient & Implant Log — Instructions'],
    [''],
    ['One file = one patient.'],
    ['• Fill in the Patient section (rows 3–11) at the top of the "Patient & Implant Log" sheet.'],
    ['• Patient Name is required — a file with no name is skipped on upload.'],
    ['• Below that, the Implant Log table has 12 rows — fill in as many as apply, leave the rest blank.'],
    ['• A row only counts if Tooth # is filled in.'],
    ['• Date format: DD-MM-YYYY (e.g. 15-01-2024)'],
    ['• Arch: Upper or Lower'],
    ['• Region: Anterior or Posterior'],
    ['• Cover Screw / Healing Abutment: Yes or No'],
    ['• Clinic Name: created automatically if it does not already exist'],
    [''],
    ['Uploading:'],
    ['• Fill out one copy of this file per patient (e.g. one implant visit each).'],
    ['• On the app, select all the filled files at once — they upload and import together.'],
    ['• Each file creates one new patient plus their implant log rows.'],
  ];
  const wsInstr = XLSX.utils.aoa_to_sheet(instrRows);
  wsInstr['!cols'] = [{ wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, 'Instructions');

  XLSX.writeFile(wb, 'OSIOLOG_Patient_Implant_Log_Template.xlsx');
}

function ExcelMethod() {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpload = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      Array.from(fileList).forEach((file) => formData.append('files', file));
      const res = await client.post('/api/implant-log-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      const { patients, implants } = res.data.totals;
      const anyErrors = res.data.results.some(r => r.errors.length > 0);
      if (anyErrors) {
        toast.error(`Imported ${patients} patient(s), ${implants} implant(s) — some rows had errors, see details below`);
      } else {
        toast.success(`Imported ${patients} patient(s), ${implants} implant(s)`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Import failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div>
      <p className="text-sm text-[#5C6773] mb-5">
        Download one template per patient, fill it in offline, then upload all the filled files together — one file per patient.
      </p>

      <div className="flex items-start gap-4 mb-5">
        <div className="w-7 h-7 rounded-full bg-[#82A098] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#2A2F35] mb-1">Download the template</p>
          <p className="text-xs text-[#5C6773] mb-3">
            Make one copy per patient. Each copy holds that patient's details plus up to 12 implant log rows.
          </p>
          <button
            data-testid="download-implant-log-template-btn"
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#EEF4F3] text-[#82A098] border border-[#C8DCD8] hover:bg-[#DDF0EC] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Patient &amp; Implant Log Template
          </button>
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div className="w-7 h-7 rounded-full bg-[#C27E70] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#2A2F35] mb-1">Upload your filled files</p>
          <p className="text-xs text-[#5C6773] mb-3">Select multiple files at once — each one becomes a new patient with their implant log.</p>
          <label
            data-testid="upload-implant-log-label"
            className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-[#E5E5E2] hover:border-[#C27E70] hover:bg-[#FDF8F6] cursor-pointer transition-all group"
          >
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              multiple
              className="hidden"
              onChange={e => { if (e.target.files?.length) handleUpload(e.target.files); }}
              disabled={uploading}
              data-testid="implant-log-file-input"
            />
            {uploading ? (
              <>
                <svg className="animate-spin text-[#C27E70]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                <span className="text-sm text-[#C27E70] font-medium">Importing…</span>
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-[#C27E70] transition-colors">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span className="text-sm text-[#5C6773] group-hover:text-[#C27E70] transition-colors">
                  Click to select one or more filled files
                </span>
              </>
            )}
          </label>
        </div>
      </div>

      {result && (
        <div className="mt-5 p-4 rounded-xl bg-[#F0FBF6] border border-[#A7DFC0]" data-testid="implant-log-result-panel">
          <div className="flex items-center gap-2 mb-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#16A34A">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5l-4-4 1.41-1.41L10 13.67l6.59-6.59L18 8.5l-8 8z" />
            </svg>
            <span className="text-sm font-semibold text-[#15803D]">Import complete</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              { label: 'Patients added', value: result.totals.patients },
              { label: 'Implants added', value: result.totals.implants },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-lg border border-[#A7DFC0] p-3 text-center">
                <p className="text-xl font-bold text-[#2A2F35]">{value}</p>
                <p className="text-xs text-[#5C6773]">{label}</p>
              </div>
            ))}
          </div>
          <ul className="space-y-1">
            {result.results.map((r, i) => (
              <li key={i} className="text-xs">
                <span className="font-medium text-[#2A2F35]">{r.filename}</span>
                {r.patient_name ? (
                  <span className="text-[#5C6773]"> — {r.patient_name}, {r.implants_created} implant{r.implants_created === 1 ? '' : 's'}</span>
                ) : (
                  <span className="text-[#B45309]"> — skipped</span>
                )}
                {r.errors.length > 0 && (
                  <ul className="ml-4">
                    {r.errors.map((e, j) => <li key={j} className="text-[#B45309]">• {e}</li>)}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Photo method (printable sheet → photo upload → AI extraction → review → save)
// ─────────────────────────────────────────────────────────────────────────

const emptyPhotoRow = () => ({
  tooth_number: '', implant_type: 'Single', brand: '', diameter_mm: '', length_mm: '',
  insertion_torque: '', connection_type: 'Internal Hex', surgical_approach: 'Immediate Placement',
  arch: 'Upper', jaw_region: 'Posterior', surgery_date: '', cover_screw: false,
  healing_abutment: false, notes: '',
});

function normalizeScanResult(raw) {
  const p = raw.patient || {};
  return {
    filename: raw.filename,
    warnings: raw.warnings || [],
    errors: raw.errors || [],
    saved: false,
    saving: false,
    patient: {
      name: p.name || '',
      age: p.age != null ? String(p.age) : '',
      gender: p.gender || 'Male',
      phone: p.phone || '',
      email: p.email || '',
      address: p.address || '',
      medical_history: p.medical_history || '',
      clinic_name: p.clinic_name || '',
      surgeon_name: p.surgeon_name || '',
    },
    rows: (raw.implants || []).map(r => ({
      tooth_number: r.tooth_number != null ? String(r.tooth_number) : '',
      implant_type: r.implant_type || 'Single',
      brand: r.brand || '',
      diameter_mm: r.diameter_mm != null ? String(r.diameter_mm) : '',
      length_mm: r.length_mm != null ? String(r.length_mm) : '',
      insertion_torque: r.insertion_torque != null ? String(r.insertion_torque) : '',
      connection_type: r.connection_type || 'Internal Hex',
      surgical_approach: r.surgical_approach || 'Immediate Placement',
      arch: r.arch || 'Upper',
      jaw_region: r.jaw_region || 'Posterior',
      surgery_date: r.surgery_date || '',
      cover_screw: !!r.cover_screw,
      healing_abutment: !!r.healing_abutment,
      notes: r.notes || '',
    })),
  };
}

function PhotoMethod() {
  const fileRef = useRef();
  const [scanning, setScanning] = useState(false);
  const [scans, setScans] = useState([]);
  const [clinics, setClinics] = useState([]);

  useEffect(() => {
    getClinics().then(setClinics).catch(() => {});
  }, []);

  const handleScan = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setScanning(true);
    try {
      const formData = new FormData();
      Array.from(fileList).forEach((file) => formData.append('files', file));
      const res = await client.post('/api/implant-log-scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newScans = res.data.results.map(normalizeScanResult);
      let mergedCount = 0;
      setScans(prev => {
        const combined = [...prev];
        newScans.forEach((scan) => {
          const name = scan.patient.name.trim().toLowerCase();
          const matchIdx = name
            ? combined.findIndex(s => !s.saved && s.patient.name.trim().toLowerCase() === name)
            : -1;
          if (matchIdx !== -1) {
            const target = combined[matchIdx];
            combined[matchIdx] = {
              ...target,
              rows: [...target.rows, ...scan.rows],
              warnings: [...target.warnings, ...scan.warnings],
              errors: [...target.errors, ...scan.errors],
              mergedFiles: [...(target.mergedFiles || [target.filename]), scan.filename],
            };
            mergedCount += 1;
          } else {
            combined.push(scan);
          }
        });
        return combined;
      });
      toast.success(
        mergedCount > 0
          ? `Scanned ${newScans.length} photo(s) — ${mergedCount} combined with a matching patient name, review below`
          : `Scanned ${newScans.length} photo(s) — review the details below before saving`
      );
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not scan photos');
    } finally {
      setScanning(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // Fallback for when the AI reads the same patient's name slightly differently
  // across pages (so the automatic match above misses it) — lets the doctor
  // combine two cards by hand instead.
  const mergeCards = (fromIdx, intoIdx) => {
    if (fromIdx === intoIdx) return;
    setScans(prev => {
      const from = prev[fromIdx];
      const into = prev[intoIdx];
      const merged = {
        ...into,
        rows: [...into.rows, ...from.rows],
        warnings: [...into.warnings, ...from.warnings],
        errors: [...into.errors, ...from.errors],
        mergedFiles: [...(into.mergedFiles || [into.filename]), ...(from.mergedFiles || [from.filename])],
      };
      return prev
        .map((s, i) => (i === intoIdx ? merged : s))
        .filter((_, i) => i !== fromIdx);
    });
    toast.success('Pages combined into one patient');
  };

  const updatePatientField = (idx, key, value) => {
    setScans(prev => prev.map((s, i) => i === idx ? { ...s, patient: { ...s.patient, [key]: value } } : s));
  };
  const updateRow = (idx, rowIdx, key, value) => {
    setScans(prev => prev.map((s, i) => i === idx
      ? { ...s, rows: s.rows.map((r, j) => j === rowIdx ? { ...r, [key]: value } : r) }
      : s));
  };
  const addRow = (idx) => {
    setScans(prev => prev.map((s, i) => i === idx ? { ...s, rows: [...s.rows, emptyPhotoRow()] } : s));
  };
  const removeRow = (idx, rowIdx) => {
    setScans(prev => prev.map((s, i) => i === idx ? { ...s, rows: s.rows.filter((_, j) => j !== rowIdx) } : s));
  };

  const resolveClinicId = async (name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return null;
    const existing = clinics.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;
    const created = await createClinic({ name: trimmed });
    setClinics(prev => [...prev, created]);
    return created.id;
  };

  const saveScan = async (idx) => {
    const scan = scans[idx];
    if (!scan.patient.name.trim()) {
      toast.error('Patient name is required before saving');
      return;
    }
    const filledRows = scan.rows.filter(r => r.tooth_number !== '' && r.tooth_number !== null);
    if (filledRows.length === 0) {
      toast.error('Add at least one implant row (Tooth # required) before saving');
      return;
    }
    setScans(prev => prev.map((s, i) => i === idx ? { ...s, saving: true } : s));
    try {
      const clinicId = await resolveClinicId(scan.patient.clinic_name);
      const patient = await createPatient({
        name: scan.patient.name.trim(),
        age: scan.patient.age ? parseInt(scan.patient.age, 10) : null,
        gender: scan.patient.gender,
        phone: scan.patient.phone || null,
        email: scan.patient.email || null,
        address: scan.patient.address || null,
        medical_history: scan.patient.medical_history || null,
      });

      let implantsCreated = 0;
      const saveErrors = [];
      for (const row of filledRows) {
        try {
          await client.post('/api/implants', {
            patient_id: patient.id,
            tooth_number: parseInt(row.tooth_number, 10),
            implant_type: row.implant_type,
            brand: row.brand || null,
            diameter_mm: row.diameter_mm ? parseFloat(row.diameter_mm) : null,
            length_mm: row.length_mm ? parseFloat(row.length_mm) : null,
            insertion_torque: row.insertion_torque ? parseFloat(row.insertion_torque) : null,
            connection_type: row.connection_type,
            surgical_approach: row.surgical_approach,
            arch: row.arch,
            jaw_region: row.jaw_region,
            surgery_date: row.surgery_date || null,
            cover_screw: row.cover_screw,
            healing_abutment: row.healing_abutment,
            clinical_notes: row.notes || null,
            clinic_id: clinicId,
            surgeon_name: scan.patient.surgeon_name || null,
          });
          implantsCreated += 1;
        } catch (err) {
          saveErrors.push(err?.response?.data?.detail || 'Failed to save a row');
        }
      }

      setScans(prev => prev.map((s, i) => i === idx ? { ...s, saving: false, saved: true, patientId: patient.id, implantsCreated } : s));
      if (saveErrors.length === 0) {
        toast.success(`Saved ${patient.name} — ${implantsCreated} implant${implantsCreated === 1 ? '' : 's'}`);
      } else {
        toast.error(`Saved ${patient.name} but ${saveErrors.length} row(s) failed`);
      }
    } catch (err) {
      setScans(prev => prev.map((s, i) => i === idx ? { ...s, saving: false } : s));
      toast.error(err?.response?.data?.detail || 'Failed to save patient');
    }
  };

  return (
    <div>
      <p className="text-sm text-[#5C6773] mb-5">
        Print a blank sheet, fill it in by hand, photograph it, then upload — AI reads the photo and you review before anything is saved.
      </p>

      <div className="flex items-start gap-4 mb-5">
        <div className="w-7 h-7 rounded-full bg-[#82A098] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#2A2F35] mb-1">Print the sheet</p>
          <p className="text-xs text-[#5C6773] mb-3">Opens a printable page — print it or save as PDF, one copy per patient.</p>
          <button
            data-testid="open-printable-sheet-btn"
            onClick={() => window.open('/print/implant-log-sheet', '_blank')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#EEF4F3] text-[#82A098] border border-[#C8DCD8] hover:bg-[#DDF0EC] transition-colors"
          >
            Open Printable Sheet
          </button>
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div className="w-7 h-7 rounded-full bg-[#C27E70] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#2A2F35] mb-1">Upload photos of the filled sheets</p>
          <p className="text-xs text-[#5C6773] mb-3">One photo per patient. Nothing is saved until you review and confirm each one below.</p>
          <label
            data-testid="upload-implant-log-photo-label"
            className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-[#E5E5E2] hover:border-[#C27E70] hover:bg-[#FDF8F6] cursor-pointer transition-all group"
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={e => { if (e.target.files?.length) handleScan(e.target.files); }}
              disabled={scanning}
              data-testid="implant-log-photo-input"
            />
            {scanning ? (
              <span className="text-sm text-[#C27E70] font-medium">Reading photos…</span>
            ) : (
              <span className="text-sm text-[#5C6773] group-hover:text-[#C27E70] transition-colors">
                Click to select one or more photos
              </span>
            )}
          </label>
        </div>
      </div>

      {scans.map((scan, idx) => (
        <div key={idx} className="mt-6 p-4 rounded-xl border border-[#E5E5E2]" data-testid={`photo-scan-card-${idx}`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-[#2A2F35]">
              {scan.mergedFiles ? `${scan.mergedFiles.length} pages combined: ${scan.mergedFiles.join(', ')}` : scan.filename}
            </p>
            {scan.saved && (
              <span className="text-xs font-semibold text-[#15803D]">
                Saved — {scan.implantsCreated} implant{scan.implantsCreated === 1 ? '' : 's'}
              </span>
            )}
          </div>

          {!scan.saved && scans.filter((s, i) => i !== idx && !s.saved).length > 0 && (
            <div className="mb-3">
              <label className="text-xs text-[#5C6773]">
                Is this another page for a patient already listed below?{' '}
              </label>
              <select
                defaultValue=""
                onChange={e => { if (e.target.value !== '') mergeCards(idx, parseInt(e.target.value, 10)); }}
                className="ml-1 text-xs border border-[#E5E5E2] rounded px-2 py-1"
                data-testid={`photo-${idx}-merge-select`}
              >
                <option value="">No — this is a separate patient</option>
                {scans.map((other, otherIdx) => (
                  otherIdx !== idx && !other.saved && (
                    <option key={otherIdx} value={otherIdx}>
                      Yes — combine with "{other.patient.name || other.filename}"
                    </option>
                  )
                ))}
              </select>
            </div>
          )}

          {scan.errors.length > 0 && (
            <div className="mb-3 p-3 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] text-xs text-[#B91C1C]">
              {scan.errors.map((e, i) => <p key={i}>• {e}</p>)}
            </div>
          )}

          {(scan.patient.name || scan.rows.length > 0) && !scan.saved && (
            <>
              {scan.warnings.length > 0 && (
                <div className="mb-3 p-3 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E]">
                  <p className="font-semibold mb-1">AI wasn't fully confident — please check:</p>
                  {scan.warnings.map((w, i) => <p key={i}>• {w}</p>)}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="text-xs text-[#2A2F35]">Full Name *</label>
                  <input value={scan.patient.name} onChange={e => updatePatientField(idx, 'name', e.target.value)} className={fieldInput} data-testid={`photo-${idx}-name`} />
                </div>
                <div>
                  <label className="text-xs text-[#2A2F35]">Age</label>
                  <input type="number" value={scan.patient.age} onChange={e => updatePatientField(idx, 'age', e.target.value)} className={fieldInput} data-testid={`photo-${idx}-age`} />
                </div>
                <div>
                  <label className="text-xs text-[#2A2F35]">Gender</label>
                  <select value={scan.patient.gender} onChange={e => updatePatientField(idx, 'gender', e.target.value)} className={fieldInput} data-testid={`photo-${idx}-gender`}>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#2A2F35]">Phone</label>
                  <input value={scan.patient.phone} onChange={e => updatePatientField(idx, 'phone', e.target.value)} className={fieldInput} data-testid={`photo-${idx}-phone`} />
                </div>
                <div>
                  <label className="text-xs text-[#2A2F35]">Clinic</label>
                  <input value={scan.patient.clinic_name} onChange={e => updatePatientField(idx, 'clinic_name', e.target.value)} className={fieldInput} data-testid={`photo-${idx}-clinic`} />
                </div>
                <div>
                  <label className="text-xs text-[#2A2F35]">Surgeon</label>
                  <input value={scan.patient.surgeon_name} onChange={e => updatePatientField(idx, 'surgeon_name', e.target.value)} className={fieldInput} data-testid={`photo-${idx}-surgeon`} />
                </div>
              </div>

              <div className="overflow-x-auto border border-[#E5E5E2] rounded-lg mb-3">
                <table className="min-w-[1300px] w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F9F9F8] text-[#5C6773] text-xs">
                      <th className="px-2 py-2 border-b border-[#E5E5E2]">Tooth</th>
                      <th className="px-2 py-2 border-b border-[#E5E5E2]">Type</th>
                      <th className="px-2 py-2 border-b border-[#E5E5E2]">Brand</th>
                      <th className="px-2 py-2 border-b border-[#E5E5E2]">Diam</th>
                      <th className="px-2 py-2 border-b border-[#E5E5E2]">Length</th>
                      <th className="px-2 py-2 border-b border-[#E5E5E2]">Torque</th>
                      <th className="px-2 py-2 border-b border-[#E5E5E2]">Connection</th>
                      <th className="px-2 py-2 border-b border-[#E5E5E2]">Approach</th>
                      <th className="px-2 py-2 border-b border-[#E5E5E2]">Arch</th>
                      <th className="px-2 py-2 border-b border-[#E5E5E2]">Region</th>
                      <th className="px-2 py-2 border-b border-[#E5E5E2]">Date</th>
                      <th className="px-2 py-2 border-b border-[#E5E5E2]">CS</th>
                      <th className="px-2 py-2 border-b border-[#E5E5E2]">HA</th>
                      <th className="px-2 py-2 border-b border-[#E5E5E2]">Notes</th>
                      <th className="px-2 py-2 border-b border-[#E5E5E2]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {scan.rows.map((row, rowIdx) => (
                      <tr key={rowIdx} className="border-b border-[#F0F0EE] last:border-b-0">
                        <td className="px-2 py-1.5"><input type="number" value={row.tooth_number} onChange={e => updateRow(idx, rowIdx, 'tooth_number', e.target.value)} className={cellInput} data-testid={`photo-${idx}-row-${rowIdx}-tooth`} /></td>
                        <td className="px-2 py-1.5">
                          <select value={row.implant_type} onChange={e => updateRow(idx, rowIdx, 'implant_type', e.target.value)} className={cellInput}>
                            <option>Single</option><option>Bridge</option><option>Full Mouth</option>
                          </select>
                        </td>
                        <td className="px-2 py-1.5"><input value={row.brand} onChange={e => updateRow(idx, rowIdx, 'brand', e.target.value)} className={cellInput} /></td>
                        <td className="px-2 py-1.5"><input type="number" step="0.1" value={row.diameter_mm} onChange={e => updateRow(idx, rowIdx, 'diameter_mm', e.target.value)} className={cellInput} /></td>
                        <td className="px-2 py-1.5"><input type="number" step="0.1" value={row.length_mm} onChange={e => updateRow(idx, rowIdx, 'length_mm', e.target.value)} className={cellInput} /></td>
                        <td className="px-2 py-1.5"><input type="number" step="0.1" value={row.insertion_torque} onChange={e => updateRow(idx, rowIdx, 'insertion_torque', e.target.value)} className={cellInput} /></td>
                        <td className="px-2 py-1.5">
                          <select value={row.connection_type} onChange={e => updateRow(idx, rowIdx, 'connection_type', e.target.value)} className={cellInput}>
                            <option>Internal Hex</option><option>External Hex</option><option>Conical</option><option>Morse Taper</option>
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <select value={row.surgical_approach} onChange={e => updateRow(idx, rowIdx, 'surgical_approach', e.target.value)} className={cellInput}>
                            <option>Immediate Placement</option><option>Delayed Placement</option>
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <select value={row.arch} onChange={e => updateRow(idx, rowIdx, 'arch', e.target.value)} className={cellInput}>
                            <option>Upper</option><option>Lower</option>
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <select value={row.jaw_region} onChange={e => updateRow(idx, rowIdx, 'jaw_region', e.target.value)} className={cellInput}>
                            <option>Anterior</option><option>Posterior</option>
                          </select>
                        </td>
                        <td className="px-2 py-1.5"><input type="date" value={row.surgery_date} onChange={e => updateRow(idx, rowIdx, 'surgery_date', e.target.value)} className={cellInput} /></td>
                        <td className="px-2 py-1.5 text-center"><input type="checkbox" checked={row.cover_screw} onChange={e => updateRow(idx, rowIdx, 'cover_screw', e.target.checked)} /></td>
                        <td className="px-2 py-1.5 text-center"><input type="checkbox" checked={row.healing_abutment} onChange={e => updateRow(idx, rowIdx, 'healing_abutment', e.target.checked)} /></td>
                        <td className="px-2 py-1.5"><input value={row.notes} onChange={e => updateRow(idx, rowIdx, 'notes', e.target.value)} className={cellInput} /></td>
                        <td className="px-2 py-1.5">
                          <button type="button" onClick={() => removeRow(idx, rowIdx)} className="text-[#B45309] text-xs" data-testid={`photo-${idx}-row-${rowIdx}-remove`}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-3">
                <button type="button" onClick={() => addRow(idx)} className="text-xs font-semibold text-[#82A098]" data-testid={`photo-${idx}-add-row`}>
                  + Add row
                </button>
                <button
                  type="button"
                  onClick={() => saveScan(idx)}
                  disabled={scan.saving}
                  data-testid={`photo-${idx}-save`}
                  className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold bg-[#82A098] hover:bg-[#6B8A82] text-white transition-colors disabled:opacity-60"
                >
                  {scan.saving ? 'Saving…' : 'Save This Patient'}
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────

export default function PatientImplantLogForm() {
  const [method, setMethod] = useState('excel'); // 'excel' | 'photo'

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E2] mt-5 overflow-hidden">
      <div className="px-6 py-4 border-b border-[#E5E5E2] flex items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#82A098" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
        </svg>
        <h2 className="font-semibold text-[#2A2F35]" style={{ fontFamily: 'Work Sans, sans-serif' }}>
          Bulk Implant Log
        </h2>
      </div>

      <div className="px-6 pt-4 flex gap-2">
        <button
          type="button"
          data-testid="implant-log-method-excel"
          onClick={() => setMethod('excel')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${method === 'excel' ? 'bg-[#82A098] text-white border-[#82A098]' : 'bg-white text-[#5C6773] border-[#E5E5E2] hover:border-[#82A098]'}`}
        >
          Excel Import
        </button>
        <button
          type="button"
          data-testid="implant-log-method-photo"
          onClick={() => setMethod('photo')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${method === 'photo' ? 'bg-[#82A098] text-white border-[#82A098]' : 'bg-white text-[#5C6773] border-[#E5E5E2] hover:border-[#82A098]'}`}
        >
          Printable Sheet (Photo)
        </button>
      </div>

      <div className="p-6">
        {method === 'excel' ? <ExcelMethod /> : <PhotoMethod />}
      </div>
    </div>
  );
}
