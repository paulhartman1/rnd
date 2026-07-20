import { NextResponse } from "next/server";
import { parseLeadPayload } from "@/lib/leads";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendNewLeadNotifications } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    // Log the incoming request for debugging
    console.log('[/api/leads/web] Incoming request:', {
      timestamp: new Date().toISOString(),
      headers: {
        'content-type': request.headers.get('content-type'),
        'user-agent': request.headers.get('user-agent'),
        'x-forwarded-for': request.headers.get('x-forwarded-for'),
      },
      body: payload,
    });

    const parsedLead = parseLeadPayload(payload);

    if (!parsedLead.ok) {
      console.error('[/api/leads/web] Validation error:', parsedLead.error);
      return NextResponse.json({ error: parsedLead.error }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const supabase = adminClient ?? (await createClient());

    // Get the "Website" source ID
    const { data: sourceData } = await supabase
      .from("sources")
      .select("id")
      .eq("name", "Website")
      .single();

    const sourceId = sourceData?.id || null;

    const { data, error } = await supabase
      .from("leads")
      .insert({
        ...parsedLead.data,
        ...(sourceId && { source_id: sourceId }),
      })
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

    // Create property record for the lead if required address data exists
    // Properties table requires: street_address, city, state, postal_code (NOT NULL constraints)
    if (parsedLead.data.street_address && parsedLead.data.city && parsedLead.data.state && parsedLead.data.postal_code) {
      const { error: propertyError } = await supabase
        .from("properties")
        .insert({
          lead_id: data.id,
          street_address: parsedLead.data.street_address,
          city: parsedLead.data.city,
          state: parsedLead.data.state,
          postal_code: parsedLead.data.postal_code,
          property_type: parsedLead.data.property_type,
          notes: "Created automatically from website lead",
        });

      if (propertyError) {
        console.error("Failed to create property for lead:", propertyError);
        // Don't fail the request if property creation fails
        // The lead was created successfully, which is the primary goal
      }
    } else if (parsedLead.data.street_address) {
      console.warn('[/api/leads/web] Skipping property creation - incomplete address', {
        leadId: data.id,
        has_street: !!parsedLead.data.street_address,
        has_city: !!parsedLead.data.city,
        has_state: !!parsedLead.data.state,
        has_postal: !!parsedLead.data.postal_code,
        street: parsedLead.data.street_address,
        city: parsedLead.data.city,
        state: parsedLead.data.state,
        postal: parsedLead.data.postal_code,
      });
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

    const notificationTimeoutMs = 5000;
    const notificationResult = await Promise.race([
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
      }).then(() => "completed" as const),
      new Promise<"timed-out">((resolve) =>
        setTimeout(() => resolve("timed-out"), notificationTimeoutMs)
      ),
    ]).catch((err) => {
      // Log error but don't fail the request
      console.error("Notification error:", err);
      return "failed" as const;
    });

    if (notificationResult === "timed-out") {
      console.warn("Notification sending timed out", {
        leadId: data.id,
        timeoutMs: notificationTimeoutMs,
      });
    }

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
