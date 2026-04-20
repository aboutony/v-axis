// apps/api/src/services/storage.service.ts

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Calculating the path to the Sovereign Vault from the services directory
const VAULT_ROOT = path.join(__dirname, '../../../../storage/vault');

/**
 * SOVEREIGN HANDSHAKE: saveToSovereignVault
 * Matches the exact export requested by the document controller
 */
export const saveToSovereignVault = async (fileBuffer: Buffer, fileName: string): Promise<string> => {
  const filePath = path.join(VAULT_ROOT, fileName);
  
  // Ensure the vault directory exists
  await fs.mkdir(VAULT_ROOT, { recursive: true });
  
  await fs.writeFile(filePath, fileBuffer);
  
  // Returns the Sovereign URI format for database persistence
  return `vaxis://vault/${fileName}`;
};

export const storageService = {
  saveFile: saveToSovereignVault,
  async getFilePath(internalUrl: string): Promise<string> {
    const fileName = internalUrl.replace('vaxis://vault/', '');
    return path.join(VAULT_ROOT, fileName);
  }
};