import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LocaleProvider } from './contexts/LocaleContext';
import { Toaster } from 'sonner';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetails from './pages/PatientDetails';
import MedicalVault from './pages/MedicalVault';
import Analytics from './pages/Analytics';
import Clinics from './pages/Clinics';
import Account from './pages/Account';
import Backup from './pages/Backup';
import Subscription from './pages/Subscription';
import DoctorPublicProfile from './pages/DoctorPublicProfile';
import CompleteProfile from './pages/CompleteProfile';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

function App() {
  return (
    <LocaleProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/profile/:doctorId" element={<DoctorPublicProfile />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="patients" element={<Patients />} />
            <Route path="patients/:id" element={<PatientDetails />} />
            <Route path="patients/:patientId/vault" element={<MedicalVault />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="clinics" element={<Clinics />} />
            <Route path="account" element={<Account />} />
            <Route path="backup" element={<Backup />} />
            <Route path="subscription" element={<Subscription />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </AuthProvider>
    </LocaleProvider>
  );
}

export default App;