import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Upload, Plus, FolderOpen, Image, X, Trash, Camera } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getPatient } from '../api/patients';
import { getCases, createCase } from '../api/cases';
import { getImages, uploadImage, deleteImage, clearImageCache } from '../api/images';

const MAX_EXTRA_PHOTOS = 12;

const PHOTO_VIEWS = [
  { id: 'front_centric',         label: 'Front - Centric Occlusion' },
  { id: 'front_protrusive',      label: 'Front - Protrusive' },
  { id: 'right_centric',         label: 'Right - Centric Occlusion' },
  { id: 'left_centric',          label: 'Left - Centric Occlusion' },
  { id: 'front_right_exclusive', label: 'Front - Right Exclusive' },
  { id: 'front_left_exclusive',  label: 'Front - Left Exclusive' },
  { id: 'maxillary_occlusal',    label: 'Maxillary Occlusal' },
  { id: 'mandibular_occlusal',   label: 'Mandibular Occlusal' },
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
  const extraCameraRef = useRef();
  const viewCameraRef = useRef();
  const [cameraViewId, setCameraViewId] = useState(null);

  const [patient, setPatient] = useState(null);
  const [cases, setCases] = useState([]);
  const [allImages, setAllImages] = useState([]); // flat: [...img, caseId, caseTitle]
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);

  // Upload dialog (photo / radiograph named views)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadType, setUploadType] = useState('photo');
  const [uploadCaseId, setUploadCaseId] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState({});

  // Extra photos upload
  const [uploadingExtra, setUploadingExtra] = useState(false);
  const [extraCaseId, setExtraCaseId] = useState(null);

  const [deletingId, setDeletingId] = useState(null);
  const [activeTab, setActiveTab] = useState('extra');

  useEffect(() => { fetchData(); }, [patientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      const [patientData, casesData] = await Promise.all([
        getPatient(patientId),
        getCases({ patientId }),
      ]);
      setPatient(patientData);
      const caseList = casesData.items ?? casesData;
      setCases(caseList);

      if (caseList.length > 0) {
        if (!uploadCaseId) setUploadCaseId(caseList[0].id);
        if (!extraCaseId) setExtraCaseId(caseList[0].id);

        const nested = await Promise.all(
          caseList.map(c =>
            getImages(c.id)
              .then(imgs => imgs.map(img => ({ ...img, caseId: c.id, caseTitle: c.title })))
              .catch(() => [])
          )
        );
        const flat = nested.flat();
        setAllImages(flat);
        if (flat.length > 0 && !selectedItem) setSelectedItem(flat[0]);
      }
    } catch {
      toast.error('Failed to load vault');
      navigate(`/patients/${patientId}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Auto-create a General case if patient has none ───────────────────────
  const ensureCase = async () => {
    if (cases.length > 0) return uploadCaseId || cases[0].id;
    try {
      const newCase = await createCase({ patient_id: patientId, title: 'General', status: 'active' });
      const cid = newCase.id;
      setCases([newCase]);
      setUploadCaseId(cid);
      setExtraCaseId(cid);
      return cid;
    } catch {
      toast.error('Could not create a case for this patient');
      return null;
    }
  };

  // ── Named-view upload (clinical photos / radiographs) ─────────────────────
  const handleViewUpload = async (file, viewId) => {
    const cid = uploadCaseId || await ensureCase();
    if (!cid) return;
    const key = `${uploadType}_${viewId}`;
    setUploadingFiles(prev => ({ ...prev, [key]: true }));
    try {
      await uploadImage(cid, file, { category: `${uploadType}_${viewId}` });
      toast.success('File uploaded');
      caseList_invalidateAndRefetch();
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to upload');
    } finally {
      setUploadingFiles(prev => ({ ...prev, [key]: false }));
    }
  };

  const caseList_invalidateAndRefetch = () => {
    cases.forEach(c => clearImageCache(c.id));
    fetchData();
  };

  // ── Extra photos upload ───────────────────────────────────────────────────
  const extraPhotos = allImages.filter(img => img.category === 'extra');
  const slotsLeft = MAX_EXTRA_PHOTOS - extraPhotos.length;

  const handleExtraUpload = async (files) => {
    const cid = extraCaseId || await ensureCase();
    if (!cid) return;
    if (slotsLeft <= 0) { toast.error(`Maximum ${MAX_EXTRA_PHOTOS} extra photos reached`); return; }
    const toUpload = Array.from(files).slice(0, slotsLeft);
    if (toUpload.length < files.length) {
      toast.warning(`Only ${slotsLeft} slot(s) left — uploading first ${toUpload.length} file(s)`);
    }
    setUploadingExtra(true);
    let uploaded = 0;
    for (const file of toUpload) {
      try {
        await uploadImage(cid, file, { category: 'extra' });
        uploaded++;
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    if (uploaded > 0) toast.success(`${uploaded} photo${uploaded > 1 ? 's' : ''} added`);
    setUploadingExtra(false);
    caseList_invalidateAndRefetch();
  };

  const handleExtraCameraCapture = async (e) => {
    const files = e.target.files;
    if (files?.length) await handleExtraUpload(files);
    e.target.value = '';
  };

  const handleViewCameraCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !cameraViewId) return;
    e.target.value = '';
    const cid = uploadCaseId || await ensureCase();
    if (!cid) return;
    const key = `${uploadType}_${cameraViewId}`;
    setUploadingFiles(prev => ({ ...prev, [key]: true }));
    try {
      await uploadImage(cid, file, { category: `${uploadType}_${cameraViewId}` });
      toast.success('Photo captured and uploaded');
      setCameraViewId(null);
      caseList_invalidateAndRefetch();
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to upload');
    } finally {
      setUploadingFiles(prev => ({ ...prev, [key]: false }));
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (img) => {
    setDeletingId(img.id);
    try {
      await deleteImage(img.caseId, img.id);
      toast.success('Image deleted');
      if (selectedItem?.id === img.id) setSelectedItem(null);
      caseList_invalidateAndRefetch();
    } catch {
      toast.error('Failed to delete image');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const groupByDate = (items) => {
    const grouped = {};
    items.forEach(item => {
      const d = item.uploaded_at || item.created_at;
      const label = d
        ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'Unknown date';
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(item);
    });
    return grouped;
  };

  // Clinical photos = category starts with "photo_"
  const clinicalPhotos = allImages.filter(img => img.category?.startsWith('photo_'));
  // Radiographs = category starts with "radiograph_"
  const radiographs = allImages.filter(img => img.category?.startsWith('radiograph_'));
  // Fallback: uncategorised / general images (uploaded via old case flow)
  const generalImages = allImages.filter(
    img => !img.category || img.category === 'general'
  );

  const photosByDate     = groupByDate(clinicalPhotos);
  const radiographsByDate = groupByDate(radiographs);
  const generalByDate    = groupByDate(generalImages);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#82A098]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#F9F9F8]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>

      {/* ── LEFT SIDEBAR ── */}
      <div className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-[#E5E5E2] flex flex-col h-[55vh] md:h-full">

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
          {cases.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-[#5C6773] mb-1">Upload to case</label>
              <select
                value={uploadCaseId || ''}
                onChange={e => { setUploadCaseId(e.target.value); setExtraCaseId(e.target.value); }}
                data-testid="case-selector"
                className="w-full px-3 py-2 bg-white border border-[#E5E5E2] rounded-lg text-sm focus:ring-2 focus:ring-[#82A098] focus:outline-none"
              >
                {cases.map(c => (
                  <option key={c.id} value={c.id}>{c.title || `Case ${c.id.slice(-6)}`}</option>
                ))}
              </select>
            </div>
          )}
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

        {/* Tab bar */}
        <div className="flex border-b border-[#E5E5E2] px-2">
          {[
            { id: 'extra', label: 'Extra Photos' },
            { id: 'clinical', label: 'Clinical' },
            { id: 'radiograph', label: 'Radiographs' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`vault-tab-${tab.id}`}
              className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#82A098] text-[#82A098]'
                  : 'border-transparent text-[#5C6773] hover:text-[#2A2F35]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Hidden file inputs — always mounted so refs are valid regardless of active tab */}
        <input
          ref={extraInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files?.length) handleExtraUpload(e.target.files); e.target.value = ''; }}
          disabled={uploadingExtra}
        />
        <input
          ref={extraCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleExtraCameraCapture}
          disabled={uploadingExtra}
        />
        <input
          ref={viewCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleViewCameraCapture}
        />

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4">

          {/* ── EXTRA PHOTOS TAB (12-slot template) ── */}
          {activeTab === 'extra' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-[#5C6773] uppercase tracking-wider">Extra Photos</h3>
                <div className="flex items-center gap-2">
                  <button
                    data-testid="extra-camera-btn"
                    onClick={() => !uploadingExtra && extraCameraRef.current?.click()}
                    disabled={uploadingExtra || slotsLeft <= 0}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#C27E70] border border-[#C27E70]/30 rounded-lg hover:bg-[#C27E70]/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Use camera"
                  >
                    <Camera size={12} /> Camera
                  </button>
                  <span className="text-xs text-[#9CA3AF]">{extraPhotos.length}/{MAX_EXTRA_PHOTOS}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: MAX_EXTRA_PHOTOS }).map((_, i) => {
                  const photo = extraPhotos[i];
                  if (photo) {
                    return (
                      <div key={photo.id} className="relative group aspect-square">
                        <button
                          onClick={() => setSelectedItem(photo)}
                          data-testid={`extra-photo-thumb-${photo.id}`}
                          className={`w-full h-full rounded-lg overflow-hidden border-2 transition-all ${
                            selectedItem?.id === photo.id
                              ? 'border-[#C27E70] ring-2 ring-[#C27E70]/30'
                              : 'border-[#E5E5E2] hover:border-[#C27E70]'
                          }`}
                        >
                          {photo.thumbnail_url ? (
                            <img src={photo.thumbnail_url} alt="extra" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-[#F9F9F8] flex items-center justify-center">
                              <Image size={20} className="text-[#E5E5E2]" />
                            </div>
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(photo)}
                          disabled={deletingId === photo.id}
                          data-testid={`delete-extra-photo-${photo.id}`}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                        >
                          {deletingId === photo.id
                            ? <span className="text-[8px] animate-spin">◌</span>
                            : <X size={10} weight="bold" />}
                        </button>
                      </div>
                    );
                  }
                  return (
                    <button
                      key={`empty-slot-${i}`}
                      onClick={() => !uploadingExtra && extraInputRef.current?.click()}
                      disabled={uploadingExtra}
                      data-testid={`extra-slot-empty-${i}`}
                      className="aspect-square rounded-lg border-2 border-dashed border-[#E5E5E2] hover:border-[#C27E70] hover:bg-[#FDF8F6] flex items-center justify-center cursor-pointer transition-all disabled:opacity-50"
                    >
                      {uploadingExtra && i === extraPhotos.length ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#C27E70]" />
                      ) : (
                        <Plus size={16} className="text-[#E5E5E2]" weight="bold" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── CLINICAL PHOTOS TAB ── */}
          {activeTab === 'clinical' && (
            <div>
              <h3 className="text-sm font-medium text-[#5C6773] uppercase tracking-wider mb-3">Clinical Photos</h3>
              {Object.keys(photosByDate).length === 0 && Object.keys(generalByDate).length === 0 ? (
                <div className="text-center py-10">
                  <Image size={40} className="mx-auto text-[#E5E5E2] mb-3" />
                  <p className="text-sm text-[#5C6773]">No clinical photos yet</p>
                  <p className="text-xs text-[#9CA3AF] mt-1">Click "Add New Photos" above to upload</p>
                </div>
              ) : (
                <>
                  {Object.entries(photosByDate).map(([date, photos]) => (
                    <div key={date} className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FolderOpen size={16} className="text-[#82A098]" />
                        <span className="text-sm font-medium text-[#2A2F35]">{date}</span>
                        <span className="text-xs text-[#5C6773]">({photos.length})</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 ml-6">
                        {photos.map((photo) => (
                          <div key={photo.id} className="relative group aspect-square">
                            <button
                              onClick={() => setSelectedItem(photo)}
                              data-testid={`photo-thumb-${photo.id}`}
                              className={`w-full h-full rounded-lg overflow-hidden border-2 transition-all ${
                                selectedItem?.id === photo.id
                                  ? 'border-[#82A098] ring-2 ring-[#82A098]/30'
                                  : 'border-[#E5E5E2] hover:border-[#82A098]'
                              }`}
                            >
                              {photo.thumbnail_url ? (
                                <img src={photo.thumbnail_url} alt={photo.category} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-[#F9F9F8] flex items-center justify-center">
                                  <Image size={20} className="text-[#E5E5E2]" />
                                </div>
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(photo)}
                              disabled={deletingId === photo.id}
                              data-testid={`delete-photo-${photo.id}`}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                            >
                              {deletingId === photo.id ? <span className="text-[8px] animate-spin">◌</span> : <X size={10} weight="bold" />}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {Object.entries(generalByDate).map(([date, imgs]) => (
                    <div key={`gen-${date}`} className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FolderOpen size={16} className="text-[#82A098]" />
                        <span className="text-sm font-medium text-[#2A2F35]">{date}</span>
                        <span className="text-xs text-[#5C6773]">({imgs.length})</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 ml-6">
                        {imgs.map((img) => (
                          <div key={img.id} className="relative group aspect-square">
                            <button
                              onClick={() => setSelectedItem(img)}
                              data-testid={`image-thumb-${img.id}`}
                              className={`w-full h-full rounded-lg overflow-hidden border-2 transition-all ${
                                selectedItem?.id === img.id
                                  ? 'border-[#82A098] ring-2 ring-[#82A098]/30'
                                  : 'border-[#E5E5E2] hover:border-[#82A098]'
                              }`}
                            >
                              {img.thumbnail_url ? (
                                <img src={img.thumbnail_url} alt="image" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-[#F9F9F8] flex items-center justify-center">
                                  <Image size={20} className="text-[#E5E5E2]" />
                                </div>
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(img)}
                              disabled={deletingId === img.id}
                              data-testid={`delete-image-${img.id}`}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                            >
                              {deletingId === img.id ? <span className="text-[8px] animate-spin">◌</span> : <X size={10} weight="bold" />}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* ── RADIOGRAPHS TAB ── */}
          {activeTab === 'radiograph' && (
            <div>
              <h3 className="text-sm font-medium text-[#5C6773] uppercase tracking-wider mb-3">Radiographs</h3>
              {Object.keys(radiographsByDate).length === 0 ? (
                <div className="text-center py-10">
                  <Image size={40} className="mx-auto text-[#E5E5E2] mb-3" />
                  <p className="text-sm text-[#5C6773]">No radiographs yet</p>
                  <p className="text-xs text-[#9CA3AF] mt-1">Click "Add New Radiographs" above to upload</p>
                </div>
              ) : (
                Object.entries(radiographsByDate).map(([date, radios]) => (
                  <div key={date} className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FolderOpen size={16} className="text-[#7B9EBB]" />
                      <span className="text-sm font-medium text-[#2A2F35]">{date}</span>
                      <span className="text-xs text-[#5C6773]">({radios.length})</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 ml-6">
                      {radios.map((radio) => (
                        <div key={radio.id} className="relative group aspect-square">
                          <button
                            onClick={() => setSelectedItem(radio)}
                            data-testid={`radio-thumb-${radio.id}`}
                            className={`w-full h-full rounded-lg overflow-hidden border-2 transition-all ${
                              selectedItem?.id === radio.id
                                ? 'border-[#7B9EBB] ring-2 ring-[#7B9EBB]/30'
                                : 'border-[#E5E5E2] hover:border-[#7B9EBB]'
                            }`}
                          >
                            {radio.thumbnail_url ? (
                              <img src={radio.thumbnail_url} alt={radio.category} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-[#F9F9F8] flex items-center justify-center">
                                <Image size={20} className="text-[#E5E5E2]" />
                              </div>
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(radio)}
                            disabled={deletingId === radio.id}
                            data-testid={`delete-radio-${radio.id}`}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                          >
                            {deletingId === radio.id ? <span className="text-[8px] animate-spin">◌</span> : <X size={10} weight="bold" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
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
                  selectedItem.category === 'extra'
                    ? 'Extra Photo'
                    : selectedItem.category?.startsWith('photo_')
                      ? `Clinical Photo — ${selectedItem.category.replace('photo_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`
                      : selectedItem.category?.startsWith('radiograph_')
                        ? `Radiograph — ${selectedItem.category.replace('radiograph_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`
                        : (selectedItem.category || 'Image')
                ) : 'No Image Selected'}
              </h3>
              {selectedItem && (
                <p className="text-sm text-[#5C6773] mt-1">
                  {selectedItem.caseTitle || `Case ${(selectedItem.caseId || '').slice(-6)}`}
                  {(selectedItem.uploaded_at || selectedItem.created_at) &&
                    ` • ${new Date(selectedItem.uploaded_at || selectedItem.created_at).toLocaleDateString()}`}
                </p>
              )}
            </div>
            {selectedItem && (
              <button
                onClick={() => handleDelete(selectedItem)}
                data-testid="delete-selected-image"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash size={13} weight="bold" /> Delete
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8 bg-[#F0F0EE]">
          {selectedItem ? (
            <img
              src={selectedItem.url}
              alt={selectedItem.category || 'Clinical image'}
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              onError={e => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="text-center">
              <Image size={64} className="mx-auto text-[#E5E5E2] mb-4" />
              <p className="text-[#5C6773]">Select an image from the sidebar to view</p>
            </div>
          )}
        </div>
      </div>

      {/* ── UPLOAD DIALOG (named clinical photos / radiographs) ── */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold" style={{ fontFamily: 'Work Sans, sans-serif' }}>
              {uploadType === 'photo' ? 'Add Clinical Photos' : 'Add Radiographs'}
            </DialogTitle>
          </DialogHeader>

          {cases.length > 1 && uploadCaseId && (
            <div className="mt-2 mb-4">
              <label className="block text-sm font-medium text-[#2A2F35] mb-2">Upload to case</label>
              <select
                value={uploadCaseId || ''}
                onChange={e => setUploadCaseId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E5E5E2] rounded-lg text-sm focus:ring-2 focus:ring-[#82A098] focus:outline-none"
              >
                {cases.map(c => (
                  <option key={c.id} value={c.id}>{c.title || `Case ${c.id.slice(-6)}`}</option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(uploadType === 'photo' ? PHOTO_VIEWS : RADIOGRAPH_VIEWS).map(view => {
                const key = `${uploadType}_${view.id}`;
                const isUploading = uploadingFiles[key];
                return (
                  <div key={view.id} className="border border-[#E5E5E2] rounded-lg p-3">
                    <p className="text-xs text-[#5C6773] mb-2 min-h-[32px]">{view.label}</p>
                    {/* Upload from gallery */}
                    <label className="aspect-square bg-[#F9F9F8] border-2 border-dashed border-[#E5E5E2] rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#82A098] hover:bg-white transition-all">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => { if (e.target.files[0]) handleViewUpload(e.target.files[0], view.id); }}
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
                    {/* Camera capture — only for photos, not radiographs */}
                    {uploadType === 'photo' && (
                      <button
                        type="button"
                        data-testid={`camera-btn-${view.id}`}
                        disabled={isUploading}
                        onClick={() => { setCameraViewId(view.id); viewCameraRef.current?.click(); }}
                        className="mt-1.5 w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-[#82A098] border border-[#82A098]/30 rounded-lg hover:bg-[#82A098]/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Camera size={12} /> Use Camera
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <Button
              onClick={() => setUploadDialogOpen(false)}
              data-testid="upload-dialog-done"
              className="w-full mt-6 bg-[#82A098] hover:bg-[#6B8A82] text-white"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MedicalVault;
