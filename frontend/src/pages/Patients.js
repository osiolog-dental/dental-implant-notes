import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MagnifyingGlass, Trash } from '@phosphor-icons/react';
import { toast } from 'sonner';
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
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';
import client from '../api/client';
import { getPatients, createPatient } from '../api/patients';

const Patients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    phone: '',
    email: '',
    address: '',
    medical_history: ''
  });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const data = await getPatients();
      setPatients(data.items ?? data);
    } catch (error) {
      toast.error('Failed to fetch patients');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createPatient({ ...formData, age: parseInt(formData.age) });
      toast.success('Patient added successfully');
      setIsDialogOpen(false);
      setFormData({
        name: '',
        age: '',
        gender: 'Male',
        phone: '',
        email: '',
        address: '',
        medical_history: ''
      });
      fetchPatients();
    } catch (error) {
      toast.error('Failed to add patient');
    }
  };

  const handleConfirmDeletePatient = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await client.delete(`/api/patients/${deleteTarget.id || deleteTarget._id}`);
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
      fetchPatients();
    } catch {
      toast.error('Failed to delete patient');
    } finally {
      setDeleting(false);
    }
  };

  const matchesSearch = (patient, rawQuery) => {
    const query = rawQuery.trim().toLowerCase();
    if (!query) return true;
    if (patient.phone && patient.phone.includes(rawQuery.trim())) return true;
    if (patient.email && patient.email.toLowerCase().includes(query)) return true;

    const nameLower = patient.name.toLowerCase();
    if (nameLower.includes(query)) return true;

    // Word-by-word match: every word typed just needs to appear somewhere in the
    // name, in any order — handles irregular spacing/word order in older records
    // (e.g. searching "lakshmi padmavathi" should still find "K Lakshmi Padmavathi").
    const nameWords = nameLower.split(/\s+/).filter(Boolean);
    const queryWords = query.split(/\s+/).filter(Boolean);
    return queryWords.every(qw => nameWords.some(nw => nw.includes(qw)));
  };

  const filteredPatients = patients.filter(patient => matchesSearch(patient, searchQuery));

  const sortedPatients = [...filteredPatients].sort((a, b) => a.name.localeCompare(b.name));

  const groupedPatients = {};
  sortedPatients.forEach(patient => {
    const first = patient.name.trim().charAt(0).toUpperCase();
    const letter = /[A-Z]/.test(first) ? first : '#';
    if (!groupedPatients[letter]) groupedPatients[letter] = [];
    groupedPatients[letter].push(patient);
  });
  const letterKeys = Object.keys(groupedPatients).sort();
  const availableLetters = new Set(letterKeys);
  const JUMP_LETTERS = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

  const scrollToLetter = (letter, smooth = true) => {
    document.getElementById(`patients-letter-${letter}`)?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  };

  // A-Z edge strip: dragging along it live-scrolls; a plain tap (no movement)
  // opens the bigger letter-grid picker instead, since the strip's own letters
  // are too small to tap precisely (matches the native Contacts app pattern).
  const sidebarRef = useRef(null);
  const pressStateRef = useRef({ pressed: false, dragging: false, startY: 0 });
  const [showLetterPicker, setShowLetterPicker] = useState(false);

  const letterFromClientY = (clientY) => {
    const el = sidebarRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const relY = clientY - rect.top;
    const idx = Math.min(JUMP_LETTERS.length - 1, Math.max(0, Math.floor((relY / rect.height) * JUMP_LETTERS.length)));
    return JUMP_LETTERS[idx];
  };

  const handleSidebarPointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pressStateRef.current = { pressed: true, dragging: false, startY: e.clientY };
  };

  const handleSidebarPointerMove = (e) => {
    const state = pressStateRef.current;
    if (!state.pressed) return;
    if (Math.abs(e.clientY - state.startY) > 6) state.dragging = true;
    if (state.dragging) {
      const letter = letterFromClientY(e.clientY);
      if (letter && availableLetters.has(letter)) scrollToLetter(letter, false);
    }
  };

  const handleSidebarPointerUp = () => {
    const state = pressStateRef.current;
    if (state.pressed && !state.dragging) setShowLetterPicker(true);
    pressStateRef.current = { pressed: false, dragging: false, startY: 0 };
  };

  return (
    <div className="p-4 md:p-8" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h1 className="text-4xl font-semibold text-[#2A2F35] tracking-tight" style={{ fontFamily: 'Work Sans, sans-serif' }}>
            Patients
          </h1>
          <p className="text-[#5C6773] mt-2">Manage your patient records</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              data-testid="add-patient-button"
              className="bg-[#82A098] hover:bg-[#6B8A82] text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-colors duration-200"
            >
              <Plus size={20} weight="bold" />
              Add Patient
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                Add New Patient
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    data-testid="patient-name-input"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="age">Age *</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({...formData, age: e.target.value})}
                    required
                    data-testid="patient-age-input"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gender">Gender *</Label>
                  <select
                    id="gender"
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                    data-testid="patient-gender-select"
                    className="mt-1 w-full px-3 py-2 bg-white border border-[#E5E5E2] rounded-md focus:ring-2 focus:ring-[#82A098] focus:outline-none"
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="phone">Phone <span className="text-[#9CA3AF] font-normal text-xs">(optional)</span></Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    data-testid="patient-phone-input"
                    className="mt-1"
                    placeholder="Can be added later"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  data-testid="patient-email-input"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  data-testid="patient-address-input"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="medical_history">Medical History</Label>
                <textarea
                  id="medical_history"
                  value={formData.medical_history}
                  onChange={(e) => setFormData({...formData, medical_history: e.target.value})}
                  data-testid="patient-medical-history-input"
                  rows={3}
                  className="mt-1 w-full px-3 py-2 bg-white border border-[#E5E5E2] rounded-md focus:ring-2 focus:ring-[#82A098] focus:outline-none"
                />
              </div>

              <Button 
                type="submit" 
                data-testid="submit-patient-button"
                className="w-full bg-[#82A098] hover:bg-[#6B8A82] text-white"
              >
                Add Patient
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="mb-6 relative">
        <MagnifyingGlass 
          size={20} 
          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#5C6773]" 
        />
        <input
          type="text"
          placeholder="Search patients by name, phone, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="search-patients-input"
          className="w-full pl-12 pr-4 py-3 bg-white border border-[#E5E5E2] rounded-xl focus:ring-2 focus:ring-[#82A098] focus:outline-none focus:ring-offset-1 text-[#2A2F35] transition-colors duration-200"
        />
      </div>

      {/* Patient List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#82A098] mx-auto"></div>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="text-center py-12 bg-white border border-[#E5E5E2] rounded-xl">
          <img
            src="https://images.pexels.com/photos/6502343/pexels-photo-6502343.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
            alt="No patients"
            className="w-48 h-48 object-cover rounded-xl mx-auto mb-4 opacity-50"
          />
          <p className="text-[#5C6773]">No patients found</p>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0 space-y-6">
            {letterKeys.map(letter => (
              <div key={letter} id={`patients-letter-${letter}`}>
                <h2 className="text-sm font-bold text-[#82A098] mb-3 sticky top-0 bg-[#F9F9F8] py-1 z-10">{letter}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupedPatients[letter].map((patient) => (
                    <div key={patient.id || patient._id} className="relative group">
                      <Link
                        to={`/patients/${patient.id || patient._id}`}
                        data-testid={`patient-card-${patient.id || patient._id}`}
                        className="flex md:block items-center gap-3 bg-white border border-[#E5E5E2] rounded-xl px-3 py-2.5 md:p-6 shadow-sm hover:shadow-md hover:border-[#82A098] transition-all duration-200"
                      >
                        {/* Compact row — mobile only */}
                        <div className="flex md:hidden items-center gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-[#82A098] flex items-center justify-center text-white font-medium text-sm shrink-0">
                            {patient.name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-medium text-[#2A2F35] truncate">{patient.name}</h3>
                            <p className="text-xs text-[#5C6773] truncate">
                              {patient.age ? `${patient.age}y` : ''}{patient.age && patient.gender ? ' · ' : ''}{patient.gender || ''}
                            </p>
                          </div>
                        </div>

                        {/* Full card — tablet/desktop */}
                        <div className="hidden md:block w-full">
                          <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 rounded-full bg-[#82A098] flex items-center justify-center text-white font-medium text-lg overflow-hidden shrink-0">
                              {patient.name.charAt(0)}
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              patient.gender === 'Male' ? 'bg-blue-100 text-blue-700' :
                              patient.gender === 'Female' ? 'bg-pink-100 text-pink-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {patient.gender}
                            </span>
                          </div>
                          <h3 className="text-lg font-medium text-[#2A2F35] mb-1 pr-6">{patient.name}</h3>
                          <p className="text-sm text-[#5C6773] mb-3">{patient.age} years old</p>
                          <div className="space-y-1">
                            <p className="text-sm text-[#5C6773]">{patient.phone}</p>
                            {patient.email && <p className="text-sm text-[#5C6773]">{patient.email}</p>}
                          </div>
                        </div>
                      </Link>
                      <button
                        data-testid={`delete-patient-${patient.id || patient._id}`}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(patient); }}
                        className="absolute top-2 right-2 md:top-4 md:right-4 p-1.5 rounded-md bg-white/80 hover:bg-red-50 text-[#9CA3AF] hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 transition-all"
                        title="Delete patient"
                      >
                        <Trash size={16} weight="bold" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* A-Z fast-scroll strip — pinned to the screen edge, like a phone's Contacts app.
              Drag up/down to live-scroll; a plain tap opens the bigger letter picker below. */}
          <div
            ref={sidebarRef}
            onPointerDown={handleSidebarPointerDown}
            onPointerMove={handleSidebarPointerMove}
            onPointerUp={handleSidebarPointerUp}
            onPointerCancel={handleSidebarPointerUp}
            style={{ touchAction: 'none' }}
            className="fixed right-0.5 top-24 bottom-20 z-30 flex flex-col justify-center items-center gap-[1px] select-none"
            data-testid="patients-alpha-jump"
          >
            {JUMP_LETTERS.map(letter => (
              <span
                key={letter}
                data-testid={`alpha-jump-${letter}`}
                className={`text-[11px] leading-[13px] w-5 text-center font-semibold ${
                  availableLetters.has(letter) ? 'text-[#82A098]' : 'text-[#D1D5DB]'
                }`}
              >
                {letter}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Letter picker popup — bigger, easier-to-tap boxes, opened by tapping the edge strip */}
      {showLetterPicker && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
          onClick={() => setShowLetterPicker(false)}
          data-testid="letter-picker-overlay"
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-4 grid grid-cols-6 gap-2 max-w-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {JUMP_LETTERS.map(letter => (
              <button
                key={letter}
                type="button"
                disabled={!availableLetters.has(letter)}
                onClick={() => { scrollToLetter(letter); setShowLetterPicker(false); }}
                data-testid={`letter-picker-${letter}`}
                className={`w-9 h-9 rounded-lg text-sm font-semibold flex items-center justify-center transition-colors ${
                  availableLetters.has(letter)
                    ? 'bg-[#EEF4F3] text-[#82A098] hover:bg-[#DDF0EC] cursor-pointer'
                    : 'bg-[#F5F5F4] text-[#D1D5DB] cursor-default'
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={handleConfirmDeletePatient}
        deleting={deleting}
        title={`Delete ${deleteTarget?.name || 'patient'}?`}
        description="This will remove this patient from your active patient list, including their implant, FPD, and abutment records."
        testIdPrefix="confirm-delete-patient"
      />
    </div>
  );
};

export default Patients;