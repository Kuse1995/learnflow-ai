/**
 * Document Extraction Hook
 * Uses AI to extract student data from images of paper registers
 */

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ExtractedStudent {
  name: string;
  studentId: string | null;
  grade: string | null;
  className: string | null;
  confidence: number;
}

export interface ExtractionResult {
  success: boolean;
  students: ExtractedStudent[];
  documentType: string;
  warnings: string[];
  studentCount: number;
  error?: string;
}

export function useDocumentExtraction() {
  const [isExtracting, setIsExtracting] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);

  const extractFromImage = async (file: File): Promise<ExtractionResult | null> => {
    setIsExtracting(true);
    setResult(null);

    try {
      // Convert file to base64
      const base64 = await fileToBase64(file);
      
      const { data, error } = await supabase.functions.invoke('extract-roster-from-image', {
        body: { imageBase64: base64 }
      });

      if (error) {
        console.error('Extraction error:', error);
        toast.error('Failed to extract data from image');
        return null;
      }

      if (!data.success) {
        toast.error(data.error || 'Extraction failed');
        return null;
      }

      const extractionResult: ExtractionResult = {
        success: true,
        students: data.students || [],
        documentType: data.documentType || 'unknown',
        warnings: data.warnings || [],
        studentCount: data.studentCount || 0,
      };

      setResult(extractionResult);

      if (extractionResult.warnings.length > 0) {
        toast.warning(`Extracted ${extractionResult.studentCount} students with warnings`);
      } else {
        toast.success(`Extracted ${extractionResult.studentCount} students`);
      }

      return extractionResult;
    } catch (error) {
      console.error('Extraction error:', error);
      toast.error('Failed to process image');
      return null;
    } finally {
      setIsExtracting(false);
    }
  };

  const extractFromUrl = async (imageUrl: string): Promise<ExtractionResult | null> => {
    setIsExtracting(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('extract-roster-from-image', {
        body: { imageUrl }
      });

      if (error) {
        console.error('Extraction error:', error);
        toast.error('Failed to extract data from image');
        return null;
      }

      if (!data.success) {
        toast.error(data.error || 'Extraction failed');
        return null;
      }

      const extractionResult: ExtractionResult = {
        success: true,
        students: data.students || [],
        documentType: data.documentType || 'unknown',
        warnings: data.warnings || [],
        studentCount: data.studentCount || 0,
      };

      setResult(extractionResult);
      toast.success(`Extracted ${extractionResult.studentCount} students`);
      return extractionResult;
    } catch (error) {
      console.error('Extraction error:', error);
      toast.error('Failed to process image');
      return null;
    } finally {
      setIsExtracting(false);
    }
  };

  const reset = () => {
    setResult(null);
    setIsExtracting(false);
  };

  return {
    extractFromImage,
    extractFromUrl,
    isExtracting,
    result,
    reset,
  };
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}
