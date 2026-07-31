import { supabaseAdmin } from "@/integrations/supabase/client.server";
import webpush from "web-push";

// Make sure to load environment variables for the server functions
const PUBLIC_VAPID_KEY = process.env.VITE_VAPID_PUBLIC_KEY || "";
const PRIVATE_VAPID_KEY = process.env.VAPID_PRIVATE_KEY || "";
const SUBJECT = "mailto:support@okikeenterprises.com";

if (PUBLIC_VAPID_KEY && PRIVATE_VAPID_KEY) {
  webpush.setVapidDetails(SUBJECT, PUBLIC_VAPID_KEY, PRIVATE_VAPID_KEY);
}

export const sendPushNotification = async (userId: string, title: string, body: string, url: string = "/") => {
  if (!PUBLIC_VAPID_KEY || !PRIVATE_VAPID_KEY) return;
  
  try {
    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);
      
    if (!subs || subs.length === 0) return;
    
    const payload = JSON.stringify({ title, body, url });
    
    for (const sub of subs) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };
        await webpush.sendNotification(pushSubscription, payload);
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Subscription has expired or is no longer valid, delete it
          await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("Error sending push to subscription", err);
        }
      }
    }
  } catch (err) {
    console.error("sendPushNotification error", err);
  }
};
