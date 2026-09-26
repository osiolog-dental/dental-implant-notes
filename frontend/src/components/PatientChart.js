import { useState } from 'react';
import DentalChart from './DentalChart';
import OpgDentalChart from './OpgDentalChart';

/*
  Chooses which FDI chart the patient page shows.
  "Panoramic" (OpgDentalChart) is the default. "Classic" is the original
  DentalChart, kept available behind the switch. The choice is remembered on
  this device only. Both charts open the same forms, so saved records are
  identical either way.
*/
const KEY = 'osiolog.chartView';

function readChoice() {
  try { return localStorage.getItem(KEY) === 'classic' ? 'classic' : 'panoramic'; } catch { return 'panoramic'; }
}

export default function PatientChart(props) {
  const [view, setView] = useState(readChoice);
  const choose = v => {
    setView(v);
    try { localStorage.setItem(KEY, v); } catch { /* private mode — choice just isn't remembered */ }
  };
  const panoramic = view === 'panoramic';

  // the classic chart doesn't take the extra record lists the panoramic one draws from
  const classicProps = { ...props };
  ['abutmentRecords', 'overdentureRecords', 'fullMouthRehabRecords', 'extractionRecords'].forEach(k => { delete classicProps[k]; });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-end gap-2 mb-2">
        <button
          type="button"
          data-testid="chart-view-switch"
          onClick={() => choose(panoramic ? 'classic' : 'panoramic')}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[#E5E5E2] bg-white hover:border-[#82A098] text-[#2A2F35]"
        >
          {panoramic ? 'Switch to classic chart' : 'Switch to panoramic chart'}
        </button>
      </div>
      {panoramic ? (
        <OpgDentalChart {...props} />
      ) : (
        <div className="overflow-x-auto">
          <div style={{ minWidth: 560 }}>
            <DentalChart {...classicProps} />
          </div>
        </div>
      )}
    </div>
  );
}
