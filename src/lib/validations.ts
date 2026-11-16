import { z } from 'zod';
import { Role } from '@prisma/client';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  currentPassword: z.string().optional().or(z.literal('')),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').optional().or(z.literal('')),
  rfidNumber: z
    .string()
    .regex(/^\d{10}$/, 'RFID must be exactly 10 digits')
    .optional()
    .or(z.literal(''))
    .nullable(),
  photoUrl: z.string().optional().nullable(),
});

export const userCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  role: z.nativeEnum(Role),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rfidNumber: z
    .string()
    .regex(/^\d{10}$/, 'RFID must be exactly 10 digits')
    .optional()
    .or(z.literal(''))
    .nullable(),
});

export const userUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  role: z.nativeEnum(Role),
  password: z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('')),
  rfidNumber: z
    .string()
    .regex(/^\d{10}$/, 'RFID must be exactly 10 digits')
    .optional()
    .or(z.literal(''))
    .nullable(),
});

export const teacherSchema = z.object({
  employeeNumber: z.string().min(3, 'Employee number is required').max(50),
  firstName: z.string().min(1, 'First name is required').max(100),
  middleName: z.string().max(100).optional().nullable(),
  lastName: z.string().min(1, 'Last name is required').max(100),
  suffix: z.string().max(20).optional().nullable(),
  position: z.string().min(1, 'Position is required').max(100),
  department: z.string().min(1, 'Department is required').max(100),
  email: z.string().email('Invalid email address').optional().or(z.literal('')).nullable(),
  contactNumber: z.string().min(7, 'Contact number is required').max(30),
  dateHired: z.string().or(z.date()),
  rfidNumber: z.string().regex(/^\d{10}$/, 'RFID must be exactly 10 numeric digits'),
  photoUrl: z.string().optional().nullable(),
  employmentStatus: z.string().default('REGULAR'),
});

export const studentSchema = z.object({
  lrn: z.string().regex(/^\d{12}$/, 'LRN must be exactly 12 numeric digits'),
  firstName: z.string().min(1, 'First name is required').max(100),
  middleName: z.string().max(100).optional().nullable(),
  lastName: z.string().min(1, 'Last name is required').max(100),
  suffix: z.string().max(20).optional().nullable(),
  sex: z.enum(['MALE', 'FEMALE']),
  birthdate: z.string().or(z.date()),
  age: z.coerce.number().int().min(3).max(100),
  gradeLevel: z.string().min(1, 'Grade level is required'),
  section: z.string().min(1, 'Section is required'),
  trackStrand: z.string().optional().nullable(),
  guardianName: z.string().min(1, 'Parent/Guardian name is required').max(150),
  guardianContact: z.string().min(7, 'Guardian contact number is required').max(30),
  address: z.string().min(3, 'Address is required').max(255),
  rfidNumber: z.string().regex(/^\d{10}$/, 'RFID must be exactly 10 numeric digits'),
  photoUrl: z.string().optional().nullable(),
  status: z.string().default('ACTIVE'),
});

export const schoolSettingsSchema = z.object({
  schoolName: z.string().min(2, 'School name is required').max(200),
  schoolAddress: z.string().min(5, 'School address is required').max(300),
  contactInfo: z.string().min(3, 'Contact info is required').max(150),
  principalName: z.string().min(2, 'Principal name is required').max(150),
  logoUrl: z.string().optional().nullable(),
});

export const turnstileSettingsSchema = z.object({
  autoToggleDirection: z.boolean(),
  soundFeedback: z.boolean(),
  displayDurationSeconds: z.number().int().min(1).max(30),
  announcementText: z.string().max(250).optional().nullable(),
});

export const rbacUpdateSchema = z.object({
  permissions: z.array(
    z.object({
      role: z.nativeEnum(Role),
      module: z.string(),
      isAllowed: z.boolean(),
    })
  ),
});

export const turnstileScanSchema = z.object({
  rfidNumber: z.string().regex(/^\d{10}$/, 'RFID Number must be exactly 10 digits'),
  forcedDirection: z.enum(['CLOCK_IN', 'CLOCK_OUT', 'AUTO']).default('AUTO'),
  deviceSource: z.string().default('TURNSTILE_KIOSK'),
});

export const classroomAttendanceSchema = z.object({
  studentId: z.string().uuid(),
  teacherId: z.string().optional().nullable(),
  subject: z.string().min(1, 'Subject is required'),
  gradeLevel: z.string().min(1, 'Grade level is required'),
  section: z.string().min(1, 'Section is required'),
  date: z.string().or(z.date()).optional(),
  status: z.enum(['PRESENT', 'LATE', 'ABSENT', 'EXCUSED']),
  remarks: z.string().max(250).optional().nullable(),
});
