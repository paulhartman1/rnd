import twilio from "twilio";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFeatureEnabled } from "@/lib/feature-flags";

type LeadNotificationData = {
  fullName: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  propertyType: string | null;
  streetAddress: string | null;
  repairsNeeded: string | null;
  closeTimeline: string | null;
  leadId: string;
};

/**
 * Send SMS notification to admin when a new lead is created
 */
export async function sendLeadSmsNotification(
  leadData: LeadNotificationData,
): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;
  const adminPhone = process.env.ADMIN_NOTIFICATION_PHONE;

  // Skip if Twilio not configured or admin phone not set
  if (!accountSid || (!apiKeySid && !authToken) || !fromPhone || !adminPhone) {
    console.log(
      "SMS notification skipped: Twilio or admin phone not configured",
    );
    return false;
  }

  try {
    // Use API key if available, otherwise fall back to auth token
    const client = apiKeySid && apiKeySecret
      ? twilio(apiKeySid, apiKeySecret, { accountSid })
      : twilio(accountSid, authToken);

    const message = `🏠 NEW LEAD ALERT

Name: ${leadData.fullName || "(No name)"}
Location: ${leadData.city || "(Unknown)"}, ${leadData.state || ""}
Property: ${leadData.propertyType || "Not specified"}
Repairs: ${leadData.repairsNeeded || "Not specified"}
Timeline: ${leadData.closeTimeline || "Not specified"}

Contact: ${leadData.phone || "(No phone)"}

View: ${process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com"}/admin/leads`;

    await client.messages.create({
      body: message,
      from: fromPhone,
      to: adminPhone,
    });

    console.log("SMS notification sent successfully");
    return true;
  } catch (error) {
    console.error("Failed to send SMS notification:", error);
    return false;
  }
}

/**
 * Send email notification to admin when a new lead is created
 * Uses Resend (requires: npm install resend)
 */
export async function sendLeadEmailNotification(
  leadData: LeadNotificationData,
): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  const fromEmail = process.env.NOTIFICATION_FROM_EMAIL || "noreply@rushndush.com";

  // Skip if Resend not configured
  if (!resendApiKey || !adminEmail) {
    console.log(
      "Email notification skipped: Resend API key or admin email not configured",
    );
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Rush N Dush <${fromEmail}>`,
        to: [adminEmail],
        subject: `🏠 New Lead: ${leadData.fullName || "(No name)"} - ${leadData.city || "(Unknown)"}, ${leadData.state || ""}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #14233f; color: #dba63d; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f6f7fb; padding: 30px; border-radius: 0 0 8px 8px; }
                .field { margin-bottom: 15px; }
                .label { font-weight: bold; color: #14233f; }
                .value { color: #5c6b84; }
                .button { 
                  display: inline-block; 
                  background: #dba63d; 
                  color: #14233f; 
                  padding: 12px 24px; 
                  text-decoration: none; 
                  border-radius: 6px;
                  font-weight: bold;
                  margin-top: 20px;
                }
                .button:hover { background: #c88b1f; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0;">🏠 New Lead Received</h1>
                </div>
                <div class="content">
                  <div class="field">
                    <span class="label">Name:</span>
                    <span class="value">${leadData.fullName || "(No name)"}</span>
                  </div>
                  <div class="field">
                    <span class="label">Property Address:</span>
                    <span class="value">${leadData.streetAddress || "(Not provided)"}, ${leadData.city || "(Unknown)"}, ${leadData.state || ""}</span>
                  </div>
                  <div class="field">
                    <span class="label">Phone:</span>
                    <span class="value"><a href="tel:${leadData.phone || ""}">${leadData.phone || "(No phone)"}</a></span>
                  </div>
                  <div class="field">
                    <span class="label">Property Type:</span>
                    <span class="value">${leadData.propertyType || "Not specified"}</span>
                  </div>
                  <div class="field">
                    <span class="label">Repairs Needed:</span>
                    <span class="value">${leadData.repairsNeeded || "Not specified"}</span>
                  </div>
                  <div class="field">
                    <span class="label">Close Timeline:</span>
                    <span class="value">${leadData.closeTimeline || "Not specified"}</span>
                  </div>
                  
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com"}/admin/leads" class="button">
                    View Lead in CRM →
                  </a>
                  
                  <p style="margin-top: 30px; color: #5c6b84; font-size: 12px; border-top: 1px solid #ddd; padding-top: 15px;">
                    This is an automated notification from your Rush N Dush CRM.
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }

    console.log("Email notification sent successfully");
    return true;
  } catch (error) {
    console.error("Failed to send email notification:", error);
    return false;
  }
}

/**
 * Send push notification to all active subscriptions
 */
export async function sendLeadPushNotification(
  leadData: LeadNotificationData,
): Promise<boolean> {
  // Check if feature is enabled
  const featureEnabled = await isFeatureEnabled("pwa_push_notifications");
  if (!featureEnabled) {
    console.log("Push notifications skipped: Feature not enabled");
    return false;
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL || "mailto:admin@rushndush.com";

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.log("Push notifications skipped: VAPID keys not configured");
    return false;
  }

  try {
    // Configure web-push with VAPID keys
    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

    // Get all active push subscriptions from database
    const adminClient = createAdminClient();
    if (!adminClient) {
      console.error("Push notification failed: Admin client not available");
      return false;
    }

    const { data: subscriptions, error } = await adminClient
      .from("push_subscriptions")
      .select("*")
      .eq("is_active", true);

    if (error || !subscriptions || subscriptions.length === 0) {
      console.log("No active push subscriptions found");
      return false;
    }

    // Prepare notification payload
    const payload = JSON.stringify({
      title: "🏠 New Lead Alert",
      body: `${leadData.fullName || "(No name)"} - ${leadData.city || "Unknown"}, ${leadData.state || ""}\n${leadData.phone || "(No phone)"}`,
      icon: "/icon-192x192.png",
      badge: "/badge-72x72.png",
      url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com"}/admin/leads`,
      leadId: leadData.leadId,
      tag: "lead-notification",
    });

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh_key,
                auth: sub.auth_key,
              },
            },
            payload
          );
          console.log(`Push notification sent to ${sub.endpoint.substring(0, 50)}...`);
        } catch (error: unknown) {
          // Check if subscription is no longer valid (410 Gone)
          if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 410) {
            console.log(`Subscription expired, marking inactive: ${sub.id}`);
            await adminClient
              .from("push_subscriptions")
              .update({ is_active: false })
              .eq("id", sub.id);
          } else {
            console.error("Push notification failed:", error);
          }
          throw error;
        }
      })
    );

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    console.log(`Push notifications: ${successCount}/${subscriptions.length} sent`);
    return successCount > 0;
  } catch (error) {
    console.error("Failed to send push notifications:", error);
    return false;
  }
}

/**
 * Send all configured notifications (SMS + Email + Push)
 */
export async function sendNewLeadNotifications(
  leadData: LeadNotificationData,
): Promise<void> {
  // Send all in parallel (don't wait for each other)
  await Promise.allSettled([
    sendLeadSmsNotification(leadData),
    sendLeadEmailNotification(leadData),
    sendLeadPushNotification(leadData),
  ]);
}
