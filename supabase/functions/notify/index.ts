import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { title, body, userId, type } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), { status: 400, headers: corsHeaders });
    }

    const vapidPublic = Deno.env.get('VITE_VAPID_PUBLIC_KEY');
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com';

    if (!vapidPublic || !vapidPrivate) {
      console.error("VAPID keys not configured in Edge Function env");
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), { status: 500, headers: corsHeaders });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all subscriptions for this user
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    const finalTitle = type === 'dinner' ? '🍽 Dinner Reminder' : '🍛 Lunch Reminder';
    const finalBody = type === 'dinner' ? 'Have you taken your dinner?' : 'Have you taken your lunch?';
    
    const actions = [
      { action: `yes_${type || 'lunch'}`, title: '✅ Yes, I Ate' },
      { action: `skip_${type || 'lunch'}`, title: '❌ Skip' },
      { action: `remind_${type || 'lunch'}`, title: '⏰ Remind Me in 3 Minutes' }
    ];

    const payload = JSON.stringify({ 
      title: finalTitle, 
      body: finalBody, 
      type: type || 'lunch',
      icon: '/icon-192x192.png',
      badge: '/badge.png',
      tag: `meal-${type || 'lunch'}`,
      renotify: true,
      requireInteraction: true,
      actions 
    });

    const results = await Promise.allSettled(
      (subs || []).map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            auth: sub.keys_auth,
            p256dh: sub.keys_p256dh,
          }
        };
        try {
          await webpush.sendNotification(pushSubscription, payload);
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Subscription expired or invalid, remove it
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          } else {
            console.error("Push error:", err);
          }
        }
      })
    );

    return new Response(JSON.stringify({ success: true, count: subs?.length || 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error("Notify error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
