import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [key, value] = line.split('=');
  if (key && value) {
    acc[key.trim()] = value.trim();
  }
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.rpc('get_social_stats', { target_user_ids: ["ff0b6a22-38ff-4f40-b66e-cc7232f3c051", "d3e028b1-bf50-405f-9e79-502a5cf34f0d"] });
  console.log("RPC Data:", data);
  console.log("RPC Error:", error);
}
test();
