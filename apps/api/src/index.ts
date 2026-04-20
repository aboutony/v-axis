// apps/api/src/index.ts

import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import multipart from '@fastify/multipart';
import path from 'path';
import { uploadAndSyncDocument } from './controllers/document.controller';
import { handleExecutiveExport } from './controllers/export.controller';

// 1. Initialize the Sovereign Engine
const app = Fastify({ 
  logger: true,
  bodyLimit: 52428800 // 50MB Global limit
});

// 2. AGGRESSIVE HANDSHAKE (CORS)
// Configured for strict 127.0.0.1 loopback stability
await app.register(cors, { 
  origin: ["http://localhost:9000", "http://127.0.0.1:9000"], 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  preflight: true
});

// 3. MULTIPART: The Circuit Breaker Configuration
// 'addToBody: true' stops the streaming race condition by collecting the file first
await app.register(multipart, {
  addToBody: true,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

// 4. STATIC: The Sovereign Vault Route
await app.register(fastifyStatic, {
  root: path.join(process.cwd(), '../../storage/vault'),
  prefix: '/vault/',
});

// 5. SOVEREIGN ROUTES
app.post('/api/v1/documents/upload', uploadAndSyncDocument);
app.get('/api/v1/export/executive/:organizationId', handleExecutiveExport);

// 6. WINDOWS-STRICT STARTUP
const start = async () => {
  try {
    const PORT = 3000;
    
    // Explicit 127.0.0.1 binding to bypass Windows DNS resolution lag
    await app.listen({ 
      port: PORT, 
      host: '127.0.0.1' 
    });

    console.log(`
    ---------------------------------------------------
    [V-AXIS CORE] Engine Pulse Active
    [V-AXIS CORE] Handshake: http://127.0.0.1:${PORT}
    [V-AXIS CORE] Status: READY FOR INGESTION
    ---------------------------------------------------
    `);
    
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();