import "@fastify/jwt";

import type { AuthTokenPayload } from "./auth";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthTokenPayload;
    user: AuthTokenPayload;
  }
}
