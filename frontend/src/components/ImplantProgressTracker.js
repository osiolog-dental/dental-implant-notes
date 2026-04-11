import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Clock, PencilSimple, CheckCircle } from '@phosphor-icons/react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STAGES = [
  { id: 1, label: 'Implant Placement' },
  { id: 2, label: 'Second Stage / Impressions' },
  { id: 3, label: 'Prosthesis Delivery' },
];

/**
 * Shows the 3-stage treatment progress for one implant.
 * Props:
 *   implant  – the implant document from the API
 *   onUpdate – callback to refetch the parent list after a mutation
 */
const ImplantProgressTracker = ({ implant, onUpdate }) => {
  const currentStage = implant.current_stage || 1;
  const osseoIntDays = implant.osseointegration_days || 90;

  const [editingDays, setEditingDays] = useState(false);
  const [customDays, setCustomDays] = useState(osseoIntDays);
  const [advancing, setAdvancing] = useState(false);

  // Derive osseointegration progress from surgery_date or created_at
  const startDate = implant.surgery_date
    ? new Date(implant.surgery_date)
    : new Date(implant.created_at);
  const today = new Date();
  const daysElapsed = Math.max(0, Math.floor((today - startDate) / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(0, osseoIntDays - daysElapsed);
  const progress = Math.min(100, Math.round((daysElapsed / osseoIntDays) * 100));
  const isReady = daysElapsed >= osseoIntDays;

  const handleSaveDays = async () => {
    const days = parseInt(customDays, 10);
    if (isNaN(days) || days < 1) {
      toast.error('Enter a valid number of days');
      return;
    }
    try {
      await axios.patch(
        `${API_URL}/api/implants/${implant._id}/stage`,
        { osseointegration_days: days },
        { withCredentials: true }
      );
      toast.success('Osseointegration period updated');
      setEditingDays(false);
      onUpdate();
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Unknown error';
      toast.error(`Failed to update: ${msg}`);
      console.error('Osseo days patch error:', err?.response?.status, msg);
    }
  };

  const handleAdvanceStage = async () => {
    if (currentStage >= 3) return;
    setAdvancing(true);
    try {
      const nextStage = currentStage + 1;
      const todayStr = new Date().toISOString().split('T')[0];
      const payload = { current_stage: nextStage };
      if (nextStage === 2) payload.stage_2_date = todayStr;
      if (nextStage === 3) payload.stage_3_date = todayStr;
      await axios.patch(`${API_URL}/api/implants/${implant._id}/stage`, payload, { withCredentials: true });
      toast.success(`Moved to Stage ${nextStage}: ${STAGES[nextStage - 1].label}`);
      onUpdate();
    } catch {
      toast.error('Failed to advance stage');
    } finally {
      setAdvancing(false);
    }
  };

  const handleRevertStage = async () => {
    if (currentStage <= 1) return;
    setAdvancing(true);
    try {
      const prevStage = currentStage - 1;
      const payload = { current_stage: prevStage };
      if (currentStage === 3) payload.stage_3_date = null;
      if (currentStage === 2) payload.stage_2_date = null;
      await axios.patch(`${API_URL}/api/implants/${implant._id}/stage`, payload, { withCredentials: true });
      toast.success(`Reverted to Stage ${prevStage}: ${STAGES[prevStage - 1].label}`);
      onUpdate();
    } catch {
      toast.error('Failed to revert stage');
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-[#E5E5E2]">

      {/* ── Stage stepper ── */}
      <div className="flex items-start mb-3">
        {STAGES.map((stage, idx) => {
          const isDone = currentStage > stage.id;
          const isActive = currentStage === stage.id;
          return (
            <div key={stage.id} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center min-w-[44px]">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors shrink-0 ${
                    isDone
                      ? 'bg-[#82A098] border-[#82A098] text-white'
                      : isActive
                      ? 'bg-white border-[#82A098] text-[#82A098]'
                      : 'bg-white border-[#E5E5E2] text-[#5C6773]'
                  }`}
                  data-testid={`stage-bubble-${implant._id}-${stage.id}`}
                >
                  {isDone ? '✓' : stage.id}
                </div>
                <p
                  className={`text-[10px] mt-1 text-center leading-tight px-0.5 ${
                    isActive ? 'text-[#82A098] font-medium' : 'text-[#5C6773]'
                  }`}
                >
                  {stage.label}
                </p>
              </div>
              {idx < STAGES.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-1 -mt-4 ${
                    isDone ? 'bg-[#82A098]' : 'bg-[#E5E5E2]'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Osseointegration counter (stage 1 only) ── */}
      {currentStage === 1 && (
        <div className="bg-[#F9F9F8] rounded-lg p-3 border border-[#E5E5E2]">
          {/* Header row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-[#82A098]" weight="duotone" />
              <span className="text-xs font-medium text-[#2A2F35]">Osseointegration</span>
            </div>

            {!editingDays ? (
              <button
                onClick={() => setEditingDays(true)}
                data-testid={`edit-osseo-days-${implant._id}`}
                className="flex items-center gap-1 text-xs text-[#5C6773] hover:text-[#82A098] transition-colors"
              >
                <PencilSimple size={12} />
                Edit period
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  data-testid={`osseo-days-input-${implant._id}`}
                  className="w-14 px-1.5 py-0.5 text-xs border border-[#82A098] rounded focus:outline-none focus:ring-1 focus:ring-[#82A098]"
                />
                <span className="text-xs text-[#5C6773]">days</span>
                <button
                  onClick={handleSaveDays}
                  data-testid={`save-osseo-days-${implant._id}`}
                  className="text-xs text-[#82A098] font-medium hover:underline"
                >
                  Save
                </button>
                <button
                  onClick={() => { setEditingDays(false); setCustomDays(osseoIntDays); }}
                  className="text-xs text-[#5C6773] hover:underline"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-[#E5E5E2] rounded-full overflow-hidden mb-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                isReady ? 'bg-[#82A098]' : 'bg-[#E8A76C]'
              }`}
              style={{ width: `${progress}%` }}
              data-testid={`osseo-progress-bar-${implant._id}`}
            />
          </div>

          {/* Status row */}
          <div className="flex justify-between items-center text-xs text-[#5C6773]">
            <span>Day {daysElapsed} of {osseoIntDays}</span>
            {isReady ? (
              <span className="text-[#82A098] font-semibold flex items-center gap-1">
                <CheckCircle size={13} weight="fill" />
                Ready for Stage 2
              </span>
            ) : (
              <span>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining</span>
            )}
          </div>
        </div>
      )}

      {/* Stage 2 date badge */}
      {currentStage >= 2 && implant.stage_2_date && (
        <p className="text-[10px] text-[#5C6773] mt-1">
          Stage 2 logged: {new Date(implant.stage_2_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      )}
      {currentStage >= 3 && implant.stage_3_date && (
        <p className="text-[10px] text-[#5C6773]">
          Prosthesis delivered: {new Date(implant.stage_3_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      )}

      {/* ── Stage buttons ── */}
      <div className="flex items-center justify-between mt-2">
        {/* Revert */}
        {currentStage > 1 ? (
          <button
            onClick={handleRevertStage}
            disabled={advancing}
            data-testid={`revert-stage-btn-${implant._id}`}
            className="text-xs px-3 py-1.5 rounded-lg font-medium border border-[#E5E5E2] text-[#5C6773] hover:border-[#C27E70] hover:text-[#C27E70] transition-colors disabled:opacity-40"
          >
            ← Revert to Stage {currentStage - 1}
          </button>
        ) : (
          <span />
        )}

        {/* Advance / Complete */}
        {currentStage < 3 ? (
          <button
            onClick={handleAdvanceStage}
            disabled={advancing || (currentStage === 1 && !isReady)}
            data-testid={`advance-stage-btn-${implant._id}`}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              currentStage === 1 && !isReady
                ? 'bg-[#E5E5E2] text-[#5C6773] cursor-not-allowed'
                : 'bg-[#82A098] text-white hover:bg-[#6B8A82]'
            }`}
          >
            {advancing ? 'Updating…' : `Mark: ${STAGES[currentStage].label}`}
          </button>
        ) : (
          <span className="text-xs px-3 py-1.5 rounded-lg bg-[#82A098]/10 text-[#82A098] font-semibold">
            ✓ Treatment Complete
          </span>
        )}
      </div>
    </div>
  );
};

export default ImplantProgressTracker;
