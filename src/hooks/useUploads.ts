import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Upload {
  id: string;
  class_id: string;
  subject: string;
  topic: string;
  date: string;
  upload_type: "test" | "homework" | "worksheet";
  marking_scheme: string | null;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadFormData {
  classId: string;
  subject: string;
  topic: string;
  date: Date;
  uploadType: "test" | "homework" | "worksheet";
  markingScheme?: string;
  file: File;
}

export function useUploads(classId?: string) {
  return useQuery({
    queryKey: ["uploads", classId],
    queryFn: async () => {
      let query = supabase
        .from("uploads")
        .select("*")
        .order("created_at", { ascending: false });

      if (classId) {
        query = query.eq("class_id", classId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Upload[];
    },
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);

  const mutation = useMutation({
    mutationFn: async (formData: UploadFormData) => {
      setUploadProgress(10);

      // Generate unique file path
      const fileExt = formData.file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${formData.classId}/${formData.uploadType}/${fileName}`;

      setUploadProgress(30);

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(filePath, formData.file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadProgress(70);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("uploads")
        .getPublicUrl(filePath);

      // Insert record into uploads table
      const { data, error } = await supabase.from("uploads").insert({
        class_id: formData.classId,
        subject: formData.subject,
        topic: formData.topic,
        date: formData.date.toISOString().split("T")[0],
        upload_type: formData.uploadType,
        marking_scheme: formData.markingScheme || null,
        file_url: urlData.publicUrl,
        file_name: formData.file.name,
        file_type: formData.file.type,
        file_size: formData.file.size,
      }).select().single();

      if (error) throw error;

      setUploadProgress(100);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["uploads"] });
      setUploadProgress(0);
    },
    onError: () => {
      setUploadProgress(0);
    },
  });

  return {
    ...mutation,
    uploadProgress,
  };
}
