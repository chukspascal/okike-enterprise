import { useState, useRef } from "react";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  value?: string | null;
  onChange: (url: string | null, name?: string | null) => void;
  fileName?: string | null;
  bucket?: string;
  folder?: string;
  className?: string;
}

export function FileUpload({
  value,
  onChange,
  fileName,
  bucket = "media",
  folder = "inquiries",
  className,
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (10MB limit)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error("File is too large. Max size is 10MB.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const fileExt = file.name.split(".").pop();
      const cleanFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${folder}/${cleanFileName}`;

      setUploadProgress(30);

      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);

      if (uploadError) throw uploadError;

      setUploadProgress(70);

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);

      setUploadProgress(100);
      onChange(urlData.publicUrl, file.name);
      toast.success("File uploaded successfully");
    } catch (error) {
      console.error(error);
      if (error instanceof Error && error.message.includes("Bucket not found")) {
        toast.error("Please create a 'media' bucket in your Supabase Storage first!");
      } else {
        toast.error("Failed to upload file");
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const getFileNameFromUrl = (url: string) => {
    if (fileName) return fileName;
    try {
      const decoded = decodeURIComponent(url);
      return decoded.split("/").pop() || "Uploaded File";
    } catch {
      return "Uploaded File";
    }
  };

  return (
    <div className={cn("flex flex-col gap-2 w-full", className)}>
      {value ? (
        <div className="flex items-center justify-between gap-3 p-4 bg-emerald-500/5 ring-1 ring-emerald-500/20 rounded-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg shrink-0">
              <FileText className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-ink truncate max-w-[250px] sm:max-w-[400px]">
                {getFileNameFromUrl(value)}
              </p>
              <a
                href={value}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-brand hover:underline font-medium block mt-0.5"
              >
                View uploaded file &rarr;
              </a>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange(null, null)}
            className="p-1 text-ink/40 hover:text-red-500 hover:bg-red-500/5 rounded-full transition-colors shrink-0"
            aria-label="Remove file"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-3 w-full p-6 bg-card border border-dashed border-ink/10 rounded-xl cursor-pointer hover:border-brand/40 hover:bg-brand/5 transition-all duration-200"
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="size-8 text-brand animate-spin" />
              <p className="text-xs text-ink/60 font-medium">Uploading file ({uploadProgress}%)...</p>
            </div>
          ) : (
            <>
              <div className="p-3 bg-ink/5 rounded-full text-ink/40 hover:text-brand hover:bg-brand/10 transition-colors">
                <Upload className="size-6" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-ink">Upload reference file or brief</p>
                <p className="text-xs text-ink/40 mt-1">PDF, DOCX, TXT, Images, ZIP up to 10MB</p>
              </div>
            </>
          )}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.rtf,.png,.jpg,.jpeg,.zip"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
