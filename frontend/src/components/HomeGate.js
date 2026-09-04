import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Landing from '../pages/Landing';

// Root route ("/") only: logged-out visitors see the public marketing page;
// everything else behaves exactly like ProtectedRoute (redirect to /login).
const HomeGate = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F9F8]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#82A098] mx-auto"></div>
          <p className="mt-4 text-[#5C6773]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return location.pathname === '/' ? <Landing /> : <Navigate to="/login" replace />;
  }

  if (user._needsRegistration) {
    return <Navigate to="/complete-profile" replace />;
  }

  return children;
};

export default HomeGate;
