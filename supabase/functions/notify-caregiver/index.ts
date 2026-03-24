/// <reference path="./../deno_types.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

serve(async (req: Request) => {
  try {
    const secret = req.headers.get("X-Function-Secret");
    if (secret !== Deno.env.get("FUNCTION_SECRET")) {
      console.warn("Unauthorized attempt to trigger notification function.");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const body = await req.json();
    console.log("Received body:", JSON.stringify(body, null, 2));
    const { record } = body;

    if (!record || !record.medication_id || !record.user_id) {
       console.error("Invalid record schema:", record);
       return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400 });
    }

    // Only proceed if status changed to 'missed'
    if (record?.status !== 'missed') {
      console.log("Status is not 'missed', skipping. Current status:", record?.status);
      return new Response(JSON.stringify({ message: "Not a missed dose" }), { status: 200 });
    }

    console.log("Processing missed dose for medication_id:", record.medication_id);

    // Initialize Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      throw new Error("Edge Function configuration error");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // 1. Get Medication Name and Senior Profile
    console.log("Fetching medication and senior profile...");
    const { data: medData, error: medError } = await supabaseClient
      .from('medications')
      .select('name, user_id')
      .eq('id', record.medication_id)
      .single();

    if (medError || !medData) {
      console.error("Medication fetch error:", medError?.message || "No data found");
      throw new Error(`Medication not found: ${record.medication_id}`);
    }

    console.log("Found medication:", medData.name, "for user_id:", medData.user_id);

    // Fetch senior profile separately to avoid join issues
    const { data: seniorProfile, error: seniorError } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', medData.user_id)
      .single();
    
    if (seniorError) {
      console.error("Senior profile fetch error:", seniorError.message);
    } else {
      console.log("Found senior profile:", seniorProfile.first_name);
    }

    const seniorName = seniorProfile 
      ? `${seniorProfile.first_name || 'Senior'} ${seniorProfile.last_name || ''}` 
      : 'Your Senior';
    const medName = medData.name;

    // 2. Find linked Caregivers with push tokens
    console.log("Searching for caregivers linked to senior id:", medData.user_id);
    const { data: caregivers, error: cgError } = await supabaseClient
      .from('profiles')
      .select('expo_push_token, first_name')
      .eq('linked_senior_id', medData.user_id)
      .not('expo_push_token', 'is', null);

    if (cgError) {
      console.error("Caregiver lookup error:", cgError.message);
      throw cgError;
    }

    console.log(`Found ${caregivers?.length || 0} caregivers with push tokens.`);

    if (!caregivers || caregivers.length === 0) {
      console.log("No caregivers with tokens found. Stopping.");
      return new Response(JSON.stringify({ message: "No caregivers with tokens found" }), { status: 200 });
    }

    // 3. Prepare Push Notifications
    console.log("Preparing notifications for caregivers...");
    const notifications = caregivers.map((cg: any) => ({
      to: cg.expo_push_token,
      sound: 'default',
      title: '⚠️ Missed Medication Alert',
      body: `Warning: ${seniorName.trim()} has missed their dosage of ${medName} scheduled for ${record.scheduled_time}.`,
      data: { seniorId: record.user_id, medId: record.medication_id, type: 'MISSED_DOSE' },
      priority: 'high',
    }));

    // 4. Send to Expo Notification Service
    console.log("Sending notifications to Expo...");
    const expoResponse = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notifications),
    });

    const result = await expoResponse.json();
    console.log("Expo response summary:", JSON.stringify(result, null, 2));

    return new Response(JSON.stringify({ success: true, expo: result }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Final catch-all error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
