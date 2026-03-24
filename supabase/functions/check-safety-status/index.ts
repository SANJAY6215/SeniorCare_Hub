/// <reference path="../deno_types.d.ts" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

Deno.serve(async (req: Request) => {
  try {
    const secret = req.headers.get("X-Function-Secret");
    if (secret !== Deno.env.get("FUNCTION_SECRET")) {
      console.warn("Unauthorized request to check-safety-status.");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Find seniors whose status is still 'pending' and last_check_in wasn't today
    const { data: seniors, error: seniorError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('role', 'senior')
      .eq('check_in_status', 'pending');

    if (seniorError) throw seniorError;
    if (!seniors || seniors.length === 0) {
      return new Response(JSON.stringify({ message: 'All seniors have checked in.' }), { status: 200 });
    }

    const alerts = [];

    for (const senior of seniors) {
      // 2. Find caregivers linked to this senior
      const { data: caregivers, error: cgError } = await supabase
        .from('profiles')
        .select('expo_push_token')
        .eq('role', 'caregiver')
        .eq('linked_senior_id', senior.id)
        .not('expo_push_token', 'is', null);

      if (cgError) continue;

      for (const caregiver of caregivers) {
        alerts.push({
          to: caregiver.expo_push_token,
          sound: 'default',
          title: '⚠️ Safety Alert',
          body: `${senior.first_name} has not checked in yet today. Please check on them.`,
          data: { seniorId: senior.id, type: 'safety_alert' },
          priority: 'high',
        });
      }
    }

    // 3. Send notifications via Expo
    if (alerts.length > 0) {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alerts),
      });
      const result = await response.json();
      return new Response(JSON.stringify({ result }), { status: 200 });
    }

    return new Response(JSON.stringify({ message: 'No alerts needed.' }), { status: 200 });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
