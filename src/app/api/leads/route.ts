import { NextResponse } from "next/server";
import { parseLeadPayload } from "@/lib/leads";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendNewLeadNotifications } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    // Verify API key for external integrations
    const apiKey = request.headers.get("x-api-key");
    const validApiKeys = [
      process.env.REI_LEAD_PROS_API_KEY,
      process.env.TEST_API_KEY,
    ].filter(Boolean);

    if (!apiKey || !validApiKeys.includes(apiKey)) {
      return NextResponse.json(
        { error: "Unauthorized. Invalid or missing API key." },
        { status: 401 }
      );
    }
    const payload = await request.json();
    
    // Log the incoming request for debugging
    console.log('[/api/leads] Incoming request:', {
      timestamp: new Date().toISOString(),
      headers: {
        'content-type': request.headers.get('content-type'),
        'user-agent': request.headers.get('user-agent'),
        'x-forwarded-for': request.headers.get('x-forwarded-for'),
      },
      body: JSON.stringify(payload, null, 2),
    });
    
    const parsedLead = parseLeadPayload(payload);

    if (!parsedLead.ok) {
      console.error('[/api/leads] Validation error:', parsedLead.error);
      return NextResponse.json({ error: parsedLead.error }, { status: 400 });
    }
    
    // Log the parsed lead data
    console.log('[/api/leads] Parsed lead data:', {
      full_name: parsedLead.data.full_name,
      phone: parsedLead.data.phone,
      email: parsedLead.data.email,
      address: {
        street: parsedLead.data.street_address,
        city: parsedLead.data.city,
        state: parsedLead.data.state,
        zip: parsedLead.data.postal_code,
      },
      acceptable_offer: parsedLead.data.acceptable_offer,
    });

    const adminClient = createAdminClient();
    const supabase = adminClient ?? (await createClient());
    const { data, error } = await supabase
      .from("leads")
      .insert(parsedLead.data)
      .select("id")
      .single();

    // Extract questionHistory from payload if provided
    const questionHistory = (payload as { questionHistory?: Array<{ questionId: string; questionText: string; answer: string }> }).questionHistory;

    if (error) {
      console.error("Lead insert failed", {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message,
      });

      const invalidOrMissingAuth =
        error.code === "PGRST301" ||
        error.message.toLowerCase().includes("jwt") ||
        error.message.toLowerCase().includes("api key");

      const responsePayload =
        process.env.NODE_ENV === "production"
          ? {
              error: invalidOrMissingAuth
                ? "Unable to create lead due to Supabase authentication failure. Verify Vercel env vars point to the same Supabase project."
                : "Unable to create lead. Verify Supabase table/policies and deployment env vars.",
              code: error.code ?? null,
            }
          : {
              error: "Unable to create lead.",
              code: error.code ?? null,
              details: error.details ?? null,
              hint: error.hint ?? null,
              message: error.message,
            };

      return NextResponse.json(responsePayload, { status: 500 });
    }

    // Store question answers if provided
    if (questionHistory && Array.isArray(questionHistory) && questionHistory.length > 0) {
      const leadAnswers = questionHistory.map((item) => ({
        lead_id: data.id,
        question_id: item.questionId,
        question_text: item.questionText,
        answer_value: item.answer,
      }));

      const { error: answersError } = await supabase
        .from("lead_answers")
        .insert(leadAnswers);

      if (answersError) {
        console.error("Failed to insert lead answers:", answersError);
        // Don't fail the request if answers fail to insert
      }
    }

    // Send notifications (SMS + Email) - don't wait for them to complete
    sendNewLeadNotifications({
      leadId: data.id,
      fullName: parsedLead.data.full_name,
      city: parsedLead.data.city,
      state: parsedLead.data.state,
      phone: parsedLead.data.phone,
      propertyType: parsedLead.data.property_type,
      streetAddress: parsedLead.data.street_address,
      repairsNeeded: parsedLead.data.repairs_needed,
      closeTimeline: parsedLead.data.close_timeline,
    }).catch((err) => {
      // Log error but don't fail the request
      console.error("Notification error:", err);
    });

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    console.error("Lead creation route failure", { message });

    return NextResponse.json(
      {
        error:
          "Lead creation failed before database insert. Check deployment env vars and JSON payload format.",
        message: process.env.NODE_ENV === "production" ? null : message,
      },
      { status: 500 },
    );
  }
}
