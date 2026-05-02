import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import { toast } from 'sonner';
import { ArrowLeft, Camera, Tag, PencilSimple, ClockCounterClockwise, FilePdf } from '@phosphor-icons/react';
import { generatePatientPDF } from '../components/PatientReportPDF';
import ImplantProgressTracker from '../components/ImplantProgressTracker';
import DentalChart from '../components/DentalChart';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ImplantModal, { INITIAL_IMPLANT } from '../components/ImplantModal';
import FPDModal, { INITIAL_FPD } from '../components/FPDModal';
import AbutmentModal, { INITIAL_ABUTMENT } from '../components/AbutmentModal';
import OverdentureModal, { INITIAL_OVERDENTURE } from '../components/OverdentureModal';


const API_URL = process.env.REACT_APP_BACKEND_URL;

const selectClass = "w-full px-3 py-2 bg-white border border-[#E5E5E2] rounded-md text-sm focus:ring-2 focus:ring-[#82A098] focus:outline-none";
const checkboxClass = "w-4 h-4 text-[#82A098] border-[#E5E5E2] rounded focus:ring-[#82A098]";

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
  const [missingConfirm, setMissingConfirm] = useState(null);
  const [abutmentRecords, setAbutmentRecords] = useState([]);
  const [overdentureRecords, setOverdentureRecords] = useState([]);
  const [isAbutmentOpen, setIsAbutmentOpen] = useState(false);
  const [isOverdentureOpen, setIsOverdentureOpen] = useState(false);
  const [abutmentData, setAbutmentData] = useState({ ...INITIAL_ABUTMENT });
  const [overdentureData, setOverdentureData] = useState({ ...INITIAL_OVERDENTURE });
  const [editingAbutmentId, setEditingAbutmentId] = useState(null);
  const [editingOverdentureId, setEditingOverdentureId] = useState(null);
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
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAll = async () => {
    try {
      const [patientRes, implantsRes, fpdRes, clinicsRes, abutmentRes, overdentureRes] = await Promise.all([
        client.get(`/api/patients/${id}`),
        client.get(`/api/implants?patient_id=${id}`),
        client.get(`/api/fpd-records?patient_id=${id}`),
        client.get(`/api/clinics`),
        client.get(`/api/abutment-records?patient_id=${id}`),
        client.get(`/api/overdenture-records?patient_id=${id}`),
      ]);
      setPatient(patientRes.data);
      setImplants(implantsRes.data);
      setFpdRecords(fpdRes.data);
      setClinics(clinicsRes.data);
      setAbutmentRecords(abutmentRes.data);
      setOverdentureRecords(overdentureRes.data);
      if (patientRes.data.tooth_conditions) {
        setToothConditions(patientRes.data.tooth_conditions);
      }
    } catch (error) {
      toast.error('Failed to fetch patient details');
      navigate('/patients');
    } finally {
      setLoading(false);
    }
    // Load edit log separately — don't crash the page if it fails
    try {
      const logRes = await client.get(`/api/patients/${id}/edit-log`);
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
      await client.patch(`/api/patients/${id}`, {
        ...editPatientData,
        age: parseInt(editPatientData.age),
      });
      toast.success('Patient details updated');
      setIsEditPatientOpen(false);
      fetchAll();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to update patient');
    }
  };

  const captureDentalChartImage = async () => {
    try {
      const svg = document.querySelector('[aria-label="FDI Dental Chart"]');
      if (!svg) return null;

      const clone = svg.cloneNode(true);

      const vb = svg.viewBox?.baseVal;
      const svgW = vb?.width  || svg.clientWidth  || 1050;
      const svgH = vb?.height || svg.clientHeight || 400;

      const imageEls = clone.querySelectorAll('image');
      await Promise.all(Array.from(imageEls).map(async (imgEl) => {
        const href = imgEl.getAttribute('href') || imgEl.getAttribute('xlink:href');
        if (!href || href.startsWith('data:')) return;
        try {
          const res = await fetch(href);
          const blob = await res.blob();
          const b64 = await new Promise((res2) => {
            const fr = new FileReader();
            fr.onload = () => res2(fr.result);
            fr.readAsDataURL(blob);
          });
          imgEl.setAttribute('href', b64);
          imgEl.removeAttribute('xlink:href');
        } catch { /* skip failed images */ }
      }));

      const svgData = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      return await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const scale = 2;
          const canvas = document.createElement('canvas');
          canvas.width  = svgW * scale;
          canvas.height = svgH * scale;
          const ctx = canvas.getContext('2d');
          ctx.scale(scale, scale);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, svgW, svgH);
          ctx.drawImage(img, 0, 0, svgW, svgH);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
        img.src = url;
      });
    } catch {
      return null;
    }
  };

  const handleExportPDF = async () => {
    setGeneratingPdf(true);
    setPdfProgress('Preparing report...');
    try {
      setPdfProgress('Capturing dental chart...');
      const chartImage = await captureDentalChartImage();

      const extraRes = await client.get(`/api/patients/${id}/photos`);
      await generatePatientPDF({
        patient,
        implants,
        fpdRecords,
        extraPhotos: extraRes.data,
        clinics,
        chartImage,
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
    const current = toothConditions[toothNumber]?.condition;
    setMissingConfirm({
      action: current === 'missing' ? 'revert' : 'mark',
      selectedTeeth: [toothNumber],
    });
  };

  const confirmMissingAction = async () => {
    if (!missingConfirm || missingConfirm.selectedTeeth.length === 0) return;
    const { action, selectedTeeth } = missingConfirm;
    const newCondition = action === 'mark' ? 'missing' : 'healthy';
    const updated = { ...toothConditions };
    selectedTeeth.forEach(tn => { updated[tn] = { condition: newCondition }; });
    setToothConditions(updated);
    setMissingConfirm(null);
    try {
      await client.patch(`/api/patients/${id}/tooth-conditions`,
        { tooth_conditions: updated }
      );
      const count = selectedTeeth.length;
      toast.success(action === 'mark'
        ? `${count} tooth${count > 1 ? 'teeth' : ''} marked as missing`
        : `${count} tooth${count > 1 ? 'teeth' : ''} restored`);
    } catch {
      toast.error('Failed to save tooth status');
    }
  };

  const toggleMissingTooth = (tn) => {
    setMissingConfirm(prev => {
      const exists = prev.selectedTeeth.includes(tn);
      return {
        ...prev,
        selectedTeeth: exists
          ? prev.selectedTeeth.filter(t => t !== tn)
          : [...prev.selectedTeeth, tn].sort((a, b) => a - b),
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

  const openAbutmentLog = (toothNumber) => {
    setAbutmentData({ ...INITIAL_ABUTMENT, tooth_number: toothNumber || '' });
    setEditingAbutmentId(null);
    setIsAbutmentOpen(true);
  };

  const openOverdentureLog = () => {
    setOverdentureData({ ...INITIAL_OVERDENTURE });
    setEditingOverdentureId(null);
    setIsOverdentureOpen(true);
  };

  const handleSubmitAbutment = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...abutmentData, patient_id: id, tooth_number: parseInt(abutmentData.tooth_number) };
      if (editingAbutmentId) {
        await client.put(`/api/abutment-records/${editingAbutmentId}`, payload);
        toast.success('Abutment record updated');
      } else {
        await client.post(`/api/abutment-records`, payload);
        toast.success('Abutment record added');
      }
      setIsAbutmentOpen(false);
      setAbutmentData({ ...INITIAL_ABUTMENT });
      setEditingAbutmentId(null);
      fetchAll();
    } catch (error) {
      toast.error(editingAbutmentId ? 'Failed to update abutment record' : 'Failed to add abutment record');
    }
  };

  const openEditAbutment = (rec) => {
    setAbutmentData({
      tooth_number: rec.tooth_number?.toString() || '',
      abutment_type: rec.abutment_type || 'Stock Abutment Straight',
      connected_implant_ids: rec.connected_implant_ids || [],
      placement_date: rec.placement_date || '',
      clinical_notes: rec.clinical_notes || '',
      clinic_id: rec.clinic_id || '',
    });
    setEditingAbutmentId(rec.id);
    setIsAbutmentOpen(true);
  };

  const handleSubmitOverdenture = async (e) => {
    e.preventDefault();
    if (overdentureData.tooth_numbers.length === 0) {
      toast.error('Select at least one implant site');
      return;
    }
    try {
      const payload = { ...overdentureData, patient_id: id };
      if (editingOverdentureId) {
        await client.put(`/api/overdenture-records/${editingOverdentureId}`, payload);
        toast.success('Overdenture record updated');
      } else {
        await client.post(`/api/overdenture-records`, payload);
        toast.success('Overdenture record added');
      }
      setIsOverdentureOpen(false);
      setOverdentureData({ ...INITIAL_OVERDENTURE });
      setEditingOverdentureId(null);
      fetchAll();
    } catch (error) {
      toast.error(editingOverdentureId ? 'Failed to update overdenture record' : 'Failed to add overdenture record');
    }
  };

  const openEditOverdenture = (rec) => {
    setOverdentureData({
      tooth_numbers: rec.tooth_numbers || [],
      attachment_type: rec.attachment_type || 'Ball Attachment',
      connected_implant_ids: rec.connected_implant_ids || [],
      has_bar: rec.has_bar || false,
      bar_material: rec.bar_material || '',
      prosthetic_loading_date: rec.prosthetic_loading_date || '',
      clinical_notes: rec.clinical_notes || '',
      clinic_id: rec.clinic_id || '',
    });
    setEditingOverdentureId(rec.id);
    setIsOverdentureOpen(true);
  };

  const toggleOverdentureTooth = (tooth) => {
    setOverdentureData(prev => {
      const exists = prev.tooth_numbers.includes(tooth);
      return {
        ...prev,
        tooth_numbers: exists
          ? prev.tooth_numbers.filter(t => t !== tooth)
          : [...prev.tooth_numbers, tooth].sort((a, b) => a - b)
      };
    });
  };

  const handleSubmitImplant = async (e) => {
    e.preventDefault();
    try {
      // eslint-disable-next-line no-unused-vars
      const { site_specific_notes, complication_remarks, ...cleanForm } = formData;
      const payload = {
        ...cleanForm,
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
        peri_implant_health: formData.peri_implant_health || null,
      };
      if (editingImplantId) {
        await client.patch(`/api/implants/${editingImplantId}`, payload);
        toast.success('Implant record updated');
      } else {
        await client.post(`/api/implants`, payload);
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
      peri_implant_health: implant.peri_implant_health || '',
      clinical_notes: implant.clinical_notes || '',
      notes: implant.notes || '',
      site_specific_notes: '',
      complication_remarks: '',
      arch: implant.arch || 'Upper',
      jaw_region: implant.jaw_region || 'Anterior',
      tag_image: implant.tag_image || null,
    });
    setEditingImplantId(implant.id);
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
      delete payload.warranty_image;
      let fpdId = editingFpdId;
      if (editingFpdId) {
        await client.patch(`/api/fpd-records/${editingFpdId}`, payload);
        toast.success('FPD record updated');
      } else {
        const res = await client.post(`/api/fpd-records`, payload);
        fpdId = res.data?.id;
        toast.success('FPD record added');
      }
      if (warrantyFile && fpdId) {
        try {
          const form = new FormData();
          form.append('file', warrantyFile);
          await client.post(`/api/fpd-records/${fpdId}/warranty-image`, form, {
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
    setEditingFpdId(fpd.id);
    setIsFpdOpen(true);
  };

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
                const res = await client.post(`/api/patients/${id}/profile-picture`, form, {
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

          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl md:text-3xl font-semibold text-[#2A2F35] tracking-tight" data-testid="patient-name">
                {patient.name}
              </h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#5C6773]">
                <span>{patient.age} years</span>
                <span>•</span>
                <span>{patient.gender}</span>
              </div>
              <div className="flex gap-2 flex-wrap mt-1">
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
                <button
                  data-testid="show-edit-log-btn"
                  onClick={() => setShowEditLog(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#5C6773] border border-[#E5E5E2] rounded-lg hover:border-[#C27E70] hover:text-[#C27E70] transition-colors"
                >
                  <ClockCounterClockwise size={13} weight="bold" /> History ({editLog.length})
                </button>
              </div>
            </div>

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

        {showEditLog && (
          <div className="mt-5 pt-4 border-t border-[#F0EDE8]">
            <p className="text-xs font-semibold text-[#C27E70] uppercase tracking-wide mb-3">Change History</p>
            {editLog.length === 0 ? (
              <p className="text-xs text-[#9CA3AF]">No changes recorded yet.</p>
            ) : (
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {editLog.map((entry, i) => (
                  <div key={i} className="text-xs text-[#5C6773] flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#C27E70] mt-1 shrink-0" />
                    <div>
                      <span className="font-medium text-[#2A2F35] capitalize">{entry.action}</span>
                      {' · '}
                      <span>{new Date(entry.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Missing Tooth Confirmation Dialog */}
      <Dialog open={!!missingConfirm} onOpenChange={(open) => { if (!open) setMissingConfirm(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#2A2F35]">
              {missingConfirm?.action === 'mark' ? '⚠️ Mark Teeth as Missing' : '↩️ Restore Teeth'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-xs text-[#5C6773] mb-3">
              {missingConfirm?.action === 'mark'
                ? 'Select all teeth to mark as missing. They will be saved to the patient record.'
                : 'Select all missing teeth to restore to healthy status.'}
            </p>
            <div className="mb-2">
              <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide mb-1">Upper Arch</p>
              <div className="flex flex-wrap gap-1.5">
                {[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28].map(tn => (
                  <button
                    key={tn}
                    type="button"
                    data-testid={`missing-tooth-${tn}`}
                    onClick={() => toggleMissingTooth(tn)}
                    className={`w-9 h-9 text-xs font-medium rounded-md border transition-colors ${
                      missingConfirm?.selectedTeeth?.includes(tn)
                        ? missingConfirm.action === 'mark'
                          ? 'bg-red-500 text-white border-red-500'
                          : 'bg-[#82A098] text-white border-[#82A098]'
                        : 'bg-white text-[#2A2F35] border-[#E5E5E2] hover:border-[#82A098]'
                    }`}
                  >{tn}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide mb-1">Lower Arch</p>
              <div className="flex flex-wrap gap-1.5">
                {[48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38].map(tn => (
                  <button
                    key={tn}
                    type="button"
                    data-testid={`missing-tooth-${tn}`}
                    onClick={() => toggleMissingTooth(tn)}
                    className={`w-9 h-9 text-xs font-medium rounded-md border transition-colors ${
                      missingConfirm?.selectedTeeth?.includes(tn)
                        ? missingConfirm.action === 'mark'
                          ? 'bg-red-500 text-white border-red-500'
                          : 'bg-[#82A098] text-white border-[#82A098]'
                        : 'bg-white text-[#2A2F35] border-[#E5E5E2] hover:border-[#82A098]'
                    }`}
                  >{tn}</button>
                ))}
              </div>
            </div>
            {missingConfirm?.selectedTeeth?.length > 0 && (
              <p className="mt-2 text-xs text-[#5C6773]">
                Selected: <span className="font-medium text-[#2A2F35]">{missingConfirm.selectedTeeth.join(', ')}</span>
              </p>
            )}
          </div>
          <div className="flex gap-3 pt-1">
            <Button
              data-testid="confirm-missing-btn"
              onClick={confirmMissingAction}
              disabled={!missingConfirm?.selectedTeeth?.length}
              className={`flex-1 text-white ${missingConfirm?.action === 'mark' ? 'bg-red-500 hover:bg-red-600' : 'bg-[#82A098] hover:bg-[#6B8A82]'}`}
            >
              {missingConfirm?.action === 'mark'
                ? `Mark ${missingConfirm?.selectedTeeth?.length || 0} as Missing`
                : `Restore ${missingConfirm?.selectedTeeth?.length || 0} Teeth`}
            </Button>
            <Button
              data-testid="cancel-missing-btn"
              variant="outline"
              onClick={() => setMissingConfirm(null)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

        <ImplantModal
          isOpen={isImplantOpen}
          onOpenChange={(open) => {
            setIsImplantOpen(open);
            if (!open) { setFormData({ ...INITIAL_IMPLANT }); setSelectedTooth(null); setEditingImplantId(null); }
          }}
          formData={formData}
          updateField={updateField}
          editingImplantId={editingImplantId}
          selectedTooth={selectedTooth}
          clinics={clinics}
          onSubmit={handleSubmitImplant}
          onTagAutoFill={handleTagAutoFill}
        />

        <FPDModal
          isOpen={isFpdOpen}
          onOpenChange={(open) => {
            setIsFpdOpen(open);
            if (!open) { setFpdData({ ...INITIAL_FPD }); setEditingFpdId(null); setWarrantyFile(null); }
          }}
          fpdData={fpdData}
          setFpdData={setFpdData}
          editingFpdId={editingFpdId}
          warrantyFile={warrantyFile}
          setWarrantyFile={setWarrantyFile}
          implants={implants}
          fpdRecords={fpdRecords}
          onSubmit={handleSubmitFpd}
          onToothToggle={toggleFpdTooth}
        />

        <AbutmentModal
          isOpen={isAbutmentOpen}
          onOpenChange={(open) => {
            setIsAbutmentOpen(open);
            if (!open) { setAbutmentData({ ...INITIAL_ABUTMENT }); setEditingAbutmentId(null); }
          }}
          abutmentData={abutmentData}
          setAbutmentData={setAbutmentData}
          editingAbutmentId={editingAbutmentId}
          implants={implants}
          onSubmit={handleSubmitAbutment}
        />

        <OverdentureModal
          isOpen={isOverdentureOpen}
          onOpenChange={(open) => {
            setIsOverdentureOpen(open);
            if (!open) { setOverdentureData({ ...INITIAL_OVERDENTURE }); setEditingOverdentureId(null); }
          }}
          overdentureData={overdentureData}
          setOverdentureData={setOverdentureData}
          editingOverdentureId={editingOverdentureId}
          implants={implants}
          onSubmit={handleSubmitOverdenture}
          onToothToggle={toggleOverdentureTooth}
        />

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
              onAbutmentLog={openAbutmentLog}
              onOverdentureLog={openOverdentureLog}
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
              // Compute osseointegration countdown from surgery_date + 90 days
              const daysRemaining = (() => {
                if (!implant.surgery_date) return 0;
                const osseoEnd = new Date(implant.surgery_date);
                osseoEnd.setDate(osseoEnd.getDate() + 90);
                return getDaysRemaining(osseoEnd.toISOString().split('T')[0]);
              })();
              return (
                <div key={implant.id} data-testid={`implant-record-${implant.id}`} className="border border-[#E5E5E2] rounded-lg p-4 hover:border-[#82A098] transition-all">
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
                        data-testid={`edit-implant-${implant.id}`}
                        onClick={() => openEditImplant(implant)}
                        className="p-1.5 rounded-md hover:bg-[#F0F0EE] text-[#5C6773] hover:text-[#82A098] transition-colors"
                        title="Edit implant record"
                      >
                        <PencilSimple size={15} weight="bold" />
                      </button>
                      {implant.tag_image ? (
                        <div className="relative group" data-testid={`tag-thumb-${implant.id}`}>
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
        <div className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-lg font-medium text-[#2A2F35] mb-4">
            FPD Records ({fpdRecords.length})
          </h2>
          <div className="space-y-3">
            {fpdRecords.map((fpd) => (
              <div key={fpd.id} data-testid={`fpd-record-${fpd.id}`} className="border border-[#E5E5E2] rounded-lg p-4 hover:border-[#3B82F6] transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-[#2A2F35] text-sm">
                      FPD - Teeth: {fpd.tooth_numbers?.join(', ')}
                    </h3>
                    <p className="text-xs text-[#5C6773]">{fpd.case_number}</p>
                  </div>
                  <button
                    data-testid={`edit-fpd-${fpd.id}`}
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

      {/* Abutment Records */}
      {abutmentRecords.length > 0 && (
        <div className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-lg font-medium text-[#2A2F35] mb-4" style={{ color: '#D4925A' }}>
            Abutment Records ({abutmentRecords.length})
          </h2>
          <div className="space-y-3">
            {abutmentRecords.map((rec) => (
              <div key={rec.id} data-testid={`abutment-record-${rec.id}`} className="border border-[#E5E5E2] rounded-lg p-4 hover:border-[#E8A76C] transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-medium text-sm flex-shrink-0" style={{ backgroundColor: '#E8A76C' }}>
                      {rec.tooth_number}
                    </div>
                    <div>
                      <h3 className="font-medium text-[#2A2F35] text-sm">{rec.abutment_type}</h3>
                      {rec.placement_date && <p className="text-xs text-[#5C6773]">Placed: {rec.placement_date}</p>}
                    </div>
                  </div>
                  <button
                    data-testid={`edit-abutment-${rec.id}`}
                    onClick={() => openEditAbutment(rec)}
                    className="p-1.5 rounded-md hover:bg-[#F0F0EE] text-[#5C6773] hover:text-[#E8A76C] transition-colors flex-shrink-0"
                    title="Edit abutment record"
                  >
                    <PencilSimple size={15} weight="bold" />
                  </button>
                </div>
                {rec.connected_implant_ids?.length > 0 && (
                  <p className="text-xs text-[#5C6773] mb-1">
                    Connected to implant{rec.connected_implant_ids.length > 1 ? 's' : ''}: {rec.connected_implant_ids.map(iid => {
                      const imp = implants.find(i => i.id === iid);
                      return imp ? `Tooth #${imp.tooth_number}${imp.brand ? ` (${imp.brand})` : ''}` : null;
                    }).filter(Boolean).join(', ')}
                  </p>
                )}
                {rec.clinical_notes && <p className="text-xs text-[#5C6773] italic">{rec.clinical_notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overdenture Records */}
      {overdentureRecords.length > 0 && (
        <div className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-lg font-medium mb-4" style={{ color: '#7C3AED' }}>
            Overdenture Records ({overdentureRecords.length})
          </h2>
          <div className="space-y-3">
            {overdentureRecords.map((rec) => (
              <div key={rec.id} data-testid={`overdenture-record-${rec.id}`} className="border rounded-lg p-4 transition-all" style={{ borderColor: '#C4B5FD' }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-[#2A2F35] text-sm">
                      Overdenture — {rec.attachment_type}
                    </h3>
                    <p className="text-xs text-[#5C6773]">Teeth: {rec.tooth_numbers?.join(', ')}</p>
                  </div>
                  <button
                    data-testid={`edit-overdenture-${rec.id}`}
                    onClick={() => openEditOverdenture(rec)}
                    className="p-1.5 rounded-md hover:bg-[#F0F0EE] text-[#5C6773] transition-colors flex-shrink-0"
                    title="Edit overdenture record"
                  >
                    <PencilSimple size={15} weight="bold" />
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {rec.has_bar && (
                    <div><span className="text-[#5C6773]">Bar:</span> <span className="font-medium" style={{ color: '#7C3AED' }}>{rec.bar_material || 'Yes'}</span></div>
                  )}
                  {rec.prosthetic_loading_date && (
                    <div><span className="text-[#5C6773]">Loading:</span> <span className="font-medium text-[#2A2F35]">{rec.prosthetic_loading_date}</span></div>
                  )}
                  {rec.connected_implant_ids?.length > 0 && (
                    <div><span className="text-[#5C6773]">Implants connected:</span> <span className="font-medium text-[#2A2F35]">{rec.connected_implant_ids.length}</span></div>
                  )}
                </div>
                {rec.clinical_notes && <p className="mt-2 text-xs text-[#5C6773] italic">{rec.clinical_notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default PatientDetails;
