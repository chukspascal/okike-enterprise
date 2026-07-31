import { createServerFn } from "@tanstack/react-start";

export const savePushSubscription = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d as { userId: string; subscription: any })
  .handler(async ({ data }) => {
    try {
      const { userId, subscription } = data;
      
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Check if subscription already exists
    const { data: existing } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id")
      .eq("endpoint", subscription.endpoint)
      .single();

    if (existing) {
      return { ok: true, message: "Subscription already exists" };
    }

    const { error } = await supabaseAdmin.from("push_subscriptions").insert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    });

    if (error) {
      console.error("Failed to save push subscription", error);
      return { ok: false, message: error.message };
    }
    return { ok: true, message: "Subscription saved" };
  } catch (error: any) {
    console.error("savePushSubscription error:", error);
    return { ok: false, message: error.message };
  }
});
