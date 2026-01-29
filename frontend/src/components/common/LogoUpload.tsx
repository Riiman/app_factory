import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, AlertCircle, Building2 } from 'lucide-react';
import api from '../../utils/api';

interface LogoUploadProps {
    startupId: number;
    currentLogoUrl?: string;
    onUploadSuccess?: (logoUrl: string) => void;
    onDeleteSuccess?: () => void;
    size?: 'sm' | 'md' | 'lg';
    editable?: boolean;
    uploadUrl?: string;
}

const LogoUpload: React.FC<LogoUploadProps> = ({
    startupId,
    currentLogoUrl,
    onUploadSuccess,
    onDeleteSuccess,
    size = 'md',
    editable = true,
    uploadUrl,
}) => {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl || null);
    const [imageError, setImageError] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync with prop changes
    useEffect(() => {
        setPreviewUrl(currentLogoUrl || null);
        setImageError(false);
    }, [currentLogoUrl]);

    const sizeClasses = {
        sm: 'w-12 h-12',
        md: 'w-20 h-20',
        lg: 'w-32 h-32',
    };

    const iconSizes = {
        sm: 16,
        md: 24,
        lg: 32,
    };

    const handleImageError = () => {
        console.error('Failed to load logo image:', api.getAssetUrl(previewUrl));
        setImageError(true);
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setError('Please upload a PNG, JPG, JPEG, SVG, or WEBP image');
            return;
        }

        // Validate file size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            setError('File size must be less than 2MB');
            return;
        }

        setError(null);
        setUploading(true);
        setImageError(false);

        try {
            const formData = new FormData();
            formData.append('logo', file);

            let response;
            if (uploadUrl) {
                response = await api.uploadFile(uploadUrl, formData);
            } else {
                response = await api.uploadLogo(startupId, formData);
            }

            const newLogoUrl = response.logo_url;
            setPreviewUrl(newLogoUrl);

            if (onUploadSuccess) {
                onUploadSuccess(newLogoUrl);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to upload logo');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to remove the logo?')) {
            return;
        }

        setUploading(true);
        setError(null);

        try {
            if (uploadUrl) { // Using uploadUrl as a proxy to know custom mode, ideally strictly use deleteUrl
                // Assuming DELETE on the same endpoint (or derived) for organizations as per my implementation
                // But wait, the prop name logic is tricky. 
                // Let's assume if uploadUrl is provided, we use the DELETE method on the same URL 
                // (which matches my backend implementation: PUT/DELETE on /logo)
                // Or better, add deleteUrl prop
                await api.delete(uploadUrl);
            } else {
                await api.deleteLogo(startupId);
            }

            setPreviewUrl(null);
            setImageError(false);

            if (onDeleteSuccess) {
                onDeleteSuccess();
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to delete logo');
        } finally {
            setUploading(false);
        }
    };

    const handleClick = () => {
        if (editable && !uploading) {
            fileInputRef.current?.click();
        }
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative group">
                <div
                    className={`${sizeClasses[size]} rounded-lg border-2 border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 ${editable ? 'cursor-pointer hover:border-blue-400 transition-colors' : ''
                        }`}
                    onClick={handleClick}
                >
                    {previewUrl && !imageError ? (
                        <img
                            src={api.getAssetUrl(previewUrl)}
                            onError={handleImageError}
                            alt="Startup logo"
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <Building2 size={iconSizes[size]} className="text-gray-400" />
                    )}

                    {editable && !uploading && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                            <Upload size={iconSizes[size]} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    )}

                    {uploading && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        </div>
                    )}
                </div>

                {editable && previewUrl && !uploading && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDelete();
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-lg"
                        title="Remove logo"
                    >
                        <X size={14} />
                    </button>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                />
            </div>

            {error && (
                <div className="flex items-center gap-1 text-red-600 text-xs">
                    <AlertCircle size={12} />
                    <span>{error}</span>
                </div>
            )}

            {editable && !previewUrl && (
                <p className="text-xs text-gray-500 text-center">
                    Click to upload<br />
                    PNG, JPG, SVG, WEBP<br />
                    Max 2MB
                </p>
            )}
        </div>
    );
};

export default LogoUpload;
