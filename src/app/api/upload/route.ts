import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/server-guard';
import { saveSecureUploadedImage, MAX_FILE_SIZE } from '@/lib/file-security';

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const category = (formData.get('category') as string) || 'photo';

    if (!file) {
      return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds maximum permitted size of 5MB' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save with magic bytes validation and cryptographic UUID filename
    const { url, filename } = await saveSecureUploadedImage(buffer, category);

    return NextResponse.json({
      success: true,
      url,
      filename,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
