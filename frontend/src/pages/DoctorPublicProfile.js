import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import { QRCodeSVG } from 'qrcode.react';
import {
  Stethoscope, Certificate, GraduationCap, MapPin,
  Buildings, Users, Tooth, CheckCircle, FilePdf,
} from '@phosphor-icons/react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function DoctorPublicProfile() {
  const { doctorId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [exporting, setExporting] = useState(false);

  const profileUrl = `${window.location.origin}/profile/${doctorId}`;

  useEffect(() => {
    axios.get(`${API_URL}/api/public/profile/${doctorId}`)
      .then(r => setProfile(r.data))
      .catch(e => {
        if (e.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [doctorId]);

  const handleExportPDF = async () => {
    if (!profile) return;
    setExporting(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210; const pad = 18;

      // Header band
      doc.setFillColor(130, 160, 152);
      doc.rect(0, 0, W, 52, 'F');

      // Profile photo
      if (profile.profile_picture) {
        try {
          const res = await fetch(`${API_URL}/api/files/${profile.profile_picture}`, { credentials: 'include' });
          const blob = await res.blob();
          const b64 = await new Promise(resolve => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result);
            fr.readAsDataURL(blob);
          });
          doc.addImage(b64, 'JPEG', pad, 8, 34, 34, '', 'FAST');
          // Circle clip illusion — white ring
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(1.5);
          doc.circle(pad + 17, 25, 18);
        } catch {}
      }

      // Name & specialization
      const nameX = profile.profile_picture ? pad + 40 : pad;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      const displayName = profile.name.startsWith('Dr') ? profile.name : `Dr. ${profile.name}`;
      doc.text(displayName, nameX, 22);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(220, 240, 235);
      doc.text(profile.specialization || 'Dental Surgeon', nameX, 30);
      doc.setFontSize(9);
      doc.text(`Reg. No: ${profile.registration_number || '—'}`, nameX, 38);

      // DentalHub branding
      doc.setFontSize(8);
      doc.setTextColor(180, 220, 210);
      doc.text('DentalHub Professional Profile', W - pad, 48, { align: 'right' });

      let y = 64;

      // Stats row
      const stats = [
        { label: 'Patients', value: profile.stats.patients ?? '—' },
        { label: 'Implants', value: profile.stats.implants ?? '—' },
        { label: 'FPD Cases', value: profile.stats.fpd ?? '—' },
        { label: 'Success Rate', value: profile.stats.success_rate != null ? `${profile.stats.success_rate}%` : 'N/A' },
      ];
      const statW = (W - pad * 2) / stats.length;
      stats.forEach((s, i) => {
        const sx = pad + i * statW;
        doc.setFillColor(238, 244, 243);
        doc.roundedRect(sx, y, statW - 3, 20, 3, 3, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(42, 47, 53);
        doc.text(String(s.value), sx + statW / 2 - 1.5, y + 11, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(92, 103, 115);
        doc.text(s.label, sx + statW / 2 - 1.5, y + 17, { align: 'center' });
      });
      y += 28;

      // Details section
      const detail = (label, value) => {
        if (!value) return;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(130, 160, 152);
        doc.text(label.toUpperCase(), pad, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(42, 47, 53);
        doc.text(value, pad, y + 5);
        y += 13;
      };

      doc.setDrawColor(229, 229, 226);
      doc.setLineWidth(0.3);
      doc.line(pad, y, W - pad, y);
      y += 6;

      detail('Specialization', profile.specialization);
      detail('Registration Number', profile.registration_number);
      detail('College / University', [profile.college, profile.college_place].filter(Boolean).join(', '));
      detail('Country', profile.country);

      if (profile.clinics?.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(130, 160, 152);
        doc.text('CLINICS', pad, y);
        y += 5;
        profile.clinics.forEach(c => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(42, 47, 53);
          doc.text(`• ${c.name || c}`, pad + 3, y);
          y += 5;
        });
        y += 4;
      }

      // QR code section
      doc.setDrawColor(229, 229, 226);
      doc.line(pad, y, W - pad, y);
      y += 8;

      // Generate QR as canvas, embed in PDF
      const qrCanvas = document.createElement('canvas');
      const { QRCodeCanvas } = await import('qrcode.react');
      // Use browser canvas via qrcode lib directly
      const QRCode = (await import('qrcode')).default;
      const qrDataUrl = await QRCode.toDataURL(profileUrl, { width: 120, margin: 1, color: { dark: '#2A2F35', light: '#FFFFFF' } });
      doc.addImage(qrDataUrl, 'PNG', pad, y, 30, 30);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(42, 47, 53);
      doc.text('Scan to view digital profile', pad + 34, y + 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(92, 103, 115);
      doc.text(profileUrl, pad + 34, y + 16);
      y += 38;

      // Footer
      doc.setFillColor(249, 249, 248);
      doc.rect(0, 282, W, 15, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.text(`Generated via DentalHub • ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, W / 2, 289, { align: 'center' });

      doc.save(`${displayName.replace(/\s+/g, '_')}_Profile.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F9F9F8] flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#82A098]" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-[#F9F9F8] flex items-center justify-center">
      <div className="text-center">
        <p className="text-2xl font-semibold text-[#2A2F35]">Profile not found</p>
        <p className="text-[#5C6773] mt-2">This link may be invalid or the doctor's account has been removed.</p>
      </div>
    </div>
  );

  if (!profile) return null;

  const displayName = (profile.name || '').startsWith('Dr') ? profile.name : `Dr. ${profile.name || ''}`;

  return (
    <div className="min-h-screen bg-[#F9F9F8]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>

      {/* Header */}
      <div className="bg-gradient-to-br from-[#82A098] to-[#5C8077] pt-12 pb-20 px-4">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center sm:items-end gap-5">
          {profile.profile_picture ? (
            <img
              src={`${API_URL}/api/files/${profile.profile_picture}`}
              alt={profile.name}
              className="w-24 h-24 rounded-full border-4 border-white/40 object-cover shadow-lg"
            />
          ) : (
            <div className="w-24 h-24 rounded-full border-4 border-white/40 bg-white/20 flex items-center justify-center shadow-lg">
              <span className="text-3xl font-bold text-white">
                {(profile.name || '').replace(/^Dr\.?\s*/i, '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'DR'}
              </span>
            </div>
          )}
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Work Sans, sans-serif' }}>{displayName}</h1>
            <p className="text-white/80 mt-1">{profile.specialization || 'Dental Surgeon'}</p>
            <p className="text-white/60 text-sm mt-0.5">Reg. {profile.registration_number}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-10">

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Users, label: 'Patients', value: profile.stats.patients },
            { icon: Tooth, label: 'Implants', value: profile.stats.implants },
            { icon: Buildings, label: 'FPD Cases', value: profile.stats.fpd },
            { icon: CheckCircle, label: 'Success Rate', value: profile.stats.success_rate != null ? `${profile.stats.success_rate}%` : 'N/A', color: '#16A34A' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-[#E5E5E2] p-4 text-center shadow-sm">
              <Icon size={20} color={color || '#82A098'} weight="fill" className="mx-auto mb-1" />
              <p className="text-2xl font-bold text-[#2A2F35]">{value ?? '—'}</p>
              <p className="text-xs text-[#5C6773]">{label}</p>
            </div>
          ))}
        </div>

        {/* Details card */}
        <div className="bg-white rounded-xl border border-[#E5E5E2] divide-y divide-[#F0EDE8] mb-5 shadow-sm">
          {[
            { icon: Stethoscope, label: 'Specialization', value: profile.specialization },
            { icon: Certificate, label: 'Registration', value: profile.registration_number },
            { icon: GraduationCap, label: 'College', value: [profile.college, profile.college_place].filter(Boolean).join(' • ') },
            { icon: MapPin, label: 'Country', value: profile.country },
          ].filter(f => f.value).map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-lg bg-[#F0F0EE] flex items-center justify-center shrink-0">
                <Icon size={18} className="text-[#82A098]" />
              </div>
              <div>
                <p className="text-xs text-[#5C6773]">{label}</p>
                <p className="text-sm font-medium text-[#2A2F35]">{value}</p>
              </div>
            </div>
          ))}

          {profile.clinics?.length > 0 && (
            <div className="flex items-start gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-lg bg-[#F0F0EE] flex items-center justify-center shrink-0 mt-0.5">
                <Buildings size={18} className="text-[#82A098]" />
              </div>
              <div>
                <p className="text-xs text-[#5C6773]">Clinics</p>
                {profile.clinics.map((c, i) => (
                  <p key={i} className="text-sm font-medium text-[#2A2F35]">{c.name || c}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* QR + Share card */}
        <div className="bg-white rounded-xl border border-[#E5E5E2] p-5 mb-5 shadow-sm">
          <h3 className="font-semibold text-[#2A2F35] mb-4" style={{ fontFamily: 'Work Sans, sans-serif' }}>Share Profile</h3>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* QR Code */}
            <div className="shrink-0 p-3 bg-white border border-[#E5E5E2] rounded-xl shadow-sm">
              <QRCodeSVG
                value={profileUrl}
                size={140}
                fgColor="#2A2F35"
                bgColor="#FFFFFF"
                level="M"
                data-testid="profile-qr-code"
              />
              <p className="text-[10px] text-[#9CA3AF] text-center mt-2">Scan to view profile</p>
            </div>

            {/* Link + actions */}
            <div className="flex-1 min-w-0 w-full">
              <p className="text-xs text-[#5C6773] mb-1">Profile link</p>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 bg-[#F9F9F8] border border-[#E5E5E2] rounded-lg px-3 py-2 text-xs text-[#2A2F35] truncate font-mono">
                  {profileUrl}
                </div>
                <button
                  data-testid="copy-profile-link"
                  onClick={() => { navigator.clipboard.writeText(profileUrl); }}
                  className="shrink-0 px-3 py-2 bg-[#82A098] text-white text-xs font-semibold rounded-lg hover:bg-[#6B8A82] transition-colors"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#9CA3AF] mb-4">Share this link or QR code on your visiting card, email signature, or social media.</p>
              <button
                data-testid="export-profile-pdf"
                onClick={handleExportPDF}
                disabled={exporting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-[#C27E70] hover:bg-[#B06B5E] text-white transition-colors disabled:opacity-60"
              >
                {exporting
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <FilePdf size={16} weight="fill" />}
                {exporting ? 'Generating PDF…' : 'Export Profile as PDF'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[#9CA3AF] pb-8">
          Powered by <span className="font-semibold text-[#82A098]">DentalHub</span>
        </p>
      </div>
    </div>
  );
}
