"use client";

import { useState, useRef, ChangeEvent } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  onUpload?: (mediaId: string) => void;
  folder?: string;
  entityType?: string;
  entityId?: string;
  disabled?: boolean;
  maxSize?: number; // in MB
  className?: string;
}

export function ImageUpload({
  value,
  onChange,
  onUpload,
  folder = "products",
  entityType,
  entityId,
  disabled = false,
  maxSize = 5,
  className = "",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`ไฟล์ต้องมีขนาดไม่เกิน ${maxSize}MB`);
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to server
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);
      if (entityType) formData.append("entity_type", entityType);
      if (entityId) formData.append("entity_id", entityId);

      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload image");
      }

      const data = await response.json();
      onChange(data.url);
      if (onUpload) {
        onUpload(data.id);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอัพโหลด");
      setPreview(value || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div
        onClick={handleClick}
        className={`relative border-2 border-dashed rounded-xl overflow-hidden transition-all ${
          preview
            ? "border-gray-300 dark:border-gray-600"
            : "border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950"
        } ${disabled || uploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        {preview ? (
          <div className="relative aspect-square w-full max-w-xs mx-auto">
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 384px"
              unoptimized
            />
            {!disabled && !uploading && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-square w-full max-w-xs mx-auto flex flex-col items-center justify-center p-8 text-center">
            {uploading ? (
              <>
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <p className="text-sm text-gray-600 dark:text-gray-300">กำลังอัพโหลด...</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                  <ImageIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <Upload className="w-5 h-5" />
                  <span className="font-semibold">คลิกเพื่ออัพโหลดรูปภาพ</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  PNG, JPG, WebP (สูงสุด {maxSize}MB)
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
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
