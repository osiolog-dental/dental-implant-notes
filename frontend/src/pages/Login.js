import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const DEMO_EMAIL = 'doctor@dentalapp.com';
const DEMO_PASSWORD = 'doctor123';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, loginWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();

  const submitLogin = async (nextEmail, nextPassword) => {
    setLoading(true);
    const result = await login(nextEmail, nextPassword);
    if (result.success) {
      toast.success('Welcome back!');
      navigate('/');
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await submitLogin(email, password);
  };

  const handleDemoLogin = async () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    await submitLogin(DEMO_EMAIL, DEMO_PASSWORD);
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const result = await loginWithGoogle();
    if (result.success) {
      toast.success('Welcome back!');
      navigate('/');
    } else {
      toast.error(result.error);
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    const result = await resetPassword(forgotEmail);
    if (result.success) {
      toast.success('Password reset email sent! Check your inbox.');
      setShowForgot(false);
      setForgotEmail('');
    } else {
      toast.error(result.error);
    }
    setForgotLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>

      {/* Left Panel — hexagon background + app icon */}
      <div className="lg:w-1/2 relative flex items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #1f3d38 0%, #2A4A44 50%, #1a3330 100%)', minHeight: 220 }}>

        {/* Hexagon SVG tiled background */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.18 }}>
          <defs>
            <pattern id="hex" x="0" y="0" width="56" height="97" patternUnits="userSpaceOnUse">
              {/* Row 1 hex */}
              <polygon points="28,2 54,16 54,44 28,58 2,44 2,16"
                fill="none" stroke="#82A098" strokeWidth="1.5" />
              {/* Row 2 hex offset */}
              <polygon points="56,50 82,64 82,92 56,106 30,92 30,64"
                fill="none" stroke="#82A098" strokeWidth="1.5" />
              <polygon points="0,50 26,64 26,92 0,106 -26,92 -26,64"
                fill="none" stroke="#82A098" strokeWidth="1.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hex)" />
        </svg>

        {/* Branding content */}
        <div className="relative z-10 flex flex-col items-center py-10 lg:py-0 px-8"
          style={{ textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
          {/* App icon in circle */}
          <div className="rounded-full flex items-center justify-center mb-6 shadow-2xl"
            style={{ width: 110, height: 110, background: 'rgba(255,255,255,0.12)', border: '2.5px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)' }}>
            <img src="/icon-512.png" alt="OSIOLOG" style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 16 }} />
          </div>
          <h1 className="text-5xl lg:text-6xl font-bold text-white tracking-widest"
            style={{ fontFamily: 'Work Sans, sans-serif', letterSpacing: '0.12em' }}>OSIOLOG</h1>
          <div className="mt-2 h-0.5 w-16 bg-[#C27E70] rounded-full" />
          <p className="text-sm mt-4 font-light text-white/80 tracking-widest uppercase text-center"
            style={{ letterSpacing: '0.18em' }}>Dental Implant Management System</p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F9F9F8]">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-4xl font-semibold text-[#2A2F35] tracking-tight" style={{ fontFamily: 'Work Sans, sans-serif' }}>Welcome Back</h2>
            <p className="text-[#5C6773] mt-2">Sign in to manage your dental implants</p>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            data-testid="google-login-btn"
            className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl border border-[#E5E5E2] bg-white text-sm font-medium text-[#2A2F35] hover:border-[#82A098] hover:shadow-sm active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mb-6"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="flex-1 text-left">{googleLoading ? 'Signing in…' : 'Continue with Google'}</span>
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-[#E5E5E2]" />
            <span className="text-xs text-[#9CA3AF] uppercase tracking-wide">or sign in with email</span>
            <div className="flex-1 h-px bg-[#E5E5E2]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#2A2F35] mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="email-input"
                className="w-full px-4 py-3 bg-white border border-[#E5E5E2] rounded-xl focus:ring-2 focus:ring-[#82A098] focus:outline-none focus:ring-offset-1 text-[#2A2F35] transition-colors duration-200"
                placeholder="doctor@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2A2F35] mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="password-input"
                className="w-full px-4 py-3 bg-white border border-[#E5E5E2] rounded-xl focus:ring-2 focus:ring-[#82A098] focus:outline-none focus:ring-offset-1 text-[#2A2F35] transition-colors duration-200"
                placeholder="••••••••"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                data-testid="forgot-password-btn"
                onClick={() => { setShowForgot(true); setForgotEmail(email); }}
                className="text-sm text-[#82A098] hover:text-[#6B8A82] transition-colors"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit-button"
              className="w-full py-3 bg-[#82A098] hover:bg-[#6B8A82] text-white rounded-xl font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[#5C6773]">
              Don't have an account?{' '}
              <Link
                to="/register"
                data-testid="register-link"
                className="text-[#82A098] hover:text-[#6B8A82] font-medium transition-colors duration-200"
              >
                Register here
              </Link>
            </p>
          </div>

          {showForgot && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl">
                <h3 className="font-semibold text-[#2A2F35] mb-1" style={{ fontFamily: 'Work Sans, sans-serif' }}>Reset Password</h3>
                <p className="text-sm text-[#5C6773] mb-4">Enter your email and we'll send you a reset link.</p>
                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    required
                    data-testid="forgot-email-input"
                    className="w-full px-4 py-3 bg-white border border-[#E5E5E2] rounded-xl focus:ring-2 focus:ring-[#82A098] focus:outline-none text-[#2A2F35] text-sm"
                    placeholder="doctor@example.com"
                  />
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      data-testid="send-reset-btn"
                      className="flex-1 py-2.5 bg-[#82A098] hover:bg-[#6B8A82] text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {forgotLoading ? 'Sending…' : 'Send Reset Link'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForgot(false)}
                      className="flex-1 py-2.5 border border-[#E5E5E2] text-[#2A2F35] rounded-xl text-sm font-medium hover:bg-[#F9F9F8] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="mt-8 p-4 bg-white border border-[#E5E5E2] rounded-xl">
            <p className="text-xs text-[#5C6773] mb-2 font-medium">Demo Credentials:</p>
            <p className="text-xs text-[#2A2F35]">Email: {DEMO_EMAIL}</p>
            <p className="text-xs text-[#2A2F35]">Password: {DEMO_PASSWORD}</p>
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              data-testid="demo-login-button"
              className="mt-3 w-full py-2.5 bg-[#F0F0EE] hover:bg-[#E5E5E2] text-[#2A2F35] rounded-xl font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Use Demo Account
            </button>
          </div>

          <p className="text-center text-xs text-[#5C6773] mt-6">
            By signing in you agree to our{' '}
            <Link to="/privacy" className="text-[#82A098] underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;