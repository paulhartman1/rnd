'use client';
import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

const supabase = createClient();
const BUCKET_NAME = 'blog-images';

interface FileObject {
  file: File;
  preview: string;
  id: string;
  valid: boolean;
  error?: string;
  dimensions?: { width: number; height: number };
}

interface UploadStatus {
  status: 'uploading' | 'success' | 'error';
  message: string;
}

interface UploadResult {
  id: string;
  url: string;
  width: number;
  height: number;
  fileSize: number;
}

interface BlogImageUploadProps {
  blogPostId?: string;
  currentImageUrl?: string | null;
  onUploadComplete?: (result: UploadResult) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  maxSizeMB?: number;
}

export default function BlogImageUpload({
  blogPostId,
  currentImageUrl,
  onUploadComplete,
  onUploadingChange,
  maxSizeMB = 5
}: BlogImageUploadProps) {
  const [file, setFile] = useState<FileObject | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);

  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = maxSizeMB * 1024 * 1024;

    if (!validTypes.includes(file.type)) {
      return { valid: false, error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP allowed.' };
    }
    if (file.size > maxSize) {
      return { valid: false, error: `File too large. Max size: ${maxSizeMB}MB` };
    }
    return { valid: true };
  }, [maxSizeMB]);

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.width, height: img.height });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  };

  const handleFile = useCallback(async (newFile: File) => {
    const validation = validateFile(newFile);

    const fileObj: FileObject = {
      file: newFile,
      preview: URL.createObjectURL(newFile),
      id: Math.random().toString(36).substr(2, 9),
      valid: validation.valid,
      error: validation.error
    };

    if (validation.valid) {
      try {
        fileObj.dimensions = await getImageDimensions(newFile);
      } catch (error) {
        console.error('Error getting dimensions:', error);
        fileObj.dimensions = { width: 800, height: 600 };
      }
    }

    setFile(fileObj);
    setUploadStatus(null);
  }, [validateFile]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    if (file?.preview) {
      URL.revokeObjectURL(file.preview);
    }
    setFile(null);
    setUploadStatus(null);
  };

  const uploadToSupabase = async () => {
    if (!file || !file.valid) return;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      setUploadStatus({ status: 'error', message: 'Please log in to upload images' });
      return;
    }

    setUploading(true);
    onUploadingChange?.(true);
    setUploadStatus({ status: 'uploading', message: 'Uploading...' });

    try {
      const fileExt = file.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file.file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);

      // Insert into blog_images table
      const imageData = {
        blog_post_id: blogPostId || null,
        url: publicUrl,
        alt_text: file.file.name.split('.')[0] || 'Blog image',
        width: file.dimensions?.width || 800,
        height: file.dimensions?.height || 600,
        file_size: file.file.size,
        is_featured: true
      };

      const { data: insertedImage, error: insertError } = await supabase
        .from('blog_images')
        .insert(imageData)
        .select('id, url, width, height, file_size')
        .single();

      if (insertError) throw insertError;

      setUploadStatus({ status: 'success', message: 'Uploaded! You can now save your post.' });
      console.log('Upload complete! Image URL:', insertedImage.url);

      if (onUploadComplete && insertedImage) {
        console.log('Calling onUploadComplete with:', insertedImage.url);
        onUploadComplete({
          id: insertedImage.id,
          url: insertedImage.url,
          width: insertedImage.width,
          height: insertedImage.height,
          fileSize: insertedImage.file_size
        });
      }

    } catch (error) {
      setUploadStatus({
        status: 'error',
        message: error instanceof Error ? error.message : 'Upload failed'
      });
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Image Display */}
      {currentImageUrl && !file && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Featured Image
          </label>
          <div className="relative w-full max-w-md aspect-video rounded-lg overflow-hidden border border-gray-300">
            <Image
              src={currentImageUrl}
              alt="Current featured image"
              fill
              className="object-cover"
            />
          </div>
        </div>
      )}

      {/* Drag and Drop Zone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Featured Image {!currentImageUrl && '*'}
        </label>
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
          />

          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-lg font-medium text-gray-700 mb-2">
            Drag and drop an image here
          </p>
          <p className="text-sm text-gray-500 mb-4">or click to browse</p>
          <p className="text-xs text-gray-400">
            Supported formats: JPEG, PNG, GIF, WebP (max {maxSizeMB}MB)
          </p>
        </div>
      </div>

      {/* File Preview */}
      {file && (
        <div className="mt-4">
          <div className="relative bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
            {file.valid ? (
              <div className="relative aspect-video">
                <Image
                  src={file.preview}
                  alt={file.file.name}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="aspect-video bg-red-50 flex items-center justify-center">
                <svg className="h-12 w-12 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}

            <button
              onClick={removeFile}
              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              disabled={uploading}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="p-4">
              <p className="text-sm text-gray-600 truncate mb-1">{file.file.name}</p>
              <p className="text-xs text-gray-400">
                {(file.file.size / 1024 / 1024).toFixed(2)} MB
                {file.dimensions && ` • ${file.dimensions.width}×${file.dimensions.height}`}
              </p>

              {uploadStatus && (
                <div className={`text-sm mt-2 flex items-center gap-2 ${
                  uploadStatus.status === 'success' ? 'text-green-600' :
                  uploadStatus.status === 'error' ? 'text-red-600' :
                  'text-blue-600'
                }`}>
                  {uploadStatus.status === 'success' && (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {uploadStatus.status === 'error' && (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <span>{uploadStatus.message}</span>
                </div>
              )}

              {!file.valid && (
                <p className="text-sm text-red-600 mt-2">{file.error}</p>
              )}

              {file.valid && uploadStatus?.status !== 'success' && (
                <button
                  onClick={uploadToSupabase}
                  disabled={uploading}
                  className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
