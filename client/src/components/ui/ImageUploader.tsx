import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Camera, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { api } from '../../services/api';

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string, mediaId?: string) => void;
  onRemove?: () => void;
  category?: 'couple_avatar' | 'event' | 'memory';
  aspectRatio?: 'square' | 'wide' | 'banner';
  placeholderText?: string;
  compact?: boolean;
  className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  onRemove,
  category = 'memory',
  aspectRatio = 'square',
  placeholderText = 'Tap to upload photo',
  compact = false,
  className = '',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const aspectClasses = {
    square: 'aspect-square',
    wide: 'aspect-[4/3] sm:aspect-[16/9]',
    banner: 'aspect-[2.5/1]',
  }[aspectRatio];

  const handleFileSelect = async (file: File) => {
    setError(null);

    // Validate size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError('Photo exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    // Validate format
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setError('Unsupported format. Please select a JPEG, PNG, WebP, or GIF image.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('category', category);

      // Simulate progress progression for smooth mobile feedback
      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => (prev < 85 ? prev + 15 : prev));
      }, 200);

      const res = await api.upload('/upload', formData);
      clearInterval(progressTimer);
      setUploadProgress(100);

      if (res.success && res.data) {
        onChange(res.data.url, res.data.id);
      } else {
        setError(res.error?.message || 'Upload failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error during upload. Please try again.');
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 400);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Hidden native input with mobile camera/gallery access */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Image Preview or Upload Dropzone */}
      {value ? (
        <div className={`relative rounded-2xl overflow-hidden border border-white/10 group ${aspectClasses} bg-space-900/60 shadow-lg`}>
          <img
            src={value}
            alt="Uploaded preview"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />

          {/* Action Overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 sm:transition-opacity flex items-center justify-center gap-2 p-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Replace</span>
            </button>

            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                disabled={isUploading}
                className="px-3 py-1.5 rounded-xl bg-rose-500/80 hover:bg-rose-500 text-white text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-1.5 shadow-md active:scale-95"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>

          {/* Mobile Always-Visible Replacement Corner Icon */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="sm:hidden absolute bottom-2 right-2 p-2 rounded-xl bg-space-950/80 text-white backdrop-blur-md border border-white/20 shadow-md"
            title="Replace Photo"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`cursor-pointer rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-4 text-center select-none active:scale-[0.99] ${
            isDragging
              ? 'border-romantic-400 bg-romantic-500/10'
              : 'border-white/15 hover:border-romantic-400/50 bg-white/5 hover:bg-white/10'
          } ${compact ? 'py-4' : 'py-8'} ${aspectClasses}`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 text-romantic-300">
              <Loader2 className="w-7 h-7 animate-spin text-romantic-400" />
              <p className="text-xs font-semibold">Uploading & optimizing...</p>
              <div className="w-36 h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
                <div
                  className="h-full bg-gradient-to-r from-romantic-500 to-purple-500 transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-rose-300 shadow-sm">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200">{placeholderText}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">JPG, PNG, WebP or GIF (up to 5MB)</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mt-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
