import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Camera, Tag, PencilSimple, ClockCounterClockwise, FilePdf } from '@phosphor-icons/react';
import { generatePatientPDF } from '../components/PatientReportPDF';
import ImplantProgressTracker from '../components/ImplantProgressTracker';
import ImplantTagScanner from '../components/ImplantTagScanner';
import DentalChart from '../components/DentalChart';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const API_URL = process.env.REACT_APP_BACKEND_URL;


const selectClass = "w-full px-3 py-2 bg-white border border-[#E5E5E2] rounded-md text-sm focus:ring-2 focus:ring-[#82A098] focus:outline-none";
const checkboxClass = "w-4 h-4 text-[#82A098] border-[#E5E5E2] rounded focus:ring-[#82A098]";

const INITIAL_IMPLANT = {
  tooth_number: '',
  implant_type: 'Single',
  brand: '',
  implant_system: '',
  diameter_mm: '',
  length_mm: '',
  insertion_torque: '',
  isq_value: '',
  connection_type: 'Internal Hex',
  surgical_approach: 'Immediate Placement',
  bone_graft: '',
  sinus_lift_type: '',
  is_pterygoid: false,
  is_zygomatic: false,
  is_subperiosteal: false,
  cover_screw: false,
  healing_abutment: false,
  membrane_used: false,
  surgery_date: '',
  prosthetic_loading_date: '',
  follow_up_date: '',
  surgeon_name: '',
  consultant_surgeon: '',
  clinic_id: '',
  implant_outcome: 'Pending',
  osseointegration_success: false,
  peri_implant_health: false,
  clinical_notes: '',
  arch: 'Upper',
  jaw_region: 'Anterior',
  tag_image: null,
};

const INITIAL_FPD = {
  tooth_numbers: [],
  prosthetic_loading_date: '',
  crown_count: 'Single',
  connected_implant_ids: [],
  crown_type: 'Screw Retained',
  crown_material: 'Zirconia',
  clinical_notes: '',
  consultant_prosthodontist: '',
  lab_name: '',
  warranty_image: null,
};

const PatientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [implants, setImplants] = useState([]);
  const [fpdRecords, setFpdRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isImplantOpen, setIsImplantOpen] = useState(false);
  const [isFpdOpen, setIsFpdOpen] = useState(false);
  const [selectedTooth, setSelectedTooth] = useState(null);
  const [formData, setFormData] = useState({ ...INITIAL_IMPLANT });
  const [fpdData, setFpdData] = useState({ ...INITIAL_FPD });
  const [editingImplantId, setEditingImplantId] = useState(null);
  const [editingFpdId, setEditingFpdId] = useState(null);
  const [warrantyFile, setWarrantyFile] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [toothConditions, setToothConditions] = useState({});
  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);
  const [editPatientData, setEditPatientData] = useState({});
  const [editLog, setEditLog] = useState([]);
  const [showEditLog, setShowEditLog] = useState(false);
  const [pdfProgress, setPdfProgress] = useState('');
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [id]);

  const fetchAll = async () => {
    try {
      const [patientRes, implantsRes, fpdRes, clinicsRes] = await Promise.all([
        axios.get(`${API_URL}/api/patients/${id}`, { withCredentials: true }),
        axios.get(`${API_URL}/api/implants?patient_id=${id}`, { withCredentials: true }),
        axios.get(`${API_URL}/api/fpd-records?patient_id=${id}`, { withCredentials: true }),
        axios.get(`${API_URL}/api/clinics`, { withCredentials: true }),
      ]);
      setPatient(patientRes.data);
      setImplants(implantsRes.data);
      setFpdRecords(fpdRes.data);
      setClinics(clinicsRes.data);
    } catch (error) {
      toast.error('Failed to fetch patient details');
      navigate('/patients');
    } finally {
      setLoading(false);
    }
    // Load edit log separately — don't crash the page if it fails
    try {
      const logRes = await axios.get(`${API_URL}/api/patients/${id}/edit-log`, { withCredentials: true });
      setEditLog(logRes.data);
    } catch {
      // edit log is optional — silently ignore
    }
  };

  const openEditPatient = () => {
    setEditPatientData({
      name: patient.name || '',
      age: patient.age || '',
      gender: patient.gender || 'Male',
      phone: patient.phone || '',
      email: patient.email || '',
      alternate_email: patient.alternate_email || '',
      emergency_phone: patient.emergency_phone || '',
      address: patient.address || '',
      medical_history: patient.medical_history || '',
    });
    setIsEditPatientOpen(true);
  };

  const handleSavePatient = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/api/patients/${id}`, {
        ...editPatientData,
        age: parseInt(editPatientData.age),
      }, { withCredentials: true });
      toast.success('Patient details updated');
      setIsEditPatientOpen(false);
      fetchAll();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to update patient');
    }
  };

  const handleExportPDF = async () => {
    setGeneratingPdf(true);
    setPdfProgress('Preparing report...');
    try {
      // Fetch extra vault photos
      const extraRes = await axios.get(`${API_URL}/api/patients/${id}/photos`, { withCredentials: true });
      await generatePatientPDF({
        patient,
        implants,
        fpdRecords,
        extraPhotos: extraRes.data,
        clinics,
        onProgress: (msg) => setPdfProgress(msg),
      });
      toast.success('PDF report downloaded');
    } catch (err) {
      toast.error('Failed to generate PDF — ' + (err.message || 'unknown error'));
    } finally {
      setGeneratingPdf(false);
      setPdfProgress('');
    }
  };

  const handleMarkMissing = (toothNumber) => {
    setToothConditions(prev => {
      const current = prev[toothNumber]?.condition;
      return {
        ...prev,
        [toothNumber]: { condition: current === 'missing' ? 'healthy' : 'missing' },
      };
    });
  };

  const openImplantLog = (toothNumber) => {
    setSelectedTooth(toothNumber);
    const arch = toothNumber <= 28 ? 'Upper' : 'Lower';
    const tens = Math.floor(toothNumber / 10);
    const jaw_region = ([1, 2, 3, 4].includes(tens) && (toothNumber % 10) <= 3) ? 'Anterior' : 'Posterior';
    setFormData({ ...INITIAL_IMPLANT, tooth_number: toothNumber, arch, jaw_region });
    setIsImplantOpen(true);
  };

  const openCrownLog = (toothNumber) => {
    setSelectedTooth(toothNumber);
    setFpdData({ ...INITIAL_FPD, tooth_numbers: [toothNumber] });
    setIsFpdOpen(true);
  };

  const handleSubmitImplant = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        patient_id: id,
        tooth_number: parseInt(formData.tooth_number),
        insertion_torque: formData.insertion_torque ? parseFloat(formData.insertion_torque) : null,
        bone_graft: formData.bone_graft || null,
        sinus_lift_type: formData.sinus_lift_type || null,
        diameter_mm: formData.diameter_mm ? parseFloat(formData.diameter_mm) : null,
        length_mm: formData.length_mm ? parseFloat(formData.length_mm) : null,
        isq_value: formData.isq_value ? parseFloat(formData.isq_value) : null,
        clinic_id: formData.clinic_id || null,
        implant_system: formData.implant_system || null,
        surgeon_name: formData.surgeon_name || null,
        follow_up_date: formData.follow_up_date || null,
      };
      if (editingImplantId) {
        await axios.put(`${API_URL}/api/implants/${editingImplantId}`, payload, { withCredentials: true });
        toast.success('Implant record updated');
      } else {
        await axios.post(`${API_URL}/api/implants`, payload, { withCredentials: true });
        toast.success('Implant record added');
      }
      setIsImplantOpen(false);
      setFormData({ ...INITIAL_IMPLANT });
      setSelectedTooth(null);
      setEditingImplantId(null);
      fetchAll();
    } catch (error) {
      toast.error(editingImplantId ? 'Failed to update implant' : 'Failed to add implant');
    }
  };

  const openEditImplant = (implant) => {
    setFormData({
      tooth_number: implant.tooth_number?.toString() || '',
      brand: implant.brand || '',
      implant_system: implant.implant_system || '',
      diameter_mm: implant.diameter_mm?.toString() || '',
      length_mm: implant.length_mm?.toString() || '',
      insertion_torque: implant.insertion_torque?.toString() || '',
      isq_value: implant.isq_value?.toString() || '',
      connection_type: implant.connection_type || 'Internal Hex',
      surgical_approach: implant.surgical_approach || 'Immediate Placement',
      bone_graft: implant.bone_graft || '',
      sinus_lift_type: implant.sinus_lift_type || '',
      is_pterygoid: implant.is_pterygoid || false,
      is_zygomatic: implant.is_zygomatic || false,
      is_subperiosteal: implant.is_subperiosteal || false,
      cover_screw: implant.cover_screw || false,
      healing_abutment: implant.healing_abutment || false,
      membrane_used: implant.membrane_used || false,
      surgery_date: implant.surgery_date || '',
      prosthetic_loading_date: implant.prosthetic_loading_date || '',
      follow_up_date: implant.follow_up_date || '',
      surgeon_name: implant.surgeon_name || '',
      consultant_surgeon: implant.consultant_surgeon || '',
      clinic_id: implant.clinic_id || '',
      implant_outcome: implant.implant_outcome || 'Pending',
      osseointegration_success: implant.osseointegration_success || false,
      peri_implant_health: implant.peri_implant_health || false,
      clinical_notes: implant.clinical_notes || '',
      arch: implant.arch || 'Upper',
      jaw_region: implant.jaw_region || 'Anterior',
      tag_image: implant.tag_image || null,
    });
    setEditingImplantId(implant._id);
    setIsImplantOpen(true);
  };

  const toggleFpdTooth = (tooth) => {
    setFpdData(prev => {
      const exists = prev.tooth_numbers.includes(tooth);
      return {
        ...prev,
        tooth_numbers: exists
          ? prev.tooth_numbers.filter(t => t !== tooth)
          : [...prev.tooth_numbers, tooth].sort((a, b) => a - b)
      };
    });
  };

  const handleSubmitFpd = async (e) => {
    e.preventDefault();
    if (fpdData.tooth_numbers.length === 0) {
      toast.error('Select at least one tooth on the chart');
      return;
    }
    try {
      const payload = { ...fpdData, patient_id: id };
      delete payload.warranty_image; // stored via separate upload endpoint
      let fpdId = editingFpdId;
      if (editingFpdId) {
        await axios.put(`${API_URL}/api/fpd-records/${editingFpdId}`, payload, { withCredentials: true });
        toast.success('FPD record updated');
      } else {
        const res = await axios.post(`${API_URL}/api/fpd-records`, payload, { withCredentials: true });
        fpdId = res.data?._id;
        toast.success('FPD record added');
      }
      // Upload warranty image if selected
      if (warrantyFile && fpdId) {
        try {
          const form = new FormData();
          form.append('file', warrantyFile);
          await axios.post(`${API_URL}/api/fpd-records/${fpdId}/warranty-image`, form, {
            withCredentials: true,
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch {
          toast.warning('FPD saved but warranty image upload failed');
        }
      }
      setIsFpdOpen(false);
      setFpdData({ ...INITIAL_FPD });
      setEditingFpdId(null);
      setWarrantyFile(null);
      fetchAll();
    } catch (error) {
      const msg = error?.response?.data?.detail || (editingFpdId ? 'Failed to update FPD record' : 'Failed to add FPD record');
      toast.error(msg);
    }
  };

  const openEditFpd = (fpd) => {
    setFpdData({
      tooth_numbers: fpd.tooth_numbers || [],
      prosthetic_loading_date: fpd.prosthetic_loading_date || '',
      crown_count: fpd.crown_count || 'Single',
      connected_implant_ids: fpd.connected_implant_ids || [],
      crown_type: fpd.crown_type || 'Screw Retained',
      crown_material: fpd.crown_material || 'Zirconia',
      clinical_notes: fpd.clinical_notes || '',
      consultant_prosthodontist: fpd.consultant_prosthodontist || '',
      lab_name: fpd.lab_name || '',
      warranty_image: fpd.warranty_image || null,
    });
    setEditingFpdId(fpd._id);
    setIsFpdOpen(true);
  };

  const getToothStatus = (toothNumber) => implants.find(imp => imp.tooth_number === toothNumber);

  const getDaysRemaining = (osseoDate) => {
    if (!osseoDate) return 0;
    const days = Math.ceil((new Date(osseoDate) - new Date()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleTagAutoFill = (parsed) => {
    setFormData(prev => ({
      ...prev,
      ...(parsed.brand      && { brand: parsed.brand }),
      ...(parsed.diameter_mm && { diameter_mm: parsed.diameter_mm }),
      ...(parsed.length_mm  && { length_mm: parsed.length_mm }),
      ...(parsed.implant_system && { implant_system: parsed.implant_system }),
    }));
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#E5E5E2] rounded w-1/4"></div>
          <div className="h-64 bg-[#E5E5E2] rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
      <button
        onClick={() => navigate('/patients')}
        data-testid="back-button"
        className="flex items-center gap-2 text-[#5C6773] hover:text-[#82A098] mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        Back to Patients
      </button>

      {/* Patient Info */}
      <div className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-start gap-5">
          {/* Avatar — click to upload profile picture */}
          <label
            htmlFor="patient-pic-upload"
            data-testid="patient-avatar"
            className="relative w-24 h-24 rounded-full shrink-0 cursor-pointer group"
            title="Click to upload patient photo"
          >
            {patient.profile_picture ? (
              <img
                src={`${API_URL}/api/files/${patient.profile_picture}`}
                alt={patient.name}
                className="w-24 h-24 rounded-full object-cover border-2 border-[#E5E5E2]"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-[#82A098] flex items-center justify-center text-white font-semibold text-3xl">
                {patient.name.charAt(0)}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-all">
              <Camera size={22} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </label>
          <input
            id="patient-pic-upload"
            type="file"
            accept="image/*"
            className="hidden"
            data-testid="patient-pic-input"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const form = new FormData();
              form.append('file', file);
              try {
                const res = await axios.post(`${API_URL}/api/patients/${id}/profile-picture`, form, {
                  withCredentials: true,
                  headers: { 'Content-Type': 'multipart/form-data' },
                });
                setPatient(prev => ({ ...prev, profile_picture: res.data.profile_picture }));
                toast.success('Profile photo updated');
              } catch {
                toast.error('Failed to upload photo');
              }
              e.target.value = '';
            }}
          />

          {/* Patient details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold text-[#2A2F35] tracking-tight" data-testid="patient-name">
                  {patient.name}
                </h1>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-[#5C6773]">
                  <span>{patient.age} years</span>
                  <span>•</span>
                  <span>{patient.gender}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap">
                <button
                  data-testid="edit-patient-btn"
                  onClick={openEditPatient}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#5C6773] border border-[#E5E5E2] rounded-lg hover:border-[#82A098] hover:text-[#82A098] transition-colors"
                >
                  <PencilSimple size={13} weight="bold" /> Edit Details
                </button>
                <button
                  data-testid="export-pdf-btn"
                  onClick={handleExportPDF}
                  disabled={generatingPdf}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#C27E70] hover:bg-[#A8685C] rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {generatingPdf
                    ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <FilePdf size={13} weight="bold" />}
                  {generatingPdf ? (pdfProgress || 'Building PDF...') : 'Export PDF'}
                </button>
                {editLog.length > 0 && (
                  <button
                    data-testid="show-edit-log-btn"
                    onClick={() => setShowEditLog(v => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#5C6773] border border-[#E5E5E2] rounded-lg hover:border-[#C27E70] hover:text-[#C27E70] transition-colors"
                  >
                    <ClockCounterClockwise size={13} weight="bold" /> History ({editLog.length})
                  </button>
                )}
              </div>
            </div>

            {/* Contact grid */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              <div className="flex gap-2">
                <span className="text-[#9CA3AF] shrink-0">Phone</span>
                <span className="text-[#2A2F35] font-medium">{patient.phone}</span>
              </div>
              {patient.emergency_phone && (
                <div className="flex gap-2">
                  <span className="text-[#9CA3AF] shrink-0">Emergency</span>
                  <span className="text-[#2A2F35] font-medium">{patient.emergency_phone}</span>
                </div>
              )}
              {patient.email && (
                <div className="flex gap-2">
                  <span className="text-[#9CA3AF] shrink-0">Email</span>
                  <span className="text-[#2A2F35] truncate">{patient.email}</span>
                </div>
              )}
              {patient.alternate_email && (
                <div className="flex gap-2">
                  <span className="text-[#9CA3AF] shrink-0">Alt. Email</span>
                  <span className="text-[#2A2F35] truncate">{patient.alternate_email}</span>
                </div>
              )}
              {patient.address && (
                <div className="flex gap-2 sm:col-span-2">
                  <span className="text-[#9CA3AF] shrink-0">Address</span>
                  <span className="text-[#2A2F35]">{patient.address}</span>
                </div>
              )}
              {patient.medical_history && (
                <div className="flex gap-2 sm:col-span-2">
                  <span className="text-[#9CA3AF] shrink-0">History</span>
                  <span className="text-[#2A2F35]">{patient.medical_history}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Edit log panel */}
        {showEditLog && editLog.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[#F0EDE8]">
            <p className="text-xs font-semibold text-[#C27E70] uppercase tracking-wide mb-3">Change History</p>
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {editLog.map((entry, i) => (
                <div key={i} className="text-xs text-[#5C6773]">
                  <span className="font-medium text-[#2A2F35]">
                    {new Date(entry.changed_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className="mt-1 space-y-0.5 pl-2 border-l-2 border-[#E5E5E2]">
                    {entry.changes.map((c, j) => (
                      <div key={j}>
                        <span className="capitalize">{c.field.replace(/_/g, ' ')}</span>
                        {': '}
                        <span className="line-through text-[#9CA3AF]">{c.old || '—'}</span>
                        {' → '}
                        <span className="text-[#2A2F35] font-medium">{c.new || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Patient Dialog */}
      <Dialog open={isEditPatientOpen} onOpenChange={setIsEditPatientOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Edit Patient Details</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSavePatient} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Full Name *</Label>
                <Input value={editPatientData.name || ''} onChange={e => setEditPatientData(p => ({ ...p, name: e.target.value }))} required data-testid="edit-patient-name" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Age *</Label>
                <Input type="number" value={editPatientData.age || ''} onChange={e => setEditPatientData(p => ({ ...p, age: e.target.value }))} required data-testid="edit-patient-age" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Gender *</Label>
                <select value={editPatientData.gender || 'Male'} onChange={e => setEditPatientData(p => ({ ...p, gender: e.target.value }))} data-testid="edit-patient-gender" className={`mt-1 ${selectClass}`}>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Primary Phone *</Label>
                <Input value={editPatientData.phone || ''} onChange={e => setEditPatientData(p => ({ ...p, phone: e.target.value }))} required data-testid="edit-patient-phone" className="mt-1" placeholder="+91 98765 43210" />
              </div>
              <div>
                <Label className="text-xs">Emergency / Alternate Phone</Label>
                <Input value={editPatientData.emergency_phone || ''} onChange={e => setEditPatientData(p => ({ ...p, emergency_phone: e.target.value }))} data-testid="edit-patient-emergency-phone" className="mt-1" placeholder="+91 99999 00000" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Email</Label>
                <Input type="email" value={editPatientData.email || ''} onChange={e => setEditPatientData(p => ({ ...p, email: e.target.value }))} data-testid="edit-patient-email" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Alternate Email</Label>
                <Input type="email" value={editPatientData.alternate_email || ''} onChange={e => setEditPatientData(p => ({ ...p, alternate_email: e.target.value }))} data-testid="edit-patient-alt-email" className="mt-1" />
              </div>
            </div>

            <div>
              <Label className="text-xs">Address</Label>
              <textarea value={editPatientData.address || ''} onChange={e => setEditPatientData(p => ({ ...p, address: e.target.value }))} rows={2} data-testid="edit-patient-address" className={`mt-1 ${selectClass}`} placeholder="Street, City, State, PIN" />
            </div>

            <div>
              <Label className="text-xs">Medical History / Allergies</Label>
              <textarea value={editPatientData.medical_history || ''} onChange={e => setEditPatientData(p => ({ ...p, medical_history: e.target.value }))} rows={3} data-testid="edit-patient-history" className={`mt-1 ${selectClass}`} placeholder="Diabetes, hypertension, blood thinners..." />
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="submit" data-testid="save-patient-btn" className="flex-1 bg-[#82A098] hover:bg-[#6B8A82] text-white">
                Save Changes
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsEditPatientOpen(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* FDI Dental Chart */}
      <div className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-medium text-[#2A2F35] mb-4">FDI Dental Chart</h2>

        {/* Implant Dialog (opened via chart tooth click) */}
        <div>
          <Dialog open={isImplantOpen} onOpenChange={(open) => {
            setIsImplantOpen(open);
            if (!open) { setFormData({ ...INITIAL_IMPLANT }); setSelectedTooth(null); setEditingImplantId(null); }
          }}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">
                  {editingImplantId ? `Edit Implant Record${selectedTooth ? ` - Tooth #${selectedTooth}` : ''}` : (selectedTooth ? `Add Implant - Tooth #${selectedTooth}` : 'Add Implant Record')}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitImplant} className="space-y-4 mt-2">
                {/* Implant Tag Scanner */}
                <ImplantTagScanner
                  tagImage={formData.tag_image}
                  onAutoFill={handleTagAutoFill}
                  onImageCapture={(img) => updateField('tag_image', img)}
                />

                {/* Row 1: Tooth, Type, Brand */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Tooth Number *</Label>
                    <Input type="number" value={formData.tooth_number} onChange={(e) => updateField('tooth_number', e.target.value)} required data-testid="tooth-number-input" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Implant Type *</Label>
                    <select value={formData.implant_type} onChange={(e) => updateField('implant_type', e.target.value)} data-testid="implant-type-select" className={`mt-1 ${selectClass}`}>
                      <option>Single</option><option>Bridge</option><option>Full Mouth</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Brand *</Label>
                    <Input value={formData.brand} onChange={(e) => updateField('brand', e.target.value)} required data-testid="brand-input" placeholder="e.g., Alpha, Straumann" className="mt-1" />
                  </div>
                </div>

                {/* Row 2: Diameter, Length */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Diameter (mm) *</Label>
                    <Input type="number" step="0.1" value={formData.diameter_mm} onChange={(e) => updateField('diameter_mm', e.target.value)} required data-testid="diameter-input" placeholder="e.g. 4.5" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Length (mm) *</Label>
                    <Input type="number" step="0.1" value={formData.length_mm} onChange={(e) => updateField('length_mm', e.target.value)} required data-testid="length-input" placeholder="e.g. 10.0" className="mt-1" />
                  </div>
                </div>

                {/* Row 3: Torque, ISQ, Connection, Surgical Approach */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Insertion Torque (Ncm)</Label>
                    <Input type="number" step="0.1" value={formData.insertion_torque} onChange={(e) => updateField('insertion_torque', e.target.value)} data-testid="torque-input" placeholder="35" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">ISQ Value</Label>
                    <Input type="number" step="0.1" value={formData.isq_value} onChange={(e) => updateField('isq_value', e.target.value)} data-testid="isq-input" placeholder="70" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Connection Type *</Label>
                    <select value={formData.connection_type} onChange={(e) => updateField('connection_type', e.target.value)} data-testid="connection-type-select" className={`mt-1 ${selectClass}`}>
                      <option>Internal Hex</option><option>External Hex</option><option>Conical</option><option>Morse Taper</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Surgical Approach *</Label>
                    <select value={formData.surgical_approach} onChange={(e) => updateField('surgical_approach', e.target.value)} data-testid="surgical-approach-select" className={`mt-1 ${selectClass}`}>
                      <option>Immediate Placement</option><option>Delayed Placement</option>
                    </select>
                  </div>
                </div>

                {/* Row 4: Arch, Jaw Region, Implant System, Outcome */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Arch</Label>
                    <select value={formData.arch} onChange={(e) => updateField('arch', e.target.value)} className={`mt-1 ${selectClass}`}>
                      <option>Upper</option><option>Lower</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Jaw Region</Label>
                    <select value={formData.jaw_region} onChange={(e) => updateField('jaw_region', e.target.value)} className={`mt-1 ${selectClass}`}>
                      <option>Anterior</option><option>Posterior</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Implant System</Label>
                    <Input value={formData.implant_system} onChange={(e) => updateField('implant_system', e.target.value)} placeholder="Product line" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Outcome</Label>
                    <select value={formData.implant_outcome} onChange={(e) => updateField('implant_outcome', e.target.value)} className={`mt-1 ${selectClass}`}>
                      <option>Pending</option><option>Success</option><option>Failed</option><option>Complications</option>
                    </select>
                  </div>
                </div>

                {/* Row 5: Surgery Date, Follow-up, Prosthetic Loading, Surgeon */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Surgery Date</Label>
                    <Input type="date" value={formData.surgery_date} onChange={(e) => updateField('surgery_date', e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Follow-up Date</Label>
                    <Input type="date" value={formData.follow_up_date} onChange={(e) => updateField('follow_up_date', e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Prosthetic Loading Date</Label>
                    <Input type="date" value={formData.prosthetic_loading_date} onChange={(e) => updateField('prosthetic_loading_date', e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Surgeon Name</Label>
                    <Input value={formData.surgeon_name} onChange={(e) => updateField('surgeon_name', e.target.value)} placeholder="In-house surgeon" className="mt-1" />
                  </div>
                </div>

                {/* Consultant surgeon */}
                <div>
                  <Label className="text-xs">Consultant / Visiting Surgeon <span className="text-[#9CA3AF]">(if different from treating doctor)</span></Label>
                  <Input value={formData.consultant_surgeon || ''} onChange={(e) => updateField('consultant_surgeon', e.target.value)} placeholder="Dr. Name, Specialization" className="mt-1" data-testid="implant-consultant-surgeon" />
                </div>

                {/* Row 6: Bone Graft, Sinus Lift, Clinic */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Bone Graft</Label>
                    <Input value={formData.bone_graft} onChange={(e) => updateField('bone_graft', e.target.value)} data-testid="bone-graft-input" placeholder="Xenograft, Allograft..." className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Sinus Lift Type</Label>
                    <select value={formData.sinus_lift_type} onChange={(e) => updateField('sinus_lift_type', e.target.value)} data-testid="sinus-lift-select" className={`mt-1 ${selectClass}`}>
                      <option value="">None</option><option>Direct</option><option>Indirect</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Clinic</Label>
                    <select value={formData.clinic_id} onChange={(e) => updateField('clinic_id', e.target.value)} className={`mt-1 ${selectClass}`}>
                      <option value="">Select clinic</option>
                      {clinics.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="flex flex-wrap gap-x-6 gap-y-2 py-2">
                  {[
                    ['cover_screw', 'Cover Screw'],
                    ['healing_abutment', 'Healing Abutment'],
                    ['membrane_used', 'Membrane Used'],
                    ['is_pterygoid', 'Pterygoid'],
                    ['is_zygomatic', 'Zygomatic'],
                    ['is_subperiosteal', 'Sub-periosteal'],
                    ['osseointegration_success', 'Osseointegration Success'],
                    ['peri_implant_health', 'Peri-implant Health'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-1.5 text-sm text-[#2A2F35]">
                      <input type="checkbox" checked={formData[key]} onChange={(e) => updateField(key, e.target.checked)} className={checkboxClass} data-testid={`${key}-checkbox`} />
                      {label}
                    </label>
                  ))}
                </div>

                {/* Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Clinical Notes</Label>
                    <textarea value={formData.clinical_notes} onChange={(e) => updateField('clinical_notes', e.target.value)} rows={3} className={`mt-1 ${selectClass}`} placeholder="Clinical observations..." />
                  </div>
                  <div>
                    <Label className="text-xs">Additional Notes</Label>
                    <textarea value={formData.notes} onChange={(e) => updateField('notes', e.target.value)} data-testid="notes-input" rows={3} className={`mt-1 ${selectClass}`} placeholder="General notes..." />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Site-Specific Notes</Label>
                    <textarea value={formData.site_specific_notes} onChange={(e) => updateField('site_specific_notes', e.target.value)} rows={2} className={`mt-1 ${selectClass}`} placeholder="Site healing patterns..." />
                  </div>
                  <div>
                    <Label className="text-xs">Complication Remarks</Label>
                    <textarea value={formData.complication_remarks} onChange={(e) => updateField('complication_remarks', e.target.value)} rows={2} className={`mt-1 ${selectClass}`} placeholder="Any complications..." />
                  </div>
                </div>

                <Button type="submit" data-testid="submit-implant-button" className="w-full bg-[#82A098] hover:bg-[#6B8A82] text-white">
                  {editingImplantId ? 'Save Changes' : 'Add Implant Record'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* FPD Log Sheet Dialog (opened via chart tooth click) */}
          <Dialog open={isFpdOpen} onOpenChange={(open) => {
            setIsFpdOpen(open);
            if (!open) { setFpdData({ ...INITIAL_FPD }); setEditingFpdId(null); setWarrantyFile(null); }
          }}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">{editingFpdId ? 'Edit FPD Record' : 'FPD Log Sheet'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitFpd} className="space-y-4 mt-2">
                {/* FDI Chart — tooth selection for FPD */}
                <div>
                  <Label className="text-xs mb-2 block">Select Teeth — click to toggle</Label>
                  <DentalChart
                    implants={implants}
                    fpdRecords={fpdRecords}
                    selectedTeeth={fpdData.tooth_numbers}
                    onToothToggle={toggleFpdTooth}
                    mode="fpd"
                  />
                  {fpdData.tooth_numbers.length > 0 && (
                    <p className="mt-2 text-xs text-[#2A2F35] font-medium text-center">
                      Selected: {fpdData.tooth_numbers.join(', ')}
                    </p>
                  )}
                </div>

                {/* FPD fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Prosthetic Loading Date</Label>
                    <Input type="date" value={fpdData.prosthetic_loading_date} onChange={(e) => setFpdData({ ...fpdData, prosthetic_loading_date: e.target.value })} data-testid="fpd-loading-date" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Crown Count</Label>
                    <select value={fpdData.crown_count} onChange={(e) => setFpdData({ ...fpdData, crown_count: e.target.value })} data-testid="fpd-crown-count" className={`mt-1 ${selectClass}`}>
                      <option>Single</option><option>Multiple</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Crown Type</Label>
                    <select value={fpdData.crown_type} onChange={(e) => setFpdData({ ...fpdData, crown_type: e.target.value })} data-testid="fpd-crown-type" className={`mt-1 ${selectClass}`}>
                      <option>Cement Retained</option><option>Screw Retained</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Crown Material</Label>
                    <select value={fpdData.crown_material} onChange={(e) => setFpdData({ ...fpdData, crown_material: e.target.value })} data-testid="fpd-crown-material" className={`mt-1 ${selectClass}`}>
                      <option>Metal</option><option>Porcelain fused to metal</option><option>Zirconia</option>
                    </select>
                  </div>
                </div>

                {/* Connected implants */}
                {implants.length > 0 && (
                  <div>
                    <Label className="text-xs">Connected Implants</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {implants.map(imp => (
                        <label key={imp._id} className="flex items-center gap-1.5 text-sm border border-[#E5E5E2] rounded-md px-2.5 py-1.5 cursor-pointer hover:border-[#82A098] transition-colors">
                          <input type="checkbox"
                            checked={fpdData.connected_implant_ids.includes(imp._id)}
                            onChange={(e) => {
                              setFpdData(prev => ({
                                ...prev,
                                connected_implant_ids: e.target.checked
                                  ? [...prev.connected_implant_ids, imp._id]
                                  : prev.connected_implant_ids.filter(x => x !== imp._id)
                              }));
                            }}
                            className={checkboxClass}
                          />
                          <span>#{imp.tooth_number} ({imp.brand})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Consultant & Lab */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Consultant / Visiting Prosthodontist <span className="text-[#9CA3AF]">(optional)</span></Label>
                    <Input value={fpdData.consultant_prosthodontist} onChange={(e) => setFpdData({ ...fpdData, consultant_prosthodontist: e.target.value })} placeholder="Dr. Name" className="mt-1" data-testid="fpd-consultant" />
                  </div>
                  <div>
                    <Label className="text-xs">Dental Lab <span className="text-[#9CA3AF]">(crown fabrication)</span></Label>
                    <Input value={fpdData.lab_name} onChange={(e) => setFpdData({ ...fpdData, lab_name: e.target.value })} placeholder="Lab name" className="mt-1" data-testid="fpd-lab-name" />
                  </div>
                </div>

                {/* Warranty image */}
                <div>
                  <Label className="text-xs">Warranty Card Photo <span className="text-[#9CA3AF]">(optional)</span></Label>
                  <div className="mt-1 flex items-center gap-3">
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[#E5E5E2] hover:border-[#82A098] hover:bg-[#F0F8F6] cursor-pointer text-xs text-[#5C6773] transition-colors" data-testid="fpd-warranty-upload-label">
                      <input type="file" accept="image/*" className="hidden" data-testid="fpd-warranty-input"
                        onChange={e => { if (e.target.files?.[0]) setWarrantyFile(e.target.files[0]); }} />
                      📷 {warrantyFile ? warrantyFile.name : 'Upload warranty photo'}
                    </label>
                    {/* Show existing warranty image if editing */}
                    {fpdData.warranty_image && !warrantyFile && (
                      <a href={`${API_URL}/api/files/${fpdData.warranty_image}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-[#82A098] underline">View existing</a>
                    )}
                    {warrantyFile && (
                      <button type="button" onClick={() => setWarrantyFile(null)} className="text-xs text-red-400 hover:text-red-600">✕ Remove</button>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Clinical Notes</Label>
                  <textarea value={fpdData.clinical_notes} onChange={(e) => setFpdData({ ...fpdData, clinical_notes: e.target.value })} data-testid="fpd-clinical-notes" rows={3} className={`mt-1 ${selectClass}`} placeholder="Prosthetic observations, adjustments..." />
                </div>

                <Button type="submit" data-testid="submit-fpd-button" className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white">
                  {editingFpdId ? 'Save Changes' : 'Add FPD Record'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* FDI Dental Chart — high-fidelity SVG */}
        <div className="overflow-x-auto">
          <div style={{ minWidth: 560 }}>
            <DentalChart
              implants={implants}
              fpdRecords={fpdRecords}
              toothConditions={toothConditions}
              onMarkMissing={handleMarkMissing}
              onImplantLog={openImplantLog}
              onCrownLog={openCrownLog}
            />
          </div>
        </div>

        {/* Photo Vault link - below chart */}
        <div className="mt-4 pt-4 border-t border-[#E5E5E2]">
          <Link
            to={`/patients/${id}/vault`}
            data-testid="photo-vault-button"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#F0F0EE] hover:bg-[#E5E5E2] text-[#2A2F35] rounded-lg transition-colors text-sm font-medium"
          >
            <Camera size={18} weight="bold" />
            Photo Vault
          </Link>
        </div>
      </div>

      {/* Implant Records */}
      {implants.length > 0 && (
        <div className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-lg font-medium text-[#2A2F35] mb-4">
            Implant Records ({implants.length})
          </h2>
          <div className="space-y-3">
            {implants.map((implant) => {
              const daysRemaining = getDaysRemaining(implant.osseointegration_date);
              return (
                <div key={implant._id} data-testid={`implant-record-${implant._id}`} className="border border-[#E5E5E2] rounded-lg p-4 hover:border-[#82A098] transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#82A098] rounded-lg flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                        {implant.tooth_number}
                      </div>
                      <div>
                        <h3 className="font-medium text-[#2A2F35] text-sm">{implant.implant_type} Implant</h3>
                        <p className="text-xs text-[#5C6773]">{implant.brand}{implant.implant_system ? ` - ${implant.implant_system}` : ''}</p>
                        {implant.case_number && <p className="text-xs text-[#5C6773]">Case: {implant.case_number}</p>}
                      </div>
                    </div>
                    <div className="flex items-start gap-3 flex-shrink-0 ml-2">
                      <button
                        data-testid={`edit-implant-${implant._id}`}
                        onClick={() => openEditImplant(implant)}
                        className="p-1.5 rounded-md hover:bg-[#F0F0EE] text-[#5C6773] hover:text-[#82A098] transition-colors"
                        title="Edit implant record"
                      >
                        <PencilSimple size={15} weight="bold" />
                      </button>
                      {/* Tag image thumbnail */}
                      {implant.tag_image ? (
                        <div className="relative group" data-testid={`tag-thumb-${implant._id}`}>
                          <img
                            src={implant.tag_image}
                            alt="Implant tag"
                            className="w-14 h-14 object-cover rounded-lg border border-[#E5E5E2] shadow-sm cursor-pointer"
                            onClick={() => window.open(implant.tag_image, '_blank')}
                            title="Click to view full tag"
                          />
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#82A098] rounded-full flex items-center justify-center shadow">
                            <Tag size={10} className="text-white" weight="fill" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-lg border border-dashed border-[#E5E5E2] flex items-center justify-center" title="No tag image">
                          <Tag size={16} className="text-[#E5E5E2]" />
                        </div>
                      )}
                      {daysRemaining > 0 && (
                        <div className="text-right">
                          <p className="text-sm font-medium text-[#E8A76C]">{daysRemaining} days</p>
                          <p className="text-xs text-[#5C6773]">until osseointegration</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div><span className="text-[#5C6773]">Diameter:</span> <span className="font-medium text-[#2A2F35]">{implant.diameter_mm ? `${implant.diameter_mm} mm` : '—'}</span></div>
                    <div><span className="text-[#5C6773]">Length:</span> <span className="font-medium text-[#2A2F35]">{implant.length_mm ? `${implant.length_mm} mm` : '—'}</span></div>
                    <div><span className="text-[#5C6773]">Torque:</span> <span className="font-medium text-[#2A2F35]">{implant.insertion_torque || 'N/A'} Ncm</span></div>
                    <div><span className="text-[#5C6773]">Connection:</span> <span className="font-medium text-[#2A2F35]">{implant.connection_type}</span></div>
                    {implant.surgeon_name && <div><span className="text-[#5C6773]">Surgeon:</span> <span className="font-medium text-[#2A2F35]">{implant.surgeon_name}</span></div>}
                    {implant.consultant_surgeon && <div><span className="text-[#5C6773]">Consultant:</span> <span className="font-medium text-[#C27E70]">{implant.consultant_surgeon}</span></div>}
                  </div>
                  {implant.notes && <p className="mt-2 text-xs text-[#5C6773] italic">{implant.notes}</p>}
                  <ImplantProgressTracker implant={implant} onUpdate={fetchAll} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FPD Records */}
      {fpdRecords.length > 0 && (
        <div className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-medium text-[#2A2F35] mb-4">
            FPD Records ({fpdRecords.length})
          </h2>
          <div className="space-y-3">
            {fpdRecords.map((fpd) => (
              <div key={fpd._id} data-testid={`fpd-record-${fpd._id}`} className="border border-[#E5E5E2] rounded-lg p-4 hover:border-[#3B82F6] transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-[#2A2F35] text-sm">
                      FPD - Teeth: {fpd.tooth_numbers?.join(', ')}
                    </h3>
                    <p className="text-xs text-[#5C6773]">{fpd.case_number}</p>
                  </div>
                  <button
                    data-testid={`edit-fpd-${fpd._id}`}
                    onClick={() => openEditFpd(fpd)}
                    className="p-1.5 rounded-md hover:bg-[#F0F0EE] text-[#5C6773] hover:text-[#3B82F6] transition-colors flex-shrink-0"
                    title="Edit FPD record"
                  >
                    <PencilSimple size={15} weight="bold" />
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div><span className="text-[#5C6773]">Crown:</span> <span className="font-medium text-[#2A2F35]">{fpd.crown_count}</span></div>
                  <div><span className="text-[#5C6773]">Type:</span> <span className="font-medium text-[#2A2F35]">{fpd.crown_type}</span></div>
                  <div><span className="text-[#5C6773]">Material:</span> <span className="font-medium text-[#2A2F35]">{fpd.crown_material}</span></div>
                  {fpd.prosthetic_loading_date && (
                    <div><span className="text-[#5C6773]">Loading:</span> <span className="font-medium text-[#2A2F35]">{fpd.prosthetic_loading_date}</span></div>
                  )}
                  {fpd.consultant_prosthodontist && (
                    <div><span className="text-[#5C6773]">Consultant:</span> <span className="font-medium text-[#2A2F35]">{fpd.consultant_prosthodontist}</span></div>
                  )}
                  {fpd.lab_name && (
                    <div><span className="text-[#5C6773]">Lab:</span> <span className="font-medium text-[#2A2F35]">{fpd.lab_name}</span></div>
                  )}
                </div>
                {fpd.clinical_notes && <p className="mt-2 text-xs text-[#5C6773] italic">{fpd.clinical_notes}</p>}
                {fpd.warranty_image && (
                  <div className="mt-2">
                    <a href={`${API_URL}/api/files/${fpd.warranty_image}`} target="_blank" rel="noopener noreferrer">
                      <img src={`${API_URL}/api/files/${fpd.warranty_image}`} alt="Warranty card"
                        className="h-16 w-auto rounded border border-[#E5E5E2] object-cover hover:opacity-80 transition-opacity cursor-pointer" />
                    </a>
                    <p className="text-[10px] text-[#9CA3AF] mt-0.5">Warranty card</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default PatientDetails;
