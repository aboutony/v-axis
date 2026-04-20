// apps/web/src/types/document.ts

export type AdminDocCategory = 'ENTITY' | 'WORKFORCE';

export type AdminDocType = 
  | 'Trade License' 
  | 'Civil Defense' 
  | 'Chamber of Commerce' 
  | 'National Address' 
  | 'GOSI' 
  | 'Muqeem' 
  | 'Insurance' 
  | 'Passport';

export interface VAxisDocument {
  id: string;
  category: AdminDocCategory;
  type: AdminDocType;
  entityName: string;
  personName?: string; // Optional: Only for Workforce docs
  sponsor?: string;
  issueDate: string;
  expiryDate: string;
  fileUrl: string;
  status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';
}