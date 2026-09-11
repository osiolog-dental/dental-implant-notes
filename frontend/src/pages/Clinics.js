import { useState, useEffect } from 'react';
import { Plus, Buildings, MapPin, Phone, EnvelopeSimple, PencilSimple, Trash, MagicWand, X } from '@phosphor-icons/react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getClinics, createClinic, updateClinic, deleteClinic } from '../api/clinics';
import client from '../api/client';

const INITIAL_FORM = {
  gmaps_link: '',
  name: '',
  address: '',
  phone: '',
  alternate_phone: '',
  email: '',
  latitude: null,
  longitude: null,
};

const Clinics = () => {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClinic, setEditingClinic] = useState(null);
  const [formData, setFormData] = useState({ ...INITIAL_FORM });
  const [resolvingMaps, setResolvingMaps] = useState(false);
  const [detailsClinic, setDetailsClinic] = useState(null);

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

  const openAdd = () => {
    setEditingClinic(null);
    setFormData({ ...INITIAL_FORM });
    setIsDialogOpen(true);
  };

  const openEdit = (clinic) => {
    setEditingClinic(clinic);
    setFormData({
      gmaps_link: clinic.gmaps_link || '',
      name: clinic.name || '',
      address: clinic.address || '',
      phone: clinic.phone || '',
      alternate_phone: clinic.alternate_phone || '',
      email: clinic.email || '',
      latitude: clinic.latitude ?? null,
      longitude: clinic.longitude ?? null,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (clinic) => {
    if (!window.confirm(`Delete "${clinic.name}"? This can't be undone.`)) return;
    try {
      await deleteClinic(clinic.id || clinic._id);
      toast.success('Clinic deleted');
      setDetailsClinic(null);
      fetchClinics();
    } catch {
      toast.error('Failed to delete clinic');
    }
  };

  const handleResolveMaps = async () => {
    if (!formData.gmaps_link.trim()) return;
    setResolvingMaps(true);
    try {
      const res = await client.post('/api/clinics/resolve-maps-link', { url: formData.gmaps_link.trim() });
      const { name, address, latitude, longitude } = res.data;
      setFormData(prev => ({
        ...prev,
        name: name || prev.name,
        address: address || prev.address,
        latitude: latitude ?? prev.latitude,
        longitude: longitude ?? prev.longitude,
      }));
      toast.success('Fetched details from Google Maps — review before saving');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not read that Maps link');
    } finally {
      setResolvingMaps(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClinic) {
        await updateClinic(editingClinic.id || editingClinic._id, formData);
        toast.success('Clinic updated');
      } else {
        await createClinic(formData);
        toast.success('Clinic added successfully');
      }
      setIsDialogOpen(false);
      setFormData({ ...INITIAL_FORM });
      setEditingClinic(null);
      fetchClinics();
    } catch (error) {
      toast.error(editingClinic ? 'Failed to update clinic' : 'Failed to add clinic');
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

        <Button
          onClick={openAdd}
          data-testid="add-clinic-button"
          className="bg-[#82A098] hover:bg-[#6B8A82] text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-colors duration-200"
        >
          <Plus size={20} weight="bold" />
          Add Clinic
        </Button>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                {editingClinic ? 'Edit Clinic' : 'Add New Clinic'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="bg-[#F9F9F8] border border-[#E5E5E2] rounded-lg p-3">
                <Label htmlFor="gmaps_link">Google Maps Link</Label>
                <div className="flex items-end gap-2 mt-1">
                  <Input
                    id="gmaps_link"
                    value={formData.gmaps_link}
                    onChange={(e) => setFormData({ ...formData, gmaps_link: e.target.value })}
                    data-testid="clinic-gmaps-input"
                    className="bg-white"
                    placeholder="Paste a Google Maps link to this clinic"
                  />
                  <Button
                    type="button"
                    onClick={handleResolveMaps}
                    disabled={!formData.gmaps_link.trim() || resolvingMaps}
                    data-testid="clinic-fetch-maps-button"
                    className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white shrink-0"
                  >
                    <MagicWand size={16} weight="bold" className="mr-1.5" /> {resolvingMaps ? 'Fetching...' : 'Fetch Details'}
                  </Button>
                </div>
                <p className="text-[10px] text-[#9CA3AF] mt-1">Fills in the name and address below — you can still edit them.</p>
              </div>

              <div>
                <Label htmlFor="name">Clinic Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                  data-testid="clinic-address-input"
                  className="mt-1"
                  placeholder="123 Main St, City, State ZIP"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    data-testid="clinic-phone-input"
                    className="mt-1"
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div>
                  <Label htmlFor="alternate_phone">Alternate Mobile</Label>
                  <Input
                    id="alternate_phone"
                    type="tel"
                    value={formData.alternate_phone}
                    onChange={(e) => setFormData({ ...formData, alternate_phone: e.target.value })}
                    data-testid="clinic-alternate-phone-input"
                    className="mt-1"
                    placeholder="+91 98765 00000"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                {editingClinic ? 'Save Changes' : 'Add Clinic'}
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
            onClick={openAdd}
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
              onClick={() => setDetailsClinic(clinic)}
              className="bg-white border border-[#E5E5E2] rounded-xl p-6 shadow-sm hover:shadow-md hover:border-[#82A098] transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-12 h-12 bg-[#7B9EBB]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Buildings size={24} weight="fill" className="text-[#7B9EBB]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-[#2A2F35] truncate">{clinic.name}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => openEdit(clinic)} data-testid={`edit-clinic-${clinic.id || clinic._id}`} className="p-1.5 rounded-md hover:bg-[#F0F0EE] text-[#5C6773] hover:text-[#82A098] transition-colors" title="Edit">
                    <PencilSimple size={16} weight="bold" />
                  </button>
                  <button onClick={() => handleDelete(clinic)} data-testid={`delete-clinic-${clinic.id || clinic._id}`} className="p-1.5 rounded-md hover:bg-red-50 text-[#5C6773] hover:text-red-500 transition-colors" title="Delete">
                    <Trash size={16} weight="bold" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm text-[#5C6773]">
                  <MapPin size={16} className="flex-shrink-0 mt-0.5" />
                  <span className="truncate">{clinic.address || '—'}</span>
                </div>
                {clinic.phone && <p className="text-sm text-[#5C6773]">{clinic.phone}</p>}
                {clinic.email && (
                  <p className="text-sm text-[#82A098]">{clinic.email}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details popup */}
      {detailsClinic && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDetailsClinic(null)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 bg-[#7B9EBB]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Buildings size={24} weight="fill" className="text-[#7B9EBB]" />
                </div>
                <h3 className="text-xl font-semibold text-[#2A2F35] truncate">{detailsClinic.name}</h3>
              </div>
              <button onClick={() => setDetailsClinic(null)} className="p-1.5 rounded-md hover:bg-[#F0F0EE] text-[#5C6773] shrink-0">
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <MapPin size={16} className="text-[#5C6773] flex-shrink-0 mt-0.5" />
                <span className="text-[#2A2F35]">{detailsClinic.address || 'No address on file'}</span>
              </div>
              {detailsClinic.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-[#5C6773] flex-shrink-0" />
                  <span className="text-[#2A2F35]">{detailsClinic.phone}</span>
                </div>
              )}
              {detailsClinic.alternate_phone && (
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-[#5C6773] flex-shrink-0" />
                  <span className="text-[#2A2F35]">{detailsClinic.alternate_phone} <span className="text-[#9CA3AF]">(alternate)</span></span>
                </div>
              )}
              {detailsClinic.email && (
                <div className="flex items-center gap-2">
                  <EnvelopeSimple size={16} className="text-[#5C6773] flex-shrink-0" />
                  <span className="text-[#2A2F35]">{detailsClinic.email}</span>
                </div>
              )}
              {detailsClinic.gmaps_link && (
                <a href={detailsClinic.gmaps_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[#2563EB] hover:underline">
                  <MapPin size={14} weight="bold" /> View on Google Maps
                </a>
              )}
            </div>

            <div className="flex items-center gap-2 mt-6">
              <Button variant="outline" onClick={() => { setDetailsClinic(null); openEdit(detailsClinic); }} className="flex-1">
                <PencilSimple size={16} weight="bold" className="mr-1.5" /> Edit
              </Button>
              <Button variant="outline" onClick={() => handleDelete(detailsClinic)} className="flex-1 text-red-600 hover:text-red-600 hover:bg-red-50 border-red-200">
                <Trash size={16} weight="bold" className="mr-1.5" /> Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clinics;
