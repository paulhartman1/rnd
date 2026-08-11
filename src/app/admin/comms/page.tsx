import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "../admin-nav";
import CommsClient from "./comms-client";

export type Voicemail = {
  id: string;
  from_number: string;
  recording_url: string | null;
  recording_duration: number | null;
  transcription: string | null;
  transcription_status: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  message_sid: string | null;
  from_number: string;
  to_number: string;
  body: string | null;
  num_media: number;
  media_urls: string[] | null;
  is_read: boolean;
  direction: "inbound" | "outbound" | null;
  created_at: string;
  updated_at: string;
};

export default async function AdminCommsPage({
  searchParams,
}: {
  searchParams: Promise<{ replyTo?: string; leadId?: string }>;
}) {
  let supabase;

  try {
    supabase = await createClient();
  } catch {
    return (
      <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[1.4rem] border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
          Supabase is not configured yet. Add `NEXT_PUBLIC_SUPABASE_URL` and
          `NEXT_PUBLIC_SUPABASE_ANON_KEY` to continue.
        </div>
      </main>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { replyTo, leadId } = await searchParams;

  const adminClient = createAdminClient();
  const queryClient = adminClient ?? supabase;

  const [voicemailsResult, messagesResult] = await Promise.all([
    queryClient
      .from("voicemails")
      .select("*")
      .order("created_at", { ascending: false }),
    queryClient
      .from("sms_messages")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  const voicemails = (voicemailsResult.data ?? []) as Voicemail[];
  const messages = (messagesResult.data ?? []) as Message[];

  const smsOutboundEnabled =
    process.env.TWILIO_SMS_OUTBOUND_ENABLED === "true";

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminNav />

        <header className="mb-6 rounded-[1.4rem] border border-black/6 bg-white px-6 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Communications
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-navy)]">
            Communications
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Manage voicemail messages and text conversations.
          </p>
        </header>

        <CommsClient
          initialVoicemails={voicemails}
          initialMessages={messages}
          smsOutboundEnabled={smsOutboundEnabled}
          initialReplyTo={replyTo}
          initialLeadId={leadId}
        />
      </div>
    </main>
  );
}