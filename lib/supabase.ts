import { createClient } from "@supabase/supabase-js";

// Public (publishable) key only — safe to expose client-side by design.
// Never put a service_role key in a NEXT_PUBLIC_ variable.
export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);
