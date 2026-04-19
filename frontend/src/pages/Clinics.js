import { useState, useEffect } from 'react';
import { Plus, Buildings, MapPin } from '@phosphor-icons/react';
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
import { getClinics, createClinic } from '../api/clinics';

const Clinics = () => {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    fetchClinics();
  }, []);

  const fetchClinics = async () => {
    try {
      const data = await getClinics();
      setClinics(data.items ?? data);
    } catch (error) {
      toast.error('Failed to fetch clinics');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createClinic(formData);
      toast.success('Clinic added successfully');
      setIsDialogOpen(false);
      setFormData({ name: '', address: '', phone: '', email: '' });
      fetchClinics();
    } catch (error) {
      toast.error('Failed to add clinic');
    }
  };

  return (
    <div className="p-4 md:p-8" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h1 className="text-4xl font-semibold text-[#2A2F35] tracking-tight" style={{ fontFamily: 'Work Sans, sans-serif' }}>
            Clinics
          </h1>
          <p className="text-[#5C6773] mt-2">Manage your practice locations</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              data-testid="add-clinic-button"
              className="bg-[#82A098] hover:bg-[#6B8A82] text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-colors duration-200"
            >
              <Plus size={20} weight="bold" />
              Add Clinic
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                Add New Clinic
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name">Clinic Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  data-testid="clinic-name-input"
                  className="mt-1"
                  placeholder="Downtown Dental Clinic"
                />
              </div>

              <div>
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  required
                  data-testid="clinic-address-input"
                  className="mt-1"
                  placeholder="123 Main St, City, State ZIP"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  required
                  data-testid="clinic-phone-input"
                  className="mt-1"
                  placeholder="+1 234 567 8900"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  data-testid="clinic-email-input"
                  className="mt-1"
                  placeholder="info@clinic.com"
                />
              </div>

              <Button 
                type="submit" 
                data-testid="submit-clinic-button"
                className="w-full bg-[#82A098] hover:bg-[#6B8A82] text-white"
              >
                Add Clinic
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Clinic List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#82A098] mx-auto"></div>
        </div>
      ) : clinics.length === 0 ? (
        <div className="text-center py-12 bg-white border border-[#E5E5E2] rounded-xl">
          <Buildings size={64} className="mx-auto text-[#E5E5E2] mb-4" weight="duotone" />
          <p className="text-[#5C6773] mb-4">No clinics added yet</p>
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="bg-[#82A098] hover:bg-[#6B8A82] text-white"
          >
            <Plus size={20} weight="bold" className="mr-2" />
            Add Your First Clinic
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clinics.map((clinic) => (
            <div
              key={clinic.id || clinic._id}
              data-testid={`clinic-card-${clinic.id || clinic._id}`}
              className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm hover:shadow-md hover:border-[#82A098] transition-all duration-200"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-[#7B9EBB]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Buildings size={24} weight="fill" className="text-[#7B9EBB]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-medium text-[#2A2F35] mb-1 truncate">{clinic.name}</h3>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm text-[#5C6773]">
                  <MapPin size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{clinic.address}</span>
                </div>
                <p className="text-sm text-[#5C6773]">{clinic.phone}</p>
                {clinic.email && (
                  <p className="text-sm text-[#82A098]">{clinic.email}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Clinics;