import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowLeft, Upload, Plus, FolderOpen, Image, X, Trash } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const MAX_EXTRA_PHOTOS = 12;

const PHOTO_VIEWS = [
  { id: 'front_centric',          label: 'Front - Centric Occlusion' },
  { id: 'front_protrusive',       label: 'Front - Protrusive' },
  { id: 'right_centric',          label: 'Right - Centric Occlusion' },
  { id: 'left_centric',           label: 'Left - Centric Occlusion' },
  { id: 'front_right_exclusive',  label: 'Front - Right Exclusive' },
  { id: 'front_left_exclusive',   label: 'Front - Left Exclusive' },
  { id: 'maxillary_occlusal',     label: 'Maxillary Occlusal' },
  { id: 'mandibular_occlusal',    label: 'Mandibular Occlusal' },
];

const RADIOGRAPH_VIEWS = [
  { id: 'pre_surgical',              label: 'Pre-Surgical' },
  { id: 'immediate_post_surgical',   label: 'Immediate Post-Surgical' },
  { id: 'immediate_post_prosthetic', label: 'Immediate Post-Prosthetic' },
  { id: 'one_year_followup',         label: '1 Year Follow-Up' },
];

const MedicalVault = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const extraInputRef = useRef();

  const [patient, setPatient] = useState(null);
  const [allPhotos, setAllPhotos] = useState([]);
  const [allRadiographs, setAllRadiographs] = useState([]);
  const [extraPhotos, setExtraPhotos] = useState([]);      // patient-level extra photos
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadType, setUploadType] = useState('photo');
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploadingFiles, setUploadingFiles] = useState({});
  const [uploadingExtra, setUploadingExtra] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => { fetchData(); }, [patientId]);

  const fetchData = async () => {
    try {
      const [patientRes, implantsRes, extraRes] = await Promise.all([
        axios.get(`${API_URL}/api/patients/${patientId}`, { withCredentials: true }),
        axios.get(`${API_URL}/api/implants?patient_id=${patientId}`, { withCredentials: true }),
        axios.get(`${API_URL}/api/patients/${patientId}/photos`, { withCredentials: true }),
      ]);
      setPatient(patientRes.data);
      setExtraPhotos(extraRes.data);

      const photos = [];
      const radiographs = [];
      implantsRes.data.forEach(implant => {
        (implant.clinical_photos || []).forEach(photo => {
          photos.push({ ...photo, implant_id: implant._id, tooth_number: implant.tooth_number, date: photo.uploaded_at || implant.created_at });
        });
        (implant.radiographs || []).forEach(radio => {
          radiographs.push({ ...radio, implant_id: implant._id, tooth_number: implant.tooth_number, date: radio.uploaded_at || implant.created_at });
        });
      });
      setAllPhotos(photos);
      setAllRadiographs(radiographs);

      if (photos.length > 0) setSelectedItem({ type: 'photo', ...photos[0] });
      else if (radiographs.length > 0) setSelectedItem({ type: 'radiograph', ...radiographs[0] });
    } catch {
      toast.error('Failed to load data');
      navigate(`/patients/${patientId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file, viewType, implantId) => {
    const uploadKey = `${uploadType}_${viewType}`;
    setUploadingFiles(prev => ({ ...prev, [uploadKey]: true }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      const endpoint = uploadType === 'photo' ? 'photos' : 'radiographs';
      await axios.post(
        `${API_URL}/api/implants/${implantId}/${endpoint}?view_type=${viewType}`,
        formData,
        { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } }
      );
      toast.success('File uploaded successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload file');
    } finally {
      setUploadingFiles(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  /* Upload extra patient photos — up to 12 at a time */
  const handleExtraUpload = async (files) => {
    const remaining = MAX_EXTRA_PHOTOS - extraPhotos.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_EXTRA_PHOTOS} extra photos reached`);
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length < files.length) {
      toast.warning(`Only ${remaining} slot(s) left — uploading first ${toUpload.length} file(s)`);
    }
    setUploadingExtra(true);
    let uploaded = 0;
    for (const file of toUpload) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        await axios.post(
          `${API_URL}/api/patients/${patientId}/photos?caption=${encodeURIComponent(file.name)}`,
          formData,
          { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } }
        );
        uploaded++;
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    if (uploaded > 0) toast.success(`${uploaded} photo${uploaded > 1 ? 's' : ''} added`);
    setUploadingExtra(false);
    fetchData();
  };

  /* Delete an extra photo */
  const handleDeleteExtra = async (photo) => {
    setDeletingId(photo.id);
    try {
      await axios.delete(`${API_URL}/api/patients/${patientId}/photos/${photo.id}`, { withCredentials: true });
      toast.success('Photo deleted');
      if (selectedItem?.id === photo.id) setSelectedItem(null);
      fetchData();
    } catch {
      toast.error('Failed to delete photo');
    } finally {
      setDeletingId(null);
    }
  };

  const groupByDate = (items) => {
    const grouped = {};
    items.forEach(item => {
      const date = new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(item);
    });
    return grouped;
  };

  const photosByDate = groupByDate(allPhotos);
  const radiographsByDate = groupByDate(allRadiographs);
  const slotsLeft = MAX_EXTRA_PHOTOS - extraPhotos.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#82A098]" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F9F9F8]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>

      {/* ── LEFT SIDEBAR ── */}
      <div className="w-80 bg-white border-r border-[#E5E5E2] flex flex-col">

        {/* Header */}
        <div className="p-4 border-b border-[#E5E5E2]">
          <button
            onClick={() => navigate(`/patients/${patientId}`)}
            className="flex items-center gap-2 text-[#5C6773] hover:text-[#82A098] mb-4 transition-colors"
          >
            <ArrowLeft size={20} /> Back to Patient
          </button>
          <h2 className="text-lg font-semibold text-[#2A2F35]" style={{ fontFamily: 'Work Sans, sans-serif' }}>Photo Vault</h2>
          <p className="text-sm text-[#5C6773] mt-1">{patient?.name}</p>
        </div>

        {/* Upload buttons */}
        <div className="p-4 space-y-2 border-b border-[#E5E5E2]">
          <button
            onClick={() => { setUploadType('photo'); setUploadDialogOpen(true); }}
            data-testid="add-photos-button"
            className="w-full flex items-center gap-3 px-4 py-3 bg-[#82A098] hover:bg-[#6B8A82] text-white rounded-lg transition-colors"
          >
            <Plus size={20} weight="bold" />
            <span className="font-medium">Add New Photos</span>
          </button>
          <button
            onClick={() => { setUploadType('radiograph'); setUploadDialogOpen(true); }}
            data-testid="add-radiographs-button"
            className="w-full flex items-center gap-3 px-4 py-3 bg-[#7B9EBB] hover:bg-[#6B8A9F] text-white rounded-lg transition-colors"
          >
            <Plus size={20} weight="bold" />
            <span className="font-medium">Add New Radiographs</span>
          </button>
        </div>

        {/* Scrollable thumbnail area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">

          {/* ── EXTRA PHOTOS SECTION ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-[#5C6773] uppercase tracking-wider">
                Extra Photos
              </h3>
              <span className="text-xs text-[#9CA3AF]">{extraPhotos.length}/{MAX_EXTRA_PHOTOS}</span>
            </div>

            {/* Grid: existing thumbnails + add button(s) */}
            <div className="grid grid-cols-3 gap-2">
              {/* Existing extra photos */}
              {extraPhotos.map((photo) => (
                <div key={photo.id} className="relative group aspect-square">
                  <button
                    onClick={() => setSelectedItem({ type: 'extra', ...photo, date: photo.uploaded_at, storage_path: photo.storage_path })}
                    className={`w-full h-full rounded-lg overflow-hidden border-2 transition-all ${
                      selectedItem?.id === photo.id
                        ? 'border-[#C27E70] ring-2 ring-[#C27E70]/30'
                        : 'border-[#E5E5E2] hover:border-[#C27E70]'
                    }`}
                    data-testid={`extra-photo-thumb-${photo.id}`}
                  >
                    <img
                      src={`${API_URL}/api/files/${photo.storage_path}`}
                      alt={photo.caption || 'Extra photo'}
                      className="w-full h-full object-cover"
                    />
                  </button>
                  {/* Delete button — appears on hover */}
                  <button
                    onClick={() => handleDeleteExtra(photo)}
                    disabled={deletingId === photo.id}
                    data-testid={`delete-extra-photo-${photo.id}`}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    title="Delete photo"
                  >
                    {deletingId === photo.id
                      ? <span className="text-[8px] animate-spin">◌</span>
                      : <X size={10} weight="bold" />}
                  </button>
                </div>
              ))}

              {/* "+" add thumbnail — only shown if slots remain */}
              {slotsLeft > 0 && (
                <label
                  data-testid="add-extra-photo-btn"
                  className="aspect-square rounded-lg border-2 border-dashed border-[#E5E5E2] hover:border-[#C27E70] hover:bg-[#FDF8F6] flex flex-col items-center justify-center cursor-pointer transition-all group"
                  title={`Add up to ${slotsLeft} more photo${slotsLeft !== 1 ? 's' : ''}`}
                >
                  <input
                    ref={extraInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => { if (e.target.files?.length) handleExtraUpload(e.target.files); e.target.value = ''; }}
                    disabled={uploadingExtra}
                  />
                  {uploadingExtra ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#C27E70]" />
                  ) : (
                    <>
                      <Plus size={20} className="text-[#C27E70] mb-1" weight="bold" />
                      <span className="text-[10px] text-[#9CA3AF] text-center leading-tight px-1">
                        Add photos<br />({slotsLeft} left)
                      </span>
                    </>
                  )}
                </label>
              )}

              {/* Empty placeholder thumbnails to fill the row visually */}
              {extraPhotos.length === 0 && slotsLeft > 0 && (
                <div className="col-span-2 flex items-center pl-1">
                  <p className="text-xs text-[#9CA3AF]">Click + to add up to {MAX_EXTRA_PHOTOS} photos</p>
                </div>
              )}
            </div>
          </div>

          {/* ── CLINICAL PHOTOS ── */}
          {Object.keys(photosByDate).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[#5C6773] uppercase tracking-wider mb-3">Clinical Photos</h3>
              {Object.entries(photosByDate).map(([date, photos]) => (
                <div key={date} className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FolderOpen size={16} className="text-[#82A098]" />
                    <span className="text-sm font-medium text-[#2A2F35]">{date}</span>
                    <span className="text-xs text-[#5C6773]">({photos.length})</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 ml-6">
                    {photos.map((photo, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedItem({ type: 'photo', ...photo })}
                        className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          selectedItem?.id === photo.id && selectedItem?.type === 'photo'
                            ? 'border-[#82A098] ring-2 ring-[#82A098]/30'
                            : 'border-[#E5E5E2] hover:border-[#82A098]'
                        }`}
                      >
                        <img src={`${API_URL}/api/files/${photo.storage_path}`} alt={photo.view_type} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── RADIOGRAPHS ── */}
          {Object.keys(radiographsByDate).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[#5C6773] uppercase tracking-wider mb-3">Radiographs</h3>
              {Object.entries(radiographsByDate).map(([date, radiographs]) => (
                <div key={date} className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FolderOpen size={16} className="text-[#7B9EBB]" />
                    <span className="text-sm font-medium text-[#2A2F35]">{date}</span>
                    <span className="text-xs text-[#5C6773]">({radiographs.length})</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 ml-6">
                    {radiographs.map((radio, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedItem({ type: 'radiograph', ...radio })}
                        className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          selectedItem?.id === radio.id && selectedItem?.type === 'radiograph'
                            ? 'border-[#7B9EBB] ring-2 ring-[#7B9EBB]/30'
                            : 'border-[#E5E5E2] hover:border-[#7B9EBB]'
                        }`}
                      >
                        <img src={`${API_URL}/api/files/${radio.storage_path}`} alt={radio.view_type} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {Object.keys(photosByDate).length === 0 && Object.keys(radiographsByDate).length === 0 && extraPhotos.length === 0 && (
            <div className="text-center py-12">
              <Image size={48} className="mx-auto text-[#E5E5E2] mb-3" />
              <p className="text-sm text-[#5C6773]">No photos or radiographs yet</p>
              <p className="text-xs text-[#5C6773] mt-1">Click above to add files</p>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL — Full view ── */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-[#E5E5E2] p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-[#2A2F35]">
                {selectedItem ? (
                  selectedItem.type === 'extra'
                    ? (selectedItem.caption || 'Extra Photo')
                    : <>
                        {selectedItem.type === 'photo' ? 'Clinical Photo' : 'Radiograph'} —{' '}
                        {selectedItem.view_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </>
                ) : 'No Image Selected'}
              </h3>
              {selectedItem && (
                <p className="text-sm text-[#5C6773] mt-1">
                  {selectedItem.type === 'extra'
                    ? `Uploaded ${new Date(selectedItem.date).toLocaleDateString()}`
                    : `Tooth #${selectedItem.tooth_number} • ${new Date(selectedItem.date).toLocaleDateString()}`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {selectedItem?.size && (
                <span className="text-sm text-[#5C6773]">{Math.round(selectedItem.size / 1024)} KB</span>
              )}
              {selectedItem?.type === 'extra' && (
                <button
                  onClick={() => handleDeleteExtra(selectedItem)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  data-testid="delete-selected-extra"
                >
                  <Trash size={13} weight="bold" /> Delete
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8 bg-[#F0F0EE]">
          {selectedItem ? (
            <img
              src={`${API_URL}/api/files/${selectedItem.storage_path}`}
              alt={selectedItem.view_type || selectedItem.caption || 'Photo'}
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            />
          ) : (
            <div className="text-center">
              <Image size={64} className="mx-auto text-[#E5E5E2] mb-4" />
              <p className="text-[#5C6773]">Select an image from the sidebar to view</p>
            </div>
          )}
        </div>
      </div>

      {/* ── UPLOAD DIALOG (implant-linked photos/radiographs) ── */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold" style={{ fontFamily: 'Work Sans, sans-serif' }}>
              {uploadType === 'photo' ? 'Add Clinical Photos' : 'Add Radiographs'}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#2A2F35] mb-2">Date of Capture</label>
              <input
                type="date"
                value={uploadDate}
                onChange={(e) => setUploadDate(e.target.value)}
                className="px-4 py-2 bg-white border border-[#E5E5E2] rounded-lg focus:ring-2 focus:ring-[#82A098] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(uploadType === 'photo' ? PHOTO_VIEWS : RADIOGRAPH_VIEWS).map(view => {
                const uploadKey = `${uploadType}_${view.id}`;
                const isUploading = uploadingFiles[uploadKey];
                return (
                  <div key={view.id} className="border border-[#E5E5E2] rounded-lg p-3">
                    <p className="text-xs text-[#5C6773] mb-2 min-h-[32px]">{view.label}</p>
                    <label className="aspect-square bg-[#F9F9F8] border-2 border-dashed border-[#E5E5E2] rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#82A098] hover:bg-white transition-all">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files[0]) handleFileUpload(e.target.files[0], view.id, 'temp_implant_id');
                        }}
                        disabled={isUploading}
                      />
                      {isUploading ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#82A098]" />
                      ) : (
                        <>
                          <Upload size={24} className="text-[#5C6773] mb-2" />
                          <span className="text-xs text-[#5C6773]">Upload</span>
                        </>
                      )}
                    </label>
                  </div>
                );
              })}
            </div>

            <Button onClick={() => setUploadDialogOpen(false)} className="w-full mt-6 bg-[#82A098] hover:bg-[#6B8A82] text-white">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MedicalVault;
