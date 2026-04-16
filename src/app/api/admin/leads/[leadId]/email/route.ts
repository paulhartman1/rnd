import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = {
  leadId: string;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<Params> },
) {
  const { leadId } = await params;

  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("full_name, email, street_address, city, state")
    .eq("id", leadId)
    .is("deleted_at", null)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.NOTIFICATION_FROM_EMAIL || "noreply@rushndush.com";
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;

  if (!resendApiKey) {
    return NextResponse.json(
      {
        error:
          "Resend is not configured. Set RESEND_API_KEY environment variable.",
      },
      { status: 500 },
    );
  }

  if (!adminEmail) {
    return NextResponse.json(
      {
        error:
          "Admin email is not configured. Set ADMIN_NOTIFICATION_EMAIL environment variable.",
      },
      { status: 500 },
    );
  }

  try {
    const body = (await request.json()) as {
      subject?: string;
      message?: string;
    };

    const subject = body.subject || `Re: ${lead.street_address}`;
    const message = body.message || "";

    const resend = new Resend(resendApiKey);

    console.log('Sending email with config:', {
      from: `Rush N Dush <${fromEmail}>`,
      to: lead.email,
      replyTo: adminEmail,
      subject: subject,
    });

    const { data, error } = await resend.emails.send({
      from: `Rush N Dush <${fromEmail}>`,
      to: [lead.email],
      replyTo: adminEmail,
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
                line-height: 1.6; 
                color: #333; 
                margin: 0;
                padding: 0;
              }
              .container { 
                max-width: 600px; 
                margin: 0 auto; 
                padding: 20px; 
              }
              .header { 
                background: #14233f; 
                color: #dba63d; 
                padding: 24px; 
                text-align: center; 
                border-radius: 8px 8px 0 0; 
              }
              .header h1 {
                margin: 0;
                font-size: 24px;
                font-weight: 700;
              }
              .content { 
                background: #ffffff; 
                padding: 32px 24px; 
                border: 1px solid #e5e7eb;
                border-top: none;
                border-radius: 0 0 8px 8px; 
              }
              .message {
                white-space: pre-wrap;
                margin-bottom: 24px;
                color: #374151;
                font-size: 15px;
              }
              .footer {
                margin-top: 24px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                color: #6b7280;
                font-size: 13px;
              }
              .signature {
                margin-top: 16px;
                color: #374151;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Rush N Dush</h1>
              </div>
              <div class="content">
                <p class="message">${message.replace(/\n/g, "<br>")}</p>
                
                <div class="signature">
                  <p style="margin: 0;"><strong>Rush N Dush Team</strong></p>
                  <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">
                    Reply directly to this email to reach us
                  </p>
                </div>

                <div class="footer">
                  <p style="margin: 0;">
                    This email was sent regarding your property inquiry at ${lead.street_address}, ${lead.city}, ${lead.state}.
                  </p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend API error:', error);
      throw error;
    }

    console.log('Email sent successfully:', data);

    return NextResponse.json({ 
      success: true, 
      emailId: data?.id,
      message: "Email sent successfully" 
    });
  } catch (error) {
    console.error('Email sending failed:', error);
    const message =
      error instanceof Error ? error.message : "Failed to send email.";
    const details = error instanceof Error ? error.stack : String(error);
    console.error('Error details:', details);
    return NextResponse.json({ 
      error: message,
      details: process.env.NODE_ENV === 'development' ? details : undefined 
    }, { status: 502 });
  }
}
