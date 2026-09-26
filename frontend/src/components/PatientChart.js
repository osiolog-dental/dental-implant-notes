import { useEffect, useState } from 'react';
import client from '../api/client';
import DentalChart from './DentalChart';
import OpgDentalChart from './OpgDentalChart';

/*
  Chooses which FDI chart the patient page shows.
  - Free plan: the classic DentalChart only — no switch.
  - Paid plans: the panoramic chart (OpgDentalChart) by default, with a switch
    to the classic chart; the choice is remembered on this device.
  Both charts open the same forms, so saved records are identical either way.
*/
const KEY = 'osiolog.chartView';

function readChoice() {
  try { return localStorage.getItem(KEY) === 'classic' ? 'classic' : 'panoramic'; } catch { return 'panoramic'; }
}

export default function PatientChart(props) {
  const [view, setView] = useState(readChoice);
  const [plan, setPlan] = useState(null); // null while loading

  useEffect(() => {
    let cancelled = false;
    client.get('/api/subscription/status')
      // If the plan can't be read, fall back to what every plan has: the classic chart.
      .then(r => { if (!cancelled) setPlan(r.data?.plan || 'free'); })
      .catch(() => { if (!cancelled) setPlan('free'); });
    return () => { cancelled = true; };
  }, []);

  const choose = v => {
    setView(v);
    try { localStorage.setItem(KEY, v); } catch { /* private mode — choice just isn't remembered */ }
  };

  // the classic chart doesn't take the extra record lists the panoramic one draws from
  const classicProps = { ...props };
  ['abutmentRecords', 'overdentureRecords', 'fullMouthRehabRecords', 'extractionRecords', 'onEditImplant'].forEach(k => { delete classicProps[k]; });

  const classic = (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 560 }}>
        <DentalChart {...classicProps} />
      </div>
    </div>
  );

  if (plan === null) {
    return <div className="h-72 rounded-xl bg-[#F0F0EE] animate-pulse" data-testid="chart-loading" />;
  }
  if (plan === 'free') return classic;

  const panoramic = view === 'panoramic';
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
      {panoramic ? <OpgDentalChart {...props} /> : classic}
    </div>
  );
}
