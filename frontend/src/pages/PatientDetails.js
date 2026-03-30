import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Camera } from '@phosphor-icons/react';
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

const FDI_CHART = {
  upper: [
    [18, 17, 16, 15, 14, 13, 12, 11],
    [21, 22, 23, 24, 25, 26, 27, 28]
  ],
  lower: [
    [48, 47, 46, 45, 44, 43, 42, 41],
    [31, 32, 33, 34, 35, 36, 37, 38]
  ]
};

const selectClass = "w-full px-3 py-2 bg-white border border-[#E5E5E2] rounded-md text-sm focus:ring-2 focus:ring-[#82A098] focus:outline-none";
const checkboxClass = "w-4 h-4 text-[#82A098] border-[#E5E5E2] rounded focus:ring-[#82A098]";

const INITIAL_IMPLANT = {
  tooth_number: '',
  implant_type: 'Single',
  brand: '',
  size: '',
  length: '',
  insertion_torque: '',
  connection_type: 'Internal Hex',
  surgical_approach: 'Immediate Placement',
  bone_graft: '',
  sinus_lift_type: '',
  is_pterygoid: false,
  is_zygomatic: false,
  is_subperiosteal: false,
  notes: '',
  clinical_notes: '',
  surgery_date: '',
  prosthetic_loading_date: '',
  implant_outcome: 'Pending',
  diameter_mm: '',
  length_mm: '',
  osseointegration_success: false,
  peri_implant_health: false,
  site_specific_notes: '',
  complication_remarks: '',
  arch: 'Upper',
  jaw_region: 'Anterior',
  implant_system: '',
  cover_screw: false,
  healing_abutment: false,
  membrane_used: false,
  isq_value: '',
  follow_up_date: '',
  surgeon_name: '',
  clinic_id: '',
};

const INITIAL_FPD = {
  tooth_numbers: [],
  prosthetic_loading_date: '',
  crown_count: 'Single',
  connected_implant_ids: [],
  crown_type: 'Screw Retained',
  crown_material: 'Zirconia',
  clinical_notes: '',
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
  const [clinics, setClinics] = useState([]);

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
  };

  const handleToothClick = (toothNumber) => {
    setSelectedTooth(toothNumber);
    const arch = toothNumber <= 28 ? 'Upper' : 'Lower';
    const tens = Math.floor(toothNumber / 10);
    const jaw_region = ([1, 2, 3, 4].includes(tens) && (toothNumber % 10) <= 3) ? 'Anterior' : 'Posterior';
    setFormData({ ...formData, tooth_number: toothNumber, arch, jaw_region });
    setIsImplantOpen(true);
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
      await axios.post(`${API_URL}/api/implants`, payload, { withCredentials: true });
      toast.success('Implant record added');
      setIsImplantOpen(false);
      setFormData({ ...INITIAL_IMPLANT });
      setSelectedTooth(null);
      fetchAll();
    } catch (error) {
      toast.error('Failed to add implant');
    }
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
      await axios.post(`${API_URL}/api/fpd-records`, { ...fpdData, patient_id: id }, { withCredentials: true });
      toast.success('FPD record added');
      setIsFpdOpen(false);
      setFpdData({ ...INITIAL_FPD });
      fetchAll();
    } catch (error) {
      toast.error('Failed to add FPD record');
    }
  };

  const getToothStatus = (toothNumber) => implants.find(imp => imp.tooth_number === toothNumber);

  const getDaysRemaining = (osseoDate) => {
    if (!osseoDate) return 0;
    const days = Math.ceil((new Date(osseoDate) - new Date()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

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
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-[#82A098] flex items-center justify-center text-white font-medium text-xl shrink-0">
            {patient.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-[#2A2F35] tracking-tight" data-testid="patient-name">
              {patient.name}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-[#5C6773]">
              <span>{patient.age} years</span>
              <span>•</span>
              <span>{patient.gender}</span>
              <span>•</span>
              <span>{patient.phone}</span>
            </div>
            {patient.medical_history && (
              <p className="mt-2 text-sm text-[#5C6773]">
                <span className="font-medium text-[#2A2F35]">History:</span> {patient.medical_history}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* FDI Dental Chart */}
      <div className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-medium text-[#2A2F35] mb-4">FDI Dental Chart</h2>

        {/* Buttons row */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Add Implant Dialog */}
          <Dialog open={isImplantOpen} onOpenChange={(open) => {
            setIsImplantOpen(open);
            if (!open) { setFormData({ ...INITIAL_IMPLANT }); setSelectedTooth(null); }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="add-implant-button" className="bg-[#82A098] hover:bg-[#6B8A82] text-white">
                <Plus size={18} weight="bold" className="mr-1.5" /> Add Implant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">
                  {selectedTooth ? `Add Implant - Tooth #${selectedTooth}` : 'Add Implant Record'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitImplant} className="space-y-4 mt-2">
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

                {/* Row 2: Size, Length, Diameter, Length_mm */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Size *</Label>
                    <Input value={formData.size} onChange={(e) => updateField('size', e.target.value)} required data-testid="size-input" placeholder="e.g., 4.2x10" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Length *</Label>
                    <Input value={formData.length} onChange={(e) => updateField('length', e.target.value)} required data-testid="length-input" placeholder="e.g., 10mm" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Diameter (mm)</Label>
                    <Input type="number" step="0.1" value={formData.diameter_mm} onChange={(e) => updateField('diameter_mm', e.target.value)} placeholder="4.5" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Length (mm)</Label>
                    <Input type="number" step="0.1" value={formData.length_mm} onChange={(e) => updateField('length_mm', e.target.value)} placeholder="10.0" className="mt-1" />
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
                    <Input value={formData.surgeon_name} onChange={(e) => updateField('surgeon_name', e.target.value)} placeholder="Operating surgeon" className="mt-1" />
                  </div>
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
                  Add Implant Record
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* FPD Log Sheet Dialog */}
          <Dialog open={isFpdOpen} onOpenChange={(open) => {
            setIsFpdOpen(open);
            if (!open) setFpdData({ ...INITIAL_FPD });
          }}>
            <DialogTrigger asChild>
              <Button data-testid="add-fpd-button" variant="outline" className="border-[#82A098] text-[#82A098] hover:bg-[#82A098]/10">
                <Plus size={18} weight="bold" className="mr-1.5" /> FPD Log Sheet
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">FPD Log Sheet</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitFpd} className="space-y-4 mt-2">
                {/* FDI Mini Chart for tooth selection */}
                <div>
                  <Label className="text-xs mb-2 block">Select Teeth (click to toggle)</Label>
                  <div className="space-y-3 bg-[#F9F9F8] p-3 rounded-lg border border-[#E5E5E2]">
                    <p className="text-xs text-[#5C6773] text-center uppercase tracking-wider">Upper Jaw</p>
                    <div className="flex justify-center gap-4 overflow-x-auto pb-1">
                      {FDI_CHART.upper.map((quadrant, qi) => (
                        <div key={qi} className="flex gap-1">
                          {quadrant.map(tooth => (
                            <button type="button" key={tooth} onClick={() => toggleFpdTooth(tooth)}
                              data-testid={`fpd-tooth-${tooth}`}
                              className={`w-9 h-9 rounded text-xs font-medium transition-all ${
                                fpdData.tooth_numbers.includes(tooth)
                                  ? 'bg-[#3B82F6] text-white border-[#3B82F6]'
                                  : 'bg-white border border-[#E5E5E2] text-[#2A2F35] hover:border-[#3B82F6]'
                              }`}
                            >{tooth}</button>
                          ))}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-[#5C6773] text-center uppercase tracking-wider">Lower Jaw</p>
                    <div className="flex justify-center gap-4 overflow-x-auto pb-1">
                      {FDI_CHART.lower.map((quadrant, qi) => (
                        <div key={qi} className="flex gap-1">
                          {quadrant.map(tooth => (
                            <button type="button" key={tooth} onClick={() => toggleFpdTooth(tooth)}
                              data-testid={`fpd-tooth-${tooth}`}
                              className={`w-9 h-9 rounded text-xs font-medium transition-all ${
                                fpdData.tooth_numbers.includes(tooth)
                                  ? 'bg-[#3B82F6] text-white border-[#3B82F6]'
                                  : 'bg-white border border-[#E5E5E2] text-[#2A2F35] hover:border-[#3B82F6]'
                              }`}
                            >{tooth}</button>
                          ))}
                        </div>
                      ))}
                    </div>
                    {fpdData.tooth_numbers.length > 0 && (
                      <p className="text-xs text-[#2A2F35] font-medium text-center">
                        Selected: {fpdData.tooth_numbers.join(', ')}
                      </p>
                    )}
                  </div>
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

                <div>
                  <Label className="text-xs">Clinical Notes</Label>
                  <textarea value={fpdData.clinical_notes} onChange={(e) => setFpdData({ ...fpdData, clinical_notes: e.target.value })} data-testid="fpd-clinical-notes" rows={3} className={`mt-1 ${selectClass}`} placeholder="Prosthetic observations, adjustments..." />
                </div>

                <Button type="submit" data-testid="submit-fpd-button" className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white">
                  Add FPD Record
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Dental Chart Grid */}
        <div className="space-y-6">
          <div>
            <p className="text-xs text-[#5C6773] mb-2 text-center uppercase tracking-wider">Upper Jaw</p>
            <div className="overflow-x-auto pb-2">
              <div className="flex justify-center gap-6 min-w-max">
                {FDI_CHART.upper.map((quadrant, qIndex) => (
                  <div key={qIndex} className="flex gap-1.5">
                    {quadrant.map((tooth) => {
                      const implant = getToothStatus(tooth);
                      return (
                        <button key={tooth} onClick={() => handleToothClick(tooth)} data-testid={`tooth-${tooth}`}
                          className={`w-11 h-11 rounded-lg border-2 flex items-center justify-center text-sm font-medium transition-all ${
                            implant
                              ? 'bg-[#82A098] border-[#82A098] text-white hover:bg-[#6B8A82]'
                              : 'bg-white border-[#E5E5E2] text-[#2A2F35] hover:border-[#82A098] hover:bg-[#F9F9F8]'
                          }`}
                        >{tooth}</button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs text-[#5C6773] mb-2 text-center uppercase tracking-wider">Lower Jaw</p>
            <div className="overflow-x-auto pb-2">
              <div className="flex justify-center gap-6 min-w-max">
                {FDI_CHART.lower.map((quadrant, qIndex) => (
                  <div key={qIndex} className="flex gap-1.5">
                    {quadrant.map((tooth) => {
                      const implant = getToothStatus(tooth);
                      return (
                        <button key={tooth} onClick={() => handleToothClick(tooth)} data-testid={`tooth-${tooth}`}
                          className={`w-11 h-11 rounded-lg border-2 flex items-center justify-center text-sm font-medium transition-all ${
                            implant
                              ? 'bg-[#82A098] border-[#82A098] text-white hover:bg-[#6B8A82]'
                              : 'bg-white border-[#E5E5E2] text-[#2A2F35] hover:border-[#82A098] hover:bg-[#F9F9F8]'
                          }`}
                        >{tooth}</button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 text-xs text-[#5C6773]">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border-2 border-[#E5E5E2] rounded"></div>
            <span>Healthy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#82A098] border-2 border-[#82A098] rounded"></div>
            <span>Has Implant</span>
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
                      <div className="w-10 h-10 bg-[#82A098] rounded-lg flex items-center justify-center text-white font-medium text-sm">
                        {implant.tooth_number}
                      </div>
                      <div>
                        <h3 className="font-medium text-[#2A2F35] text-sm">{implant.implant_type} Implant</h3>
                        <p className="text-xs text-[#5C6773]">{implant.brand}{implant.implant_system ? ` - ${implant.implant_system}` : ''}</p>
                        {implant.case_number && <p className="text-xs text-[#5C6773]">Case: {implant.case_number}</p>}
                      </div>
                    </div>
                    {daysRemaining > 0 && (
                      <div className="text-right">
                        <p className="text-sm font-medium text-[#E8A76C]">{daysRemaining} days</p>
                        <p className="text-xs text-[#5C6773]">until osseointegration</p>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div><span className="text-[#5C6773]">Size:</span> <span className="font-medium text-[#2A2F35]">{implant.size}</span></div>
                    <div><span className="text-[#5C6773]">Length:</span> <span className="font-medium text-[#2A2F35]">{implant.length}</span></div>
                    <div><span className="text-[#5C6773]">Torque:</span> <span className="font-medium text-[#2A2F35]">{implant.insertion_torque || 'N/A'} Ncm</span></div>
                    <div><span className="text-[#5C6773]">Connection:</span> <span className="font-medium text-[#2A2F35]">{implant.connection_type}</span></div>
                  </div>
                  {implant.notes && <p className="mt-2 text-xs text-[#5C6773] italic">{implant.notes}</p>}
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
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div><span className="text-[#5C6773]">Crown:</span> <span className="font-medium text-[#2A2F35]">{fpd.crown_count}</span></div>
                  <div><span className="text-[#5C6773]">Type:</span> <span className="font-medium text-[#2A2F35]">{fpd.crown_type}</span></div>
                  <div><span className="text-[#5C6773]">Material:</span> <span className="font-medium text-[#2A2F35]">{fpd.crown_material}</span></div>
                  {fpd.prosthetic_loading_date && (
                    <div><span className="text-[#5C6773]">Loading:</span> <span className="font-medium text-[#2A2F35]">{fpd.prosthetic_loading_date}</span></div>
                  )}
                </div>
                {fpd.clinical_notes && <p className="mt-2 text-xs text-[#5C6773] italic">{fpd.clinical_notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDetails;
