import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import client from '../api/client';
import { toast } from 'sonner';
import {
  DownloadSimple, UploadSimple, FileXls, CheckCircle,
  WarningCircle, Spinner,
} from '@phosphor-icons/react';

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

// archFormula/jawFormula: auto-filled from tooth number; dateCol: format as DD-MM-YYYY text
const IMPLANT_COLS = [
  { header: 'Patient Name',            note: 'Auto-filled from Patients sheet (required)' },
  { header: 'Tooth Number',            note: 'One FDI tooth number per row e.g. 16. For multiple implants add a new row each.' },
  { header: 'Implant Type',            note: 'Single / Multiple / Full Arch' },
  { header: 'Brand',                   note: 'e.g. Straumann, Nobel Biocare' },
  { header: 'Size (Diameter mm)',      note: 'e.g. 3.3' },
  { header: 'Length (mm)',             note: 'e.g. 10' },
  { header: 'Insertion Torque (Ncm)',  note: 'Number e.g. 35' },
  { header: 'Connection Type',         note: 'e.g. Internal Hex, Conical' },
  { header: 'Surgical Approach',       note: 'Flapless / Flap' },
  { header: 'Arch',                    note: 'Auto-filled: Upper (11-28) / Lower (31-48)',  archFormula: true },
  { header: 'Jaw Region',             note: 'Auto-filled: Anterior (x1-x3) / Posterior (x4-x8)', jawFormula: true },
  { header: 'Implant System',          note: 'Product line / system name' },
  { header: 'Bone Graft',              note: 'Autograft / Xenograft / None' },
  { header: 'Sinus Lift Type',         note: 'Lateral / Crestal / None' },
  { header: 'Pterygoid',               note: 'Yes / No' },
  { header: 'Zygomatic',               note: 'Yes / No' },
  { header: 'Subperiosteal',           note: 'Yes / No' },
  { header: 'Cover Screw',             note: 'Yes / No' },
  { header: 'Healing Abutment',        note: 'Yes / No' },
  { header: 'Membrane Used',           note: 'Yes / No' },
  { header: 'ISQ Value',               note: 'Implant Stability Quotient (number)' },
  { header: 'Surgery Date',            note: 'DD-MM-YYYY  e.g. 15-01-2025',            dateCol: true },
  { header: 'Prosthetic Loading Date', note: 'DD-MM-YYYY  e.g. 20-04-2025',            dateCol: true },
  { header: 'Follow Up Date',          note: 'DD-MM-YYYY  e.g. 15-07-2025',            dateCol: true },
  { header: 'Surgeon Name',            note: 'Operating surgeon' },
  { header: 'Outcome',                 note: 'Pending / Success / Failed' },
  { header: 'Osseointegration Success',note: 'Yes / No' },
  { header: 'Peri-Implant Health',     note: 'Yes / No' },
  { header: 'Case Number',             note: 'Your internal case reference' },
  { header: 'Consultant Surgeon',      note: 'Visiting/consultant surgeon (if different from treating doctor)' },
  { header: 'Clinic Name',             note: 'Name of clinic where surgery was done (must match your Clinics list)' },
  { header: 'Clinic Address',          note: 'Address of the clinic (only needed if clinic is new)' },
  { header: 'Clinical Notes',          note: 'Any additional clinical notes' },
  { header: 'Notes',                   note: 'General notes' },
];

const FPD_COLS = [
  { header: 'Patient Name',            note: 'Auto-filled from Patients sheet (required)' },
  { header: 'Tooth Numbers',           note: 'Comma-separated FDI numbers e.g. 13,14,15 (required)' },
  { header: 'Crown Count',             note: 'Single / Multiple' },
  { header: 'Crown Type',              note: 'Screw Retained / Cement Retained' },
  { header: 'Crown Material',          note: 'Zirconia / PFM / Metal / PFZ / Emax' },
  { header: 'Prosthetic Loading Date', note: 'DD-MM-YYYY  e.g. 01-05-2025',           dateCol: true },
  { header: 'Consultant Prosthodontist', note: 'Visiting prosthodontist (if different from treating doctor)' },
  { header: 'Dental Lab',              note: 'Name of lab that fabricated the crowns' },
  { header: 'Clinical Notes',          note: 'Any clinical observations or adjustments' },
];

/* Sample data rows for each sheet */
const PATIENT_SAMPLE = [
  ['John Doe', 45, 'Male', '9876543210', '9876543211', 'john@email.com', '', '123 Main St, Chennai', 'Hypertension, Metformin'],
  ['Priya Sharma', 32, 'Female', '9123456780', '', 'priya@email.com', 'priya2@work.com', 'Block 5, Bengaluru', 'No known allergies'],
];

const IMPLANT_SAMPLE = [
  ['John Doe', 16, '', 'Straumann', '4.1', '10', 35, 'Internal Hex', 'Flapless', '', '', 'BLT', 'None', 'None', '', '', '', '', '', '', 72, '15-01-2025', '20-04-2025', '15-07-2025', 'Dr. Suresh', 'Success', '', '', 'CN-001', 'Dr. Ramesh (Oral Surgeon)', 'City Dental Clinic', '123 MG Road, Chennai', 'Uneventful healing', ''],
  ['Priya Sharma', 46, '', 'Nobel Biocare', '3.5', '11.5', 30, 'Conical', 'Flap', '', '', 'Active', 'Xenograft', 'None', '', '', '', '', '', '', 68, '10-03-2025', '', '10-09-2025', 'Dr. Suresh', 'Pending', '', '', 'CN-002', '', 'Smile Care Centre', '456 Brigade Rd, Bengaluru', '', 'Watch bone graft site'],
];

const FPD_SAMPLE = [
  ['John Doe', '13,14,15', 'Multiple', 'Screw Retained', 'Zirconia', '01-05-2025', 'Dr. Anita (Prosthodontist)', 'Precision Dental Lab', 'Patient satisfied with aesthetics'],
  ['Priya Sharma', '35', 'Single', 'Cement Retained', 'Porcelain fused to metal', '15-06-2025', '', 'City Ceramics Lab', ''],
];

// Number of patient rows the dropdown will cover in Implants/FPD sheets
const MAX_PATIENT_ROWS = 500;

// Tooth sites for Site Analysis sheet (FDI upper + lower)
const FDI_SITES = [
  [11,'Upper','Anterior'],[12,'Upper','Anterior'],[13,'Upper','Anterior'],
  [14,'Upper','Posterior'],[15,'Upper','Posterior'],[16,'Upper','Posterior'],[17,'Upper','Posterior'],[18,'Upper','Posterior'],
  [21,'Upper','Anterior'],[22,'Upper','Anterior'],[23,'Upper','Anterior'],
  [24,'Upper','Posterior'],[25,'Upper','Posterior'],[26,'Upper','Posterior'],[27,'Upper','Posterior'],[28,'Upper','Posterior'],
  [31,'Lower','Anterior'],[32,'Lower','Anterior'],[33,'Lower','Anterior'],
  [34,'Lower','Posterior'],[35,'Lower','Posterior'],[36,'Lower','Posterior'],[37,'Lower','Posterior'],[38,'Lower','Posterior'],
  [41,'Lower','Anterior'],[42,'Lower','Anterior'],[43,'Lower','Anterior'],
  [44,'Lower','Posterior'],[45,'Lower','Posterior'],[46,'Lower','Posterior'],[47,'Lower','Posterior'],[48,'Lower','Posterior'],
];

// Implant diameters and lengths used in Dimension Analysis
const DIAMETERS = [3.3, 3.5, 3.75, 4.0, 4.1, 4.3, 4.5, 4.8, 5.0, 5.5, 6.0];
const LENGTHS   = [6, 7, 8, 8.5, 10, 11.5, 12, 13, 14, 16];

function styleHeader(ws, cols, headerRow = 0, noteRow = 1) {
  ws['!cols'] = cols.map(c => ({ wch: c.w || 22 }));
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let C = range.s.c; C <= range.e.c; C++) {
    const hCell = XLSX.utils.encode_cell({ r: headerRow, c: C });
    if (ws[hCell]) {
      ws[hCell].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '82A098' } },
        alignment: { wrapText: true, vertical: 'center' },
        border: { bottom: { style: 'thin', color: { rgb: 'CCCCCC' } }, right: { style: 'thin', color: { rgb: 'CCCCCC' } } },
      };
    }
    if (noteRow !== null) {
      const nCell = XLSX.utils.encode_cell({ r: noteRow, c: C });
      if (ws[nCell]) {
        ws[nCell].s = {
          font: { italic: true, color: { rgb: '888888' }, sz: 9 },
          fill: { fgColor: { rgb: 'F5F5F3' } },
          alignment: { wrapText: true },
        };
      }
    }
  }
  ws['!freeze'] = { xSplit: 0, ySplit: noteRow !== null ? 2 : 1 };
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new();

  /* ════════════════════════════════════════════
     SHEET 1 — Patients
  ════════════════════════════════════════════ */
  const patData = [
    PATIENT_COLS.map(c => c.header),
    PATIENT_COLS.map(c => c.note),
    [],
    ...PATIENT_SAMPLE,
  ];
  const patWs = XLSX.utils.aoa_to_sheet(patData);
  styleHeader(patWs, PATIENT_COLS);
  // Extend ref so formulas in other sheets can reference up to row 502
  const pRange = XLSX.utils.decode_range(patWs['!ref']);
  pRange.e.r = Math.max(pRange.e.r, MAX_PATIENT_ROWS + 1);
  patWs['!ref'] = XLSX.utils.encode_range(pRange);
  XLSX.utils.book_append_sheet(wb, patWs, 'Patients');

  /* ════════════════════════════════════════════
     SHEET 2 — Implants (main data entry)
     • Col A: patient name linked from Patients sheet
     • Col J (Arch), Col K (Jaw Region): auto from tooth number
     • All other cols: blank for doctor to fill
  ════════════════════════════════════════════ */
  const implantHeaders = [...IMPLANT_COLS.map(c => c.header)];
  implantHeaders[0] = 'Patient Name ← from Patients sheet';
  const implantNotes = [...IMPLANT_COLS.map(c => c.note)];
  implantNotes[0] = 'Auto-filled from Patients sheet col A. Fill Patients first.';

  const implantSampleStripped = IMPLANT_SAMPLE.map(r => ['', ...r.slice(1)]);
  const implantData = [implantHeaders, implantNotes, [], ...implantSampleStripped];
  const implantWs = XLSX.utils.aoa_to_sheet(implantData);
  styleHeader(implantWs, IMPLANT_COLS);

  // Inject formulas: rows 3..502 (index 2..501)
  for (let r = 2; r < MAX_PATIENT_ROWS + 2; r++) {
    const er = r + 1; // Excel 1-based row
    // Col A → patient name from Patients sheet (blank when no patient)
    implantWs[XLSX.utils.encode_cell({ r, c: 0 })] = {
      t: 'f', f: `IF(Patients!A${er}="","",Patients!A${er})`,
    };
    const tc = `B${er}`; // Tooth Number cell reference
    // Col J (9) → Arch
    IMPLANT_COLS.forEach((col, c) => {
      if (col.archFormula) {
        implantWs[XLSX.utils.encode_cell({ r, c })] = {
          t: 'f', f: `IF(${tc}="","",IF(AND(INT(${tc}/10)>=1,INT(${tc}/10)<=2),"Upper","Lower"))`,
        };
      } else if (col.jawFormula) {
        implantWs[XLSX.utils.encode_cell({ r, c })] = {
          t: 'f', f: `IF(${tc}="","",IF(MOD(${tc},10)<=3,"Anterior","Posterior"))`,
        };
      }
    });
  }
  const iRange = XLSX.utils.decode_range(implantWs['!ref'] || 'A1');
  iRange.e.r = Math.max(iRange.e.r, MAX_PATIENT_ROWS + 1);
  iRange.e.c = Math.max(iRange.e.c, IMPLANT_COLS.length - 1);
  implantWs['!ref'] = XLSX.utils.encode_range(iRange);
  XLSX.utils.book_append_sheet(wb, implantWs, 'Implants');

  /* ════════════════════════════════════════════
     SHEET 3 — FPD
  ════════════════════════════════════════════ */
  const fpdHeaders = [...FPD_COLS.map(c => c.header)];
  fpdHeaders[0] = 'Patient Name ← from Patients sheet';
  const fpdNotes = [...FPD_COLS.map(c => c.note)];
  fpdNotes[0] = 'Auto-filled from Patients sheet col A. Fill Patients first.';

  const fpdSampleStripped = FPD_SAMPLE.map(r => ['', ...r.slice(1)]);
  const fpdData = [fpdHeaders, fpdNotes, [], ...fpdSampleStripped];
  const fpdWs = XLSX.utils.aoa_to_sheet(fpdData);
  styleHeader(fpdWs, FPD_COLS);

  for (let r = 2; r < MAX_PATIENT_ROWS + 2; r++) {
    const er = r + 1;
    fpdWs[XLSX.utils.encode_cell({ r, c: 0 })] = {
      t: 'f', f: `IF(Patients!A${er}="","",Patients!A${er})`,
    };
  }
  const fRange = XLSX.utils.decode_range(fpdWs['!ref'] || 'A1');
  fRange.e.r = Math.max(fRange.e.r, MAX_PATIENT_ROWS + 1);
  fRange.e.c = Math.max(fRange.e.c, FPD_COLS.length - 1);
  fpdWs['!ref'] = XLSX.utils.encode_range(fRange);
  XLSX.utils.book_append_sheet(wb, fpdWs, 'FPD');

  /* ════════════════════════════════════════════
     SHEET 4 — Site Analysis
     COUNTIF on Implants col B (Tooth Number) for each FDI site
     Implants data starts at row 3 (index 2) → Excel rows 3:502
  ════════════════════════════════════════════ */
  const siteData = [
    ['IMPLANT SITE USAGE ANALYSIS'],
    ['Count of implants placed at each tooth site — updates automatically as you add rows to Implants sheet'],
    ['Tooth Number', 'Arch', 'Jaw Region', 'Implant Count', '% of Total'],
  ];
  const IMPLANT_DATA_RANGE = `Implants!$B$3:$B$${MAX_PATIENT_ROWS + 2}`;
  const totalFormula = `COUNTA(${IMPLANT_DATA_RANGE})`;
  FDI_SITES.forEach(([tooth, arch, jaw]) => {
    siteData.push([
      tooth, arch, jaw,
      { t: 'f', f: `COUNTIF(${IMPLANT_DATA_RANGE},${tooth})` },
      { t: 'f', f: `IF(${totalFormula}=0,0,COUNTIF(${IMPLANT_DATA_RANGE},${tooth})/${totalFormula})` },
    ]);
  });

  const siteWs = XLSX.utils.aoa_to_sheet(siteData);
  // Style title rows
  siteWs['A1'].s = { font: { bold: true, sz: 13, color: { rgb: '2A4A44' } } };
  siteWs['A2'].s = { font: { italic: true, color: { rgb: '888888' }, sz: 9 } };
  // Style header row (row index 2 = row 3)
  ['A3','B3','C3','D3','E3'].forEach(addr => {
    if (siteWs[addr]) siteWs[addr].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '82A098' } },
    };
  });
  // Format % column
  for (let r = 3; r < 3 + FDI_SITES.length; r++) {
    const addr = XLSX.utils.encode_cell({ r, c: 4 });
    if (siteWs[addr]) siteWs[addr].z = '0.0%';
  }
  siteWs['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 12 }];
  siteWs['!freeze'] = { xSplit: 0, ySplit: 3 };
  XLSX.utils.book_append_sheet(wb, siteWs, 'Site Analysis');

  /* ════════════════════════════════════════════
     SHEET 5 — Dimension Analysis
     COUNTIF on Implants col E (Diameter) and col F (Length)
     Diameter = col E (index 4), Length = col F (index 5)
  ════════════════════════════════════════════ */
  const DIA_RANGE = `Implants!$E$3:$E$${MAX_PATIENT_ROWS + 2}`;
  const LEN_RANGE = `Implants!$F$3:$F$${MAX_PATIENT_ROWS + 2}`;
  const dimData = [
    ['IMPLANT DIMENSION USAGE ANALYSIS'],
    ['Updates automatically from Implants sheet'],
    ['DIAMETER COUNTS', '', '', '', 'LENGTH COUNTS'],
    ['Diameter (mm)', 'Count', '% Share', '', 'Length (mm)', 'Count', '% Share'],
  ];
  const maxRows = Math.max(DIAMETERS.length, LENGTHS.length);
  for (let i = 0; i < maxRows; i++) {
    const row = [];
    if (i < DIAMETERS.length) {
      const d = DIAMETERS[i];
      row.push(d,
        { t: 'f', f: `COUNTIF(${DIA_RANGE},${d})` },
        { t: 'f', f: `IF(COUNTA(${DIA_RANGE})=0,0,COUNTIF(${DIA_RANGE},${d})/COUNTA(${DIA_RANGE}))` },
      );
    } else { row.push('', '', ''); }
    row.push('');
    if (i < LENGTHS.length) {
      const l = LENGTHS[i];
      row.push(l,
        { t: 'f', f: `COUNTIF(${LEN_RANGE},${l})` },
        { t: 'f', f: `IF(COUNTA(${LEN_RANGE})=0,0,COUNTIF(${LEN_RANGE},${l})/COUNTA(${LEN_RANGE}))` },
      );
    }
    dimData.push(row);
  }
  const dimWs = XLSX.utils.aoa_to_sheet(dimData);
  dimWs['!cols'] = [{ wch: 14 }, { wch: 8 }, { wch: 10 }, { wch: 4 }, { wch: 12 }, { wch: 8 }, { wch: 10 }];
  dimWs['!freeze'] = { xSplit: 0, ySplit: 4 };
  // Format % columns
  for (let r = 4; r < 4 + maxRows; r++) {
    ['C','G'].forEach(col => {
      const addr = `${col}${r + 1}`;
      if (dimWs[addr]) dimWs[addr].z = '0.0%';
    });
  }
  XLSX.utils.book_append_sheet(wb, dimWs, 'Dimension Analysis');

  /* ════════════════════════════════════════════
     SHEET 6 — Brand & Surgeon Summary
     Brand = Implants col D (index 3), Surgeon = col Y (index 24)
  ════════════════════════════════════════════ */
  const BRAND_RANGE   = `Implants!$D$3:$D$${MAX_PATIENT_ROWS + 2}`;
  const SURGEON_RANGE = `Implants!$Y$3:$Y$${MAX_PATIENT_ROWS + 2}`;
  const BRANDS   = ['Straumann','Nobel Biocare','Dentsply Sirona','Zimmer Biomet','BioHorizons','Osstem','Megagen','Adin','Alpha Bio','Other'];
  const brandData = [
    ['BRAND & SURGEON SUMMARY'],
    ['Updates automatically from Implants sheet'],
    ['IMPLANT BRAND COUNTS'],
    ['Brand', 'Count', '% Share'],
    ...BRANDS.map(b => [
      b,
      { t: 'f', f: `COUNTIF(${BRAND_RANGE},"${b}")` },
      { t: 'f', f: `IF(COUNTA(${BRAND_RANGE})=0,0,COUNTIF(${BRAND_RANGE},"${b}")/COUNTA(${BRAND_RANGE}))` },
    ]),
    [{ t: 'f', f: '"TOTAL"' }, { t: 'f', f: `COUNTA(${BRAND_RANGE})` }, ''],
    [''],
    ['SURGEON COUNTS'],
    ['Surgeon', 'Implants Placed', '% of Total'],
  ];
  const brandWs = XLSX.utils.aoa_to_sheet(brandData);
  brandWs['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 10 }];
  // Format % column
  for (let r = 4; r < 4 + BRANDS.length; r++) {
    const addr = `C${r + 1}`;
    if (brandWs[addr]) brandWs[addr].z = '0.0%';
  }
  XLSX.utils.book_append_sheet(wb, brandWs, 'Brand & Surgeon');

  /* ════════════════════════════════════════════
     SHEET 7 — Instructions
  ════════════════════════════════════════════ */
  const instrData = [
    ['OSIOLOG — Bulk Import Template'],
    [''],
    ['HOW TO USE THIS FILE'],
    ['1. Fill the "Patients" sheet first — one row per patient, Patient Name in column A.'],
    ['2. Go to "Implants" sheet — Patient Name (col A) auto-fills from the Patients sheet.'],
    ['   ONE ROW = ONE IMPLANT. For a patient with 3 implants, add 3 rows.'],
    ['3. Type the tooth number (FDI) in col B — Arch and Jaw Region fill automatically.'],
    ['4. Fill remaining columns for each implant. Leave columns blank if not applicable.'],
    ['5. "FPD" sheet works the same way — Patient Name auto-fills, one row per FPD bridge.'],
    ['6. "Site Analysis", "Dimension Analysis", "Brand & Surgeon" update automatically.'],
    ['7. When done, upload from Backup page → Bulk Import.'],
    [''],
    ['DATE FORMAT'],
    ['• All dates must be typed as DD-MM-YYYY (e.g. 15-03-2025).'],
    ['• Type dates as text — do not use Excel date picker.'],
    [''],
    ['COLUMN KEY — IMPLANTS SHEET'],
    ['Col A   Patient Name         Auto-filled from Patients sheet'],
    ['Col B   Tooth Number         FDI number — one tooth per row (e.g. 16, 26, 36)'],
    ['Col C   Implant Type         Single / Multiple / Full Arch'],
    ['Col D   Brand                Manufacturer name'],
    ['Col E   Size (Diameter mm)   Implant body diameter'],
    ['Col F   Length (mm)          Implant body length'],
    ['Col G   Insertion Torque     Ncm achieved at placement'],
    ['Col H   Connection Type      Internal Hex / Conical / External Hex etc.'],
    ['Col I   Surgical Approach    Flapless / Flap'],
    ['Col J   Arch                 Auto-filled: Upper (11-28) / Lower (31-48)'],
    ['Col K   Jaw Region           Auto-filled: Anterior (x1-x3) / Posterior (x4-x8)'],
    ['Col L   Implant System       Product line / system name'],
    ['Col M   Bone Graft           Autograft / Xenograft / None'],
    ['Col N   Sinus Lift Type      Lateral / Crestal / None'],
    ['Col O   Pterygoid            Yes / No'],
    ['Col P   Zygomatic            Yes / No'],
    ['Col Q   Subperiosteal        Yes / No'],
    ['Col R   Cover Screw          Yes / No'],
    ['Col S   Healing Abutment     Yes / No'],
    ['Col T   Membrane Used        Yes / No'],
    ['Col U   ISQ Value            Implant Stability Quotient (number)'],
    ['Col V   Surgery Date         DD-MM-YYYY'],
    ['Col W   Prosthetic Loading   DD-MM-YYYY'],
    ['Col X   Follow Up Date       DD-MM-YYYY'],
    ['Col Y   Surgeon Name         Operating surgeon'],
    ['Col Z   Outcome              Pending / Success / Failed'],
    ['Col AA  Osseointegration     Yes / No'],
    ['Col AB  Peri-Implant Health  Yes / No'],
    ['Col AC  Case Number          Internal reference'],
    ['Col AD  Consultant Surgeon   If different from treating doctor'],
    ['Col AE  Clinic Name          Must match your Clinics list (or will be created)'],
    ['Col AF  Clinic Address       Only needed if clinic is new'],
    ['Col AG  Clinical Notes       Any clinical observations'],
    ['Col AH  Notes                General notes'],
  ];
  const instrWs = XLSX.utils.aoa_to_sheet(instrData);
  instrWs['!cols'] = [{ wch: 90 }];
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
      const res = await client.post(`/api/bulk-import`, formData, {
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
