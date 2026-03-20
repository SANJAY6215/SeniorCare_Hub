import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

serve(async (req) => {
  try {
    const { record, old_record } = await req.json();

    // Only proceed if status changed to 'missed'
    if (record.status !== 'missed') {
      return new Response(JSON.stringify({ message: "Not a missed dose" }), { status: 200 });
    }

    // Initialize Supabase Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Get Senior Name and Medication Name
    const { data: medData } = await supabaseClient
      .from('medications')
      .select('name, profiles(first_name, last_name)')
      .eq('id', record.medication_id)
      .single();

    if (!medData) throw new Error("Medication not found");

    const seniorName = `${medData.profiles?.first_name} ${medData.profiles?.last_name}`;
    const medName = medData.name;

    // 2. Find linked Caregivers with push tokens
    const { data: caregivers } = await supabaseClient
      .from('profiles')
      .select('expo_push_token, first_name')
      .eq('linked_senior_id', record.user_id)
      .not('expo_push_token', 'is', null);

    if (!caregivers || caregivers.length === 0) {
      return new Response(JSON.stringify({ message: "No caregivers with tokens found" }), { status: 200 });
    }

    // 3. Prepare Push Notifications
    const notifications = caregivers.map(cg => ({
      to: cg.expo_push_token,
      sound: 'default',
      title: '⚠️ Missed Medication Alert',
      body: `Warning: ${seniorName} has missed their dosage of ${medName} scheduled for ${record.scheduled_time}.`,
      data: { seniorId: record.user_id, medId: record.medication_id },
      priority: 'high',
    }));

    // 4. Send to Expo
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notifications),
    });

    const result = await response.json();
    console.log("Expo response:", result);

    return new Response(JSON.stringify({ success: true, count: notifications.length }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in notify-caregiver:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
