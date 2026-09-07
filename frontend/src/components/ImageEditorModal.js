import { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowsClockwise } from '@phosphor-icons/react';
import { getCroppedImageFile } from '../lib/cropImage';

const ASPECT_OPTIONS = [
  { label: 'Square', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:4', value: 3 / 4 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
];

/**
 * Shared crop / rotate / aspect-ratio editor, used before every photo
 * upload in the app (Photo Vault, implant/abutment tags, crown warranty
 * photo, patient & doctor profile pictures).
 *
 * Usage: prefer the `useImageEditor()` hook below over using this directly.
 */
export default function ImageEditorModal({ file, defaultAspect = 1, onCancel, onConfirm }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState(defaultAspect);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!file) { setImageSrc(null); return undefined; }
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setAspect(defaultAspect);
    return () => URL.revokeObjectURL(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const onCropComplete = useCallback((_, pixels) => setCroppedAreaPixels(pixels), []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels || !imageSrc) return;
    setSaving(true);
    try {
      const cropped = await getCroppedImageFile(imageSrc, croppedAreaPixels, rotation, file?.name || 'photo.jpg');
      if (!cropped) throw new Error('crop failed');
      onConfirm(cropped);
    } catch {
      toast.error('Could not crop image — using the original photo instead');
      onConfirm(file);
    } finally {
      setSaving(false);
    }
  };

  if (!file) return null;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-lg" data-testid="image-editor-modal">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Edit Photo</DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-72 bg-[#1A1A18] rounded-lg overflow-hidden">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              cropShape="rect"
              showGrid
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        {/* Aspect ratio picker */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {ASPECT_OPTIONS.map(opt => (
            <button
              key={opt.label}
              type="button"
              data-testid={`aspect-${opt.label.replace(':', '-')}`}
              onClick={() => setAspect(opt.value)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                aspect === opt.value
                  ? 'bg-[#82A098] text-white border-[#82A098]'
                  : 'border-[#E5E5E2] text-[#5C6773] hover:border-[#82A098]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Zoom + rotate sliders */}
        <div className="mt-3 space-y-2.5">
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#5C6773] w-10 shrink-0">Zoom</span>
            <input
              type="range" min={1} max={3} step={0.05} value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="flex-1 accent-[#82A098]"
              data-testid="zoom-slider"
            />
          </div>
          <div className="flex items-center gap-3">
            <ArrowsClockwise size={14} className="text-[#5C6773] shrink-0" />
            <input
              type="range" min={0} max={360} step={1} value={rotation}
              onChange={e => setRotation(Number(e.target.value))}
              className="flex-1 accent-[#82A098]"
              data-testid="rotation-slider"
            />
            <span className="text-xs text-[#5C6773] w-9 shrink-0 text-right">{rotation}°</span>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <Button
            data-testid="image-editor-apply-btn"
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 bg-[#82A098] hover:bg-[#6B8A82] text-white"
          >
            {saving ? 'Applying…' : 'Apply'}
          </Button>
          <Button
            data-testid="image-editor-cancel-btn"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook form of the editor — returns [editImage, editorElement].
 * Call `await editImage(file)` to open the modal for that file; resolves
 * with the cropped File on Apply, or null on Cancel. Render `editorElement`
 * once, anywhere in the component tree.
 *
 *   const [editImage, imageEditor] = useImageEditor();
 *   ...
 *   const cropped = await editImage(file, { aspect: 1 });
 *   if (!cropped) return; // user cancelled
 *   ...
 *   return <>{imageEditor}</>;
 */
export function useImageEditor() {
  const [pending, setPending] = useState(null); // { file, aspect, resolve }

  const editImage = useCallback((file, { aspect = 1 } = {}) => {
    if (!file) return Promise.resolve(null);
    return new Promise((resolve) => setPending({ file, aspect, resolve }));
  }, []);

  const editorElement = pending ? (
    <ImageEditorModal
      file={pending.file}
      defaultAspect={pending.aspect}
      onCancel={() => { pending.resolve(null); setPending(null); }}
      onConfirm={(f) => { pending.resolve(f); setPending(null); }}
    />
  ) : null;

  return [editImage, editorElement];
}
