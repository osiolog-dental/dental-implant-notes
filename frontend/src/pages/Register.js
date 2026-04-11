import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Tooth, Plus, Trash, UploadSimple, User } from '@phosphor-icons/react';

// ── Country / Currency data ────────────────────────────────────────────────
const COUNTRIES = [
  { name: 'India',                currency: 'INR', symbol: '₹',   registrationLabel: 'DCI Registration Number' },
  { name: 'China',                currency: 'CNY', symbol: '¥',   registrationLabel: 'Medical Practice License' },
  { name: 'Japan',                currency: 'JPY', symbol: '¥',   registrationLabel: 'Dental License Number' },
  { name: 'South Korea',          currency: 'KRW', symbol: '₩',   registrationLabel: 'Dental License Number' },
  { name: 'Singapore',            currency: 'SGD', symbol: 'S$',  registrationLabel: 'Singapore Dental Council Reg. No.' },
  { name: 'Malaysia',             currency: 'MYR', symbol: 'RM',  registrationLabel: 'Malaysian Dental Council Reg. No.' },
  { name: 'Thailand',             currency: 'THB', symbol: '฿',   registrationLabel: 'Dental Council Reg. No.' },
  { name: 'Indonesia',            currency: 'IDR', symbol: 'Rp',  registrationLabel: 'STR (Surat Tanda Registrasi)' },
  { name: 'Philippines',          currency: 'PHP', symbol: '₱',   registrationLabel: 'PRC License Number' },
  { name: 'Vietnam',              currency: 'VND', symbol: '₫',   registrationLabel: 'Medical Practice Certificate' },
  { name: 'Pakistan',             currency: 'PKR', symbol: '₨',   registrationLabel: 'PMDC Registration Number' },
  { name: 'Bangladesh',           currency: 'BDT', symbol: '৳',   registrationLabel: 'BDDA Registration Number' },
  { name: 'Sri Lanka',            currency: 'LKR', symbol: 'Rs',  registrationLabel: 'SLDC Registration Number' },
  { name: 'Nepal',                currency: 'NPR', symbol: 'Rs',  registrationLabel: 'Nepal Medical Council Reg. No.' },
  { name: 'United Arab Emirates', currency: 'AED', symbol: 'د.إ', registrationLabel: 'DHA / MOH License Number' },
  { name: 'Saudi Arabia',         currency: 'SAR', symbol: 'ر.س', registrationLabel: 'SCFHS License Number' },
  { name: 'Qatar',                currency: 'QAR', symbol: 'ر.ق', registrationLabel: 'QCHP License Number' },
  { name: 'Kuwait',               currency: 'KWD', symbol: 'د.ك', registrationLabel: 'MOH License Number' },
  { name: 'Bahrain',              currency: 'BHD', symbol: '.د.ب', registrationLabel: 'NHRA License Number' },
  { name: 'Oman',                 currency: 'OMR', symbol: 'ر.ع', registrationLabel: 'OMSB License Number' },
  { name: 'Jordan',               currency: 'JOD', symbol: 'د.أ', registrationLabel: 'JDA License Number' },
  { name: 'Lebanon',              currency: 'LBP', symbol: 'ل.ل', registrationLabel: 'Order of Dentists Reg. No.' },
  { name: 'Israel',               currency: 'ILS', symbol: '₪',   registrationLabel: 'MOH License Number' },
  { name: 'Turkey',               currency: 'TRY', symbol: '₺',   registrationLabel: 'TDB Registration Number' },
  { name: 'Iran',                 currency: 'IRR', symbol: '﷼',   registrationLabel: 'IRIMC License Number' },
  { name: 'United Kingdom',       currency: 'GBP', symbol: '£',   registrationLabel: 'GDC Registration Number' },
  { name: 'Germany',              currency: 'EUR', symbol: '€',   registrationLabel: 'Approbation Number' },
  { name: 'France',               currency: 'EUR', symbol: '€',   registrationLabel: 'RPPS / ADELI Number' },
  { name: 'Italy',                currency: 'EUR', symbol: '€',   registrationLabel: 'Albo Odontoiatri Reg. No.' },
  { name: 'Spain',                currency: 'EUR', symbol: '€',   registrationLabel: 'Colegio de Odontólogos Reg. No.' },
  { name: 'Netherlands',          currency: 'EUR', symbol: '€',   registrationLabel: 'BIG Registration Number' },
  { name: 'Belgium',              currency: 'EUR', symbol: '€',   registrationLabel: 'INAMI / RIZIV Number' },
  { name: 'Switzerland',          currency: 'CHF', symbol: 'Fr',  registrationLabel: 'Cantonal Practice License' },
  { name: 'Sweden',               currency: 'SEK', symbol: 'kr',  registrationLabel: 'Socialstyrelsen Reg. No.' },
  { name: 'Norway',               currency: 'NOK', symbol: 'kr',  registrationLabel: 'HPR Number' },
  { name: 'Denmark',              currency: 'DKK', symbol: 'kr',  registrationLabel: 'Sundhedsstyrelsen Reg. No.' },
  { name: 'Finland',              currency: 'EUR', symbol: '€',   registrationLabel: 'Valvira License Number' },
  { name: 'Portugal',             currency: 'EUR', symbol: '€',   registrationLabel: 'Ordem dos Médicos Dentistas Reg. No.' },
  { name: 'Austria',              currency: 'EUR', symbol: '€',   registrationLabel: 'Ärztekammer License Number' },
  { name: 'Poland',               currency: 'PLN', symbol: 'zł',  registrationLabel: 'NIL Registration Number' },
  { name: 'Czech Republic',       currency: 'CZK', symbol: 'Kč',  registrationLabel: 'Czech Dental Chamber Reg. No.' },
  { name: 'Romania',              currency: 'RON', symbol: 'lei', registrationLabel: 'CMR Registration Number' },
  { name: 'Greece',               currency: 'EUR', symbol: '€',   registrationLabel: 'Dental Association Reg. No.' },
  { name: 'Hungary',              currency: 'HUF', symbol: 'Ft',  registrationLabel: 'ENKK Registration Number' },
  { name: 'Russia',               currency: 'RUB', symbol: '₽',   registrationLabel: 'Medical License Number' },
  { name: 'United States',        currency: 'USD', symbol: '$',   registrationLabel: 'State Dental License Number' },
  { name: 'Canada',               currency: 'CAD', symbol: 'CA$', registrationLabel: 'Provincial Dental License' },
  { name: 'Brazil',               currency: 'BRL', symbol: 'R$',  registrationLabel: 'CRO Registration Number' },
  { name: 'Mexico',               currency: 'MXN', symbol: 'MX$', registrationLabel: 'Cédula Profesional' },
  { name: 'Argentina',            currency: 'ARS', symbol: '$',   registrationLabel: 'FBOA Registration Number' },
  { name: 'Colombia',             currency: 'COP', symbol: 'COP$', registrationLabel: 'Tarjeta Profesional' },
  { name: 'Chile',                currency: 'CLP', symbol: 'CLP$', registrationLabel: 'Superintendencia de Salud Reg. No.' },
  { name: 'Peru',                 currency: 'PEN', symbol: 'S/',  registrationLabel: 'COP Registration Number' },
  { name: 'South Africa',         currency: 'ZAR', symbol: 'R',   registrationLabel: 'HPCSA Registration Number' },
  { name: 'Egypt',                currency: 'EGP', symbol: 'E£',  registrationLabel: 'Egyptian Dental Syndicate Reg. No.' },
  { name: 'Nigeria',              currency: 'NGN', symbol: '₦',   registrationLabel: 'MDCN Registration Number' },
  { name: 'Kenya',                currency: 'KES', symbol: 'KSh', registrationLabel: 'Kenya Dental Association Reg. No.' },
  { name: 'Ghana',                currency: 'GHS', symbol: 'GH₵', registrationLabel: 'MDC Registration Number' },
  { name: 'Australia',            currency: 'AUD', symbol: 'A$',  registrationLabel: 'AHPRA Registration Number' },
  { name: 'New Zealand',          currency: 'NZD', symbol: 'NZ$', registrationLabel: 'Dental Council Reg. No.' },
];

const getCountryData = (name) =>
  COUNTRIES.find(c => c.name === name) || COUNTRIES.find(c => c.name === 'United States');

const DEGREE_TYPES = ['Graduation (BDS)', 'Post-Graduation (MDS)', 'Fellowship', 'Diploma', 'PhD', 'Other'];

const emptyEducation = () => ({ degree_type: '', institution: '', field: '', start_year: '', end_year: '', passing_year: '' });
const emptyPublication = () => ({ title: '', journal: '', year: '', doi: '' });

// ── Reusable UI helpers ────────────────────────────────────────────────────
const inputCls = 'w-full px-4 py-3 bg-white border border-[#E5E5E2] rounded-xl focus:ring-2 focus:ring-[#82A098] focus:outline-none focus:ring-offset-1 text-[#2A2F35] text-sm transition-colors duration-200';
const labelCls = 'block text-xs font-medium text-[#5C6773] mb-1.5 uppercase tracking-wide';

function SectionHeader({ number, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-5 pb-3 border-b border-[#E5E5E2]">
      <div className="w-7 h-7 rounded-lg bg-[#82A098] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
        {number}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-[#2A2F35]" style={{ fontFamily: 'Work Sans, sans-serif' }}>{title}</h3>
        {subtitle && <p className="text-xs text-[#5C6773]">{subtitle}</p>}
      </div>
    </div>
  );
}

function FormSection({ children, className = '' }) {
  return (
    <div className={`bg-white border border-[#E5E5E2] rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
const Register = () => {
  const [formData, setFormData] = useState({
    // Account
    email: '',
    password: '',
    // Personal
    name: '',
    gender: '',
    date_of_birth: '',
    phone: '',
    country: 'United States',
    currency: 'USD',
    address_street: '',
    address_city: '',
    address_state: '',
    address_zip: '',
    profile_picture: null,
    // Professional
    specialization: '',
    designation: '',
    organization: '',
    years_of_experience: '',
    registration_number: '',
    // Clinic
    primary_clinic: '',
    consulting_clinics: '',
    clinical_focus: '',
  });

  const [education, setEducation] = useState([emptyEducation()]);
  const [publications, setPublications] = useState([emptyPublication()]);
  const [profilePreview, setProfilePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef();
  const { register } = useAuth();
  const navigate = useNavigate();

  const countryData = getCountryData(formData.country);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'country') {
      const cd = getCountryData(value);
      setFormData(prev => ({ ...prev, country: value, currency: cd.currency }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleProfilePic = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Profile picture must be under 5 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProfilePreview(ev.target.result);
      setFormData(prev => ({ ...prev, profile_picture: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  // Education dynamic rows
  const updateEducation = (idx, field, value) => {
    setEducation(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  };
  const addEducation = () => setEducation(prev => [...prev, emptyEducation()]);
  const removeEducation = (idx) => setEducation(prev => prev.filter((_, i) => i !== idx));

  // Publications dynamic rows
  const updatePublication = (idx, field, value) => {
    setPublications(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  };
  const addPublication = () => setPublications(prev => [...prev, emptyPublication()]);
  const removePublication = (idx) => setPublications(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...formData,
      education: education.filter(e => e.institution || e.degree_type),
      publications: publications.filter(p => p.title || p.journal),
    };

    const result = await register(payload);
    if (result.success) {
      toast.success('Registration successful!');
      navigate('/');
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-5/12 xl:w-2/5 bg-cover bg-center relative flex-shrink-0"
        style={{ backgroundImage: 'url(https://images.pexels.com/photos/1029624/pexels-photo-1029624.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)' }}
      >
        <div className="absolute inset-0 bg-[#82A098] opacity-25" />
        <div className="relative z-10 flex flex-col justify-between w-full p-10">
          <div className="text-white">
            <Tooth size={48} weight="fill" />
            <h1 className="text-4xl font-semibold mt-4" style={{ fontFamily: 'Work Sans, sans-serif' }}>DentalHub</h1>
            <p className="text-lg mt-2 opacity-90">Professional Clinical Network</p>
          </div>
          <div className="text-white/80 text-sm space-y-2">
            <p className="flex items-center gap-2"><span className="text-[#C27E70]">✓</span> Track implant cases with FDI chart</p>
            <p className="flex items-center gap-2"><span className="text-[#C27E70]">✓</span> Manage osseointegration timelines</p>
            <p className="flex items-center gap-2"><span className="text-[#C27E70]">✓</span> Collaborate across clinics</p>
            <p className="flex items-center gap-2"><span className="text-[#C27E70]">✓</span> Analytics & financial insights</p>
          </div>
        </div>
      </div>

      {/* Right panel — scrollable form */}
      <div className="flex-1 bg-[#F9F9F8] overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-10">

          <div className="mb-8">
            <h2 className="text-3xl font-semibold text-[#2A2F35]" style={{ fontFamily: 'Work Sans, sans-serif' }}>Create Your Profile</h2>
            <p className="text-[#5C6773] mt-1 text-sm">Complete your professional registration — all fields marked * are required</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ── 1. Account Credentials ── */}
            <FormSection>
              <SectionHeader number="1" title="Account Credentials" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Email Address *</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required data-testid="email-input" className={inputCls} placeholder="doctor@example.com" />
                </div>
                <div>
                  <label className={labelCls}>Password *</label>
                  <input type="password" name="password" value={formData.password} onChange={handleChange} required data-testid="password-input" className={inputCls} placeholder="Min. 8 characters" minLength={8} />
                </div>
              </div>
            </FormSection>

            {/* ── 2. Personal Details ── */}
            <FormSection>
              <SectionHeader number="2" title="Personal Details" />

              {/* Profile picture */}
              <div className="flex items-start gap-5 mb-5">
                <div
                  className="w-20 h-20 rounded-2xl border-2 border-dashed border-[#E5E5E2] flex items-center justify-center bg-[#F9F9F8] flex-shrink-0 overflow-hidden cursor-pointer hover:border-[#82A098] transition-colors"
                  onClick={() => fileInputRef.current.click()}
                  data-testid="profile-picture-upload"
                >
                  {profilePreview
                    ? <img src={profilePreview} alt="preview" className="w-full h-full object-cover" />
                    : <User size={32} className="text-[#5C6773]" />
                  }
                </div>
                <div>
                  <p className="text-xs font-medium text-[#2A2F35] mb-1">Profile Picture</p>
                  <p className="text-xs text-[#5C6773] mb-2">JPEG or PNG, max 5 MB</p>
                  <button type="button" onClick={() => fileInputRef.current.click()} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#82A098] border border-[#82A098]/30 rounded-lg hover:bg-[#82A098]/5 transition-colors">
                    <UploadSimple size={14} /> Upload Photo
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleProfilePic} data-testid="profile-picture-input" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Full Name *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} required data-testid="name-input" className={inputCls} placeholder="Dr. Jane Smith" />
                </div>
                <div>
                  <label className={labelCls}>Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} data-testid="gender-select" className={inputCls}>
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Date of Birth</label>
                  <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} data-testid="dob-input" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Contact Number *</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required data-testid="phone-input" className={inputCls} placeholder="+1 234 567 8900" />
                </div>
              </div>

              {/* Country + Currency */}
              <div className="mt-4">
                <label className={labelCls}>Country *</label>
                <select name="country" value={formData.country} onChange={handleChange} required data-testid="country-select" className={inputCls}>
                  {COUNTRIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-[#5C6773]">Currency:</span>
                  <span data-testid="currency-badge" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#82A098]/10 text-[#82A098] text-xs font-semibold border border-[#82A098]/20">
                    {countryData.symbol} {countryData.currency}
                  </span>
                </div>
              </div>

              {/* Address */}
              <div className="mt-4 space-y-3">
                <div>
                  <label className={labelCls}>Street Address</label>
                  <input type="text" name="address_street" value={formData.address_street} onChange={handleChange} data-testid="address-street-input" className={inputCls} placeholder="123 Main Street, Suite 4" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="col-span-1 sm:col-span-1">
                    <label className={labelCls}>City</label>
                    <input type="text" name="address_city" value={formData.address_city} onChange={handleChange} data-testid="address-city-input" className={inputCls} placeholder="City" />
                  </div>
                  <div>
                    <label className={labelCls}>State / Province</label>
                    <input type="text" name="address_state" value={formData.address_state} onChange={handleChange} data-testid="address-state-input" className={inputCls} placeholder="State" />
                  </div>
                  <div>
                    <label className={labelCls}>Zip / Postal Code</label>
                    <input type="text" name="address_zip" value={formData.address_zip} onChange={handleChange} data-testid="address-zip-input" className={inputCls} placeholder="000000" />
                  </div>
                </div>
              </div>
            </FormSection>

            {/* ── 3. Educational Details ── */}
            <FormSection>
              <SectionHeader number="3" title="Educational Details" subtitle="Add all your degrees, fellowships and diplomas" />

              <div className="space-y-4">
                {education.map((edu, idx) => (
                  <div key={idx} className="p-4 bg-[#F9F9F8] rounded-xl border border-[#E5E5E2] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#82A098]">Degree {idx + 1}</span>
                      {education.length > 1 && (
                        <button type="button" onClick={() => removeEducation(idx)} data-testid={`remove-education-${idx}`} className="text-[#C27E70] hover:text-red-500 transition-colors">
                          <Trash size={15} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Degree Type</label>
                        <select value={edu.degree_type} onChange={e => updateEducation(idx, 'degree_type', e.target.value)} data-testid={`edu-degree-${idx}`} className={inputCls}>
                          <option value="">Select degree</option>
                          {DEGREE_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Institution / University</label>
                        <input type="text" value={edu.institution} onChange={e => updateEducation(idx, 'institution', e.target.value)} data-testid={`edu-institution-${idx}`} className={inputCls} placeholder="University name" />
                      </div>
                      <div>
                        <label className={labelCls}>Specialization / Field</label>
                        <input type="text" value={edu.field} onChange={e => updateEducation(idx, 'field', e.target.value)} data-testid={`edu-field-${idx}`} className={inputCls} placeholder="e.g. Oral & Maxillofacial Surgery" />
                      </div>
                      <div>
                        <label className={labelCls}>Passing Year</label>
                        <input
                          type="number"
                          value={edu.passing_year}
                          onChange={e => updateEducation(idx, 'passing_year', e.target.value)}
                          data-testid={`edu-passing-year-${idx}`}
                          className={inputCls}
                          placeholder="e.g. 2018"
                          min="1950"
                          max={new Date().getFullYear()}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Start Year</label>
                        <input type="number" value={edu.start_year} onChange={e => updateEducation(idx, 'start_year', e.target.value)} data-testid={`edu-start-year-${idx}`} className={inputCls} placeholder="e.g. 2013" min="1950" max={new Date().getFullYear()} />
                      </div>
                      <div>
                        <label className={labelCls}>End Year</label>
                        <input type="number" value={edu.end_year} onChange={e => updateEducation(idx, 'end_year', e.target.value)} data-testid={`edu-end-year-${idx}`} className={inputCls} placeholder="e.g. 2018" min="1950" max={new Date().getFullYear() + 6} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" onClick={addEducation} data-testid="add-education-btn" className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[#82A098] hover:text-[#6B8A82] transition-colors">
                <Plus size={16} weight="bold" /> Add Another Degree
              </button>
            </FormSection>

            {/* ── 4. Professional Details ── */}
            <FormSection>
              <SectionHeader number="4" title="Professional Details" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Current Designation / Job Title *</label>
                  <input type="text" name="designation" value={formData.designation} onChange={handleChange} required data-testid="designation-input" className={inputCls} placeholder="e.g. Senior Implantologist" />
                </div>
                <div>
                  <label className={labelCls}>Current Organization / Hospital</label>
                  <input type="text" name="organization" value={formData.organization} onChange={handleChange} data-testid="organization-input" className={inputCls} placeholder="Hospital or practice name" />
                </div>
                <div>
                  <label className={labelCls}>Specialization *</label>
                  <input type="text" name="specialization" value={formData.specialization} onChange={handleChange} required data-testid="specialization-input" className={inputCls} placeholder="e.g. Implantology, Prosthodontics" />
                </div>
                <div>
                  <label className={labelCls}>Years of Experience</label>
                  <input type="number" name="years_of_experience" value={formData.years_of_experience} onChange={handleChange} data-testid="experience-input" className={inputCls} placeholder="e.g. 8" min="0" max="60" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>{countryData.registrationLabel} *</label>
                  <input type="text" name="registration_number" value={formData.registration_number} onChange={handleChange} required data-testid="registration-input" className={inputCls} placeholder="Enter your registration number" />
                </div>
              </div>
            </FormSection>

            {/* ── 5. Clinic & Associations ── */}
            <FormSection>
              <SectionHeader number="5" title="Clinic & Consultant Associations" />
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Primary Clinic Name</label>
                  <input type="text" name="primary_clinic" value={formData.primary_clinic} onChange={handleChange} data-testid="primary-clinic-input" className={inputCls} placeholder="Your main clinic or practice" />
                </div>
                <div>
                  <label className={labelCls}>Consulting Hospitals / Clinics</label>
                  <textarea name="consulting_clinics" value={formData.consulting_clinics} onChange={handleChange} data-testid="consulting-clinics-input" className={`${inputCls} resize-none`} rows={3} placeholder="List any hospitals or clinics you consult at, one per line" />
                </div>
                <div>
                  <label className={labelCls}>Area of Clinical Focus</label>
                  <input type="text" name="clinical_focus" value={formData.clinical_focus} onChange={handleChange} data-testid="clinical-focus-input" className={inputCls} placeholder="e.g. Full-arch rehabilitation, Sinus lifts, Zygomatic implants" />
                </div>
              </div>
            </FormSection>

            {/* ── 6. Publications & Research ── */}
            <FormSection>
              <SectionHeader number="6" title="Publications & Research" subtitle="Optional — add your articles and journal contributions" />

              <div className="space-y-4">
                {publications.map((pub, idx) => (
                  <div key={idx} className="p-4 bg-[#F9F9F8] rounded-xl border border-[#E5E5E2] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#82A098]">Publication {idx + 1}</span>
                      {publications.length > 1 && (
                        <button type="button" onClick={() => removePublication(idx)} data-testid={`remove-publication-${idx}`} className="text-[#C27E70] hover:text-red-500 transition-colors">
                          <Trash size={15} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className={labelCls}>Article Title</label>
                        <input type="text" value={pub.title} onChange={e => updatePublication(idx, 'title', e.target.value)} data-testid={`pub-title-${idx}`} className={inputCls} placeholder="Full article title" />
                      </div>
                      <div>
                        <label className={labelCls}>Journal Name</label>
                        <input type="text" value={pub.journal} onChange={e => updatePublication(idx, 'journal', e.target.value)} data-testid={`pub-journal-${idx}`} className={inputCls} placeholder="e.g. Journal of Oral Implantology" />
                      </div>
                      <div>
                        <label className={labelCls}>Publication Year</label>
                        <input
                          type="number"
                          value={pub.year}
                          onChange={e => updatePublication(idx, 'year', e.target.value)}
                          data-testid={`pub-year-${idx}`}
                          className={inputCls}
                          placeholder="e.g. 2022"
                          min="1950"
                          max={new Date().getFullYear()}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelCls}>Link to Article / DOI</label>
                        <input type="url" value={pub.doi} onChange={e => updatePublication(idx, 'doi', e.target.value)} data-testid={`pub-doi-${idx}`} className={inputCls} placeholder="https://doi.org/10.xxxx/xxxxx" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" onClick={addPublication} data-testid="add-publication-btn" className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[#82A098] hover:text-[#6B8A82] transition-colors">
                <Plus size={16} weight="bold" /> Add Another Publication
              </button>
            </FormSection>

            {/* ── Submit ── */}
            <button
              type="submit"
              disabled={loading}
              data-testid="register-submit-button"
              className="w-full py-4 bg-[#82A098] hover:bg-[#6B8A82] text-white rounded-xl font-semibold text-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating your profile...' : 'Create Professional Account'}
            </button>

            <p className="text-center text-sm text-[#5C6773] pb-4">
              Already registered?{' '}
              <Link to="/login" data-testid="login-link" className="text-[#82A098] hover:text-[#6B8A82] font-medium transition-colors">
                Sign in
              </Link>
            </p>

          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
