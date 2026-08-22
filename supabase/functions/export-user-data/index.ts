/// <reference types="@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
      return new Response(JSON.stringify({ error: 'Server configuration missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization') || '';

    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

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

    const safeSelect = async (table: string, column: string) => {
      const { data, error } = await adminClient
        .from(table)
        .select('*')
        .eq(column, userId);

      if (error) {
        return {
          error: error.message,
          data: [],
        };
      }

      return {
        error: null,
        data: data || [],
      };
    };

    const profile = await safeSelect('user_profiles', 'user_id');
    const opportunities = await safeSelect('opportunities', 'user_id');
    const comments = await safeSelect('comments', 'user_id');
    const favorites = await safeSelect('favorites', 'user_id');
    const reports = await safeSelect('reports', 'reporter_id');
    const { data: pickupRequestsData, error: pickupRequestsError } = await adminClient
  .from('pickup_requests')
  .select('*')
  .or(`requester_id.eq.${user.id},owner_id.eq.${user.id}`);

const pickupRequests = {
  error: pickupRequestsError ? pickupRequestsError.message : null,
  data: pickupRequestsData || [],
};
    const privacyConsents = await safeSelect('privacy_consents', 'user_id');
    const privacyRequests = await safeSelect('privacy_requests', 'user_id');
    const conversationMessages = await safeSelect('conversation_messages', 'sender_id');
    const conversationReads = await safeSelect('conversation_reads', 'user_id');

    const exportData = {
      exported_at: new Date().toISOString(),
      export_type: 'gdpr_user_data_export',
      app: 'DealRadar',
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        user_metadata: user.user_metadata || {},
      },
      data: {
        profile,
        opportunities,
        comments,
        favorites,
        reports,
        pickup_requests: pickupRequests,
        privacy_consents: privacyConsents,
        privacy_requests: privacyRequests,
        conversation_messages: conversationMessages,
        conversation_reads: conversationReads,
      },
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    console.error('Export user data error:', err);

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