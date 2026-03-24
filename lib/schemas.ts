import { z } from 'zod';

export const MedicationSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  name: z.string().min(1).max(100).trim(),
  dosage: z.string().min(1).max(50).trim(),
  frequency: z.string().min(1).max(50).trim(),
  times: z.array(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/)), // 24h format HH:mm
  reason: z.string().max(200).trim().optional(),
  color: z.string().regex(/^#([A-Fa-f0-9]{3}){1,2}$/),
  pills_remaining: z.number().int().nonnegative().optional(),
  refill_threshold: z.number().int().nonnegative().optional(),
});

export const DoseLogSchema = z.object({
  id: z.string().uuid().optional(),
  medication_id: z.string().uuid(),
  user_id: z.string().uuid(),
  scheduled_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  actual_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  status: z.enum(['taken', 'missed', 'pending', 'snoozed']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(500).trim().optional(),
});

export const ProfileSchema = z.object({
  id: z.string().uuid().optional(),
  first_name: z.string().min(1).max(50).trim(),
  last_name: z.string().min(1).max(50).trim(),
  role: z.enum(['senior', 'caregiver']),
  age: z.number().int().min(0).max(120),
  phone: z.string().regex(/^\+?[\d\s-]{10,15}$/).trim(),
  emergency_contacts: z.array(z.object({
    name: z.string().min(1),
    relationship: z.string(),
    phone: z.string().regex(/^\+?[\d\s-]{10,15}$/),
    isPrimary: z.boolean(),
  })),
  conditions: z.array(z.string()),
  language: z.string().max(50),
  text_size: z.enum(['medium', 'large', 'extra-large']),
  dark_mode: z.boolean(),
  is_premium: z.boolean().optional(),
  sound_enabled: z.boolean().optional(),
  vibration_enabled: z.boolean().optional(),
  voice_assist_enabled: z.boolean().optional(),
  gender: z.string().optional(),
  family_code: z.string().optional(),
  linked_senior_id: z.string().uuid().optional(),
  dietary_profile: z.record(z.any()).optional(),
  last_check_in: z.string().optional(),
  check_in_status: z.string().optional(),
  expo_push_token: z.string().optional(),
});

export const VitalSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  type: z.enum(['bp', 'hr', 'weight', 'glucose', 'spo2', 'temp']),
  value: z.string().min(1).max(20).trim(),
  unit: z.string().min(1).max(20).trim(),
  measured_at: z.string().datetime(),
  status: z.string().min(1).max(50).trim().optional(),
  notes: z.string().max(500).trim().optional(),
});

export const AppointmentSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  doctor: z.string().min(1).max(100).trim(),
  specialty: z.string().min(1).max(100).trim(),
  date: z.string().datetime(),
  location: z.string().min(1).max(200).trim(),
  phone: z.string().regex(/^\+?[\d\s-]{10,15}$/).trim().optional(),
  notes: z.string().max(500).trim().optional(),
  status: z.enum(['pending', 'visited']).optional(),
});
