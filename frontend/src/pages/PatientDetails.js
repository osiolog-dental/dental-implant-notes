import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import { toast } from 'sonner';
import { ArrowLeft, Camera, Stack } from '@phosphor-icons/react';
import { generatePatientPDF } from '../components/PatientReportPDF';
import DentalChart from '../components/DentalChart';
import BulkImplantModal from '../components/BulkImplantModal';
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';
import PatientInfoHeader from '../components/PatientInfoHeader';
import EditPatientModal from '../components/EditPatientModal';
import MissingTeethDialog from '../components/MissingTeethDialog';
import FailedImplantDialog from '../components/FailedImplantDialog';
import ImplantFormModal from '../components/ImplantFormModal';
import FpdFormModal from '../components/FpdFormModal';
import AbutmentFormModal from '../components/AbutmentFormModal';
import OverdentureFormModal from '../components/OverdentureFormModal';
import FullMouthRehabFormModal from '../components/FullMouthRehabFormModal';
import ImplantRecordsSection from '../components/ImplantRecordsSection';
import FpdRecordsSection from '../components/FpdRecordsSection';
import AbutmentRecordsSection from '../components/AbutmentRecordsSection';
import OverdentureRecordsSection from '../components/OverdentureRecordsSection';
import FullMouthRehabRecordsSection from '../components/FullMouthRehabRecordsSection';

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
  peri_implant_health: '',
  clinical_notes: '',
  notes: '',
  site_specific_notes: '',
  complication_remarks: '',
  arch: 'Upper',
  jaw_region: 'Anterior',
  tag_image: null,
};

const INITIAL_FPD = {
  tooth_numbers: [],
  tooth_roles: {},      // { [toothNumber]: 'abutment' | 'pontic' }
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

const INITIAL_ABUTMENT = {
  tooth_number: '',
  abutment_type: 'Stock Abutment Straight',
  connected_implant_ids: [],
  placement_date: '',
  clinical_notes: '',
  clinic_id: '',
};

const INITIAL_OVERDENTURE = {
  tooth_numbers: [],
  attachment_type: 'Ball Attachment',
  connected_implant_ids: [],
  has_bar: false,
  bar_material: '',
  prosthetic_loading_date: '',
  clinical_notes: '',
  clinic_id: '',
};

const INITIAL_FULL_MOUTH_REHAB = {
  rehab_type: 'Upper FMR',
  connected_implant_ids: [],
  prosthetic_loading_date: '',
  clinical_notes: '',
  clinic_id: '',
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
  const [missingConfirm, setMissingConfirm] = useState(null); // { toothNumber, action: 'mark'|'revert' }
  const [abutmentRecords, setAbutmentRecords] = useState([]);
  const [overdentureRecords, setOverdentureRecords] = useState([]);
  const [fullMouthRehabRecords, setFullMouthRehabRecords] = useState([]);
  const [isAbutmentOpen, setIsAbutmentOpen] = useState(false);
  const [isOverdentureOpen, setIsOverdentureOpen] = useState(false);
  const [isFullMouthRehabOpen, setIsFullMouthRehabOpen] = useState(false);
  const [abutmentData, setAbutmentData] = useState({ ...INITIAL_ABUTMENT });
  const [overdentureData, setOverdentureData] = useState({ ...INITIAL_OVERDENTURE });
  const [rehabData, setRehabData] = useState({ ...INITIAL_FULL_MOUTH_REHAB });
  const [editingAbutmentId, setEditingAbutmentId] = useState(null);
  const [editingOverdentureId, setEditingOverdentureId] = useState(null);
  const [editingRehabId, setEditingRehabId] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [toothConditions, setToothConditions] = useState({});
  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);
  const [editPatientData, setEditPatientData] = useState({});
  const [editLog, setEditLog] = useState([]);
  const [showEditLog, setShowEditLog] = useState(false);
  const [pdfProgress, setPdfProgress] = useState('');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [isBulkImplantOpen, setIsBulkImplantOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'implant'|'fpd'|'abutment'|'overdenture'|'full_mouth_rehab', id, label }
  const [deleting, setDeleting] = useState(false);
  const [failedImplantConfirm, setFailedImplantConfirm] = useState(null); // { toothNumber }

  const DELETE_ENDPOINTS = {
    implant: (recId) => `/api/implants/${recId}`,
    fpd: (recId) => `/api/fpd-records/${recId}`,
    abutment: (recId) => `/api/abutment-records/${recId}`,
    overdenture: (recId) => `/api/overdenture-records/${recId}`,
    full_mouth_rehab: (recId) => `/api/full-mouth-rehab-records/${recId}`,
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await client.delete(DELETE_ENDPOINTS[deleteTarget.type](deleteTarget.id));
      toast.success(`${deleteTarget.label} deleted`);
      setDeleteTarget(null);
      fetchAll();
    } catch {
      toast.error(`Failed to delete ${deleteTarget.label.toLowerCase()}`);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAll = async () => {
    try {
      const [patientRes, implantsRes, fpdRes, clinicsRes, abutmentRes, overdentureRes, rehabRes] = await Promise.all([
        client.get(`/api/patients/${id}`),
        client.get(`/api/implants?patient_id=${id}`),
        client.get(`/api/fpd-records?patient_id=${id}`),
        client.get(`/api/clinics`),
        client.get(`/api/abutment-records?patient_id=${id}`),
        client.get(`/api/overdenture-records?patient_id=${id}`),
        client.get(`/api/full-mouth-rehab-records?patient_id=${id}`),
      ]);
      setPatient(patientRes.data);
      setImplants(implantsRes.data);
      setFpdRecords(fpdRes.data);
      setClinics(clinicsRes.data);
      setAbutmentRecords(abutmentRes.data);
      setOverdentureRecords(overdentureRes.data);
      setFullMouthRehabRecords(rehabRes.data);
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

      // Clone SVG so we can mutate it without affecting the page
      const clone = svg.cloneNode(true);

      // Get the SVG's viewBox dimensions for canvas sizing
      const vb = svg.viewBox?.baseVal;
      const svgW = vb?.width  || svg.clientWidth  || 1050;
      const svgH = vb?.height || svg.clientHeight || 400;

      // Inline all external <image> hrefs as base64 so canvas renders them
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

      // Serialize and render to canvas
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

      // Fetch extra vault photos
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
    // Open dialog with clicked tooth pre-selected, show all teeth for multi-select
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
    // If an implant already exists on this tooth, ask if the previous one failed
    const existing = implants.find(i => i.tooth_number === toothNumber);
    if (existing) {
      setFailedImplantConfirm({ toothNumber });
      return;
    }
    doOpenImplantLog(toothNumber);
  };

  const doOpenImplantLog = (toothNumber) => {
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

  const openFullMouthRehabLog = () => {
    setRehabData({ ...INITIAL_FULL_MOUTH_REHAB });
    setEditingRehabId(null);
    setIsFullMouthRehabOpen(true);
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

  const handleSubmitFullMouthRehab = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...rehabData, patient_id: id };
      if (editingRehabId) {
        await client.put(`/api/full-mouth-rehab-records/${editingRehabId}`, payload);
        toast.success('Full mouth rehab record updated');
      } else {
        await client.post(`/api/full-mouth-rehab-records`, payload);
        toast.success('Full mouth rehab record added');
      }
      setIsFullMouthRehabOpen(false);
      setRehabData({ ...INITIAL_FULL_MOUTH_REHAB });
      setEditingRehabId(null);
      fetchAll();
    } catch (error) {
      toast.error(editingRehabId ? 'Failed to update full mouth rehab record' : 'Failed to add full mouth rehab record');
    }
  };

  const openEditFullMouthRehab = (rec) => {
    setRehabData({
      rehab_type: rec.rehab_type || 'Upper FMR',
      connected_implant_ids: rec.connected_implant_ids || [],
      prosthetic_loading_date: rec.prosthetic_loading_date || '',
      clinical_notes: rec.clinical_notes || '',
      clinic_id: rec.clinic_id || '',
    });
    setEditingRehabId(rec.id);
    setIsFullMouthRehabOpen(true);
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
      delete payload.warranty_image; // stored via separate upload endpoint
      let fpdId = editingFpdId;
      if (editingFpdId) {
        await client.patch(`/api/fpd-records/${editingFpdId}`, payload);
        toast.success('FPD record updated');
      } else {
        const res = await client.post(`/api/fpd-records`, payload);
        fpdId = res.data?.id;
        toast.success('FPD record added');
      }
      // Upload warranty image if selected
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
      tooth_roles: fpd.tooth_roles || {},
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

  // Dialog open/close handlers — reset form state when a dialog is dismissed
  const handleImplantOpenChange = (open) => {
    setIsImplantOpen(open);
    if (!open) { setFormData({ ...INITIAL_IMPLANT }); setSelectedTooth(null); setEditingImplantId(null); }
  };

  const handleFpdOpenChange = (open) => {
    setIsFpdOpen(open);
    if (!open) { setFpdData({ ...INITIAL_FPD }); setEditingFpdId(null); setWarrantyFile(null); }
  };

  const handleAbutmentOpenChange = (open) => {
    setIsAbutmentOpen(open);
    if (!open) { setAbutmentData({ ...INITIAL_ABUTMENT }); setEditingAbutmentId(null); }
  };

  const handleOverdentureOpenChange = (open) => {
    setIsOverdentureOpen(open);
    if (!open) { setOverdentureData({ ...INITIAL_OVERDENTURE }); setEditingOverdentureId(null); }
  };

  const handleFullMouthRehabOpenChange = (open) => {
    setIsFullMouthRehabOpen(open);
    if (!open) { setRehabData({ ...INITIAL_FULL_MOUTH_REHAB }); setEditingRehabId(null); }
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
      <PatientInfoHeader
        patient={patient}
        patientId={id}
        editLog={editLog}
        showEditLog={showEditLog}
        onToggleEditLog={() => setShowEditLog(v => !v)}
        onEditPatient={openEditPatient}
        onExportPDF={handleExportPDF}
        generatingPdf={generatingPdf}
        pdfProgress={pdfProgress}
        onPhotoUploaded={(pic) => setPatient(prev => ({ ...prev, profile_picture: pic }))}
      />

      {/* Missing Tooth Confirmation Dialog — multi-select */}
      <MissingTeethDialog
        missingConfirm={missingConfirm}
        onToggleTooth={toggleMissingTooth}
        onConfirm={confirmMissingAction}
        onClose={() => setMissingConfirm(null)}
      />

      {/* Edit Patient Dialog */}
      <EditPatientModal
        open={isEditPatientOpen}
        onOpenChange={setIsEditPatientOpen}
        editPatientData={editPatientData}
        setEditPatientData={setEditPatientData}
        onSubmit={handleSavePatient}
      />

      {/* FDI Dental Chart */}
      <div className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-[#2A2F35]">FDI Dental Chart</h2>
          <button
            data-testid="open-bulk-implant-button"
            onClick={() => setIsBulkImplantOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#82A098] border border-[#82A098]/30 rounded-lg hover:bg-[#82A098]/5 transition-colors"
          >
            <Stack size={14} weight="bold" /> Add Multiple Implants
          </button>
        </div>

        <BulkImplantModal
          open={isBulkImplantOpen}
          onOpenChange={setIsBulkImplantOpen}
          patientId={id}
          clinics={clinics}
          onSaved={fetchAll}
        />

        <ConfirmDeleteDialog
          open={!!deleteTarget}
          onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
          onConfirm={handleConfirmDelete}
          deleting={deleting}
          title={`Delete ${deleteTarget?.label || 'record'}?`}
          description="This will permanently remove this record from the patient's history. This cannot be undone."
        />

        {/* Failed Implant Confirmation Dialog */}
        {failedImplantConfirm && (
          <FailedImplantDialog
            failedImplantConfirm={failedImplantConfirm}
            onClose={() => setFailedImplantConfirm(null)}
            onConfirm={() => {
              const tn = failedImplantConfirm.toothNumber;
              setFailedImplantConfirm(null);
              doOpenImplantLog(tn);
            }}
          />
        )}

        {/* Implant Dialog (opened via chart tooth click) */}
        <div>
          <ImplantFormModal
            open={isImplantOpen}
            onOpenChange={handleImplantOpenChange}
            formData={formData}
            updateField={updateField}
            onSubmit={handleSubmitImplant}
            onTagAutoFill={handleTagAutoFill}
            editingImplantId={editingImplantId}
            selectedTooth={selectedTooth}
            clinics={clinics}
          />

          {/* FPD Log Sheet Dialog (opened via chart tooth click) */}
          <FpdFormModal
            open={isFpdOpen}
            onOpenChange={handleFpdOpenChange}
            fpdData={fpdData}
            setFpdData={setFpdData}
            onSubmit={handleSubmitFpd}
            onToothToggle={toggleFpdTooth}
            editingFpdId={editingFpdId}
            implants={implants}
            fpdRecords={fpdRecords}
            toothConditions={toothConditions}
            warrantyFile={warrantyFile}
            setWarrantyFile={setWarrantyFile}
          />
        </div>

        {/* Abutment Log Dialog */}
        <AbutmentFormModal
          open={isAbutmentOpen}
          onOpenChange={handleAbutmentOpenChange}
          abutmentData={abutmentData}
          setAbutmentData={setAbutmentData}
          onSubmit={handleSubmitAbutment}
          editingAbutmentId={editingAbutmentId}
          implants={implants}
        />

        {/* Overdenture Log Dialog */}
        <OverdentureFormModal
          open={isOverdentureOpen}
          onOpenChange={handleOverdentureOpenChange}
          overdentureData={overdentureData}
          setOverdentureData={setOverdentureData}
          onSubmit={handleSubmitOverdenture}
          editingOverdentureId={editingOverdentureId}
          implants={implants}
          onToothToggle={toggleOverdentureTooth}
        />

        {/* Full Mouth Rehab Log Dialog */}
        <FullMouthRehabFormModal
          open={isFullMouthRehabOpen}
          onOpenChange={handleFullMouthRehabOpenChange}
          rehabData={rehabData}
          setRehabData={setRehabData}
          onSubmit={handleSubmitFullMouthRehab}
          editingRehabId={editingRehabId}
          implants={implants}
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
              onFullMouthRehabLog={openFullMouthRehabLog}
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
      <ImplantRecordsSection
        implants={implants}
        onEdit={openEditImplant}
        onDelete={setDeleteTarget}
        onUpdate={fetchAll}
      />

      {/* FPD Records */}
      <FpdRecordsSection
        fpdRecords={fpdRecords}
        onEdit={openEditFpd}
        onDelete={setDeleteTarget}
      />

      {/* Abutment Records */}
      <AbutmentRecordsSection
        abutmentRecords={abutmentRecords}
        implants={implants}
        onEdit={openEditAbutment}
        onDelete={setDeleteTarget}
      />

      {/* Overdenture Records */}
      <OverdentureRecordsSection
        overdentureRecords={overdentureRecords}
        onEdit={openEditOverdenture}
        onDelete={setDeleteTarget}
      />

      {/* Full Mouth Rehab Records */}
      <FullMouthRehabRecordsSection
        rehabRecords={fullMouthRehabRecords}
        onEdit={openEditFullMouthRehab}
        onDelete={setDeleteTarget}
      />

    </div>
  );
};

export default PatientDetails;
