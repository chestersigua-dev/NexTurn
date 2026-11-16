import { NextRequest, NextResponse } from 'next/server';
import { requireModuleAccess, handleApiError } from '@/lib/server-guard';
import { prisma } from '@/lib/prisma';
import { AuditAction } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    await requireModuleAccess('audit_logs', req);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const action = searchParams.get('action') || '';
    const entityType = searchParams.get('entityType') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 500);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (action && action !== 'ALL' && Object.values(AuditAction).includes(action as AuditAction)) {
      where.action = action as AuditAction;
    }

    if (entityType && entityType !== 'ALL') {
      where.entityType = entityType;
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.timestamp.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { currentHash: { contains: search } },
        { previousHash: { contains: search } },
        { entityId: { contains: search } },
        { actorRole: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [totalCount, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      logs: logs.map((l) => ({
        id: l.id,
        timestamp: l.timestamp.toISOString(),
        millisecondTimestamp: l.timestamp.toISOString().replace('T', ' ').replace('Z', ''),
        actorId: l.actorId,
        actorRole: l.actorRole,
        actorName: l.actor?.name || 'System / Kiosk',
        actorEmail: l.actor?.email || null,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        details: l.details,
        previousHash: l.previousHash,
        currentHash: l.currentHash,
      })),
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
