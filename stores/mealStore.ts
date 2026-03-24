import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';
import { useVitalsStore } from '@/stores/vitalsStore';
import { Alert } from 'react-native';

export interface Meal {
  id: string;
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories?: number;
  macros?: { protein: number; carbs: number; fat: number };
  benefits: string[];
  warnings: string[];
  day: string; // ISO date string
}

interface MealStore {
  weeklyPlan: Meal[];
  loading: boolean;
  activePlanId: string | null;
  
  fetchPlan: () => Promise<void>;
  generateAIPlan: () => Promise<void>;
  logMealConsumption: (mealId: string) => Promise<void>;
}

export const useMealStore = create<MealStore>((set, get) => ({
  weeklyPlan: [],
  loading: false,
  activePlanId: null,

  fetchPlan: async () => {
    set({ loading: true });
    // In production, this would fetch from a 'meal_plans' table
    await new Promise(r => setTimeout(r, 800));
    set({ loading: false });
  },

  generateAIPlan: async () => {
    set({ loading: true });
    
    // 1. Gather health context for personalization
    const { profile } = useUserStore.getState();
    const { readings } = useVitalsStore.getState();
    const latestBP = readings.find(r => r.type === 'bp');
    const latestGlucose = readings.find(r => r.type === 'glucose');
    
    let focus = 'General Wellness';
    if (latestBP && (parseInt(latestBP.value.split('/')[0]) > 130)) focus = 'Hypertension (Lower Sodium)';
    if (latestGlucose && (parseInt(latestGlucose.value) > 140)) focus = 'Diabetic Friendly (Low Glycemic)';

    // 2. Mock Gemini AI Generation
    await new Promise(r => setTimeout(r, 3000));
    
    const today = new Date();
    const newPlan: Meal[] = [];
    const mealTypes: ('breakfast' | 'lunch' | 'dinner')[] = ['breakfast', 'lunch', 'dinner'];
    
    // Generate for next 3 days for demo
    for (let i = 0; i < 3; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        
        mealTypes.forEach(type => {
            newPlan.push({
                id: Math.random().toString(36).substr(2, 9),
                name: type === 'breakfast' ? 'Oatmeal with Blueberries & Flax' : type === 'lunch' ? 'Grilled Salmon Salad' : 'Quinoa and Roasted Vegetables',
                type,
                calories: type === 'breakfast' ? 320 : type === 'lunch' ? 450 : 520,
                benefits: [focus, 'High Fiber', 'Omega-3'],
                warnings: [],
                day: dateStr,
            });
        });
    }

    set({ weeklyPlan: newPlan, loading: false });
    
    // Security Audit Log
    const targetUserId = useUserStore.getState().getTargetUserId();
    await supabase.rpc('log_security_event', {
      event_name: 'MEAL_PLAN_GENERATED',
      details: `AI generated a new ${focus} meal plan for the user.`,
      user_id: targetUserId,
      severity_level: 'info'
    });

    Alert.alert('Plan Ready!', `Gemini has generated a ${focus} meal plan based on your recent health readings.`);
  },

  logMealConsumption: async (mealId) => {
    Alert.alert('Meal Logged', 'Your consumption has been recorded to your health history.');
  }
}));
