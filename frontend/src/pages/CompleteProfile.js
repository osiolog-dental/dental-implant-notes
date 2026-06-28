import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const inputCls = 'w-full px-4 py-3 bg-white border border-[#E5E5E2] rounded-xl focus:ring-2 focus:ring-[#82A098] focus:outline-none text-[#2A2F35] text-sm transition-colors duration-200';
const labelCls = 'block text-xs font-medium text-[#5C6773] mb-1.5 uppercase tracking-wide';

export default function CompleteProfile() {
  const { user, completeGoogleRegistration } = useAuth();
  const navigate = useNavigate();

  const firebaseUser = user?.firebaseUser;
  const suggestedName = firebaseUser?.displayName || '';

  const [name, setName] = useState(suggestedName);
  const [specialization, setSpecialization] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Please enter your name'); return; }
    setLoading(true);
    const result = await completeGoogleRegistration({
      name: name.trim(),
      specialization: specialization.trim() || null,
    });
    if (result.success) {
      toast.success('Welcome to OSIOLOG! Complete your profile in Account settings.');
      navigate('/account');
    } else {
      toast.error(result.error || 'Could not create account. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9F9F8] p-6" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
      <div className="w-full max-w-md">

        <div className="flex items-center gap-3 mb-8">
          <img src="/tooth_logo.png" alt="OSIOLOG" style={{ width: 40, height: 40, objectFit: 'contain' }} />
          <span className="text-2xl font-bold text-[#2A2F35]" style={{ fontFamily: 'Work Sans, sans-serif' }}>OSIOLOG</span>
        </div>

        <div className="bg-white border border-[#E5E5E2] rounded-2xl p-8">
          <h2 className="text-2xl font-semibold text-[#2A2F35] mb-1" style={{ fontFamily: 'Work Sans, sans-serif' }}>Almost there!</h2>
          <p className="text-sm text-[#5C6773] mb-6">
            Just two quick details and you're in. You can fill in your full professional profile afterwards in Account settings.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Your Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                data-testid="complete-profile-name"
                className={inputCls}
                placeholder="Dr. Your Name"
                autoFocus
              />
            </div>

            <div>
              <label className={labelCls}>Specialization <span className="normal-case text-[#9CA3AF] font-normal">— optional</span></label>
              <input
                type="text"
                value={specialization}
                onChange={e => setSpecialization(e.target.value)}
                data-testid="complete-profile-specialization"
                className={inputCls}
                placeholder="e.g. Implantology, Prosthodontics"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              data-testid="complete-profile-submit"
              className="w-full py-3.5 bg-[#82A098] hover:bg-[#6B8A82] text-white rounded-xl font-semibold text-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Setting up your account…' : 'Enter OSIOLOG'}
            </button>
          </form>
        </div>

        <p className="text-xs text-center text-[#9CA3AF] mt-4">
          You'll be taken to your Account page to complete your full professional profile.
        </p>
      </div>
    </div>
  );
}
