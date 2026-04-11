import { useRef, useState } from 'react';
import jsQR from 'jsqr';
import { UploadSimple, QrCode, X, CheckCircle, Warning, Tag } from '@phosphor-icons/react';
import { toast } from 'sonner';

/**
 * Parses GS1 Application Identifiers from a decoded QR/DataMatrix string.
 * Handles both parenthesised format: (01)12345... and raw FNC1 groups.
 */
function parseGS1(raw) {
  const result = {};
  // Parenthesised GS1: (01)...(10)...(17)...(21)...
  const paren = raw.match(/\((\d{2,4})\)([^(]+)/g);
  if (paren) {
    paren.forEach(seg => {
      const m = seg.match(/\((\d{2,4})\)(.+)/);
      if (!m) return;
      const [, ai, val] = m;
      const v = val.trim();
      if (ai === '01') result.gtin = v;
      else if (ai === '10') result.lot = v;
      else if (ai === '11') result.mfg_date = v;          // YYMMDD
      else if (ai === '17') result.exp_date = v;           // YYMMDD
      else if (ai === '21') result.serial = v;
      else if (ai === '240') result.product_ref = v;
      else if (ai === '30') result.quantity = v;
      else if (ai === '703') result.country = v;
    });
    return result;
  }
  // Some scanners emit raw GS1 without parens — try common patterns
  const rawGS1 = raw.match(/01(\d{14})10([^\x1d]{1,20})/);
  if (rawGS1) {
    result.gtin = rawGS1[1];
    result.lot = rawGS1[2];
  }
  return result;
}

/**
 * Tries to extract diameter and length from common text patterns.
 * e.g. "D 4.1 L 10", "4.1x10", "Ø4.1mm / L10mm", "dia:4.1 len:10"
 */
function extractDimensions(text) {
  const dims = {};
  // diameter patterns
  const diaMatch = text.match(/(?:dia(?:meter)?|D|Ø)\s*[:\s]?\s*(\d+(?:\.\d+)?)\s*(?:mm)?/i);
  if (diaMatch) dims.diameter_mm = diaMatch[1];

  // length patterns
  const lenMatch = text.match(/(?:len(?:gth)?|L)\s*[:\s]?\s*(\d+(?:\.\d+)?)\s*(?:mm)?/i);
  if (lenMatch) dims.length_mm = lenMatch[1];

  // combined: 4.1x10 or 4.1×10
  if (!dims.diameter_mm || !dims.length_mm) {
    const combo = text.match(/(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/);
    if (combo) {
      if (!dims.diameter_mm) dims.diameter_mm = combo[1];
      if (!dims.length_mm) dims.length_mm = combo[2];
    }
  }
  return dims;
}

/**
 * Extract brand name heuristically from the raw text.
 * Checks for known brand names or "Brand: X" pattern.
 */
const KNOWN_BRANDS = [
  'Straumann','Nobel Biocare','Nobel','Zimmer','Biomet','Dentsply',
  'Astra Tech','Osstem','Megagen','Alpha Bio','BioHorizons','Thommen',
  'Camlog','Bredent','Neoss','Ankylos','Dentium','Dio','SIC',
  'Cortex','Hiossen','Cowellmedi','Alpha-Bio','TBR','AB Dental',
];

function extractBrand(text) {
  const brandLine = text.match(/brand\s*[:\-]\s*(.+)/i);
  if (brandLine) return brandLine[1].trim().split(/\s*[,;\n]/)[0];
  for (const b of KNOWN_BRANDS) {
    if (text.toLowerCase().includes(b.toLowerCase())) return b;
  }
  return null;
}

/**
 * Master parse function — returns a partial implant object with whatever was extracted.
 */
function parseQRData(raw) {
  if (!raw) return { raw };
  const gs1 = parseGS1(raw);
  const dims = extractDimensions(raw);
  const brand = extractBrand(raw);

  const result = { raw };

  if (brand) result.brand = brand;
  if (dims.diameter_mm) result.diameter_mm = dims.diameter_mm;
  if (dims.length_mm) {
    result.length_mm = dims.length_mm;
    result.length = `${dims.length_mm}mm`;
  }
  if (gs1.lot) result.lot_number = gs1.lot;
  if (gs1.serial) result.serial = gs1.serial;

  // Build size string if we have both
  if (dims.diameter_mm && dims.length_mm) {
    result.size = `${dims.diameter_mm}x${dims.length_mm}`;
  }

  // Extract ref/catalog number from GS1 product ref or GTIN
  if (gs1.product_ref) result.implant_system = gs1.product_ref;
  if (gs1.gtin) result.gtin = gs1.gtin;

  // Expiry → notes hint
  if (gs1.exp_date) {
    const y = `20${gs1.exp_date.substring(0, 2)}`;
    const m = gs1.exp_date.substring(2, 4);
    const d = gs1.exp_date.substring(4, 6);
    result.exp_date_display = `${d}/${m}/${y}`;
  }

  return result;
}

// ── Component ──────────────────────────────────────────────────────────────
const ImplantTagScanner = ({ onAutoFill, onImageCapture, tagImage }) => {
  const fileRef = useRef();
  const canvasRef = useRef();
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(null);   // parsed result
  const [preview, setPreview] = useState(tagImage || null);

  const handleFile = (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10 MB');
      return;
    }
    setScanning(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setPreview(dataUrl);
      onImageCapture && onImageCapture(dataUrl);

      // Draw onto hidden canvas to get pixel data for jsQR
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });
        setScanning(false);
        if (code) {
          const parsed = parseQRData(code.data);
          setScanned(parsed);
          onAutoFill && onAutoFill(parsed);
          toast.success('QR code detected — fields auto-filled!');
        } else {
          // Try inverted
          const code2 = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'onlyInvert',
          });
          if (code2) {
            const parsed = parseQRData(code2.data);
            setScanned(parsed);
            onAutoFill && onAutoFill(parsed);
            toast.success('QR code detected — fields auto-filled!');
          } else {
            setScanned({ raw: null });
            toast('No QR code found in this image. Fill details manually.', { icon: '🔍' });
          }
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
  };

  const clearTag = () => {
    setPreview(null);
    setScanned(null);
    onImageCapture && onImageCapture(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="mb-4 p-4 bg-[#F0F5F4] border border-[#82A098]/30 rounded-xl">
      {/* Hidden canvas for QR decode */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex items-center gap-2 mb-3">
        <Tag size={16} className="text-[#82A098]" weight="fill" />
        <span className="text-xs font-semibold text-[#2A2F35] uppercase tracking-wide">Implant Tag / Package Label</span>
        <span className="ml-auto text-[10px] text-[#5C6773] flex items-center gap-1">
          <QrCode size={11} />QR auto-fill supported
        </span>
      </div>

      {!preview ? (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current.click()}
          data-testid="tag-upload-zone"
          className="border-2 border-dashed border-[#82A098]/40 rounded-xl p-5 text-center cursor-pointer hover:border-[#82A098] hover:bg-[#82A098]/5 transition-all"
        >
          <UploadSimple size={28} className="text-[#82A098] mx-auto mb-2" />
          <p className="text-sm font-medium text-[#2A2F35]">Upload implant tag photo</p>
          <p className="text-xs text-[#5C6773] mt-1">Drag & drop or click · JPEG / PNG · max 10 MB</p>
          <p className="text-xs text-[#82A098] mt-1.5 font-medium">QR code on the tag will auto-fill the form</p>
        </div>
      ) : (
        <div className="flex items-start gap-4">
          {/* Tag preview */}
          <div className="relative flex-shrink-0">
            <img
              src={preview}
              alt="Implant tag"
              data-testid="tag-image-preview"
              className="w-28 h-28 object-cover rounded-xl border border-[#E5E5E2] shadow-sm"
            />
            <button
              type="button"
              onClick={clearTag}
              data-testid="tag-image-clear"
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#C27E70] text-white flex items-center justify-center shadow"
            >
              <X size={10} weight="bold" />
            </button>
          </div>

          {/* Scan result */}
          <div className="flex-1 min-w-0">
            {scanning && (
              <div className="flex items-center gap-2 text-sm text-[#5C6773]">
                <div className="w-4 h-4 border-2 border-[#82A098] border-t-transparent rounded-full animate-spin" />
                Reading QR code…
              </div>
            )}

            {scanned && !scanning && (
              <div>
                {scanned.raw ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                      <CheckCircle size={13} weight="fill" /> QR decoded — fields auto-filled
                    </div>
                    {/* Show parsed fields */}
                    <div className="flex flex-wrap gap-1.5">
                      {scanned.brand && <Chip label="Brand" value={scanned.brand} />}
                      {scanned.size && <Chip label="Size" value={scanned.size} />}
                      {scanned.diameter_mm && <Chip label="Dia" value={`${scanned.diameter_mm}mm`} />}
                      {scanned.length_mm && <Chip label="Len" value={`${scanned.length_mm}mm`} />}
                      {scanned.lot_number && <Chip label="Lot" value={scanned.lot_number} />}
                      {scanned.serial && <Chip label="S/N" value={scanned.serial} />}
                      {scanned.exp_date_display && <Chip label="Exp" value={scanned.exp_date_display} />}
                    </div>
                    <details className="mt-1">
                      <summary className="text-[10px] text-[#5C6773] cursor-pointer hover:text-[#2A2F35]">View raw QR data</summary>
                      <pre className="text-[10px] text-[#5C6773] mt-1 whitespace-pre-wrap break-all bg-white rounded p-2 border border-[#E5E5E2]">{scanned.raw}</pre>
                    </details>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-[#5C6773]">
                    <Warning size={13} className="text-amber-500" weight="fill" />
                    No QR code found — fill details manually or
                    <button type="button" onClick={() => fileRef.current.click()} className="text-[#82A098] underline ml-1">try another image</button>
                  </div>
                )}
              </div>
            )}

            {!scanned && !scanning && (
              <div className="text-xs text-[#5C6773]">
                Tag image saved.
                <button type="button" onClick={() => fileRef.current.click()} className="text-[#82A098] underline ml-1">Replace</button>
              </div>
            )}
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        data-testid="tag-file-input"
        onChange={e => handleFile(e.target.files[0])}
      />
    </div>
  );
};

function Chip({ label, value }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-[#E5E5E2] text-[10px]">
      <span className="text-[#5C6773]">{label}:</span>
      <span className="font-semibold text-[#2A2F35]">{value}</span>
    </span>
  );
}

export default ImplantTagScanner;
