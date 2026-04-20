// apps/api/src/controllers/document.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { saveToSovereignVault } from '../services/storage.service';
import crypto from 'crypto';

export const uploadAndSyncDocument = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    // 1. Dual-Path Detection: Check body (addToBody) OR direct file stream
    const body = request.body as any;
    let filePart = body?.document ? body.document[0] : await request.file();

    if (!filePart || (!filePart.data && !filePart.file)) {
      return reply.status(400).send({ 
        error: 'Sovereign Handshake Failed', 
        message: 'The CR document was not detected in the payload.' 
      });
    }

    // 2. Extract Buffer (Handling both memory-bus and stream-bus)
    const buffer = filePart.data || await filePart.toBuffer();
    const fileName = filePart.filename || 'cr_document.pdf';
    const uniqueFileName = `${Date.now()}-${fileName}`;

    // 3. Commit to the Vault
    const vaultUrl = await saveToSovereignVault(buffer, uniqueFileName);

    // 4. Success Response
    return reply.status(201).send({
      id: crypto.randomUUID(),
      name: fileName,
      url: vaultUrl,
      category: 'ENTITY',
      status: 'PROCESSED',
      uploadedAt: new Date().toISOString(),
    });

  } catch (err: any) {
    request.log.error(err);
    return reply.status(500).send({ 
      error: 'Ingestion Failure', 
      message: err.message || 'Internal Engine Error' 
    });
  }
};