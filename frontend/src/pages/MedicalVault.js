import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Upload, Plus, FolderOpen, Image, X, Trash } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { getPatient } from '../api/patients';
import { getCases } from '../api/cases';
import { getImages, uploadImage, deleteImage } from '../api/images';

const MedicalVault = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef();

  const [patient, setPatient] = useState(null);
  const [cases, setCases] = useState([]);
  const [images, setImages] = useState([]); // flat list of {caseId, ...image}
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedCaseId, setSelectedCaseId] = useState(null); // for upload target

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

      // Load images from all cases in parallel
      if (caseList.length > 0) {
        const allImagesNested = await Promise.all(
          caseList.map(c =>
            getImages(c.id).then(imgs => imgs.map(img => ({ ...img, caseId: c.id, caseTitle: c.title }))).catch(() => [])
          )
        );
        const flat = allImagesNested.flat();
        setImages(flat);
        if (flat.length > 0) setSelectedItem(flat[0]);
        if (caseList[0]) setSelectedCaseId(caseList[0].id);
      }
    } catch {
      toast.error('Failed to load vault');
      navigate(`/patients/${patientId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (files) => {
    if (!selectedCaseId) {
      toast.error('No case selected for upload');
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    let uploaded = 0;
    for (const file of Array.from(files)) {
      try {
        await uploadImage(selectedCaseId, file, {
          category: 'general',
          onProgress: (pct) => setUploadProgress(pct),
        });
        uploaded++;
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    if (uploaded > 0) toast.success(`${uploaded} file${uploaded > 1 ? 's' : ''} uploaded`);
    setUploading(false);
    setUploadProgress(0);
    fetchData();
  };

  const handleDelete = async (image) => {
    setDeletingId(image.id);
    try {
      await deleteImage(image.caseId, image.id);
      toast.success('Image deleted');
      if (selectedItem?.id === image.id) setSelectedItem(null);
      fetchData();
    } catch {
      toast.error('Failed to delete image');
    } finally {
      setDeletingId(null);
    }
  };

  const groupByDate = (items) => {
    const grouped = {};
    items.forEach(item => {
      const d = item.created_at || item.uploaded_at;
      const label = d
        ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'Unknown date';
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(item);
    });
    return grouped;
  };

  const imagesByDate = groupByDate(images);

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
      <div className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-[#E5E5E2] flex flex-col h-[45vh] md:h-full">

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

        {/* Case selector + Upload */}
        <div className="p-4 space-y-3 border-b border-[#E5E5E2]">
          {cases.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-[#5C6773] mb-1">Upload to case</label>
              <select
                value={selectedCaseId || ''}
                onChange={e => setSelectedCaseId(e.target.value)}
                data-testid="case-selector"
                className="w-full px-3 py-2 bg-white border border-[#E5E5E2] rounded-lg text-sm focus:ring-2 focus:ring-[#82A098] focus:outline-none"
              >
                {cases.map(c => (
                  <option key={c.id} value={c.id}>{c.title || `Case ${c.id.slice(-6)}`}</option>
                ))}
              </select>
            </div>
          )}
          <label
            data-testid="add-images-button"
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
              uploading ? 'bg-[#E5E5E2] cursor-not-allowed' : 'bg-[#82A098] hover:bg-[#6B8A82] text-white'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="hidden"
              disabled={uploading || !selectedCaseId}
              onChange={e => { if (e.target.files?.length) handleUpload(e.target.files); e.target.value = ''; }}
            />
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                <span className="font-medium text-white">{uploadProgress}%</span>
              </>
            ) : (
              <>
                <Plus size={20} weight="bold" />
                <span className="font-medium">{cases.length === 0 ? 'No cases yet' : 'Add Images / PDFs'}</span>
              </>
            )}
          </label>
        </div>

        {/* Scrollable thumbnail area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {Object.keys(imagesByDate).length === 0 ? (
            <div className="text-center py-12">
              <Image size={48} className="mx-auto text-[#E5E5E2] mb-3" />
              <p className="text-sm text-[#5C6773]">No images yet</p>
              {cases.length === 0 && (
                <p className="text-xs text-[#9CA3AF] mt-1">Create a case first, then upload images here</p>
              )}
            </div>
          ) : (
            Object.entries(imagesByDate).map(([date, imgs]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-2">
                  <FolderOpen size={16} className="text-[#82A098]" />
                  <span className="text-sm font-medium text-[#2A2F35]">{date}</span>
                  <span className="text-xs text-[#5C6773]">({imgs.length})</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {imgs.map(img => (
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
                          <img src={img.thumbnail_url} alt="thumb" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-[#F9F9F8] flex items-center justify-center">
                            <Image size={24} className="text-[#E5E5E2]" />
                          </div>
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(img)}
                        disabled={deletingId === img.id}
                        data-testid={`delete-image-${img.id}`}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                        title="Delete image"
                      >
                        {deletingId === img.id
                          ? <span className="text-[8px] animate-spin">◌</span>
                          : <X size={10} weight="bold" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL — Full view ── */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-[#E5E5E2] p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-[#2A2F35]">
                {selectedItem ? (selectedItem.category || 'Image') : 'No Image Selected'}
              </h3>
              {selectedItem && (
                <p className="text-sm text-[#5C6773] mt-1">
                  {selectedItem.caseTitle || `Case ${(selectedItem.caseId || '').slice(-6)}`}
                  {selectedItem.created_at && ` • ${new Date(selectedItem.created_at).toLocaleDateString()}`}
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
    </div>
  );
};

export default MedicalVault;
