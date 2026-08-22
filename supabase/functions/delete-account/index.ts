/// <reference types="@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Server configuration missing' }, 500);
    }

    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Missing authorization' }, 401);
    }

    const token = authHeader.slice('Bearer '.length).trim();
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: userError,
    } = await adminClient.auth.getUser(token);

    if (userError || !user) {
      return jsonResponse({ error: 'Invalid user' }, 401);
    }

    const userId = user.id;

    // Read/remove avatar BEFORE database erasure. If Storage fails, no database cleanup has begun.
    const { data: profile, error: profileReadError } = await adminClient
      .from('user_profiles')
      .select('avatar_url')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileReadError) {
      throw new Error(`user_profiles read failed: ${profileReadError.message}`);
    }

    const avatarUrl = profile?.avatar_url || null;
    if (avatarUrl) {
      const marker = '/avatars/';
      const markerIndex = avatarUrl.indexOf(marker);
      if (markerIndex >= 0) {
        const avatarPath = decodeURIComponent(avatarUrl.slice(markerIndex + marker.length));
        if (avatarPath && avatarPath.startsWith(`${userId}-`)) {
          const { error: avatarDeleteError } = await adminClient.storage
            .from('avatars')
            .remove([avatarPath]);
          if (avatarDeleteError) {
            throw new Error(`avatar cleanup failed: ${avatarDeleteError.message}`);
          }
        }
      }
    }

    // All database cleanup now runs inside one PostgreSQL function invocation / transaction.
    // The RPC is executable only by service_role.
    const { data: prepared, error: prepareError } = await adminClient.rpc(
      'prepare_account_deletion',
      { p_user_id: userId },
    );

    if (prepareError) {
      throw new Error(`database cleanup failed: ${prepareError.message}`);
    }

    if (!prepared?.prepared) {
      throw new Error('database cleanup did not confirm completion');
    }

    // Auth deletion is deliberately last. If it fails, this endpoint returns 500 and can be retried;
    // the database preparation is designed to be idempotent.
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      throw new Error(`auth deletion failed: ${deleteUserError.message}`);
    }

    // Non-identifying operational evidence that an erasure completed.
    const { error: auditError } = await adminClient.from('privacy_requests').insert([
      {
        user_id: null,
        email: null,
        request_type: 'delete_account',
        status: 'completed',
        notes: 'Account deletion completed automatically; identifying fields minimized.',
        completed_at: new Date().toISOString(),
      },
    ]);

    if (auditError) {
      console.error('Deletion audit insert failed:', auditError);
    }

    return jsonResponse({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Unexpected server error' },
      500,
    );
  }
});
