import ImplantLogSheetContent from '../components/ImplantLogSheetContent';

export default function PrintImplantLogSheet() {
  return (
    <div>
      <div className="no-print" style={{ margin: '4mm 4mm 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <p style={{ fontSize: 13, color: '#5C6773', fontFamily: 'Arial, sans-serif' }}>
          Print this sheet (or save as PDF), fill it in by hand, then photograph and upload it from the Bulk Implant Log section.
          If it doesn't quite fit one page, use "Fit to printable area" / "Scale to fit" in your browser's print dialog.
        </p>
        <button
          onClick={() => window.print()}
          data-testid="print-implant-log-sheet-btn"
          style={{ padding: '8px 16px', borderRadius: 8, background: '#82A098', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
        >
          Print / Save as PDF
        </button>
      </div>

      <ImplantLogSheetContent />
    </div>
  );
}
