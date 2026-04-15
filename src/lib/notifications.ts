import twilio from "twilio";

type LeadNotificationData = {
  fullName: string;
  city: string;
  state: string;
  phone: string;
  propertyType: string;
  streetAddress: string;
  repairsNeeded: string;
  closeTimeline: string;
  leadId: string;
};

/**
 * Send SMS notification to admin when a new lead is created
 */
export async function sendLeadSmsNotification(
  leadData: LeadNotificationData,
): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;
  const adminPhone = process.env.ADMIN_NOTIFICATION_PHONE;

  // Skip if Twilio not configured or admin phone not set
  if (!accountSid || !authToken || !fromPhone || !adminPhone) {
    console.log(
      "SMS notification skipped: Twilio or admin phone not configured",
    );
    return false;
  }

  try {
    const client = twilio(accountSid, authToken);

    const message = `🏠 NEW LEAD ALERT

Name: ${leadData.fullName}
Location: ${leadData.city}, ${leadData.state}
Property: ${leadData.propertyType}
Repairs: ${leadData.repairsNeeded}
Timeline: ${leadData.closeTimeline}

Contact: ${leadData.phone}

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
        subject: `🏠 New Lead: ${leadData.fullName} - ${leadData.city}, ${leadData.state}`,
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
                    <span class="value">${leadData.fullName}</span>
                  </div>
                  <div class="field">
                    <span class="label">Property Address:</span>
                    <span class="value">${leadData.streetAddress}, ${leadData.city}, ${leadData.state}</span>
                  </div>
                  <div class="field">
                    <span class="label">Phone:</span>
                    <span class="value"><a href="tel:${leadData.phone}">${leadData.phone}</a></span>
                  </div>
                  <div class="field">
                    <span class="label">Property Type:</span>
                    <span class="value">${leadData.propertyType}</span>
                  </div>
                  <div class="field">
                    <span class="label">Repairs Needed:</span>
                    <span class="value">${leadData.repairsNeeded}</span>
                  </div>
                  <div class="field">
                    <span class="label">Close Timeline:</span>
                    <span class="value">${leadData.closeTimeline}</span>
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
 * Send all configured notifications (SMS + Email)
 */
export async function sendNewLeadNotifications(
  leadData: LeadNotificationData,
): Promise<void> {
  // Send both in parallel (don't wait for each other)
  await Promise.allSettled([
    sendLeadSmsNotification(leadData),
    sendLeadEmailNotification(leadData),
  ]);
}
