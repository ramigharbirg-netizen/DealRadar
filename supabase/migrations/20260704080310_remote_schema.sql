


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."handle_new_user_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.user_profiles (
    user_id,
    display_name,
    email,
    country
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    'IT'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_opportunity_confirmation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  confirmations_count integer;
  opportunity_owner uuid;
  was_verified boolean;
begin
  select user_id, coalesce(is_verified, false)
  into opportunity_owner, was_verified
  from public.opportunities
  where id = new.opportunity_id;

  select count(*)
  into confirmations_count
  from public.opportunity_confirmations
  where opportunity_id = new.opportunity_id;

  update public.opportunities
  set
    verified_count = confirmations_count,
    is_verified = confirmations_count >= 3
  where id = new.opportunity_id;

  if confirmations_count >= 3 and was_verified = false then
    update public.user_profiles
    set
      verified_deals = coalesce(verified_deals, 0) + 1,
      trust_score = coalesce(trust_score, 0) + 10
    where user_id = opportunity_owner;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_opportunity_confirmation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_opportunity_reputation_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if tg_op = 'INSERT' then
    perform public.recalculate_user_reputation(new.user_id);
    return new;
  end if;

  if tg_op = 'UPDATE' then
    perform public.recalculate_user_reputation(new.user_id);

    if old.user_id is distinct from new.user_id then
      perform public.recalculate_user_reputation(old.user_id);
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    perform public.recalculate_user_reputation(old.user_id);
    return old;
  end if;

  return null;
end;
$$;


ALTER FUNCTION "public"."handle_opportunity_reputation_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_chat_message_push"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions', 'vault'
    AS $$
declare
  internal_secret text;
  request_id bigint;
begin
  select decrypted_secret
  into internal_secret
  from vault.decrypted_secrets
  where name = 'dealradar_internal_secret'
  limit 1;

  if internal_secret is null then
    raise warning 'Missing dealradar_internal_secret in Vault';
    return new;
  end if;

  select net.http_post(
    url := 'https://vwvliyxrlzxkmdbrmtns.supabase.co/functions/v1/notify-chat-message',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-dealradar-secret', internal_secret
    ),
    body := jsonb_build_object(
      'message_id', new.id
    )
  )
  into request_id;

  return new;
end;
$$;


ALTER FUNCTION "public"."notify_chat_message_push"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_message_flood"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if (
    select count(*)
    from public.conversation_messages
    where sender_id = new.sender_id
    and created_at > now() - interval '5 seconds'
  ) >= 5 then
    raise exception 'Too many messages';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."prevent_message_flood"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_opportunity_system_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if auth.uid() is not null
     and old.user_id = auth.uid()
     and not exists (
       select 1
       from public.admin_roles ar
       where ar.user_id = auth.uid()
         and ar.role in ('admin', 'owner')
     )
  then
    new.is_verified := old.is_verified;
    new.verified_count := old.verified_count;
    new.reports_count := old.reports_count;
    new.is_hidden := old.is_hidden;
    new.hidden_reason := old.hidden_reason;
    new.reports := old.reports;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."protect_opportunity_system_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_opportunity_verified_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  target_opportunity_id uuid;
  confirmations_count integer;
begin
  target_opportunity_id := coalesce(new.opportunity_id, old.opportunity_id);

  select count(*)
  into confirmations_count
  from public.opportunity_confirmations
  where opportunity_id = target_opportunity_id;

  update public.opportunities
  set
    verified_count = confirmations_count,
    is_verified = confirmations_count >= 3
  where id = target_opportunity_id;

  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "public"."recalculate_opportunity_verified_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_user_reputation"("target_user" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  total_count integer;
  verified_count integer;
  hidden_count integer;
  calculated_points integer;
  calculated_trust integer;
  calculated_level text;
begin
  select count(*)
  into total_count
  from public.opportunities
  where user_id = target_user;

  select count(*)
  into verified_count
  from public.opportunities
  where user_id = target_user
    and coalesce(is_verified, false) = true;

  select count(*)
  into hidden_count
  from public.opportunities
  where user_id = target_user
    and coalesce(is_hidden, false) = true;

  calculated_points :=
    total_count * 5 +
    verified_count * 15 -
    hidden_count * 20;

  calculated_trust :=
    least(100, greatest(0,
      30 +
      total_count * 3 +
      verified_count * 8 -
      hidden_count * 15
    ));

  calculated_level :=
    case
      when calculated_points >= 500 then 'elite_member'
      when calculated_points >= 200 then 'trusted_member'
      when calculated_points >= 50 then 'contributor'
      else 'new_member'
    end;

  update public.user_profiles
  set
    total_opportunities = total_count,
    verified_deals = verified_count,
    hidden_deals = hidden_count,
    points = calculated_points,
    trust_score = calculated_trust,
    reputation_level = calculated_level
  where user_id = target_user;
end;
$$;


ALTER FUNCTION "public"."recalculate_user_reputation"("target_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_last_message"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update public.conversations
  set
    last_message = new.message,
    last_message_at = new.created_at,
    last_message_sender_id = new.sender_id
  where id = new.conversation_id;

  return new;
end;
$$;


ALTER FUNCTION "public"."update_conversation_last_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_opportunity_reports"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  target_opportunity_id uuid;
  active_reports_count integer;
begin
  target_opportunity_id := coalesce(new.opportunity_id, old.opportunity_id);

  select count(*)
  into active_reports_count
  from public.reports
  where opportunity_id = target_opportunity_id
    and status in ('pending', 'accepted');

  update public.opportunities
  set
    reports_count = active_reports_count,
    is_hidden = active_reports_count >= 3
  where id = target_opportunity_id;

  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "public"."update_opportunity_reports"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_opportunity_verification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  target_opportunity_id uuid;
  confirmations_count integer;
begin
  target_opportunity_id := coalesce(new.opportunity_id, old.opportunity_id);

  select count(*)
  into confirmations_count
  from public.opportunity_confirmations
  where opportunity_id = target_opportunity_id;

  update public.opportunities
  set
    verified_count = confirmations_count,
    is_verified = confirmations_count >= 2
  where id = target_opportunity_id;

  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "public"."update_opportunity_verification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_opportunity_verified_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  confirmations_count integer;
begin
  select count(*)
  into confirmations_count
  from public.opportunity_confirmations
  where opportunity_id = new.opportunity_id;

  update public.opportunities
  set
    verified_count = confirmations_count,
    is_verified = confirmations_count >= 3
  where id = new.opportunity_id;

  return new;
end;
$$;


ALTER FUNCTION "public"."update_opportunity_verified_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_storage_image"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if lower(new.metadata->>'mimetype') not in (
    'image/jpeg',
    'image/png',
    'image/webp'
  ) then
    raise exception 'Invalid file type';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_storage_image"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'admin'::"text" NOT NULL
);


ALTER TABLE "public"."admin_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "session_id" "text",
    "event_name" "text" NOT NULL,
    "entity_type" "text",
    "entity_id" "uuid",
    "category" "text",
    "city" "text",
    "country" "text" DEFAULT 'IT'::"text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."app_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bounties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "category" "text" NOT NULL,
    "reward_amount" numeric DEFAULT 0,
    "status" "text" DEFAULT 'active'::"text",
    "latitude" double precision,
    "longitude" double precision,
    "address" "text",
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "user_name" "text",
    "max_price" numeric,
    "radius_km" integer DEFAULT 20 NOT NULL
);


ALTER TABLE "public"."bounties" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bounty_matches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "bounty_id" "uuid" NOT NULL,
    "opportunity_id" "uuid" NOT NULL,
    "hunter_id" "uuid",
    "match_score" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'suggested'::"text" NOT NULL
);


ALTER TABLE "public"."bounty_matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bounty_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "bounty_id" "uuid",
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "note" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "opportunity_id" "uuid",
    "user_name" "text"
);


ALTER TABLE "public"."bounty_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "opportunity_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_name" "text",
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_name" "text",
    "sender_email" "text",
    "message" "text" NOT NULL,
    "sender_id" "uuid"
);


ALTER TABLE "public"."conversation_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_reads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "last_read_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."conversation_reads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "opportunity_id" "uuid" NOT NULL,
    "requester_id" "uuid" NOT NULL,
    "owner_id" "uuid",
    "last_message" "text",
    "last_message_at" timestamp with time zone,
    "last_message_sender_id" "uuid"
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."favorites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "opportunity_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."opportunities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "category" "text" NOT NULL,
    "latitude" double precision,
    "longitude" double precision,
    "address" "text",
    "estimated_price" double precision,
    "estimated_resale_value" double precision,
    "contact_phone" "text",
    "contact_email" "text",
    "contact_link" "text",
    "images" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "is_high_value" boolean DEFAULT false NOT NULL,
    "confirmations" integer DEFAULT 0 NOT NULL,
    "reports" integer DEFAULT 0 NOT NULL,
    "user_name" "text",
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "is_hidden" boolean DEFAULT false,
    "hidden_reason" "text",
    "verified_count" bigint DEFAULT '0'::bigint,
    "is_verified" boolean DEFAULT false,
    "reports_count" integer DEFAULT 0,
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."opportunities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."opportunity_confirmations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "opportunity_id" "uuid",
    "user_id" "uuid"
);


ALTER TABLE "public"."opportunity_confirmations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pickup_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "opportunity_id" "uuid" NOT NULL,
    "requester_name" "text",
    "requester_email" "text",
    "owner_name" "text",
    "owner_email" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL
);


ALTER TABLE "public"."pickup_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."privacy_consents" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "session_id" "text",
    "ip_anonymized" "text",
    "user_agent" "text",
    "consent_version" "text" DEFAULT '1.0'::"text" NOT NULL,
    "privacy_version" "text" DEFAULT '1.0'::"text" NOT NULL,
    "terms_version" "text" DEFAULT '1.0'::"text" NOT NULL,
    "necessary" boolean DEFAULT true NOT NULL,
    "analytics" boolean DEFAULT false NOT NULL,
    "marketing" boolean DEFAULT false NOT NULL,
    "geolocation" boolean DEFAULT false NOT NULL,
    "preferences" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "source" "text" DEFAULT 'app'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."privacy_consents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."privacy_requests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "email" "text",
    "request_type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."privacy_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "display_name" "text",
    "email" "text",
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "points" integer DEFAULT 0 NOT NULL,
    "trust_score" integer DEFAULT 0 NOT NULL,
    "city" "text",
    "country" "text" DEFAULT 'IT'::"text",
    "preferred_categories" "text"[] DEFAULT '{}'::"text"[],
    "total_opportunities" integer DEFAULT 0 NOT NULL,
    "total_bounties" integer DEFAULT 0 NOT NULL,
    "total_submissions" integer DEFAULT 0 NOT NULL,
    "approved_submissions" integer DEFAULT 0 NOT NULL,
    "gdpr_privacy_accepted" boolean DEFAULT false NOT NULL,
    "gdpr_privacy_accepted_at" timestamp with time zone,
    "analytics_consent" boolean DEFAULT false NOT NULL,
    "marketing_consent" boolean DEFAULT false NOT NULL,
    "ads_personalization_consent" boolean DEFAULT false NOT NULL,
    "last_seen_at" timestamp with time zone,
    "verified_deals" integer DEFAULT 0,
    "accepted_reports" integer DEFAULT 0,
    "rejected_reports" integer DEFAULT 0,
    "avatar_url" "text",
    "is_premium" boolean DEFAULT false,
    "premium_until" timestamp with time zone,
    "hidden_deals" integer DEFAULT 0,
    "reputation_level" "text" DEFAULT 'new_member'::"text"
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."public_user_profiles" AS
 SELECT "user_id",
    "display_name",
    "avatar_url",
    "is_premium",
    "trust_score",
    "points",
    "reputation_level",
    "total_opportunities",
    "verified_deals",
    "created_at"
   FROM "public"."user_profiles";


ALTER VIEW "public"."public_user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_notification_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "message_id" "uuid",
    "conversation_id" "uuid",
    "recipient_id" "uuid",
    "token_id" "uuid",
    "status" "text" NOT NULL,
    "fcm_status" integer,
    "error_code" "text",
    "error_message" "text"
);


ALTER TABLE "public"."push_notification_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "platform" "text" DEFAULT 'android'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."push_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "reporter_id" "uuid",
    "opportunity_id" "uuid",
    "reason" "text" NOT NULL,
    "details" "text",
    "status" "text" DEFAULT 'pending'::"text"
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_roles"
    ADD CONSTRAINT "admin_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_roles"
    ADD CONSTRAINT "admin_roles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."app_events"
    ADD CONSTRAINT "app_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bounties"
    ADD CONSTRAINT "bounties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bounty_matches"
    ADD CONSTRAINT "bounty_matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bounty_matches"
    ADD CONSTRAINT "bounty_matches_unique" UNIQUE ("bounty_id", "opportunity_id");



ALTER TABLE ONLY "public"."bounty_submissions"
    ADD CONSTRAINT "bounty_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_messages"
    ADD CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_reads"
    ADD CONSTRAINT "conversation_reads_conversation_id_user_id_key" UNIQUE ("conversation_id", "user_id");



ALTER TABLE ONLY "public"."conversation_reads"
    ADD CONSTRAINT "conversation_reads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_unique_pair" UNIQUE ("opportunity_id", "requester_id", "owner_id");



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_user_opportunity_unique" UNIQUE ("user_id", "opportunity_id");



ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."opportunity_confirmations"
    ADD CONSTRAINT "opportunity_confirmations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."opportunity_confirmations"
    ADD CONSTRAINT "opportunity_confirmations_unique_user_opportunity" UNIQUE ("opportunity_id", "user_id");



ALTER TABLE ONLY "public"."pickup_requests"
    ADD CONSTRAINT "pickup_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."privacy_consents"
    ADD CONSTRAINT "privacy_consents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."privacy_requests"
    ADD CONSTRAINT "privacy_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_notification_logs"
    ADD CONSTRAINT "push_notification_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_token_key" UNIQUE ("user_id", "token");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_unique_reporter_opportunity" UNIQUE ("reporter_id", "opportunity_id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_key" UNIQUE ("user_id");



CREATE INDEX "app_events_category_idx" ON "public"."app_events" USING "btree" ("category");



CREATE INDEX "app_events_created_at_idx" ON "public"."app_events" USING "btree" ("created_at" DESC);



CREATE INDEX "app_events_event_name_idx" ON "public"."app_events" USING "btree" ("event_name");



CREATE INDEX "app_events_user_id_idx" ON "public"."app_events" USING "btree" ("user_id");



CREATE INDEX "comments_created_at_idx" ON "public"."comments" USING "btree" ("created_at" DESC);



CREATE INDEX "comments_opportunity_id_idx" ON "public"."comments" USING "btree" ("opportunity_id");



CREATE INDEX "comments_user_id_idx" ON "public"."comments" USING "btree" ("user_id");



CREATE INDEX "conversation_messages_conversation_id_idx" ON "public"."conversation_messages" USING "btree" ("conversation_id");



CREATE INDEX "conversation_messages_created_at_idx" ON "public"."conversation_messages" USING "btree" ("created_at");



CREATE INDEX "conversations_created_at_idx" ON "public"."conversations" USING "btree" ("created_at" DESC);



CREATE INDEX "conversations_opportunity_id_idx" ON "public"."conversations" USING "btree" ("opportunity_id");



CREATE INDEX "conversations_owner_id_idx" ON "public"."conversations" USING "btree" ("owner_id");



CREATE INDEX "conversations_requester_id_idx" ON "public"."conversations" USING "btree" ("requester_id");



CREATE INDEX "favorites_opportunity_id_idx" ON "public"."favorites" USING "btree" ("opportunity_id");



CREATE INDEX "favorites_user_id_idx" ON "public"."favorites" USING "btree" ("user_id");



CREATE INDEX "idx_conversation_messages_conversation_created" ON "public"."conversation_messages" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "idx_conversation_messages_sender_id" ON "public"."conversation_messages" USING "btree" ("sender_id");



CREATE INDEX "idx_conversation_reads_conversation" ON "public"."conversation_reads" USING "btree" ("conversation_id");



CREATE INDEX "idx_conversation_reads_user" ON "public"."conversation_reads" USING "btree" ("user_id");



CREATE INDEX "idx_push_logs_created_at" ON "public"."push_notification_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_push_logs_message_id" ON "public"."push_notification_logs" USING "btree" ("message_id");



CREATE INDEX "idx_push_logs_recipient_id" ON "public"."push_notification_logs" USING "btree" ("recipient_id");



CREATE INDEX "opportunities_category_idx" ON "public"."opportunities" USING "btree" ("category");



CREATE INDEX "opportunities_created_at_idx" ON "public"."opportunities" USING "btree" ("created_at" DESC);



CREATE INDEX "opportunities_latitude_idx" ON "public"."opportunities" USING "btree" ("latitude");



CREATE INDEX "opportunities_longitude_idx" ON "public"."opportunities" USING "btree" ("longitude");



CREATE INDEX "pickup_requests_created_at_idx" ON "public"."pickup_requests" USING "btree" ("created_at" DESC);



CREATE INDEX "pickup_requests_opportunity_id_idx" ON "public"."pickup_requests" USING "btree" ("opportunity_id");



CREATE UNIQUE INDEX "unique_user_favorite" ON "public"."favorites" USING "btree" ("user_id", "opportunity_id");



CREATE UNIQUE INDEX "unique_user_report" ON "public"."reports" USING "btree" ("reporter_id", "opportunity_id");



CREATE INDEX "user_profiles_user_id_idx" ON "public"."user_profiles" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "trg_handle_opportunity_confirmation" AFTER INSERT ON "public"."opportunity_confirmations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_opportunity_confirmation"();



CREATE OR REPLACE TRIGGER "trg_notify_chat_message_push" AFTER INSERT ON "public"."conversation_messages" FOR EACH ROW EXECUTE FUNCTION "public"."notify_chat_message_push"();



CREATE OR REPLACE TRIGGER "trg_opportunity_reputation_update" AFTER INSERT OR DELETE OR UPDATE ON "public"."opportunities" FOR EACH ROW EXECUTE FUNCTION "public"."handle_opportunity_reputation_update"();



CREATE OR REPLACE TRIGGER "trg_prevent_message_flood" BEFORE INSERT ON "public"."conversation_messages" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_message_flood"();



CREATE OR REPLACE TRIGGER "trg_protect_opportunity_system_fields" BEFORE UPDATE ON "public"."opportunities" FOR EACH ROW EXECUTE FUNCTION "public"."protect_opportunity_system_fields"();



CREATE OR REPLACE TRIGGER "trg_update_conversation_last_message" AFTER INSERT ON "public"."conversation_messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_last_message"();



CREATE OR REPLACE TRIGGER "trg_update_opportunity_reports" AFTER INSERT OR DELETE OR UPDATE ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "public"."update_opportunity_reports"();



CREATE OR REPLACE TRIGGER "trg_update_opportunity_verification" AFTER INSERT OR DELETE ON "public"."opportunity_confirmations" FOR EACH ROW EXECUTE FUNCTION "public"."update_opportunity_verification"();



CREATE OR REPLACE TRIGGER "trigger_recalculate_opportunity_verified_count_delete" AFTER DELETE ON "public"."opportunity_confirmations" FOR EACH ROW EXECUTE FUNCTION "public"."recalculate_opportunity_verified_count"();



CREATE OR REPLACE TRIGGER "trigger_recalculate_opportunity_verified_count_insert" AFTER INSERT ON "public"."opportunity_confirmations" FOR EACH ROW EXECUTE FUNCTION "public"."recalculate_opportunity_verified_count"();



CREATE OR REPLACE TRIGGER "trigger_update_opportunity_verified_count" AFTER INSERT ON "public"."opportunity_confirmations" FOR EACH ROW EXECUTE FUNCTION "public"."update_opportunity_verified_count"();



ALTER TABLE ONLY "public"."bounty_matches"
    ADD CONSTRAINT "bounty_matches_bounty_id_fkey" FOREIGN KEY ("bounty_id") REFERENCES "public"."bounties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bounty_matches"
    ADD CONSTRAINT "bounty_matches_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bounty_submissions"
    ADD CONSTRAINT "bounty_submissions_bounty_id_fkey" FOREIGN KEY ("bounty_id") REFERENCES "public"."bounties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bounty_submissions"
    ADD CONSTRAINT "bounty_submissions_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_messages"
    ADD CONSTRAINT "conversation_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_messages"
    ADD CONSTRAINT "conversation_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conversation_reads"
    ADD CONSTRAINT "conversation_reads_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_reads"
    ADD CONSTRAINT "conversation_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_last_message_sender_id_fkey" FOREIGN KEY ("last_message_sender_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pickup_requests"
    ADD CONSTRAINT "pickup_requests_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Bounty creators can convert matches to submissions" ON "public"."bounty_submissions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."bounties"
  WHERE (("bounties"."id" = "bounty_submissions"."bounty_id") AND ("bounties"."user_id" = "auth"."uid"())))));



CREATE POLICY "Bounty creators can update submissions" ON "public"."bounty_submissions" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Users can create privacy requests" ON "public"."privacy_requests" FOR INSERT WITH CHECK ((("user_id" IS NULL) OR ("auth"."uid"() = "user_id")));



CREATE POLICY "Users can delete own push tokens" ON "public"."push_tokens" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own bounty submissions" ON "public"."bounty_submissions" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own push tokens" ON "public"."push_tokens" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own consents" ON "public"."privacy_consents" FOR INSERT WITH CHECK ((("user_id" IS NULL) OR ("auth"."uid"() = "user_id")));



CREATE POLICY "Users can manage own conversation reads" ON "public"."conversation_reads" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own admin role" ON "public"."admin_roles" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can read own pickup requests" ON "public"."pickup_requests" FOR SELECT TO "authenticated" USING ((("auth"."email"() = "requester_email") OR ("auth"."email"() = "owner_email")));



CREATE POLICY "Users can read their own consents" ON "public"."privacy_consents" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read their own privacy requests" ON "public"."privacy_requests" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own push tokens" ON "public"."push_tokens" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own conversation reads" ON "public"."conversation_reads" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own push tokens" ON "public"."push_tokens" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view relevant bounty submissions" ON "public"."bounty_submissions" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."admin_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admins can read app events" ON "public"."app_events" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."admin_roles" "ar"
  WHERE ("ar"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."app_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "auth insert" ON "public"."opportunities" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "auth insert bounties" ON "public"."bounties" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "authenticated insert bounty matches" ON "public"."bounty_matches" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated update bounty matches" ON "public"."bounty_matches" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated users can insert app events" ON "public"."app_events" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) OR ("user_id" IS NULL)));



CREATE POLICY "authenticated users can insert comments" ON "public"."comments" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "authenticated users can insert conversations" ON "public"."conversations" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "requester_id"));



CREATE POLICY "authenticated users can insert pickup requests" ON "public"."pickup_requests" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated_users_can_verify" ON "public"."opportunity_confirmations" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."bounties" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bounty_matches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bounty_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversation_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversation_reads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "everyone_can_read_verifications" ON "public"."opportunity_confirmations" FOR SELECT USING (true);



ALTER TABLE "public"."favorites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."opportunities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."opportunity_confirmations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "owners can delete their own opportunities" ON "public"."opportunities" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "owners can update their own opportunities" ON "public"."opportunities" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "owners delete bounties" ON "public"."bounties" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "owners update bounties" ON "public"."bounties" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "participants can insert conversation messages" ON "public"."conversation_messages" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "conversation_messages"."conversation_id") AND (("auth"."uid"() = "c"."requester_id") OR ("auth"."uid"() = "c"."owner_id"))))));



CREATE POLICY "participants can read conversation messages" ON "public"."conversation_messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "conversation_messages"."conversation_id") AND (("auth"."uid"() = "c"."requester_id") OR ("auth"."uid"() = "c"."owner_id"))))));



CREATE POLICY "participants can read conversations" ON "public"."conversations" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "requester_id") OR ("auth"."uid"() = "owner_id")));



CREATE POLICY "participants can update conversations" ON "public"."conversations" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "requester_id") OR ("auth"."uid"() = "owner_id"))) WITH CHECK ((("auth"."uid"() = "requester_id") OR ("auth"."uid"() = "owner_id")));



ALTER TABLE "public"."pickup_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."privacy_consents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."privacy_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public can read comments" ON "public"."comments" FOR SELECT USING (true);



CREATE POLICY "public read" ON "public"."opportunities" FOR SELECT USING (true);



CREATE POLICY "public read bounties" ON "public"."bounties" FOR SELECT USING (true);



CREATE POLICY "public read bounty matches" ON "public"."bounty_matches" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."push_notification_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users can delete their own comments" ON "public"."comments" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users can delete their own favorites" ON "public"."favorites" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users can insert own profile" ON "public"."user_profiles" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "users can insert reports" ON "public"."reports" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "reporter_id"));



CREATE POLICY "users can insert their own favorites" ON "public"."favorites" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users can read own profile" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "users can read own reports" ON "public"."reports" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "reporter_id"));



CREATE POLICY "users can read their own favorites" ON "public"."favorites" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users can update own profile" ON "public"."user_profiles" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."conversation_messages";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_opportunity_confirmation"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_opportunity_confirmation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_opportunity_confirmation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_opportunity_reputation_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_opportunity_reputation_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_opportunity_reputation_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_chat_message_push"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_chat_message_push"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_chat_message_push"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_message_flood"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_message_flood"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_message_flood"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_opportunity_system_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_opportunity_system_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_opportunity_system_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_opportunity_verified_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_opportunity_verified_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_opportunity_verified_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_user_reputation"("target_user" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_user_reputation"("target_user" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_user_reputation"("target_user" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_opportunity_reports"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_opportunity_reports"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_opportunity_reports"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_opportunity_verification"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_opportunity_verification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_opportunity_verification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_opportunity_verified_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_opportunity_verified_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_opportunity_verified_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_storage_image"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_storage_image"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_storage_image"() TO "service_role";


















GRANT ALL ON TABLE "public"."admin_roles" TO "anon";
GRANT ALL ON TABLE "public"."admin_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_roles" TO "service_role";



GRANT ALL ON TABLE "public"."app_events" TO "anon";
GRANT ALL ON TABLE "public"."app_events" TO "authenticated";
GRANT ALL ON TABLE "public"."app_events" TO "service_role";



GRANT ALL ON TABLE "public"."bounties" TO "anon";
GRANT ALL ON TABLE "public"."bounties" TO "authenticated";
GRANT ALL ON TABLE "public"."bounties" TO "service_role";



GRANT ALL ON TABLE "public"."bounty_matches" TO "anon";
GRANT ALL ON TABLE "public"."bounty_matches" TO "authenticated";
GRANT ALL ON TABLE "public"."bounty_matches" TO "service_role";



GRANT ALL ON TABLE "public"."bounty_submissions" TO "anon";
GRANT ALL ON TABLE "public"."bounty_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."bounty_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_messages" TO "anon";
GRANT ALL ON TABLE "public"."conversation_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_messages" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_reads" TO "anon";
GRANT ALL ON TABLE "public"."conversation_reads" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_reads" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."favorites" TO "anon";
GRANT ALL ON TABLE "public"."favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."favorites" TO "service_role";



GRANT ALL ON TABLE "public"."opportunities" TO "anon";
GRANT ALL ON TABLE "public"."opportunities" TO "authenticated";
GRANT ALL ON TABLE "public"."opportunities" TO "service_role";



GRANT ALL ON TABLE "public"."opportunity_confirmations" TO "anon";
GRANT ALL ON TABLE "public"."opportunity_confirmations" TO "authenticated";
GRANT ALL ON TABLE "public"."opportunity_confirmations" TO "service_role";



GRANT ALL ON TABLE "public"."pickup_requests" TO "anon";
GRANT ALL ON TABLE "public"."pickup_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."pickup_requests" TO "service_role";



GRANT ALL ON TABLE "public"."privacy_consents" TO "anon";
GRANT ALL ON TABLE "public"."privacy_consents" TO "authenticated";
GRANT ALL ON TABLE "public"."privacy_consents" TO "service_role";



GRANT ALL ON TABLE "public"."privacy_requests" TO "anon";
GRANT ALL ON TABLE "public"."privacy_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."privacy_requests" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."public_user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."public_user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."public_user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."push_notification_logs" TO "anon";
GRANT ALL ON TABLE "public"."push_notification_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."push_notification_logs" TO "service_role";



GRANT ALL ON TABLE "public"."push_tokens" TO "anon";
GRANT ALL ON TABLE "public"."push_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."push_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































CREATE TRIGGER trg_create_user_profile AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();


  create policy "Authenticated upload avatars 1oj01fe_0"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'avatars'::text) AND (name ~~ ((auth.uid())::text || '-%'::text))));



  create policy "Authenticated users can upload opportunity images"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'opportunity-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can delete own avatars 1oj01fe_0"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'avatars'::text) AND (name ~~ ((auth.uid())::text || '-%'::text))));



  create policy "Users can delete own avatars 1oj01fe_1"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'avatars'::text) AND (name ~~ ((auth.uid())::text || '-%'::text))));



  create policy "Users can delete own opportunity images 1meoasy_0"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'opportunity-images'::text) AND (name ~~ ((auth.uid())::text || '/%'::text))));



  create policy "Users can delete own opportunity images 1meoasy_1"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'opportunity-images'::text) AND (name ~~ ((auth.uid())::text || '/%'::text))));



  create policy "Users can delete own opportunity images"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'opportunity-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));


CREATE TRIGGER trg_validate_storage_image BEFORE INSERT ON storage.objects FOR EACH ROW WHEN ((new.bucket_id = ANY (ARRAY['avatars'::text, 'opportunity-images'::text]))) EXECUTE FUNCTION public.validate_storage_image();


