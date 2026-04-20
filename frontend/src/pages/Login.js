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
  const { login, resetPassword } = useAuth();
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
    <div className="min-h-screen flex" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
      {/* Left Side - Image */}
      <div 
        className="hidden lg:flex lg:w-1/2 bg-cover bg-center relative"
        style={{
          backgroundImage: 'url(https://images.pexels.com/photos/1029624/pexels-photo-1029624.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)'
        }}
      >
        <div className="absolute inset-0 bg-[#2A4A44] opacity-55"></div>
        <div className="relative z-10 flex items-center justify-center w-full p-12">
          <div className="text-white" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.35)' }}>
            <img src="/tooth_logo.png" alt="OSIOLOG logo" style={{ width: 80, height: 80, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            <h1 className="text-6xl font-bold mt-6 tracking-wide" style={{ fontFamily: 'Work Sans, sans-serif', letterSpacing: '0.08em' }}>OSIOLOG</h1>
            <div className="mt-1 h-0.5 w-16 bg-[#C27E70] rounded-full"></div>
            <p className="text-lg mt-4 font-light tracking-widest uppercase opacity-95" style={{ letterSpacing: '0.18em' }}>Dental Implant Management System</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F9F9F8]">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-4xl font-semibold text-[#2A2F35] tracking-tight" style={{ fontFamily: 'Work Sans, sans-serif' }}>Welcome Back</h2>
            <p className="text-[#5C6773] mt-2">Sign in to manage your dental implants</p>
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