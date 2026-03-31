import type { FastifyReply, FastifyRequest } from "fastify";

import type { PermissionFlag } from "@vaxis/domain";

export async function ensureAuthenticated(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await request.jwtVerify();
    return true;
  } catch {
    await reply.code(401).send({
      error: "UNAUTHORIZED",
      message: "A valid access token is required.",
    });

    return false;
  }
}

export function ensurePermission(
  request: FastifyRequest,
  reply: FastifyReply,
  permission: PermissionFlag,
) {
  if (!request.user.permissions.includes(permission)) {
    void reply.code(403).send({
      error: "FORBIDDEN",
      message: `This action requires the ${permission} permission.`,
    });

    return false;
  }

  return true;
}
