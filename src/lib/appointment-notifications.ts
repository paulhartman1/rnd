type AppointmentRequestNotificationData = {
  fullName: string;
  email: string;
  phone: string;
  appointmentType: string;
  requestedTime: string;
  address: string;
  requestId: string;
};

type AppointmentApprovalNotificationData = {
  email: string;
  fullName: string;
  appointmentType: string;
  startTime: string;
  endTime: string;
  location: string;
};

/**
 * Send email notification to admin when a new appointment request is submitted
 */
export async function sendAppointmentRequestNotification(
  data: AppointmentRequestNotificationData,
): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  const fromEmail =
    process.env.NOTIFICATION_FROM_EMAIL || "noreply@rushndush.com";

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
        subject: `📅 New Appointment Request: ${data.fullName}`,
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
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0;">📅 New Appointment Request</h1>
                </div>
                <div class="content">
                  <div class="field">
                    <span class="label">Name:</span>
                    <span class="value">${data.fullName}</span>
                  </div>
                  <div class="field">
                    <span class="label">Email:</span>
                    <span class="value"><a href="mailto:${data.email}">${data.email}</a></span>
                  </div>
                  <div class="field">
                    <span class="label">Phone:</span>
                    <span class="value"><a href="tel:${data.phone}">${data.phone}</a></span>
                  </div>
                  <div class="field">
                    <span class="label">Appointment Type:</span>
                    <span class="value">${data.appointmentType}</span>
                  </div>
                  <div class="field">
                    <span class="label">Requested Time:</span>
                    <span class="value">${new Date(data.requestedTime).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })}</span>
                  </div>
                  <div class="field">
                    <span class="label">Property Address:</span>
                    <span class="value">${data.address}</span>
                  </div>
                  
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com"}/admin/calendar" class="button">
                    Review & Approve →
                  </a>
                  
                  <p style="margin-top: 30px; color: #5c6b84; font-size: 12px; border-top: 1px solid #ddd; padding-top: 15px;">
                    This is an automated notification from your Rush N Dush calendar system.
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

    console.log("Appointment request notification sent successfully");
    return true;
  } catch (error) {
    console.error("Failed to send appointment request notification:", error);
    return false;
  }
}

/**
 * Send confirmation email to user when their appointment request is approved
 */
export async function sendAppointmentApprovalNotification(
  data: AppointmentApprovalNotificationData,
): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.NOTIFICATION_FROM_EMAIL || "noreply@rushndush.com";

  if (!resendApiKey) {
    console.log("Email notification skipped: Resend API key not configured");
    return false;
  }

  const startDate = new Date(data.startTime);
  const endDate = new Date(data.endTime);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Rush N Dush <${fromEmail}>`,
        to: [data.email],
        subject: `✅ Appointment Confirmed - ${data.appointmentType}`,
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
                .value { color: #5c6b84; font-size: 18px; }
                .highlight { background: #dba63d; color: #14233f; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0;">✅ Your Appointment is Confirmed!</h1>
                </div>
                <div class="content">
                  <p>Hi ${data.fullName},</p>
                  <p>Great news! Your appointment request has been approved.</p>
                  
                  <div class="highlight">
                    <strong>${data.appointmentType}</strong>
                  </div>
                  
                  <div class="field">
                    <span class="label">📅 Date & Time:</span><br>
                    <span class="value">${startDate.toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span><br>
                    <span class="value">${startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} - ${endDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                  </div>
                  
                  <div class="field">
                    <span class="label">📍 Location:</span><br>
                    <span class="value">${data.location}</span>
                  </div>
                  
                  <p style="margin-top: 30px;">If you need to reschedule or have any questions, please don't hesitate to contact us.</p>
                  
                  <p style="margin-top: 30px; color: #5c6b84; font-size: 12px; border-top: 1px solid #ddd; padding-top: 15px;">
                    We look forward to meeting with you!<br>
                    - Rush N Dush Team
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

    console.log("Appointment approval notification sent successfully");
    return true;
  } catch (error) {
    console.error("Failed to send appointment approval notification:", error);
    return false;
  }
}
