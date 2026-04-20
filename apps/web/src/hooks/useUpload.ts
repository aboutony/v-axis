// apps/web/src/hooks/useUpload.ts

import { useState } from 'react';
import { VAxisDocument, AdminDocCategory } from '../types/document';

interface UploadParams {
  file: File;
  category: AdminDocCategory;
  entityName: string;
  personName?: string;
}

export const useUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadDocument = async ({ file, category, entityName, personName }: UploadParams): Promise<VAxisDocument | null> => {
    setIsUploading(true);
    setError(null);
    setProgress(10); // Initializing Handshake

    const formData = new FormData();
    formData.append('document', file);
    formData.append('category', category);
    formData.append('entityName', entityName);
    if (personName) formData.append('personName', personName);

    try {
      // SOVEREIGN HANDSHAKE: Using Strict IP to bypass Windows Localhost issues
      const response = await fetch('http://127.0.0.1:3000/api/v1/documents/upload', {
        method: 'POST',
        body: formData,
        // Mode 'cors' ensures the browser respects our API's aggressive CORS settings
        mode: 'cors',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Sovereign Handshake Failed');
      }

      setProgress(100);
      const newDoc: VAxisDocument = await response.json();
      return newDoc;

    } catch (err) {
      console.error('[V-AXIS UPLOAD ERROR]:', err);
      setError(err instanceof Error ? err.message : 'Unknown upload error');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadDocument, isUploading, progress, error };
};