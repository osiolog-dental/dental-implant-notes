/**
 * PatientReportPDF
 * Generates a clinical PDF report for a patient including:
 *   - Patient summary & contact info
 *   - Implant records (all fields)
 *   - FPD / Crown records
 *   - Clinical photos (grid, 2 per row)
 *   - Radiographs (grid, 2 per row)
 *   - Extra vault photos (grid, 3 per row)
 *
 * Uses jsPDF (no external server needed — fully client-side).
 */

import jsPDF from 'jspdf';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8002';

/* ── Colours matching Osiolog design ── */
const C = {
  brand:    [130, 160, 152],   // #82A098 teal
  accent:   [194, 126, 112],   // #C27E70 terracotta
  dark:     [42,  47,  53],    // #2A2F35
  mid:      [92,  103, 115],   // #5C6773
  light:    [229, 229, 226],   // #E5E5E2
  white:    [255, 255, 255],
  bg:       [249, 249, 248],   // #F9F9F8
};

/* Convert any accessible URL to base64 data-URL via fetch + FileReader */
async function toBase64(url) {
  try {
    const res = await fetch(url, { credentials: 'include' });
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/* Wrap text to fit within maxWidth, return array of lines */
function wrapText(doc, text, maxWidth) {
  return doc.splitTextToSize(String(text || '—'), maxWidth);
}

/* Draw a filled rounded rect (jsPDF doesn't have built-in, use rect) */
function filledRect(doc, x, y, w, h, color) {
  doc.setFillColor(...color);
  doc.rect(x, y, w, h, 'F');
}

/* Section heading */
function sectionHeading(doc, text, y) {
  filledRect(doc, 14, y, 182, 8, C.brand);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text(text.toUpperCase(), 18, y + 5.5);
  doc.setTextColor(...C.dark);
  return y + 12;
}

/* Key-value row */
function kvRow(doc, key, value, x, y, colW) {
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.mid);
  doc.text(key, x, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.dark);
  const lines = wrapText(doc, value, colW - 2);
  doc.text(lines, x + colW * 0.42, y);
  return lines.length * 4;
}

/* Add page footer */
function footer(doc, pageNum, total, patientName, date) {
  const pageH = doc.internal.pageSize.height;
  doc.setDrawColor(...C.light);
  doc.line(14, pageH - 12, 196, pageH - 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.mid);
  doc.text(`Osiolog — ${patientName}`, 14, pageH - 7);
  doc.text(`Generated ${date}`, 105, pageH - 7, { align: 'center' });
  doc.text(`Page ${pageNum} of ${total}`, 196, pageH - 7, { align: 'right' });
}

/* Add new page and return starting Y */
function newPage(doc, pages) {
  doc.addPage();
  pages.push(doc.internal.getCurrentPageInfo().pageNumber);
  return 18;
}

/* Check if there's enough room; if not, add page */
function checkY(doc, y, needed, pages) {
  if (y + needed > doc.internal.pageSize.height - 20) {
    return newPage(doc, pages);
  }
  return y;
}

/* ── MAIN EXPORT FUNCTION ── */
export async function generatePatientPDF({
  patient,
  implants = [],
  fpdRecords = [],
  extraPhotos = [],
  clinics = [],
  onProgress,
}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = doc.internal.pageSize.width;   // 210
  const pageH = doc.internal.pageSize.height;  // 297
  const margin = 14;
  const contentW = pageW - margin * 2;         // 182
  const pages = [1];

  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
  const patientName = patient.name || 'Unknown';

  /* ════════════════════════════════════════
     PAGE 1 — HEADER + PATIENT SUMMARY
  ════════════════════════════════════════ */
  let y = 14;

  /* Header bar */
  filledRect(doc, 0, 0, pageW, 28, C.brand);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text('Osiolog', margin, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Clinical Patient Report', margin, 19);
  doc.text(`Generated: ${today}`, pageW - margin, 19, { align: 'right' });

  y = 36;

  /* Profile picture */
  let profileB64 = null;
  if (patient.profile_picture) {
    onProgress?.('Loading profile photo...');
    profileB64 = await toBase64(`${API_URL}/api/files/${patient.profile_picture}`);
  }

  const photoSize = 28;
  const infoX = margin + (profileB64 ? photoSize + 6 : 0);
  const infoW = contentW - (profileB64 ? photoSize + 6 : 0);

  if (profileB64) {
    doc.addImage(profileB64, 'JPEG', margin, y, photoSize, photoSize);
  }

  /* Patient name */
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.dark);
  doc.text(patientName, infoX, y + 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.mid);
  doc.text(`${patient.age || '—'} years  •  ${patient.gender || '—'}`, infoX, y + 15);

  y += photoSize + 8;

  /* Divider */
  doc.setDrawColor(...C.light);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  /* Patient info grid — 2 columns */
  y = sectionHeading(doc, 'Patient Information', y);
  const col = contentW / 2;
  const rows = [
    ['Phone',           patient.phone],
    ['Emergency Phone', patient.emergency_phone],
    ['Email',           patient.email],
    ['Alternate Email', patient.alternate_email],
    ['Address',         patient.address],
    ['Medical History', patient.medical_history],
  ].filter(([, v]) => v);

  for (let i = 0; i < rows.length; i += 2) {
    const leftH  = kvRow(doc, rows[i][0],   rows[i][1],   margin, y + 4, col);
    const rightH = rows[i + 1]
      ? kvRow(doc, rows[i + 1][0], rows[i + 1][1], margin + col, y + 4, col)
      : 0;
    y += Math.max(leftH, rightH) + 3;
    y = checkY(doc, y, 10, pages);
  }

  y += 6;

  /* ════════════════════════════════════════
     IMPLANT RECORDS
  ════════════════════════════════════════ */
  if (implants.length > 0) {
    y = checkY(doc, y, 20, pages);
    y = sectionHeading(doc, `Implant Records  (${implants.length})`, y);

    for (let idx = 0; idx < implants.length; idx++) {
      const imp = implants[idx];
      onProgress?.(`Processing implant ${idx + 1}/${implants.length}...`);

      y = checkY(doc, y, 50, pages);

      /* Implant sub-header */
      filledRect(doc, margin, y, contentW, 7, [235, 243, 241]);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.brand);
      doc.text(`Tooth #${imp.tooth_number}  —  ${imp.implant_type || ''} Implant  —  ${imp.brand || ''}`, margin + 3, y + 5);

      const clinic = clinics.find(c => c._id === imp.clinic_id);
      if (clinic) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.mid);
        doc.text(clinic.name, pageW - margin - 3, y + 5, { align: 'right' });
      }
      y += 10;
      doc.setTextColor(...C.dark);

      /* Two-column detail grid */
      const fields = [
        ['Arch',               imp.arch],
        ['Jaw Region',         imp.jaw_region],
        ['Implant System',     imp.implant_system],
        ['Connection Type',    imp.connection_type],
        ['Diameter',           imp.diameter_mm ? `${imp.diameter_mm} mm` : null],
        ['Length',             imp.length_mm   ? `${imp.length_mm} mm`   : null],
        ['Insertion Torque',   imp.insertion_torque ? `${imp.insertion_torque} Ncm` : null],
        ['ISQ Value',          imp.isq_value   ? String(imp.isq_value)   : null],
        ['Surgical Approach',  imp.surgical_approach],
        ['Bone Graft',         imp.bone_graft],
        ['Sinus Lift',         imp.sinus_lift_type],
        ['Surgery Date',       imp.surgery_date],
        ['Loading Date',       imp.prosthetic_loading_date],
        ['Follow-up Date',     imp.follow_up_date],
        ['Surgeon',            imp.surgeon_name],
        ['Outcome',            imp.implant_outcome],
      ].filter(([, v]) => v);

      for (let i = 0; i < fields.length; i += 2) {
        const lh = kvRow(doc, fields[i][0], fields[i][1], margin + 2, y + 3.5, col - 2);
        const rh = fields[i + 1]
          ? kvRow(doc, fields[i + 1][0], fields[i + 1][1], margin + col + 2, y + 3.5, col - 2)
          : 0;
        y += Math.max(lh, rh) + 2;
        y = checkY(doc, y, 8, pages);
      }

      /* Checkboxes row */
      const checks = [
        ['Cover Screw',            imp.cover_screw],
        ['Healing Abutment',       imp.healing_abutment],
        ['Membrane Used',          imp.membrane_used],
        ['Pterygoid',              imp.is_pterygoid],
        ['Zygomatic',              imp.is_zygomatic],
        ['Sub-periosteal',         imp.is_subperiosteal],
        ['Osseointegration ✓',     imp.osseointegration_success],
        ['Peri-implant Health ✓',  imp.peri_implant_health],
      ].filter(([, v]) => v).map(([l]) => l);

      if (checks.length) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.mid);
        doc.text('Flags: ' + checks.join('  ·  '), margin + 2, y + 3);
        y += 6;
      }

      /* Clinical notes */
      if (imp.clinical_notes) {
        y = checkY(doc, y, 12, pages);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bolditalic');
        doc.setTextColor(...C.mid);
        doc.text('Notes:', margin + 2, y + 3);
        doc.setFont('helvetica', 'normal');
        const noteLines = wrapText(doc, imp.clinical_notes, contentW - 20);
        doc.text(noteLines, margin + 18, y + 3);
        y += noteLines.length * 4 + 4;
      }

      y += 5;
      doc.setDrawColor(...C.light);
      doc.line(margin, y, pageW - margin, y);
      y += 4;
    }
  }

  /* ════════════════════════════════════════
     FPD RECORDS
  ════════════════════════════════════════ */
  if (fpdRecords.length > 0) {
    y = checkY(doc, y, 20, pages);
    y = sectionHeading(doc, `Crown / FPD Records  (${fpdRecords.length})`, y);

    for (const fpd of fpdRecords) {
      y = checkY(doc, y, 30, pages);

      filledRect(doc, margin, y, contentW, 7, [240, 237, 232]);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.accent);
      doc.text(`Teeth: ${fpd.tooth_numbers?.join(', ') || '—'}  —  ${fpd.crown_type || ''} / ${fpd.crown_material || ''}`, margin + 3, y + 5);
      y += 10;
      doc.setTextColor(...C.dark);

      const fpdFields = [
        ['Crown Count',   fpd.crown_count],
        ['Crown Type',    fpd.crown_type],
        ['Material',      fpd.crown_material],
        ['Loading Date',  fpd.prosthetic_loading_date],
      ].filter(([, v]) => v);

      for (let i = 0; i < fpdFields.length; i += 2) {
        const lh = kvRow(doc, fpdFields[i][0], fpdFields[i][1], margin + 2, y + 3.5, col - 2);
        const rh = fpdFields[i + 1]
          ? kvRow(doc, fpdFields[i + 1][0], fpdFields[i + 1][1], margin + col + 2, y + 3.5, col - 2)
          : 0;
        y += Math.max(lh, rh) + 2;
      }

      if (fpd.clinical_notes) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.mid);
        const noteLines = wrapText(doc, fpd.clinical_notes, contentW - 6);
        doc.text(noteLines, margin + 2, y + 3);
        y += noteLines.length * 4 + 4;
      }
      y += 5;
      doc.setDrawColor(...C.light);
      doc.line(margin, y, pageW - margin, y);
      y += 4;
    }
  }

  /* ════════════════════════════════════════
     HELPER: render an image grid section
  ════════════════════════════════════════ */
  async function renderImageGrid(items, sectionTitle, cols, imgH, getUrl, getCaption, progressLabel) {
    if (!items || items.length === 0) return;

    y = checkY(doc, y, 20, pages);
    y = sectionHeading(doc, `${sectionTitle}  (${items.length})`, y);

    const cellW = (contentW - (cols - 1) * 4) / cols;
    let col = 0;
    let rowStartX = margin;

    for (let i = 0; i < items.length; i++) {
      onProgress?.(`${progressLabel} ${i + 1}/${items.length}...`);
      const url = getUrl(items[i]);
      const caption = getCaption(items[i]);
      const b64 = await toBase64(url);

      const cellX = rowStartX + col * (cellW + 4);

      y = checkY(doc, y, imgH + 10, pages);

      if (b64) {
        try {
          doc.addImage(b64, 'JPEG', cellX, y, cellW, imgH, undefined, 'FAST');
        } catch {
          filledRect(doc, cellX, y, cellW, imgH, C.bg);
          doc.setFontSize(7);
          doc.setTextColor(...C.mid);
          doc.text('Image unavailable', cellX + 2, y + imgH / 2);
        }
      } else {
        filledRect(doc, cellX, y, cellW, imgH, C.bg);
        doc.setFontSize(7);
        doc.setTextColor(...C.mid);
        doc.text('Image unavailable', cellX + 2, y + imgH / 2);
      }

      /* Caption below image */
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.mid);
      const capLines = wrapText(doc, caption, cellW);
      doc.text(capLines, cellX, y + imgH + 3.5);

      col++;
      if (col >= cols) {
        col = 0;
        y += imgH + (capLines.length * 3.5) + 6;
      }
    }
    if (col > 0) {
      y += imgH + 10;
    }
    y += 4;
  }

  /* ════════════════════════════════════════
     PHOTOS from implants
  ════════════════════════════════════════ */
  const allPhotos = implants.flatMap(imp =>
    (imp.clinical_photos || []).map(p => ({ ...p, tooth_number: imp.tooth_number }))
  );
  await renderImageGrid(
    allPhotos, 'Clinical Photos', 2, 60,
    p => `${API_URL}/api/files/${p.storage_path}`,
    p => `${p.view_type?.replace(/_/g, ' ') || ''}  —  Tooth #${p.tooth_number}`,
    'Loading photo'
  );

  /* ════════════════════════════════════════
     RADIOGRAPHS from implants
  ════════════════════════════════════════ */
  const allRadiographs = implants.flatMap(imp =>
    (imp.radiographs || []).map(r => ({ ...r, tooth_number: imp.tooth_number }))
  );
  await renderImageGrid(
    allRadiographs, 'Radiographs', 2, 70,
    r => `${API_URL}/api/files/${r.storage_path}`,
    r => `${r.view_type?.replace(/_/g, ' ') || ''}  —  Tooth #${r.tooth_number}`,
    'Loading radiograph'
  );

  /* ════════════════════════════════════════
     EXTRA PATIENT PHOTOS
  ════════════════════════════════════════ */
  await renderImageGrid(
    extraPhotos, 'Additional Photos', 3, 50,
    p => `${API_URL}/api/files/${p.storage_path}`,
    p => p.caption || p.original_filename || 'Photo',
    'Loading extra photo'
  );

  /* ════════════════════════════════════════
     FOOTERS on every page
  ════════════════════════════════════════ */
  const totalPages = doc.internal.getNumberOfPages();
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg);
    footer(doc, pg, totalPages, patientName, today);
  }

  /* Save */
  const safeName = patientName.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Osiolog_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
