import { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface ImageCropperProps {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob) => void;
  aspectRatio?: number;
}

export default function ImageCropper({ open, imageSrc, onClose, onCropComplete, aspectRatio = 16 / 9 }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropDone = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    const canvas = document.createElement('canvas');
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = imageSrc;
    await new Promise(resolve => { image.onload = resolve; });

    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(
      image,
      croppedAreaPixels.x, croppedAreaPixels.y,
      croppedAreaPixels.width, croppedAreaPixels.height,
      0, 0,
      croppedAreaPixels.width, croppedAreaPixels.height,
    );
    canvas.toBlob(blob => {
      if (blob) onCropComplete(blob);
    }, 'image/jpeg', 0.9);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Crop Image</DialogTitle></DialogHeader>
        <div className="relative w-full h-[300px] bg-muted rounded-[5px] overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropDone}
          />
        </div>
        <div className="space-y-2 pt-2">
          <Label className="text-xs">Zoom</Label>
          <Slider
            value={[zoom]}
            onValueChange={v => setZoom(v[0])}
            min={1}
            max={3}
            step={0.1}
          />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Apply Crop</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
