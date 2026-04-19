import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MagnifyingGlass } from '@phosphor-icons/react';
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

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.phone.includes(searchQuery) ||
    (patient.email && patient.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    required
                    data-testid="patient-phone-input"
                    className="mt-1"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => (
            <Link
              key={patient.id || patient._id}
              to={`/patients/${patient.id || patient._id}`}
              data-testid={`patient-card-${patient.id || patient._id}`}
              className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm hover:shadow-md hover:border-[#82A098] transition-all duration-200"
            >
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
              <h3 className="text-lg font-medium text-[#2A2F35] mb-1">{patient.name}</h3>
              <p className="text-sm text-[#5C6773] mb-3">{patient.age} years old</p>
              <div className="space-y-1">
                <p className="text-sm text-[#5C6773]">{patient.phone}</p>
                {patient.email && <p className="text-sm text-[#5C6773]">{patient.email}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Patients;