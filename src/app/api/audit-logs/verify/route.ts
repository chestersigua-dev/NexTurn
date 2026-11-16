import { NextRequest, NextResponse } from 'next/server';
import { requireModuleAccess, handleApiError } from '@/lib/server-guard';
import { verifyBlockchainIntegrity } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    await requireModuleAccess('audit_logs', req);

    const verificationResult = await verifyBlockchainIntegrity();

    return NextResponse.json({
      success: true,
      verification: verificationResult,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
