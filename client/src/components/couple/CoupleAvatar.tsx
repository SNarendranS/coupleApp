import React, { useState } from 'react';
import { Heart, Camera, X, Check, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';
import { ImageUploader } from '../ui/ImageUploader';

interface CoupleAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  editable?: boolean;
  className?: string;
}

export const CoupleAvatar: React.FC<CoupleAvatarProps> = ({
  size = 'md',
  editable = false,
  className = '',
}) => {
  const { user, partner, couple, setCoupleData } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [newAvatarUrl, setNewAvatarUrl] = useState<string>('');
  const [newPublicId, setNewPublicId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-20 h-20 text-lg',
    xl: 'w-28 h-28 text-2xl',
  }[size];

  const currentAvatar = couple?.avatarUrl;
  const coupleName = couple?.name || (user && partner ? `${user.displayName} & ${partner.displayName}` : 'Us');

  // Compute initials (e.g. "A & S")
  const getInitials = () => {
    if (couple?.name) {
      const parts = couple.name.split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return couple.name.slice(0, 2).toUpperCase();
    }
    const u1 = user?.displayName?.[0] || 'U';
    const u2 = partner?.displayName?.[0] || 'T';
    return `${u1} & ${u2}`.toUpperCase();
  };

  const handleOpenModal = () => {
    if (!editable) return;
    setNewAvatarUrl(currentAvatar || '');
    setNewPublicId(couple?.avatarPublicId || '');
    setError(null);
    setIsOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await api.patch('/couple/settings', {
        avatarUrl: newAvatarUrl,
        avatarPublicId: newPublicId,
      });

      if (res.success && res.data) {
        setCoupleData(res.data, partner);
        setIsOpen(false);
      } else {
        setError(res.error?.message || 'Failed to update couple photo.');
      }
    } catch (err: any) {
      setError(err.message || 'Error updating couple photo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await api.patch('/couple/settings', {
        avatarUrl: '',
        avatarPublicId: '',
      });

      if (res.success && res.data) {
        setCoupleData(res.data, partner);
        setNewAvatarUrl('');
        setNewPublicId('');
        setIsOpen(false);
      } else {
        setError(res.error?.message || 'Failed to remove photo.');
      }
    } catch (err: any) {
      setError(err.message || 'Error removing photo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div
        onClick={handleOpenModal}
        className={`relative inline-block rounded-full group select-none shrink-0 ${
          editable ? 'cursor-pointer' : ''
        } ${className}`}
      >
        {/* Avatar Ring */}
        <div
          className={`${sizeClasses} rounded-full overflow-hidden border-2 border-rose-400/40 bg-gradient-to-tr from-rose-500/20 via-purple-500/20 to-romantic-500/20 shadow-md flex items-center justify-center transition-all ${
            editable ? 'group-hover:border-rose-400 group-hover:scale-105 active:scale-95' : ''
          }`}
        >
          {currentAvatar ? (
            <img
              src={currentAvatar}
              alt={coupleName}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-rose-300 font-bold tracking-wider">
              {size === 'sm' ? (
                <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
              ) : (
                <>
                  <Heart className="w-4 h-4 fill-rose-400 text-rose-400 mb-0.5" />
                  <span className="text-[10px] leading-none opacity-90">{getInitials()}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Editable Overlay / Badge */}
        {editable && (
          <div className="absolute -bottom-0.5 -right-0.5 p-1 rounded-full bg-space-950/90 text-rose-300 border border-white/20 shadow-md transition-transform group-hover:scale-110">
            <Camera className="w-3 h-3" />
          </div>
        )}
      </div>

      {/* Couple Avatar Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-space-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-sm rounded-3xl p-6 border border-white/10 shadow-2xl relative space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-romantic-500/20 text-rose-400 flex items-center justify-center">
                  <Heart className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-serif">Shared Couple Photo</h3>
                  <p className="text-[11px] text-slate-400">Seen by you and {partner?.displayName || 'partner'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Live Uploader */}
            <div className="flex flex-col items-center">
              <ImageUploader
                value={newAvatarUrl}
                onChange={(url, mediaId) => {
                  setNewAvatarUrl(url);
                  if (mediaId) setNewPublicId(mediaId);
                }}
                onRemove={() => {
                  setNewAvatarUrl('');
                  setNewPublicId('');
                }}
                category="couple_avatar"
                aspectRatio="square"
                placeholderText="Upload our couple photo"
                className="max-w-[200px]"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-400 text-center">{error}</p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              {currentAvatar && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={isSaving}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Remove photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Remove</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || newAvatarUrl === currentAvatar}
                className="flex-1 btn-romantic py-2 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Photo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
