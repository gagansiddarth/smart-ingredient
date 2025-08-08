import { supabase } from "@/integrations/supabase/client";
import type { Scan } from "@/utils/storage";

export async function saveScanToSupabase(scan: Scan) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Not authenticated") };
  const { error } = await supabase.from("scans").insert({
    user_id: user.id,
    source: scan.source,
    image_url: scan.image_path,
    raw_text: scan.raw_text,
    cleaned_ingredients: scan.cleaned_ingredients,
    analysis: scan.analysis,
    saved: true,
  });
  return { error };
}
