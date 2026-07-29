"use client";

import { useState, useRef, ChangeEvent } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

export interface ImageFile {
  file?: File; // Optional - for new uploads
  preview: string; // Can be blob URL or server URL
  id: string;
  isPrimary?: boolean;
  existingUrl?: string; // For existing images from server
  mediaId?: string; // Media ID from server (for existing images)
}

interface MultiImageUploadProps {
  value?: ImageFile[];
  onChange: (files: ImageFile[]) => void;
  maxFiles?: number;
  maxSize?: number; // in MB
  disabled?: boolean;
  className?: string;
}

export function MultiImageUpload({
  value = [],
  onChange,
  maxFiles = 5,
  maxSize = 5,
  disabled = false,
  className = "",
}: MultiImageUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Check max files
    if (value.length + files.length > maxFiles) {
      setError(`สามารถอัปโหลดได้สูงสุด ${maxFiles} รูป`);
      return;
    }

    setError(null);
    const newImageFiles: ImageFile[] = [];

    for (const file of files) {
      // Validate file size
      if (file.size > maxSize * 1024 * 1024) {
        setError(`ไฟล์ ${file.name} มีขนาดเกิน ${maxSize}MB`);
        continue;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError(`ไฟล์ ${file.name} ไม่ใช่รูปภาพ`);
        continue;
      }

      // Create preview
      const preview = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      newImageFiles.push({
        file,
        preview,
        id: `${Date.now()}-${Math.random()}`,
        isPrimary: false,
      });
    }

    const updatedFiles = [...value, ...newImageFiles];
    // Set first image as primary if no primary exists
    if (updatedFiles.length > 0 && !updatedFiles.some(img => img.isPrimary)) {
      updatedFiles[0].isPrimary = true;
    }

    onChange(updatedFiles);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = (id: string) => {
    const filtered = value.filter((img) => img.id !== id);
    // If removed image was primary and there are remaining images, make first one primary
    if (filtered.length > 0 && !filtered.some(img => img.isPrimary)) {
      filtered[0].isPrimary = true;
    }
    onChange(filtered);
  };

  const handleSetPrimary = (id: string) => {
    const updated = value.map((img) => ({
      ...img,
      isPrimary: img.id === id,
    }));
    onChange(updated);
  };

  const handleClick = () => {
    if (!disabled && value.length < maxFiles) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Image Grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {value.map((imageFile, index) => (
            <div
              key={imageFile.id}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 group transition-all ${
                imageFile.isPrimary
                  ? "border-blue-500 ring-2 ring-blue-300 dark:ring-blue-700"
                  : "border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500"
              }`}
            >
              <Image
                src={imageFile.preview}
                alt={`Preview ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
              {!disabled && (
                <>
                  <button
                    type="button"
                    onClick={() => handleRemove(imageFile.id)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg opacity-0 group-hover:opacity-100 z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {!imageFile.isPrimary && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(imageFile.id)}
                      className="absolute top-2 left-2 px-2 py-1 bg-gray-800/80 text-white text-xs rounded-md hover:bg-gray-900 transition-colors shadow-lg opacity-0 group-hover:opacity-100 z-10"
                    >
                      ตั้งเป็นรูปหลัก
                    </button>
                  )}
                </>
              )}
              {imageFile.isPrimary && (
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-blue-600 text-white text-xs rounded-md font-semibold shadow-lg">
                  รูปหลัก
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {value.length < maxFiles && (
        <div
          onClick={handleClick}
          className={`relative border-2 border-dashed rounded-xl overflow-hidden transition-all ${
            disabled
              ? "opacity-50 cursor-not-allowed border-gray-300 dark:border-gray-600"
              : "border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 cursor-pointer"
          }`}
        >
          <div className="aspect-video w-full flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <ImageIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <Upload className="w-5 h-5" />
              <span className="font-semibold">คลิกเพื่อเลือกรูปภาพ</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              PNG, JPG, WebP (สูงสุด {maxSize}MB)
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              เลือกได้สูงสุด {maxFiles} รูป ({value.length}/{maxFiles})
            </p>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        disabled={disabled}
        className="hidden"
      />

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-3">
          {error}
        </div>
      )}
    </div>
  );
}
