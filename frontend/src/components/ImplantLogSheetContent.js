import { forwardRef } from 'react';

// Field labels/options here MUST match backend/app/api/routes/implant_log_scan.py's extraction prompt.
// Shared between frontend/src/pages/PrintImplantLogSheet.js (the printable page) and
// PatientImplantLogForm.js's "Open Printable Sheet" button, so both stay visually
// identical without maintaining the layout twice.
const ROWS = Array.from({ length: 6 }, (_, i) => i + 1);

// A square tick-box next to a label — mark it with a ✓ or X to select.
const TickBox = ({ label }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, marginRight: 5, whiteSpace: 'nowrap', lineHeight: 1 }}>
    <span style={{ width: 18, height: 18, border: '1.5px solid #333', display: 'inline-block', flexShrink: 0 }} />
    <span style={{ lineHeight: 1 }}>{label}</span>
  </span>
);

// A row of individual rectangular boxes — one CAPITAL LETTER (or digit) per box.
const BoxGrid = ({ count = 18, width = 20, height = 30 }) => (
  <span style={{ display: 'inline-flex', gap: 2, height, verticalAlign: 'middle' }}>
    {Array.from({ length: count }).map((_, i) => (
      <span key={i} style={{ width, height, border: '1.3px solid #333', display: 'inline-block', flexShrink: 0 }} />
    ))}
  </span>
);

const ImplantLogSheetContent = forwardRef(function ImplantLogSheetContent(_props, ref) {
  return (
    <div ref={ref} style={{ fontFamily: 'Arial, sans-serif', color: '#111', fontSize: 14, background: '#fff', boxSizing: 'border-box', padding: '3mm', width: '100%' }}>
      <style>{`
        @page { size: A4 landscape; margin: 4mm; }
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; margin: 0; }
        }
        *, *::before, *::after { box-sizing: border-box; }
        table { border-collapse: collapse; width: 100%; font-size: 14px; }
        .patient-table td { border: 1px solid #333; vertical-align: middle; }
        .patient-table .label-cell { padding: 8px 6px; }
        .patient-table .box-cell { padding: 0; }
        .patient-table .mixed-cell { padding: 6px; }
        .implant-table { table-layout: fixed; }
        .implant-table th, .implant-table td { border: 1px solid #333; padding: 4px; vertical-align: middle; overflow-wrap: break-word; }
        .implant-table th { background: #EEF4F3; }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 style={{ fontSize: 18, marginBottom: 3 }}>OSIOLOG — Patient &amp; Implant Log</h1>
        <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
          Page <BoxGrid count={1} width={16} height={20} />
        </span>
      </div>
      <p style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>
        Write one CAPITAL LETTER or digit per box (leave a box blank for a space). Tick (✓ or X) the box for your choice.
        More than 6 implants for one patient? Use another copy of this sheet, write the SAME Patient Name on it, and
        number the pages above — upload every page for that patient together and they'll be combined automatically.
      </p>

      {/* Patient section */}
      <table className="patient-table" style={{ marginBottom: 6 }}>
        <tbody>
          <tr>
            <td className="label-cell" style={{ fontWeight: 600, width: '10%' }}>Patient Name</td>
            <td className="box-cell" colSpan={5}><BoxGrid count={20} /></td>
          </tr>
          <tr>
            <td className="label-cell" style={{ fontWeight: 600 }}>Age</td>
            <td className="box-cell" style={{ width: '12%' }}><BoxGrid count={2} /></td>
            <td className="label-cell" style={{ fontWeight: 600, width: '10%' }}>Gender</td>
            <td className="mixed-cell" colSpan={3}><TickBox label="Male" /><TickBox label="Female" /><TickBox label="Other" /></td>
          </tr>
          <tr>
            <td className="label-cell" style={{ fontWeight: 600 }}>Phone</td>
            <td className="box-cell" colSpan={5}><BoxGrid count={16} /></td>
          </tr>
          <tr>
            <td className="label-cell" style={{ fontWeight: 600 }}>Email</td>
            <td className="box-cell" colSpan={5}><BoxGrid count={20} /></td>
          </tr>
          <tr>
            <td className="label-cell" style={{ fontWeight: 600 }}>Address</td>
            <td className="box-cell" colSpan={5}><BoxGrid count={20} /></td>
          </tr>
          <tr>
            <td className="label-cell" style={{ fontWeight: 600 }}>Medical History</td>
            <td className="mixed-cell" colSpan={5}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 0' }}>
                <TickBox label="Allergy" /><TickBox label="Cardiac" /><TickBox label="Liver" />
                <TickBox label="Kidney" /><TickBox label="Thyroid" /><TickBox label="BP" />
                <TickBox label="Diabetic" /><TickBox label="On Medication" />
                <span style={{ marginLeft: 4 }}><BoxGrid count={12} width={16} height={22} /></span>
              </div>
            </td>
          </tr>
          <tr>
            <td className="label-cell" style={{ fontWeight: 600 }}>Clinic Name</td>
            <td className="box-cell" colSpan={2}><BoxGrid count={16} /></td>
            <td className="label-cell" style={{ fontWeight: 600 }}>Surgeon</td>
            <td className="box-cell" colSpan={2}><BoxGrid count={16} /></td>
          </tr>
        </tbody>
      </table>

      {/* Implant log table */}
      <table className="implant-table">
        <colgroup>
          <col style={{ width: '5%' }} />
          <col style={{ width: '21%' }} />
          <col style={{ width: '6%' }} />
          <col style={{ width: '6%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '7%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>Tooth</th>
            <th>Brand</th>
            <th>Width (mm)</th>
            <th>Length (mm)</th>
            <th>Connection</th>
            <th>Approach</th>
            <th>Arch</th>
            <th>Region</th>
            <th>Surgery Date<br /><span style={{ fontWeight: 400, fontSize: 9 }}>DDMMYYYY</span></th>
            <th>CS</th>
            <th>HA</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((n) => (
            <tr key={n} style={{ height: 40 }}>
              <td style={{ textAlign: 'center' }}><BoxGrid count={2} width={15} height={22} /></td>
              <td></td>
              <td></td>
              <td></td>
              <td><TickBox label="IH" /><TickBox label="EH" /><TickBox label="Con" /><TickBox label="MT" /></td>
              <td><TickBox label="Imm" /><TickBox label="Del" /></td>
              <td><TickBox label="U" /><TickBox label="L" /></td>
              <td><TickBox label="Ant" /><TickBox label="Post" /></td>
              <td><BoxGrid count={8} width={13} height={20} /></td>
              <td><TickBox label="Y" /><TickBox label="N" /></td>
              <td><TickBox label="Y" /><TickBox label="N" /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ fontSize: 10.5, color: '#666', marginTop: 5 }}>
        Connection: IH = Internal Hex, EH = External Hex, Con = Conical, MT = Morse Taper.
        Approach: Imm = Immediate Placement, Del = Delayed Placement. CS = Cover Screw, HA = Healing Abutment.
        Surgery Date boxes = D D M M Y Y Y Y. Leave a row's Tooth # blank to skip it.
      </p>
    </div>
  );
});

export default ImplantLogSheetContent;
