import prisma from "@/lib/prisma";

export interface CreateAuditLogParams {
  userId?: string | null;
  action: string;
  entityType: "Issue" | "User" | "Software" | "Resolution" | "Testing" | "Regression" | "Assignment";
  entityId: string;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
  ipAddress?: string | null;
}

export async function recordAuditLog(params: CreateAuditLogParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValue: params.oldValue ? (typeof params.oldValue === "string" ? params.oldValue : JSON.stringify(params.oldValue)) : null,
        newValue: params.newValue ? (typeof params.newValue === "string" ? params.newValue : JSON.stringify(params.newValue)) : null,
        metadata: params.metadata ? (typeof params.metadata === "string" ? params.metadata : JSON.stringify(params.metadata)) : null,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    console.error("[AuditLog Error]: Failed to create audit record", error);
    return null;
  }
}
