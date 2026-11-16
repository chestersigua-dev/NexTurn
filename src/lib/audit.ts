import crypto from 'crypto';
import { prisma } from './prisma';
import { AuditAction } from '@prisma/client';

export const GENESIS_PREVIOUS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Deterministic JSON stringifier (RFC 8785 canonicalization)
 * Guarantees identical hashing regardless of PostgreSQL jsonb key order.
 */
export function canonicalizeJson(obj: any): string {
  if (obj === null || obj === undefined) return '{}';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalizeJson).join(',') + ']';
  }
  const sortedKeys = Object.keys(obj).sort();
  const entries = sortedKeys.map((k) => JSON.stringify(k) + ':' + canonicalizeJson(obj[k]));
  return '{' + entries.join(',') + '}';
}

export function computeBlockHash(
  timestamp: Date,
  actorId: string | null,
  actorRole: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  details: any,
  previousHash: string
): string {
  const canonDetails = canonicalizeJson(details);
  const content = `${new Date(timestamp).toISOString()}|${actorId || ''}|${actorRole || ''}|${action}|${entityType}|${entityId || ''}|${canonDetails}|${previousHash}`;
  return crypto.createHash('sha256').update(content).digest('hex');
}

export interface RecordAuditParams {
  actorId?: string | null;
  actorRole?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  details?: any;
}

let writeLock = Promise.resolve();

async function doRecordAuditLog(params: RecordAuditParams) {
  try {
    const lastBlock = await prisma.auditLog.findFirst({
      orderBy: { timestamp: 'desc' },
      select: { currentHash: true },
    });

    const previousHash = lastBlock ? lastBlock.currentHash : GENESIS_PREVIOUS_HASH;
    const timestamp = new Date();

    const currentHash = computeBlockHash(
      timestamp,
      params.actorId || null,
      params.actorRole || null,
      params.action,
      params.entityType,
      params.entityId || null,
      params.details || {},
      previousHash
    );

    return await prisma.auditLog.create({
      data: {
        timestamp,
        actorId: params.actorId || null,
        actorRole: params.actorRole || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        details: params.details || {},
        previousHash,
        currentHash,
      },
    });
  } catch (error) {
    console.error('AuditLog writing failed:', error);
    return null;
  }
}

export async function recordAuditLog(params: RecordAuditParams) {
  return new Promise((resolve) => {
    writeLock = writeLock.then(async () => {
      try {
        const result = await doRecordAuditLog(params);
        resolve(result);
      } catch (err) {
        resolve(null);
      }
    });
  });
}

export interface VerificationResult {
  isValid: boolean;
  totalBlocks: number;
  genesisHash: string | null;
  latestHash: string | null;
  invalidBlockIndex?: number;
  invalidBlockId?: string;
  reason?: string;
  verifiedAt: string;
}

export async function verifyBlockchainIntegrity(): Promise<VerificationResult> {
  const blocks = await prisma.auditLog.findMany({
    orderBy: { timestamp: 'asc' },
  });

  const verifiedAt = new Date().toISOString();

  if (blocks.length === 0) {
    return {
      isValid: true,
      totalBlocks: 0,
      genesisHash: null,
      latestHash: null,
      verifiedAt,
    };
  }

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    // Check previousHash link
    if (i === 0) {
      if (block.previousHash !== GENESIS_PREVIOUS_HASH) {
        return {
          isValid: false,
          totalBlocks: blocks.length,
          genesisHash: block.currentHash,
          latestHash: blocks[blocks.length - 1].currentHash,
          invalidBlockIndex: i,
          invalidBlockId: block.id,
          reason: `Genesis block does not link to standard zero hash (found: ${block.previousHash})`,
          verifiedAt,
        };
      }
    } else {
      const prevBlock = blocks[i - 1];
      if (block.previousHash !== prevBlock.currentHash) {
        return {
          isValid: false,
          totalBlocks: blocks.length,
          genesisHash: blocks[0].currentHash,
          latestHash: blocks[blocks.length - 1].currentHash,
          invalidBlockIndex: i,
          invalidBlockId: block.id,
          reason: `Broken hash link at block #${i}. Block previousHash (${block.previousHash}) does not match previous block currentHash (${prevBlock.currentHash}).`,
          verifiedAt,
        };
      }
    }

    // Verify currentHash calculation
    const computed = computeBlockHash(
      block.timestamp,
      block.actorId,
      block.actorRole,
      block.action,
      block.entityType,
      block.entityId,
      block.details,
      block.previousHash
    );

    if (computed !== block.currentHash) {
      return {
        isValid: false,
        totalBlocks: blocks.length,
        genesisHash: blocks[0].currentHash,
        latestHash: blocks[blocks.length - 1].currentHash,
        invalidBlockIndex: i,
        invalidBlockId: block.id,
        reason: `Cryptographic tamper detected at block #${i}. Stored hash (${block.currentHash}) does not match recomputed hash (${computed}).`,
        verifiedAt,
      };
    }
  }

  return {
    isValid: true,
    totalBlocks: blocks.length,
    genesisHash: blocks[0].currentHash,
    latestHash: blocks[blocks.length - 1].currentHash,
    verifiedAt,
  };
}
