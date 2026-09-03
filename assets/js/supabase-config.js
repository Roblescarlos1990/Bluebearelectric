window.BLUE_BEAR_SUPABASE_URL = 'https://xpnkybwbliiqulsgqgho.supabase.co';
window.BLUE_BEAR_SUPABASE_KEY = 'sb_publishable_shb3xQEsmtWtYAIBnDzDPQ_GfT35KF-';

window.BLUE_BEAR_SUPABASE_CLIENT =
  window.supabase && window.BLUE_BEAR_SUPABASE_URL && window.BLUE_BEAR_SUPABASE_KEY
    ? window.supabase.createClient(window.BLUE_BEAR_SUPABASE_URL, window.BLUE_BEAR_SUPABASE_KEY)
    : null;
