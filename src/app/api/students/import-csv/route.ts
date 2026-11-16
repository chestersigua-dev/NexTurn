import { NextRequest, NextResponse } from 'next/server';
import { requireModuleAccess, handleApiError } from '@/lib/server-guard';
import { prisma } from '@/lib/prisma';
import Papa from 'papaparse';
import { recordAuditLog } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

export interface ColumnMapping {
  lrn: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  sex: string;
  birthdate: string;
  age?: string;
  gradeLevel: string;
  section: string;
  trackStrand?: string;
  guardianName: string;
  guardianContact: string;
  address: string;
  rfidNumber?: string;
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await requireModuleAccess('students', req);
    const body = await req.json();
    const { csvContent, mapping, action = 'preview' } = body;

    if (!csvContent || typeof csvContent !== 'string') {
      return NextResponse.json({ error: 'Valid CSV content string is required' }, { status: 400 });
    }

    // Parse CSV
    const parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return NextResponse.json(
        { error: 'Failed to parse CSV file', details: parsed.errors },
        { status: 400 }
      );
    }

    const headers = parsed.meta.fields || [];
    const rows = parsed.data as Record<string, string>[];

    // Auto-detect standard DepEd SF1 / LIS headers if mapping is not provided
    const autoDetectedMapping: Record<string, string> = {
      lrn: headers.find((h) => /lrn|learner.*ref/i.test(h)) || 'LRN',
      lastName: headers.find((h) => /last.*name|surname/i.test(h)) || 'Last Name',
      firstName: headers.find((h) => /first.*name|given.*name/i.test(h)) || 'First Name',
      middleName: headers.find((h) => /middle.*name/i.test(h)) || 'Middle Name',
      suffix: headers.find((h) => /suffix|ext/i.test(h)) || 'Suffix',
      sex: headers.find((h) => /sex|gender/i.test(h)) || 'Sex',
      birthdate: headers.find((h) => /birth|dob/i.test(h)) || 'Birthdate',
      age: headers.find((h) => /^age$/i.test(h)) || 'Age',
      gradeLevel: headers.find((h) => /grade/i.test(h)) || 'Grade Level',
      section: headers.find((h) => /section/i.test(h)) || 'Section',
      trackStrand: headers.find((h) => /track|strand/i.test(h)) || 'Track/Strand',
      guardianName: headers.find((h) => /guardian|parent/i.test(h)) || 'Parent/Guardian',
      guardianContact: headers.find((h) => /contact|phone|mobile/i.test(h)) || 'Guardian Contact',
      address: headers.find((h) => /address|residence/i.test(h)) || 'Address',
      rfidNumber: headers.find((h) => /rfid/i.test(h)) || 'RFID Number',
    };

    if (action === 'preview') {
      return NextResponse.json({
        totalRows: rows.length,
        headers,
        autoDetectedMapping,
        previewRows: rows.slice(0, 5),
      });
    }

    // Action === 'import'
    const activeMapping = mapping || autoDetectedMapping;
    let inserted = 0;
    let updated = 0;
    const errors: Array<{ row: number; lrn?: string; reason: string }> = [];

    // Helper to generate a unique 10-digit RFID if row has none
    let rfidSeed = 8000000000;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-based + 1 for header

      const rawLrn = (row[activeMapping.lrn] || '').trim().replace(/\D/g, '');
      if (rawLrn.length !== 12) {
        errors.push({
          row: rowNum,
          lrn: rawLrn,
          reason: `LRN must be exactly 12 numeric digits (found: "${rawLrn}")`,
        });
        continue;
      }

      const firstName = (row[activeMapping.firstName] || '').trim();
      const lastName = (row[activeMapping.lastName] || '').trim();
      if (!firstName || !lastName) {
        errors.push({
          row: rowNum,
          lrn: rawLrn,
          reason: 'First Name and Last Name are required',
        });
        continue;
      }

      const middleName = activeMapping.middleName ? (row[activeMapping.middleName] || '').trim() : null;
      const suffix = activeMapping.suffix ? (row[activeMapping.suffix] || '').trim() : null;

      let sex = (row[activeMapping.sex] || 'MALE').trim().toUpperCase();
      if (sex.startsWith('M')) sex = 'MALE';
      else if (sex.startsWith('F')) sex = 'FEMALE';
      else sex = 'MALE';

      const birthdateStr = (row[activeMapping.birthdate] || '2009-01-01').trim();
      let birthdate = new Date(birthdateStr);
      if (isNaN(birthdate.getTime())) {
        birthdate = new Date('2009-01-01');
      }

      let age = parseInt(row[activeMapping.age] || '16', 10);
      if (isNaN(age) || age < 3 || age > 99) {
        age = 16;
      }

      const gradeLevel = (row[activeMapping.gradeLevel] || 'Grade 10').trim();
      const section = (row[activeMapping.section] || 'Section 1').trim();
      const trackStrand = activeMapping.trackStrand ? (row[activeMapping.trackStrand] || '').trim() || null : null;
      const guardianName = (row[activeMapping.guardianName] || `${lastName} Family`).trim();
      const guardianContact = (row[activeMapping.guardianContact] || '09170000000').trim();
      const address = (row[activeMapping.address] || 'School District, Philippines').trim();

      // Handle RFID (ensure 10 digits)
      let rfid = activeMapping.rfidNumber ? (row[activeMapping.rfidNumber] || '').trim().replace(/\D/g, '') : '';
      if (rfid.length !== 10) {
        // Look up if student already exists and keep their RFID
        const existingStudent = await prisma.student.findUnique({
          where: { lrn: rawLrn },
          select: { rfidNumber: true },
        });

        if (existingStudent?.rfidNumber) {
          rfid = existingStudent.rfidNumber;
        } else {
          // Generate unique 10-digit sequential
          rfid = (rfidSeed++).toString();
        }
      }

      try {
        const student = await prisma.student.upsert({
          where: { lrn: rawLrn },
          update: {
            firstName,
            middleName: middleName || null,
            lastName,
            suffix: suffix || null,
            sex,
            birthdate,
            age,
            gradeLevel,
            section,
            trackStrand,
            guardianName,
            guardianContact,
            address,
            // Keep existing RFID if collision would occur
            rfidNumber: rfid,
          },
          create: {
            lrn: rawLrn,
            firstName,
            middleName: middleName || null,
            lastName,
            suffix: suffix || null,
            sex,
            birthdate,
            age,
            gradeLevel,
            section,
            trackStrand,
            guardianName,
            guardianContact,
            address,
            rfidNumber: rfid,
            status: 'ACTIVE',
          },
        });

        // Check if upsert was create or update
        if (student.createdAt.getTime() === student.updatedAt.getTime()) {
          inserted++;
        } else {
          updated++;
        }
      } catch (upsertErr: any) {
        errors.push({
          row: rowNum,
          lrn: rawLrn,
          reason: upsertErr.message.includes('Unique constraint')
            ? 'RFID or LRN collision occurred for this record'
            : upsertErr.message,
        });
      }
    }

    // Record audit log
    await recordAuditLog({
      actorId: sessionUser.id,
      actorRole: sessionUser.role,
      action: AuditAction.CREATE,
      entityType: 'StudentCsvImport',
      details: {
        totalRows: rows.length,
        inserted,
        updated,
        errorCount: errors.length,
      },
    });

    return NextResponse.json({
      success: true,
      totalRows: rows.length,
      inserted,
      updated,
      errors,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
