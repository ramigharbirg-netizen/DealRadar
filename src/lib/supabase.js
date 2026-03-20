import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://lhyiarluwkctmflamwpu.supabase.co"
const supabaseKey = "sb_publishable_ddl7kJb5wpkS24DQwQWOtQ_JMrIbG8n"

export const supabase = createClient(supabaseUrl, supabaseKey);
