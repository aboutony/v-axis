// apps/api/src/controllers/upload.controller.ts

import { Request, Response } from 'express';
import { processDocumentMetadata } from '../services/extractor.service';
import { saveToSovereignVault } from '../services/storage.service';

export const handleDocumentUpload = async (req: Request, res: Response) => {
  try {
    const file = req.file; // The Muqeem or Trade License
    const { category, entityName, personName } = req.body;

    // 1. Save the physical file to the secure vault
    const fileUrl = await saveToSovereignVault(file);

    // 2. Extract key dates (Muqeem Expiry, License Date) via the Bridge
    const metadata = await processDocumentMetadata(file);

    // 3. Construct the VAxisDocument object for the DB
    const newDoc = {
      id: generateSovereignID(),
      category,
      type: metadata.detectedType,
      entityName,
      personName,
      expiryDate: metadata.expiryDate,
      fileUrl,
      status: 'ACTIVE' // Will be recalculated by the frontend engine
    };

    // 4. Update the database and return the "Live Signal"
    await db.documents.create(newDoc);
    res.status(201).json(newDoc);
    
  } catch (error) {
    res.status(500).json({ message: "Upload Handshake Failed", error });
  }
};