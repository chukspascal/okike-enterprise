import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "./button";
import { cn } from "@/lib/utils";

function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
              const compressedFile = new File([blob], newName, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  bucket?: string;
  folder?: string;
  className?: string;
}

export function ImageUpload({
  value,
  onChange,
  bucket = "media",
  folder = "uploads",
  className,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setIsUploading(true);

    try {
      // Compress image client-side if it is larger than 1MB
      if (file.size > 1 * 1024 * 1024) {
        try {
          file = await compressImage(file);
        } catch (compressErr) {
          console.error("Compression failed, uploading original:", compressErr);
        }
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);

      onChange(urlData.publicUrl);
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error(error);
      if (error instanceof Error && error.message.includes("Bucket not found")) {
        toast.error("Please create a 'media' bucket in your Supabase Storage first!");
      } else {
        toast.error("Failed to upload image");
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {value ? (
        <div className="relative group">
          <img
            src={value}
            alt="Preview"
            className="w-full h-48 object-cover rounded-xl border border-ink/10"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-3 w-full h-48 bg-card border-2 border-dashed border-ink/20 rounded-xl cursor-pointer hover:border-brand/50 hover:bg-brand/5 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="p-3 bg-ink/5 rounded-full">
            <ImageIcon className="size-8 text-ink/40" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-ink">Click to upload image</p>
            <p className="text-xs text-ink/40">PNG, JPG, GIF up to 5MB</p>
          </div>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={isUploading}
        className="hidden"
      />
      {value && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? "Uploading..." : "Change Image"}
        </Button>
      )}
    </div>
  );
}
