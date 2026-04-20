// apps/web/src/components/upload/DocumentUploadContainer.tsx

import React, { useRef } from 'react';
import { useUpload } from '../../hooks/useUpload';
import { AdminDocCategory, VAxisDocument } from '../../types/document';

interface DocumentUploadContainerProps {
  activeTab: 'entity' | 'workforce';
  onUploadSuccess?: (doc: VAxisDocument) => void;
}

const DocumentUploadContainer: React.FC<DocumentUploadContainerProps> = ({ 
  activeTab, 
  onUploadSuccess 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadDocument, isUploading, error } = useUpload();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const result = await uploadDocument({
      file,
      category: activeTab.toUpperCase() as AdminDocCategory,
      entityName: 'PAC Technologies',
    });

    if (result && onUploadSuccess) {
      onUploadSuccess(result);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div 
      onClick={() => fileInputRef.current?.click()}
      className={`relative group cursor-pointer rounded-3xl border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center p-12
        ${isUploading ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-200 hover:border-emerald-400 bg-slate-50/50 hover:bg-emerald-50/5'}`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png"
      />

      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors">
          <span className="text-3xl font-light">+</span>
        </div>
        
        <p className="text-slate-500 font-bold tracking-widest text-[10px] uppercase">
          {isUploading ? 'Ingesting Asset...' : 'Drop Administrative Asset'}
        </p>

        {error && (
          <p className="text-rose-500 text-[9px] font-bold uppercase animate-pulse">
            Error: {error}
          </p>
        )}
      </div>
    </div>
  );
};

export default DocumentUploadContainer;