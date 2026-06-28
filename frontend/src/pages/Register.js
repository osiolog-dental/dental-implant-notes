import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const Register = () => {
  const [loading, setLoading] = useState(false);
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleGoogle = async () => {
    setLoading(true);
    const result = await loginWithGoogle();
    if (result.success) {
      navigate('/');
    } else {
      toast.error(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-1/2 bg-cover bg-center relative"
        style={{ backgroundImage: 'url(https://images.pexels.com/photos/1029624/pexels-photo-1029624.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)' }}
      >
        <div className="absolute inset-0 bg-[#2A4A44] opacity-55" />
        <div className="relative z-10 flex flex-col justify-between w-full p-12">
          <div className="text-white" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.35)' }}>
            <img src="/tooth_logo.png" alt="OSIOLOG logo" style={{ width: 80, height: 80, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            <h1 className="text-6xl font-bold mt-6 tracking-wide" style={{ fontFamily: 'Work Sans, sans-serif', letterSpacing: '0.08em' }}>OSIOLOG</h1>
            <div className="mt-1 h-0.5 w-16 bg-[#C27E70] rounded-full" />
            <p className="text-lg mt-4 font-light tracking-widest uppercase opacity-95" style={{ letterSpacing: '0.18em' }}>Dental Implant Management System</p>
          </div>
          <div className="text-white/80 text-sm space-y-2">
            <p className="flex items-center gap-2"><span className="text-[#C27E70]">✓</span> Track implant cases with FDI chart</p>
            <p className="flex items-center gap-2"><span className="text-[#C27E70]">✓</span> Manage osseointegration timelines</p>
            <p className="flex items-center gap-2"><span className="text-[#C27E70]">✓</span> Collaborate across clinics</p>
            <p className="flex items-center gap-2"><span className="text-[#C27E70]">✓</span> Analytics & financial insights</p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F9F9F8]">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src="/tooth_logo.png" alt="OSIOLOG" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            <span className="text-2xl font-bold text-[#2A2F35]" style={{ fontFamily: 'Work Sans, sans-serif' }}>OSIOLOG</span>
          </div>

          <h2 className="text-3xl font-semibold text-[#2A2F35] mb-1" style={{ fontFamily: 'Work Sans, sans-serif' }}>Create Account</h2>
          <p className="text-sm text-[#5C6773] mb-8">Sign up with your existing account — no new password needed</p>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            data-testid="google-signup-btn"
            className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl border border-[#E5E5E2] bg-white text-sm font-medium text-[#2A2F35] hover:border-[#82A098] hover:shadow-sm active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="flex-1 text-left">{loading ? 'Signing in…' : 'Continue with Google'}</span>
          </button>

          <div className="mt-6 text-center">
            <p className="text-xs text-[#9CA3AF]">
              By signing up you agree to our{' '}
              <Link to="/privacy" className="text-[#82A098] hover:underline">Privacy Policy</Link>
            </p>
          </div>

          <p className="mt-6 text-center text-sm text-[#5C6773]">
            Already have an account?{' '}
            <Link to="/login" data-testid="login-link" className="text-[#82A098] hover:text-[#6B8A82] font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
