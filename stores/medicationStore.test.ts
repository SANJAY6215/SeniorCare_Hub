import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMedicationStore } from './medicationStore';
import { supabase } from '@/lib/supabase';

// Mock the supabase responses
const mockDose = {
  id: 'dose-1',
  medication_id: 'med-1',
  user_id: 'user-1',
  scheduled_time: '08:00',
  status: 'pending' as const,
  date: new Date().toISOString().split('T')[0],
};

const mockMed = {
  id: 'med-1',
  name: 'Test Med',
  dosage: '10mg',
  frequency: 'Daily',
  times: ['08:00'],
  reason: 'Testing',
  color: '#000',
  pills_remaining: 30,
};

describe('MedicationStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    useMedicationStore.setState({
      medications: [mockMed],
      doseLogs: [mockDose],
      loading: false,
    });
    vi.clearAllMocks();
  });

  it('should mark a dose as taken and decrement pill count', async () => {
    // Setup supabase mock for successful update
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    } as any);

    await useMedicationStore.getState().markTaken('dose-1');

    const state = useMedicationStore.getState();
    const updatedDose = state.doseLogs.find(d => d.id === 'dose-1');
    const updatedMed = state.medications.find(m => m.id === 'med-1');

    expect(updatedDose?.status).toBe('taken');
    expect(updatedMed?.pills_remaining).toBe(29);
  });

  it('should mark a dose as missed', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    } as any);

    await useMedicationStore.getState().markMissed('dose-1');

    const state = useMedicationStore.getState();
    const updatedDose = state.doseLogs.find(d => d.id === 'dose-1');

    expect(updatedDose?.status).toBe('missed');
  });

  it('should calculate today\'s doses correctly', () => {
    const doses = useMedicationStore.getState().getTodayDoses();
    expect(doses.length).toBe(1);
    expect(doses[0].id).toBe('dose-1');
  });
});
