import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Tooth } from '@phosphor-icons/react';

const DEMO_EMAIL = 'doctor@dentalapp.com';
const DEMO_PASSWORD = 'doctor123';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
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

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
      {/* Left Side - Image */}
      <div 
        className="hidden lg:flex lg:w-1/2 bg-cover bg-center relative"
        style={{
          backgroundImage: 'url(https://images.pexels.com/photos/1029624/pexels-photo-1029624.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)'
        }}
      >
        <div className="absolute inset-0 bg-[#82A098] opacity-20"></div>
        <div className="relative z-10 flex items-center justify-center w-full p-12">
          <div className="text-white">
            <Tooth size={64} weight="fill" />
            <h1 className="text-5xl font-semibold mt-6" style={{ fontFamily: 'Work Sans, sans-serif' }}>DentalHub</h1>
            <p className="text-xl mt-4 opacity-90">Professional Implant Management System</p>
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
        </div>

        <p className="text-center text-xs text-[#5C6773] mt-6">
          By signing in you agree to our{' '}
          <Link to="/privacy" className="text-[#82A098] underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
