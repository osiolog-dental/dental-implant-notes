import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import client from '../api/client';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import BulkImport from '../components/BulkImport';
import {
  User, Envelope, Phone, MapPin, Certificate,
  GraduationCap, Stethoscope, PencilSimple, FloppyDisk,
  ShareNetwork, ArrowSquareOut, X, Warning, Camera, CurrencyDollar,
  Briefcase, Buildings, Clock, Plus, Trash, House, CalendarBlank,
  GenderIntersex, Newspaper,
} from '@phosphor-icons/react';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

/* ── Country list (mirrors Register.js) ────────────────────────────────── */
const COUNTRIES = [
  'India','China','Japan','South Korea','Singapore','Malaysia','Thailand','Indonesia',
  'Philippines','Vietnam','Pakistan','Bangladesh','Sri Lanka','Nepal',
  'United Arab Emirates','Saudi Arabia','Qatar','Kuwait','Bahrain','Oman',
  'Jordan','Lebanon','Israel','Turkey','Iran','United Kingdom','Germany','France',
  'Italy','Spain','Netherlands','Belgium','Switzerland','Sweden','Norway','Denmark',
  'Finland','Portugal','Austria','Poland','Czech Republic','Romania','Greece',
  'Hungary','Russia','United States','Canada','Brazil','Mexico','Argentina',
  'Colombia','Chile','Peru','South Africa','Egypt','Nigeria','Kenya','Ghana',
  'Australia','New Zealand',
];

const COUNTRY_CURRENCY = {
  'India':{ currency:'INR', symbol:'₹' }, 'China':{ currency:'CNY', symbol:'¥' },
  'Japan':{ currency:'JPY', symbol:'¥' }, 'United States':{ currency:'USD', symbol:'$' },
  'United Kingdom':{ currency:'GBP', symbol:'£' }, 'Germany':{ currency:'EUR', symbol:'€' },
  'France':{ currency:'EUR', symbol:'€' }, 'Australia':{ currency:'AUD', symbol:'A$' },
  'Canada':{ currency:'CAD', symbol:'C$' }, 'Singapore':{ currency:'SGD', symbol:'S$' },
  'Malaysia':{ currency:'MYR', symbol:'RM' }, 'United Arab Emirates':{ currency:'AED', symbol:'د.إ' },
  'Saudi Arabia':{ currency:'SAR', symbol:'ر.س' }, 'Pakistan':{ currency:'PKR', symbol:'₨' },
  'Bangladesh':{ currency:'BDT', symbol:'৳' }, 'Sri Lanka':{ currency:'LKR', symbol:'Rs' },
  'Nepal':{ currency:'NPR', symbol:'Rs' }, 'Philippines':{ currency:'PHP', symbol:'₱' },
  'Indonesia':{ currency:'IDR', symbol:'Rp' }, 'Thailand':{ currency:'THB', symbol:'฿' },
};
const getCurrency = (country) => COUNTRY_CURRENCY[country] || { currency:'USD', symbol:'$' };

/* ── Crop modal (pure canvas, no library) ──────────────────────────────── */
function CropModal({ src, onCrop, onCancel }) {
  const canvasRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });
  const imgRef = useRef(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, size: 0 });
  const [imgDims, setImgDims] = useState({ w: 0, h: 0, ox: 0, oy: 0, scale: 1 });

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const maxW = Math.min(500, window.innerWidth - 48);
      const maxH = 400;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = img.width * scale;
      const h = img.height * scale;
      const ox = (maxW - w) / 2;
      const oy = (maxH - h) / 2;
      setImgDims({ w, h, ox, oy, scale, naturalW: img.width, naturalH: img.height });
      const size = Math.min(w, h) * 0.7;
      setCrop({ x: ox + (w - size) / 2, y: oy + (h - size) / 2, size });
      imgRef.current = img;
      drawCanvas({ x: ox + (w - size) / 2, y: oy + (h - size) / 2, size }, img, { w, h, ox, oy, scale });
    };
    img.src = src;
  }, [src]); // eslint-disable-line react-hooks/exhaustive-deps

  const drawCanvas = (c, img, dims) => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const maxW = Math.min(500, window.innerWidth - 48);
    const ctx = canvas.getContext('2d');
    canvas.width = maxW;
    canvas.height = 400;
    ctx.clearRect(0, 0, maxW, 400);
    ctx.drawImage(img, dims.ox, dims.oy, dims.w, dims.h);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, maxW, 400);
    ctx.clearRect(c.x, c.y, c.size, c.size);
    ctx.strokeStyle = '#82A098';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x, c.y, c.size, c.size);
    // Corner handles
    const h = 12;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    [[c.x,c.y],[c.x+c.size-h,c.y],[c.x,c.y+c.size-h],[c.x+c.size-h,c.y+c.size-h]].forEach(([ex,ey]) => {
      ctx.strokeRect(ex, ey, h, h);
    });
  };

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches?.[0] || e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };

  const onMouseDown = (e) => {
    const pos = getPos(e);
    if (pos.x >= crop.x && pos.x <= crop.x + crop.size && pos.y >= crop.y && pos.y <= crop.y + crop.size) {
      setDrag(true);
      setStart({ x: pos.x - crop.x, y: pos.y - crop.y });
    }
  };

  const onMouseMove = (e) => {
    if (!drag) return;
    const pos = getPos(e);
    const newX = Math.max(imgDims.ox, Math.min(imgDims.ox + imgDims.w - crop.size, pos.x - start.x));
    const newY = Math.max(imgDims.oy, Math.min(imgDims.oy + imgDims.h - crop.size, pos.y - start.y));
    const newCrop = { ...crop, x: newX, y: newY };
    setCrop(newCrop);
    drawCanvas(newCrop, imgRef.current, imgDims);
  };

  const onMouseUp = () => setDrag(false);

  const handleApply = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    const scaleX = (crop.x - imgDims.ox) / imgDims.scale;
    const scaleY = (crop.y - imgDims.oy) / imgDims.scale;
    const cropSize = crop.size / imgDims.scale;
    ctx.drawImage(imgRef.current, scaleX, scaleY, cropSize, cropSize, 0, 0, 400, 400);
    canvas.toBlob(blob => {
      if (!blob) { toast.error('Crop failed'); return; }
      const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
      onCrop(file, canvas.toDataURL('image/jpeg', 0.9));
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-lg">
        <div className="px-5 py-4 border-b border-[#E5E5E2] flex items-center justify-between">
          <h3 className="font-semibold text-[#2A2F35]" style={{ fontFamily: 'Work Sans, sans-serif' }}>Crop Profile Photo</h3>
          <button onClick={onCancel} className="text-[#9CA3AF] hover:text-[#2A2F35]"><X size={20} /></button>
        </div>
        <div className="p-4 bg-[#F0F0EE] flex justify-center">
          <canvas
            ref={canvasRef}
            style={{ cursor: drag ? 'grabbing' : 'grab', maxWidth: '100%', borderRadius: 8 }}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
            onTouchStart={onMouseDown} onTouchMove={onMouseMove} onTouchEnd={onMouseUp}
          />
        </div>
        <p className="text-xs text-[#9CA3AF] text-center pb-1">Drag the square to reposition the crop area</p>
        <div className="px-5 py-4 flex gap-3">
          <Button
            data-testid="crop-apply-btn"
            onClick={handleApply}
            className="flex-1 bg-[#82A098] hover:bg-[#6B8A82] text-white"
          >
            Apply Crop
          </Button>
          <Button
            data-testid="crop-cancel-btn"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Account() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [retainData, setRetainData] = useState(true);
  const [picUploading, setPicUploading] = useState(false);
  const [localPicUrl, setLocalPicUrl] = useState(null);
  const [cropSrc, setCropSrc] = useState(null);
  const picInputRef = useRef(null);

  const emptyEdu = () => ({ degree_type: '', institution: '', field: '', passing_year: '', start_year: '', end_year: '' });
  const emptyPub = () => ({ title: '', journal: '', year: '', doi: '' });

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    gender: user?.gender || '',
    date_of_birth: user?.date_of_birth || '',
    country: user?.country || '',
    address_street: user?.address_street || '',
    address_city: user?.address_city || '',
    address_state: user?.address_state || '',
    address_zip: user?.address_zip || '',
    registration_number: user?.registration_number || '',
    designation: user?.designation || '',
    organization: user?.organization || '',
    specialization: user?.specialization || '',
    years_of_experience: user?.years_of_experience || '',
    primary_clinic: user?.primary_clinic || '',
    consulting_clinics: user?.consulting_clinics || '',
    clinical_focus: user?.clinical_focus || '',
    college: user?.college || '',
    college_place: user?.college_place || '',
    place: user?.place || '',
    bio: user?.bio || '',
  });
  const [education, setEducation] = useState(user?.education?.length ? user.education : [emptyEdu()]);
  const [publications, setPublications] = useState(user?.publications?.length ? user.publications : [emptyPub()]);

  const rawName = user?.name || 'Doctor';
  const displayName = rawName.startsWith('Dr.') || rawName.startsWith('Dr ') ? rawName : `Dr. ${rawName}`;
  const initials = rawName.replace(/^Dr\.?\s*/i, '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const doctorId = user?._id || user?.id;
  const profileUrl = doctorId ? `${window.location.origin}/profile/${doctorId}` : '';

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        years_of_experience: form.years_of_experience ? parseInt(form.years_of_experience) : null,
        education: education.filter(e => e.institution || e.degree_type),
        publications: publications.filter(p => p.title || p.journal),
      };
      await client.patch('/api/users/me', payload);
      toast.success('Profile updated');
      setEditing(false);
      window.location.reload();
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      name: user?.name || '',
      phone: user?.phone || '',
      gender: user?.gender || '',
      date_of_birth: user?.date_of_birth || '',
      country: user?.country || '',
      address_street: user?.address_street || '',
      address_city: user?.address_city || '',
      address_state: user?.address_state || '',
      address_zip: user?.address_zip || '',
      registration_number: user?.registration_number || '',
      designation: user?.designation || '',
      organization: user?.organization || '',
      specialization: user?.specialization || '',
      years_of_experience: user?.years_of_experience || '',
      primary_clinic: user?.primary_clinic || '',
      consulting_clinics: user?.consulting_clinics || '',
      clinical_focus: user?.clinical_focus || '',
      college: user?.college || '',
      college_place: user?.college_place || '',
      place: user?.place || '',
      bio: user?.bio || '',
    });
    setEducation(user?.education?.length ? user.education : [emptyEdu()]);
    setPublications(user?.publications?.length ? user.publications : [emptyPub()]);
    setEditing(false);
  };

  /* Pick a file → show crop modal */
  const handlePicSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10 MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setCropSrc(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  /* After crop → upload cropped file */
  const handleCropApply = useCallback(async (croppedFile, previewUrl) => {
    setCropSrc(null);
    setLocalPicUrl(previewUrl);
    setPicUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', croppedFile);
      const res = await client.post('/api/users/me/profile-picture', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setLocalPicUrl(res.data.profile_picture_url);
      toast.success('Profile picture updated');
    } catch {
      toast.error('Failed to upload picture');
      setLocalPicUrl(null);
    } finally {
      setPicUploading(false);
    }
  }, []);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      await client.delete('/api/users/me');
      await logout();
      navigate('/login');
      toast.success('Your account has been deleted.');
    } catch {
      toast.error('Failed to delete account. Please try again.');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    }
  };

  const Field = ({ label, value, icon: Icon }) => (
    <div className="flex items-center gap-4 px-6 py-4">
      <div className="w-9 h-9 rounded-lg bg-[#F0F0EE] flex items-center justify-center shrink-0">
        <Icon size={18} className="text-[#5C6773]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[#5C6773]">{label}</p>
        <p className="text-sm font-medium text-[#2A2F35] truncate">{value || '—'}</p>
      </div>
    </div>
  );

  const EditField = ({ label, fieldKey, placeholder, type = 'text' }) => (
    <div>
      <label className="block text-xs font-medium text-[#5C6773] mb-1">{label}</label>
      <Input
        type={type}
        value={form[fieldKey]}
        onChange={e => setForm(f => ({ ...f, [fieldKey]: e.target.value }))}
        placeholder={placeholder}
        data-testid={`edit-${fieldKey}`}
        className="text-sm"
      />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10" data-testid="account-page">

      {/* Crop modal */}
      {cropSrc && (
        <CropModal
          src={cropSrc}
          onCrop={handleCropApply}
          onCancel={() => setCropSrc(null)}
        />
      )}

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-[#E5E5E2] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#82A098] to-[#5C8077] p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16 border-2 border-white/30">
                {(localPicUrl || user?.profile_picture) && (
                  <AvatarImage src={localPicUrl || user.profile_picture} alt={user?.name} />
                )}
                <AvatarFallback className="bg-white/20 text-white text-lg font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <button
                data-testid="upload-profile-pic-btn"
                onClick={() => picInputRef.current?.click()}
                disabled={picUploading}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md hover:bg-[#F0F0EE] transition-colors disabled:opacity-60"
                title="Change profile picture"
              >
                {picUploading
                  ? <span className="w-3 h-3 border-2 border-[#82A098] border-t-transparent rounded-full animate-spin" />
                  : <Camera size={12} className="text-[#5C6773]" weight="fill" />}
              </button>
              <input ref={picInputRef} type="file" accept="image/*" className="hidden" onChange={handlePicSelect} data-testid="profile-pic-input" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white" data-testid="account-doctor-name">{displayName}</h1>
              <p className="text-sm text-white/70">{user?.specialization || 'Dental Surgeon'}</p>
            </div>
          </div>
          {!editing && (
            <button
              data-testid="edit-profile-btn"
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-colors"
            >
              <PencilSimple size={14} /> Edit Profile
            </button>
          )}
        </div>

        {/* View mode */}
        {!editing ? (
          <div className="divide-y divide-[#E5E5E2]">
            <Field label="Full Name"              value={user?.name}                icon={User} />
            <Field label="Email"                  value={user?.email}               icon={Envelope} />
            <Field label="Phone"                  value={user?.phone}               icon={Phone} />
            <Field label="Gender"                 value={user?.gender}              icon={GenderIntersex} />
            <Field label="Date of Birth"          value={user?.date_of_birth}       icon={CalendarBlank} />
            <Field label="Country"                value={user?.country}             icon={MapPin} />
            {user?.country && (
              <Field
                label="Currency"
                value={`${getCurrency(user.country).symbol} ${getCurrency(user.country).currency}`}
                icon={CurrencyDollar}
              />
            )}
            {(user?.address_street || user?.address_city) && (
              <Field
                label="Address"
                value={[user?.address_street, user?.address_city, user?.address_state, user?.address_zip].filter(Boolean).join(', ')}
                icon={House}
              />
            )}
            <Field label="Registration No."        value={user?.registration_number} icon={Certificate} />
            <Field label="Designation / Job Title" value={user?.designation}         icon={Briefcase} />
            <Field label="Organisation"            value={user?.organization}        icon={Buildings} />
            <Field label="Years of Experience"     value={user?.years_of_experience ? `${user.years_of_experience} years` : null} icon={Clock} />
            <Field label="Specialization"          value={user?.specialization}      icon={Stethoscope} />
            <Field label="Primary Clinic"          value={user?.primary_clinic}      icon={Buildings} />
            <Field label="Clinical Focus"          value={user?.clinical_focus}      icon={Stethoscope} />
            <Field label="College / University"    value={user?.college}             icon={GraduationCap} />
            <Field label="College City"            value={user?.college_place}       icon={MapPin} />
            <Field label="Practice City"           value={user?.place}               icon={MapPin} />
            {user?.consulting_clinics && (
              <div className="px-6 py-4">
                <p className="text-xs text-[#5C6773] mb-1">Consulting Hospitals / Clinics</p>
                <p className="text-sm text-[#2A2F35] whitespace-pre-line">{user.consulting_clinics}</p>
              </div>
            )}
            {user?.education?.length > 0 && (
              <div className="px-6 py-4">
                <p className="text-xs text-[#5C6773] mb-2">Education</p>
                <div className="space-y-1.5">
                  {user.education.map((e, i) => (
                    <div key={i} className="text-sm text-[#2A2F35]">
                      {e.degree_type && <span className="font-medium">{e.degree_type}</span>}
                      {e.institution && <span className="text-[#5C6773]"> — {e.institution}</span>}
                      {e.passing_year && <span className="text-[#9CA3AF]"> ({e.passing_year})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {user?.publications?.length > 0 && (
              <div className="px-6 py-4">
                <p className="text-xs text-[#5C6773] mb-2">Publications</p>
                <div className="space-y-1.5">
                  {user.publications.map((p, i) => (
                    <div key={i} className="text-sm text-[#2A2F35]">
                      {p.title && <span className="font-medium">{p.title}</span>}
                      {p.journal && <span className="text-[#5C6773]"> — {p.journal}</span>}
                      {p.year && <span className="text-[#9CA3AF]"> ({p.year})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="px-6 py-4">
              <p className="text-xs text-[#5C6773] mb-1">About / Bio</p>
              <p className="text-sm text-[#2A2F35]">{user?.bio || '—'}</p>
            </div>
            <div className="px-6 py-4 bg-[#F9F9F8]">
              <p className="text-xs text-[#5C6773]">
                Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
              </p>
            </div>
          </div>
        ) : (
          /* Edit mode */
          <div className="p-6 space-y-5">

            {/* ── Personal ── */}
            <p className="text-xs font-semibold text-[#82A098] uppercase tracking-wider">Personal</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <EditField label="Full Name"      fieldKey="name"          placeholder="Dr. Your Name" />
              <EditField label="Phone"          fieldKey="phone"         placeholder="+91 98765 43210" />
              <div>
                <label className="block text-xs font-medium text-[#5C6773] mb-1">Gender</label>
                <select
                  value={form.gender}
                  onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                  data-testid="edit-gender"
                  className="w-full text-sm px-3 py-2 border border-[#E5E5E2] rounded-lg focus:ring-2 focus:ring-[#82A098] focus:outline-none bg-white"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
              <EditField label="Date of Birth" fieldKey="date_of_birth" placeholder="" type="date" />
            </div>

            {/* Country */}
            <div>
              <label className="block text-xs font-medium text-[#5C6773] mb-1">Country</label>
              <select
                value={form.country}
                onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                data-testid="edit-country"
                className="w-full text-sm px-3 py-2 border border-[#E5E5E2] rounded-lg focus:ring-2 focus:ring-[#82A098] focus:outline-none bg-white"
              >
                <option value="">Select country</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <EditField label="Street Address" fieldKey="address_street" placeholder="123 Main Street, Suite 4" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <EditField label="City"              fieldKey="address_city"  placeholder="City" />
                <EditField label="State / Province"  fieldKey="address_state" placeholder="State" />
                <EditField label="Zip / Postal Code" fieldKey="address_zip"   placeholder="000000" />
              </div>
            </div>

            {/* ── Professional ── */}
            <p className="text-xs font-semibold text-[#82A098] uppercase tracking-wider pt-2">Professional</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <EditField label="Designation / Job Title"    fieldKey="designation"        placeholder="e.g. Senior Implantologist" />
              <EditField label="Organisation / Hospital"    fieldKey="organization"       placeholder="Hospital or practice name" />
              <EditField label="Specialization"             fieldKey="specialization"     placeholder="e.g. Implantology" />
              <EditField label="Years of Experience"        fieldKey="years_of_experience" placeholder="e.g. 8" type="number" />
              <div className="sm:col-span-2">
                <EditField label="Registration Number"      fieldKey="registration_number" placeholder="e.g. DCI12345" />
              </div>
            </div>

            {/* ── Clinic & Associations ── */}
            <p className="text-xs font-semibold text-[#82A098] uppercase tracking-wider pt-2">Clinic &amp; Associations</p>
            <div className="space-y-3">
              <EditField label="Primary Clinic"             fieldKey="primary_clinic"     placeholder="Your main clinic or practice" />
              <div>
                <label className="block text-xs font-medium text-[#5C6773] mb-1">Consulting Hospitals / Clinics</label>
                <textarea
                  value={form.consulting_clinics}
                  onChange={e => setForm(f => ({ ...f, consulting_clinics: e.target.value }))}
                  placeholder="List any hospitals or clinics you consult at, one per line"
                  data-testid="edit-consulting_clinics"
                  rows={3}
                  className="w-full text-sm px-3 py-2 border border-[#E5E5E2] rounded-lg focus:ring-2 focus:ring-[#82A098] focus:outline-none resize-none"
                />
              </div>
              <EditField label="Area of Clinical Focus"     fieldKey="clinical_focus"     placeholder="e.g. Full-arch rehabilitation, Sinus lifts" />
            </div>

            {/* ── Education ── */}
            <p className="text-xs font-semibold text-[#82A098] uppercase tracking-wider pt-2">Education</p>
            <div className="space-y-3">
              {education.map((edu, idx) => (
                <div key={idx} className="p-4 bg-[#F9F9F8] rounded-xl border border-[#E5E5E2] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#82A098]">Degree {idx + 1}</span>
                    {education.length > 1 && (
                      <button type="button" onClick={() => setEducation(prev => prev.filter((_, i) => i !== idx))} data-testid={`remove-edu-${idx}`} className="text-[#C27E70] hover:text-red-500">
                        <Trash size={14} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#5C6773] mb-1">Degree Type</label>
                      <select
                        value={edu.degree_type}
                        onChange={e => setEducation(prev => prev.map((r, i) => i === idx ? { ...r, degree_type: e.target.value } : r))}
                        data-testid={`edu-degree-${idx}`}
                        className="w-full text-sm px-3 py-2 border border-[#E5E5E2] rounded-lg focus:ring-2 focus:ring-[#82A098] focus:outline-none bg-white"
                      >
                        <option value="">Select degree</option>
                        {['Graduation (BDS)', 'Post-Graduation (MDS)', 'Fellowship', 'Diploma', 'PhD', 'Other'].map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5C6773] mb-1">Institution / University</label>
                      <Input value={edu.institution} onChange={e => setEducation(prev => prev.map((r, i) => i === idx ? { ...r, institution: e.target.value } : r))} placeholder="University name" data-testid={`edu-institution-${idx}`} className="text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5C6773] mb-1">Specialization / Field</label>
                      <Input value={edu.field} onChange={e => setEducation(prev => prev.map((r, i) => i === idx ? { ...r, field: e.target.value } : r))} placeholder="e.g. Oral Surgery" data-testid={`edu-field-${idx}`} className="text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5C6773] mb-1">Passing Year</label>
                      <Input type="number" value={edu.passing_year} onChange={e => setEducation(prev => prev.map((r, i) => i === idx ? { ...r, passing_year: e.target.value } : r))} placeholder="e.g. 2018" data-testid={`edu-passing-${idx}`} className="text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5C6773] mb-1">Start Year</label>
                      <Input type="number" value={edu.start_year} onChange={e => setEducation(prev => prev.map((r, i) => i === idx ? { ...r, start_year: e.target.value } : r))} placeholder="e.g. 2013" data-testid={`edu-start-${idx}`} className="text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5C6773] mb-1">End Year</label>
                      <Input type="number" value={edu.end_year} onChange={e => setEducation(prev => prev.map((r, i) => i === idx ? { ...r, end_year: e.target.value } : r))} placeholder="e.g. 2018" data-testid={`edu-end-${idx}`} className="text-sm" />
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setEducation(prev => [...prev, emptyEdu()])} data-testid="add-edu-btn" className="inline-flex items-center gap-2 text-sm font-medium text-[#82A098] hover:text-[#6B8A82]">
                <Plus size={15} weight="bold" /> Add Another Degree
              </button>
            </div>

            {/* ── Publications ── */}
            <p className="text-xs font-semibold text-[#82A098] uppercase tracking-wider pt-2">Publications &amp; Research</p>
            <div className="space-y-3">
              {publications.map((pub, idx) => (
                <div key={idx} className="p-4 bg-[#F9F9F8] rounded-xl border border-[#E5E5E2] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#82A098]">Publication {idx + 1}</span>
                    {publications.length > 1 && (
                      <button type="button" onClick={() => setPublications(prev => prev.filter((_, i) => i !== idx))} data-testid={`remove-pub-${idx}`} className="text-[#C27E70] hover:text-red-500">
                        <Trash size={14} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-[#5C6773] mb-1">Article Title</label>
                      <Input value={pub.title} onChange={e => setPublications(prev => prev.map((r, i) => i === idx ? { ...r, title: e.target.value } : r))} placeholder="Full article title" data-testid={`pub-title-${idx}`} className="text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5C6773] mb-1">Journal Name</label>
                      <Input value={pub.journal} onChange={e => setPublications(prev => prev.map((r, i) => i === idx ? { ...r, journal: e.target.value } : r))} placeholder="e.g. Journal of Oral Implantology" data-testid={`pub-journal-${idx}`} className="text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5C6773] mb-1">Publication Year</label>
                      <Input type="number" value={pub.year} onChange={e => setPublications(prev => prev.map((r, i) => i === idx ? { ...r, year: e.target.value } : r))} placeholder="e.g. 2022" data-testid={`pub-year-${idx}`} className="text-sm" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-[#5C6773] mb-1">Link / DOI</label>
                      <Input type="url" value={pub.doi} onChange={e => setPublications(prev => prev.map((r, i) => i === idx ? { ...r, doi: e.target.value } : r))} placeholder="https://doi.org/10.xxxx/xxxxx" data-testid={`pub-doi-${idx}`} className="text-sm" />
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setPublications(prev => [...prev, emptyPub()])} data-testid="add-pub-btn" className="inline-flex items-center gap-2 text-sm font-medium text-[#82A098] hover:text-[#6B8A82]">
                <Newspaper size={15} /> Add Another Publication
              </button>
            </div>

            {/* ── Location ── */}
            <p className="text-xs font-semibold text-[#82A098] uppercase tracking-wider pt-2">Education Location</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <EditField label="College / University" fieldKey="college"       placeholder="College name" />
              <EditField label="College City"         fieldKey="college_place" placeholder="City / Place" />
            </div>
            <EditField label="Practice City" fieldKey="place" placeholder="City where you practice" />

            {/* Bio */}
            <div>
              <label className="block text-xs font-medium text-[#5C6773] mb-1">About / Bio</label>
              <textarea
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="Brief professional bio shown on your public profile..."
                data-testid="edit-bio"
                rows={3}
                className="w-full text-sm px-3 py-2 border border-[#E5E5E2] rounded-lg focus:ring-2 focus:ring-[#82A098] focus:outline-none resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                data-testid="save-profile-btn"
                className="bg-[#82A098] hover:bg-[#6B8A82] text-white"
              >
                <FloppyDisk size={15} className="mr-1.5" />
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
              <Button onClick={handleCancel} variant="ghost" data-testid="cancel-edit-btn">
                <X size={15} className="mr-1" /> Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Share Profile Card */}
      {doctorId && (
        <div className="bg-white rounded-xl border border-[#E5E5E2] mt-5 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E5E2] flex items-center gap-2">
            <ShareNetwork size={18} className="text-[#82A098]" />
            <h2 className="font-semibold text-[#2A2F35]" style={{ fontFamily: 'Work Sans, sans-serif' }}>Share Your Profile</h2>
          </div>
          <div className="p-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="shrink-0 p-3 bg-white border border-[#E5E5E2] rounded-xl shadow-sm">
              <QRCodeSVG value={profileUrl} size={120} fgColor="#2A2F35" bgColor="#FFFFFF" level="M" data-testid="account-qr-code" />
              <p className="text-[10px] text-[#9CA3AF] text-center mt-2">Scan for digital profile</p>
            </div>
            <div className="flex-1 min-w-0 w-full">
              <p className="text-xs text-[#5C6773] mb-1">Your public profile link</p>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 bg-[#F9F9F8] border border-[#E5E5E2] rounded-lg px-3 py-2 text-xs text-[#2A2F35] truncate font-mono">{profileUrl}</div>
                <button
                  data-testid="copy-profile-link-account"
                  onClick={() => { navigator.clipboard.writeText(profileUrl); toast.success('Link copied!'); }}
                  className="shrink-0 px-3 py-2 bg-[#82A098] text-white text-xs font-semibold rounded-lg hover:bg-[#6B8A82] transition-colors"
                >Copy</button>
              </div>
              <p className="text-xs text-[#9CA3AF] mb-4">
                Share this on visiting cards, email signatures, or social media. Anyone with the link can view your professional profile and case statistics.
              </p>
              <a
                data-testid="view-public-profile-btn"
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-semibold text-[#82A098] hover:text-[#6B8A82] transition-colors"
              >
                <ArrowSquareOut size={16} /> Preview your public profile
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import */}
      <BulkImport />

      {/* Danger Zone */}
      <div className="mt-5 bg-white rounded-xl border border-red-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-red-100 flex items-center gap-2">
          <Warning size={18} className="text-red-500" />
          <h2 className="font-semibold text-[#2A2F35]" style={{ fontFamily: 'Work Sans, sans-serif' }}>Danger Zone</h2>
        </div>
        <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#2A2F35]">Delete Account</p>
            <p className="text-xs text-[#5C6773] mt-0.5">Permanently delete your account and all patient data. This cannot be undone.</p>
          </div>
          <button
            data-testid="delete-account-btn"
            onClick={() => setShowDeleteConfirm(true)}
            className="shrink-0 px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
          >Delete Account</button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Warning size={20} className="text-red-500" />
              </div>
              <h3 className="font-semibold text-[#2A2F35]" style={{ fontFamily: 'Work Sans, sans-serif' }}>Delete Account?</h3>
            </div>
            <p className="text-sm text-[#5C6773] mb-4">
              This will delete your account and sign you out. <strong>This cannot be undone.</strong>
            </p>
            <div className="mb-4 p-3 bg-[#F9F9F8] rounded-lg border border-[#E5E5E2]">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={retainData} onChange={e => setRetainData(e.target.checked)} data-testid="retain-data-checkbox" className="mt-0.5 accent-[#82A098]" />
                <div>
                  <p className="text-sm font-medium text-[#2A2F35]">Retain my data for 30 days</p>
                  <p className="text-xs text-[#5C6773] mt-0.5">Your patient records and photos will be kept for 30 days before permanent deletion.</p>
                </div>
              </label>
            </div>
            <p className="text-xs font-medium text-[#2A2F35] mb-2">Type <span className="font-mono font-bold">DELETE</span> to confirm:</p>
            <input
              data-testid="delete-confirm-input"
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full text-sm px-3 py-2 border border-[#E5E5E2] rounded-lg focus:ring-2 focus:ring-red-400 focus:outline-none mb-4 font-mono"
            />
            <div className="flex gap-3">
              <button
                data-testid="confirm-delete-btn"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deleting}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {deleting ? 'Deleting…' : 'Delete My Account'}
              </button>
              <button
                data-testid="cancel-delete-btn"
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                className="flex-1 py-2 rounded-lg border border-[#E5E5E2] text-[#2A2F35] text-sm font-semibold hover:bg-[#F9F9F8] transition-colors"
              >Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
