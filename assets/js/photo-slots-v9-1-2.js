(function () {
  const TENANT = 'blue-bear-electric';
  const images = [...document.querySelectorAll('[data-photo-slot]')];
  if (!images.length) return;

  async function applyOverrides() {
    if (!window.supabase || !window.BLUE_BEAR_SUPABASE_URL || !window.BLUE_BEAR_SUPABASE_KEY)
      return;
    try {
      const client = window.supabase.createClient(
        window.BLUE_BEAR_SUPABASE_URL,
        window.BLUE_BEAR_SUPABASE_KEY,
      );
      const keys = images.map((img) => img.dataset.photoSlot).filter(Boolean);
      const { data, error } = await client
        .from('website_photo_slots')
        .select('*')
        .eq('tenant_key', TENANT)
        .in('slot_key', keys)
        .eq('is_published', true);
      if (error || !data?.length) return;
      const map = new Map(data.map((row) => [row.slot_key, row]));
      images.forEach((img) => {
        const row = map.get(img.dataset.photoSlot);
        if (!row) return;
        img.src = row.public_url;
        if (row.alt_text) img.alt = row.alt_text;
        img.dataset.photoSource = 'managed';
      });
    } catch (error) {
      console.warn('Photo slot fallback in use', error);
    }
  }
  applyOverrides();
})();
