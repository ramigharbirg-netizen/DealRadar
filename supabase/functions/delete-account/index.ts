/// <reference types="@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration missing' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const authHeader = req.headers.get('Authorization') || '';

    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

const token = authHeader.replace('Bearer ', '');

const {
  data: { user },
  error: userError,
} = await adminClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    const userEmail = user.email || null;

    await adminClient.from('privacy_requests').insert([
      {
        user_id: userId,
        email: userEmail,
        request_type: 'delete_account',
        status: 'completed',
        notes: 'Account deleted automatically by Edge Function',
        completed_at: new Date().toISOString(),
      },
    ]);

    await adminClient.from('favorites').delete().eq('user_id', userId);
    await adminClient.from('comments').delete().eq('user_id', userId);
    await adminClient.from('reports').delete().eq('reporter_id', userId);
    await adminClient.from('conversation_reads').delete().eq('user_id', userId);
    await adminClient.from('reputation_events').delete().eq('user_id', userId);

    await adminClient
      .from('conversation_messages')
      .update({
        sender_name: 'Utente eliminato',
        sender_email: null,
        message: 'Messaggio rimosso',
        sender_id: null,
      })
      .eq('sender_id', userId);

    await adminClient
      .from('opportunities')
      .update({
        user_name: 'Utente eliminato',
        user_id: null,
      })
      .eq('user_id', userId);

    await adminClient
  .from('user_profiles')
  .update({
    display_name: 'Utente eliminato',
    avatar_url: null,
    city: null,
    country: null,
    points: 0,
    trust_score: 0,
    total_opportunities: 0,
    verified_deals: 0,
    hidden_deals: 0,
    reputation_level: 'new_member',
    is_premium: false,
    premium_until: null,
  })
  .eq('user_id', userId);

    const { error: deleteUserError } =
      await adminClient.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      return new Response(
        JSON.stringify({ error: deleteUserError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account deleted successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Delete account error:', err);

    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Unexpected server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});