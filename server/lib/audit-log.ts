import type { IStorage } from "../storage";

type AuditActor = {
  id?: number | string;
  name?: string;
  role?: string;
};

export type AuditLogPayload = {
  action: string;
  module: string;
  entityType?: string;
  entityId?: string | number;
  description: string;
  metadata?: Record<string, unknown> | string;
  createdAt?: string;
};

const stringifyMetadata = (metadata: AuditLogPayload["metadata"]): string => {
  if (typeof metadata === "string") {
    return metadata || "{}";
  }

  if (!metadata) {
    return "{}";
  }

  try {
    return JSON.stringify(metadata);
  } catch {
    return "{}";
  }
};

export async function logAuditEvent(storage: IStorage, actor: AuditActor | undefined, payload: AuditLogPayload): Promise<void> {
  try {
    await storage.createAuditLog({
      userId: actor?.id ? String(actor.id) : "",
      userName: actor?.name || "System",
      userRole: actor?.role || "",
      action: payload.action,
      module: payload.module,
      entityType: payload.entityType || "",
      entityId: payload.entityId ? String(payload.entityId) : "",
      description: payload.description,
      metadata: stringifyMetadata(payload.metadata),
      createdAt: payload.createdAt || new Date().toISOString(),
    });
  } catch (error) {
    console.error("[audit-log] failed to persist event", error);
  }
}
