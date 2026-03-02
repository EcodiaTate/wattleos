"use client";

import { useRef, useCallback } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { capturePhoto } from "@/lib/native/camera";
import { compressImage } from "@/lib/utils/image-compression";
import { isNative } from "@/lib/native/platform";

interface CameraCaptureButtonProps {
  onCapture: (file: File, previewUrl: string) => void;
  disabled?: boolean;
  className?: string;
}

export function CameraCaptureButton({
  onCapture,
  disabled = false,
  className = "",
}: CameraCaptureButtonProps) {
  const haptics = useHaptics();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNativeCapture = useCallback(async () => {
    const photo = await capturePhoto({ source: "camera", quality: 90 });
    if (!photo) return;

    haptics.impact("light");

    // Convert base64 to File for compression
    let file: File;
    if (photo.file) {
      file = photo.file;
    } else {
      const byteString = atob(photo.base64Data);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      file = new File([ab], `capture.${photo.extension}`, {
        type: photo.mimeType,
      });
    }

    const compressed = await compressImage(file, {
      maxDimension: 2048,
      maxSizeBytes: 3_145_728, // 3MB - higher quality for ID photos
    });

    const previewUrl = URL.createObjectURL(compressed);
    onCapture(compressed, previewUrl);
  }, [haptics, onCapture]);

  const handleWebCapture = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      haptics.impact("light");

      const compressed = await compressImage(file, {
        maxDimension: 2048,
        maxSizeBytes: 3_145_728,
      });

      const previewUrl = URL.createObjectURL(compressed);
      onCapture(compressed, previewUrl);

      // Reset the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [haptics, onCapture],
  );

  const handleClick = useCallback(() => {
    if (isNative()) {
      void handleNativeCapture();
    } else {
      handleWebCapture();
    }
  }, [handleNativeCapture, handleWebCapture]);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`active-push touch-target inline-flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50 ${className}`}
        style={{
          background: "var(--primary)",
          color: "var(--primary-foreground)",
        }}
      >
        <span className="text-base" aria-hidden="true">
          {"\uD83D\uDCF7"}
        </span>
        Take Photo
      </button>

      {/* Hidden file input for web fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
    </>
  );
}
