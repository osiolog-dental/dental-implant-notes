import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Envelope, Phone, MapPin, Certificate, GraduationCap, Stethoscope } from '@phosphor-icons/react';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';

export default function Account() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const rawName = user?.name || 'Doctor';
  const displayName = rawName.startsWith('Dr.') || rawName.startsWith('Dr ') ? rawName : `Dr. ${rawName}`;
  const initials = rawName
    .replace(/^Dr\.?\s*/i, '')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const fields = [
    { label: 'Full Name', value: user?.name, icon: User },
    { label: 'Email', value: user?.email, icon: Envelope },
    { label: 'Phone', value: user?.phone, icon: Phone },
    { label: 'Country', value: user?.country, icon: MapPin },
    { label: 'Registration Number', value: user?.registration_number, icon: Certificate },
    { label: 'College', value: user?.college, icon: GraduationCap },
    { label: 'Specialization', value: user?.specialization, icon: Stethoscope },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10" data-testid="account-page">
      <button
        onClick={() => navigate(-1)}
        data-testid="account-back-btn"
        className="flex items-center gap-1.5 text-sm text-[#5C6773] hover:text-[#2A2F35] mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <div className="bg-white rounded-xl border border-[#E5E5E2] overflow-hidden">
        {/* Profile Header */}
        <div className="bg-gradient-to-br from-[#82A098] to-[#5C8077] p-6 flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-white/30">
            {user?.profile_picture && (
              <AvatarImage src={user.profile_picture} alt={user?.name} />
            )}
            <AvatarFallback className="bg-white/20 text-white text-lg font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-semibold text-white" data-testid="account-doctor-name">
              {displayName}
            </h1>
            <p className="text-sm text-white/70">{user?.specialization || 'Dental Surgeon'}</p>
          </div>
        </div>

        {/* Details */}
        <div className="divide-y divide-[#E5E5E2]">
          {fields.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-4 px-6 py-4" data-testid={`account-field-${label.toLowerCase().replace(/\s+/g, '-')}`}>
              <div className="w-9 h-9 rounded-lg bg-[#F0F0EE] flex items-center justify-center shrink-0">
                <Icon size={18} className="text-[#5C6773]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-[#5C6773]">{label}</p>
                <p className="text-sm font-medium text-[#2A2F35] truncate">{value || '—'}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Member Since */}
        <div className="px-6 py-4 bg-[#F9F9F8] border-t border-[#E5E5E2]">
          <p className="text-xs text-[#5C6773]">
            Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}
