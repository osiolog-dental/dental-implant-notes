import { useState } from 'react';
import client from '../api/client';
import { toast } from 'sonner';

const TEMPLATE_URL = 'https://docs.google.com/spreadsheets/d/1nGRD2YcKeOEqntRdjBTkSIPO3ehknyZQy2TesmaW4-0/edit?usp=sharing';

export default function BulkImport() {
  const [sheetUrl, setSheetUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleImport = async () => {
    if (!sheetUrl.trim()) {
      toast.error('Please paste your Google Sheet link first');
      return;
    }
    setImporting(true);
    setResult(null);
    try {
      const res = await client.post('/api/bulk-import-sheets', { sheet_url: sheetUrl.trim() });
      setResult(res.data);
      toast.success(`Import complete — ${res.data.created.patients} patients, ${res.data.created.implants} implants added`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Import failed — check the sheet is shared publicly');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E2] mt-5 overflow-hidden">
      <div className="px-6 py-4 border-b border-[#E5E5E2] flex items-center gap-2">
        {/* spreadsheet icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#82A098" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>
        </svg>
        <h2 className="font-semibold text-[#2A2F35]" style={{ fontFamily: 'Work Sans, sans-serif' }}>
          Bulk Import from Google Sheets
        </h2>
      </div>

      <div className="p-6 space-y-6">

        {/* Step 1 */}
        <div className="flex items-start gap-4">
          <div className="w-7 h-7 rounded-full bg-[#82A098] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#2A2F35] mb-1">Open the OSIOLOG template</p>
            <p className="text-xs text-[#5C6773] mb-3">
              Click below to open the template. Then go to <strong>File → Make a copy</strong> to get your own editable version.
            </p>
            <a
              href={TEMPLATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="open-template-link"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#EEF4F3] text-[#82A098] border border-[#C8DCD8] hover:bg-[#DDF0EC] transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Open Template in Google Sheets
            </a>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex items-start gap-4">
          <div className="w-7 h-7 rounded-full bg-[#82A098] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#2A2F35] mb-1">Fill in your patient data</p>
            <p className="text-xs text-[#5C6773]">
              Each row = one implant. For the same patient with multiple implants, leave Patient Name blank on rows 2, 3, 4… — the app carries the name forward automatically.
            </p>
            <div className="mt-2 p-3 rounded-lg bg-[#F9F9F8] border border-[#E5E5E2] text-xs text-[#5C6773]">
              <span className="font-semibold text-[#2A2F35]">Columns: </span>
              Patient Name · Date of Surgery · Surgeon · Tooth/Site# · Arch · Jaw Region · Implant Brand · Implant System · Diameter · Length · Cover Screw · Healing Abutment · Bone Graft · Membrane · Torque · ISQ · Follow-up Date · Clinic Name · Clinic Address · Notes
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex items-start gap-4">
          <div className="w-7 h-7 rounded-full bg-[#C27E70] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#2A2F35] mb-1">Paste your sheet link and import</p>
            <p className="text-xs text-[#5C6773] mb-3">
              In your copy, click <strong>Share → Anyone with the link → Viewer</strong>, copy the link and paste it here.
            </p>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#E5E5E2] bg-white focus-within:ring-2 focus-within:ring-[#82A098] focus-within:border-transparent transition-all">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                </svg>
                <input
                  type="url"
                  value={sheetUrl}
                  onChange={e => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  data-testid="sheet-url-input"
                  className="flex-1 text-sm text-[#2A2F35] bg-transparent outline-none placeholder-[#9CA3AF]"
                  disabled={importing}
                />
              </div>
              <button
                onClick={handleImport}
                disabled={importing || !sheetUrl.trim()}
                data-testid="import-sheets-btn"
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#C27E70] text-white hover:bg-[#a96a5e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {importing ? (
                  <>
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    Importing…
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Import
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="p-4 rounded-xl bg-[#F0FBF6] border border-[#A7DFC0]">
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
