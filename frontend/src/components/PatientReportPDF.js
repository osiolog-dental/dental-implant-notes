/**
 * PatientReportPDF
 * Generates a clinical PDF report for a patient including:
 *   - Patient summary & contact info
 *   - Implant records (all fields + tag/package label image)
 *   - Abutment records (+ tag/package label image)
 *   - FPD / Crown records (+ warranty image)
 *   - Photo Vault images (clinical photos & radiographs, grid)
 *
 * Uses jsPDF (no external server needed — fully client-side).
 */

import jsPDF from 'jspdf';
import client from '../api/client';

/* ── Colours matching DentalHub design ── */
const C = {
  brand:    [130, 160, 152],   // #82A098 teal
  accent:   [194, 126, 112],   // #C27E70 terracotta
  dark:     [42,  47,  53],    // #2A2F35
  mid:      [92,  103, 115],   // #5C6773
  light:    [229, 229, 226],   // #E5E5E2
  white:    [255, 255, 255],
  bg:       [249, 249, 248],   // #F9F9F8
};

/*
 * Convert an image reference to a base64 data-URL.
 * - Already a data: URL (e.g. tag images captured client-side) → returned as-is.
 * - Absolute http(s) URL (e.g. a presigned S3/R2 download URL) → fetched directly,
 *   NOT through `client`, since it's a foreign origin that doesn't need/want a
 *   Firebase auth header.
 * - Relative API path → fetched through `client` (Firebase token attached).
 */
async function toBase64(url) {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  try {
    let blob;
    if (/^https?:\/\//i.test(url)) {
      const res = await fetch(url);
      if (!res.ok) return null;
      blob = await res.blob();
    } else {
      const res = await client.get(url, { responseType: 'blob' });
      blob = res.data;
    }
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

/* jsPDF needs an explicit format ('JPEG'/'PNG'/'WEBP') — infer it from the data URL */
function imageFormatFromDataUrl(dataUrl) {
  const m = /^data:image\/(\w+);/i.exec(dataUrl || '');
  const ext = m ? m[1].toLowerCase() : 'jpeg';
  if (ext === 'png') return 'PNG';
  if (ext === 'webp') return 'WEBP';
  return 'JPEG';
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
  doc.text(`OSIOLOG — ${patientName}`, 14, pageH - 7);
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
  abutmentRecords = [],
  overdentureRecords = [],
  fullMouthRehabRecords = [],
  extractionRecords = [],
  followUpRecords = [],
  extraPhotos = [],
  clinics = [],
  chartImage = null,
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
  doc.text('OSIOLOG', margin, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Dental Implant Management System  —  Clinical Report', margin, 19);
  doc.text(`Generated: ${today}`, pageW - margin, 19, { align: 'right' });

  y = 36;

  /* Profile picture */
  let profileB64 = null;
  if (patient.profile_picture) {
    onProgress?.('Loading profile photo...');
    profileB64 = await toBase64(`/api/files/${patient.profile_picture}`);
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
     FDI DENTAL CHART
  ════════════════════════════════════════ */
  if (chartImage) {
    onProgress?.('Embedding dental chart...');
    y = checkY(doc, y, 80, pages);
    y = sectionHeading(doc, 'FDI Dental Chart', y);

    // Fit chart image across full content width, maintain aspect ratio (SVG ~1056×368 → 0.348)
    const chartW = contentW;
    const chartH = Math.round(contentW * 0.348);
    y = checkY(doc, y, chartH + 6, pages);
    try {
      doc.addImage(chartImage, 'PNG', margin, y, chartW, chartH);
    } catch {
      // fallback: skip chart silently
    }
    y += chartH + 8;
  }

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

      /* Implant tag / package label image (stored as a base64 data URL — no fetch needed) */
      if (imp.tag_image) {
        y = checkY(doc, y, 30, pages);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bolditalic');
        doc.setTextColor(...C.mid);
        doc.text('Implant Tag:', margin + 2, y + 3);
        try {
          doc.addImage(imp.tag_image, imageFormatFromDataUrl(imp.tag_image), margin + 2, y + 5, 24, 24);
        } catch {
          // corrupt/unsupported image data — skip silently
        }
        y += 24 + 6;
      }

      y += 5;
      doc.setDrawColor(...C.light);
      doc.line(margin, y, pageW - margin, y);
      y += 4;
    }
  }

  /* ════════════════════════════════════════
     ABUTMENT RECORDS
  ════════════════════════════════════════ */
  if (abutmentRecords.length > 0) {
    y = checkY(doc, y, 20, pages);
    y = sectionHeading(doc, `Abutment Records  (${abutmentRecords.length})`, y);

    for (const ab of abutmentRecords) {
      y = checkY(doc, y, 30, pages);

      filledRect(doc, margin, y, contentW, 7, [253, 243, 227]);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...[201, 132, 10]);
      doc.text(`Tooth #${ab.tooth_number ?? '—'}  —  ${ab.abutment_type || ''}`, margin + 3, y + 5);
      y += 10;
      doc.setTextColor(...C.dark);

      const connectedNames = (ab.connected_implant_ids || [])
        .map(iid => implants.find(i => i.id === iid))
        .filter(Boolean)
        .map(i => `Tooth #${i.tooth_number}${i.brand ? ` (${i.brand})` : ''}`)
        .join(', ');

      const abFields = [
        ['Placement Date',    ab.placement_date],
        ['Connected Implant', connectedNames || null],
      ].filter(([, v]) => v);

      for (let i = 0; i < abFields.length; i += 2) {
        const lh = kvRow(doc, abFields[i][0], abFields[i][1], margin + 2, y + 3.5, col - 2);
        const rh = abFields[i + 1]
          ? kvRow(doc, abFields[i + 1][0], abFields[i + 1][1], margin + col + 2, y + 3.5, col - 2)
          : 0;
        y += Math.max(lh, rh) + 2;
      }

      if (ab.clinical_notes) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.mid);
        const noteLines = wrapText(doc, ab.clinical_notes, contentW - 6);
        doc.text(noteLines, margin + 2, y + 3);
        y += noteLines.length * 4 + 4;
      }

      /* Abutment tag / package label image (base64 data URL — no fetch needed) */
      if (ab.tag_image) {
        y = checkY(doc, y, 30, pages);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bolditalic');
        doc.setTextColor(...C.mid);
        doc.text('Abutment Tag:', margin + 2, y + 3);
        try {
          doc.addImage(ab.tag_image, imageFormatFromDataUrl(ab.tag_image), margin + 2, y + 5, 24, 24);
        } catch {
          // corrupt/unsupported image data — skip silently
        }
        y += 24 + 6;
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

      /* Crown warranty image, if one was uploaded (stored as an S3/R2 key,
         resolved by the backend into a fresh presigned URL on every read) */
      if (fpd.warranty_image_url) {
        onProgress?.('Loading crown warranty image...');
        const warrantyB64 = await toBase64(fpd.warranty_image_url);
        if (warrantyB64) {
          y = checkY(doc, y, 30, pages);
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'bolditalic');
          doc.setTextColor(...C.mid);
          doc.text('Crown Warranty:', margin + 2, y + 3);
          try {
            doc.addImage(warrantyB64, imageFormatFromDataUrl(warrantyB64), margin + 2, y + 5, 24, 24);
          } catch {
            // corrupt/unsupported image data — skip silently
          }
          y += 24 + 6;
        }
      }

      y += 5;
      doc.setDrawColor(...C.light);
      doc.line(margin, y, pageW - margin, y);
      y += 4;
    }
  }

  /* ════════════════════════════════════════
     HELPER: render a simple key/value record section
     (used for Overdenture / Full Mouth Rehab / Extracted Teeth — no images)
  ════════════════════════════════════════ */
  function renderSimpleSection(title, records, headerColor, headerBg, getHeader, getFields, getNotes) {
    if (!records || records.length === 0) return;

    y = checkY(doc, y, 20, pages);
    y = sectionHeading(doc, `${title}  (${records.length})`, y);

    for (const rec of records) {
      y = checkY(doc, y, 30, pages);

      filledRect(doc, margin, y, contentW, 7, headerBg);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...headerColor);
      doc.text(getHeader(rec), margin + 3, y + 5);
      y += 10;
      doc.setTextColor(...C.dark);

      const fields = getFields(rec).filter(([, v]) => v);
      for (let i = 0; i < fields.length; i += 2) {
        const lh = kvRow(doc, fields[i][0], fields[i][1], margin + 2, y + 3.5, col - 2);
        const rh = fields[i + 1]
          ? kvRow(doc, fields[i + 1][0], fields[i + 1][1], margin + col + 2, y + 3.5, col - 2)
          : 0;
        y += Math.max(lh, rh) + 2;
      }

      const notes = getNotes(rec);
      if (notes) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.mid);
        const noteLines = wrapText(doc, notes, contentW - 6);
        doc.text(noteLines, margin + 2, y + 3);
        y += noteLines.length * 4 + 4;
      }

      y += 5;
      doc.setDrawColor(...C.light);
      doc.line(margin, y, pageW - margin, y);
      y += 4;
    }
  }

  const connectedImplantNames = (ids) => (ids || [])
    .map(iid => implants.find(i => i.id === iid))
    .filter(Boolean)
    .map(i => `Tooth #${i.tooth_number}${i.brand ? ` (${i.brand})` : ''}`)
    .join(', ');

  /* ════════════════════════════════════════
     OVERDENTURE RECORDS
  ════════════════════════════════════════ */
  renderSimpleSection(
    'Overdenture Records', overdentureRecords, [92, 74, 158], [237, 233, 247],
    rec => `Teeth: ${rec.tooth_numbers?.join(', ') || '—'}  —  ${rec.attachment_type || ''}`,
    rec => [
      ['Bar', rec.has_bar ? (rec.bar_material || 'Yes') : null],
      ['Loading Date', rec.prosthetic_loading_date],
      ['Connected Implant', connectedImplantNames(rec.connected_implant_ids)],
    ],
    rec => rec.clinical_notes,
  );

  /* ════════════════════════════════════════
     FULL MOUTH REHAB RECORDS
  ════════════════════════════════════════ */
  renderSimpleSection(
    'Full Mouth Rehab Records', fullMouthRehabRecords, [30, 100, 130], [222, 240, 245],
    rec => rec.rehab_type || 'Full Mouth Rehab',
    rec => [
      ['Loading Date', rec.prosthetic_loading_date],
      ['Connected Implant', connectedImplantNames(rec.connected_implant_ids)],
    ],
    rec => rec.clinical_notes,
  );

  /* ════════════════════════════════════════
     EXTRACTED TEETH RECORDS
  ════════════════════════════════════════ */
  renderSimpleSection(
    'Extracted Teeth Records', extractionRecords, [180, 60, 60], [250, 228, 228],
    rec => `Teeth: ${rec.tooth_numbers?.join(', ') || '—'}  —  Extracted ${rec.extraction_date || ''}`,
    rec => [
      ['Bone Graft', rec.bone_graft],
      ['Membrane Used', rec.membrane_used ? 'Yes' : null],
      ['Planned Future Implant', rec.planned_future_implant ? `Yes (reminder in ${rec.reminder_days || '—'} days)` : null],
    ],
    rec => rec.clinical_notes,
  );

  /* ════════════════════════════════════════
     IMPLANT FOLLOW-UP RECORDS
  ════════════════════════════════════════ */
  renderSimpleSection(
    'Implant Follow-up Records', followUpRecords, [30, 100, 200], [222, 232, 250],
    rec => {
      const imp = implants.find(i => i.id === rec.implant_id);
      return `Tooth #${imp?.tooth_number ?? '—'}  —  Follow-up ${rec.follow_up_date || ''}`;
    },
    rec => [
      ['Osseointegration', rec.osseointegration_success ? 'Success' : 'Not confirmed'],
      ['Peri-implant Health', rec.peri_implant_health],
      ['Prognosis', rec.prognosis],
    ],
    rec => rec.clinical_notes,
  );

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
          doc.addImage(b64, imageFormatFromDataUrl(b64), cellX, y, cellW, imgH, undefined, 'FAST');
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
     PHOTO VAULT — clinical photos & radiographs
  ════════════════════════════════════════ */
  await renderImageGrid(
    extraPhotos, 'Photo Vault', 3, 50,
    p => p.url,
    p => {
      const label = p.category ? p.category.replace(/_/g, ' ') : 'Photo';
      const date = p.uploaded_at ? new Date(p.uploaded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
      return date ? `${label}  —  ${date}` : label;
    },
    'Loading photo'
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
  doc.save(`OSIOLOG_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
