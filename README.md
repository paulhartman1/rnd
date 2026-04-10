This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Supabase setup (database + auth)

1. Create a Supabase project.
2. In Supabase SQL Editor, run `supabase/schema.sql` from this repository.
3. Copy `.env.example` to `.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - Optional but recommended for server API routes: `SUPABASE_SERVICE_ROLE_KEY`
4. In Supabase Authentication, create the owner/admin user (email + password) you will use to sign in.
5. Set Twilio variables for voice calls from admin:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER` (Twilio number used as the outbound caller ID)
   - `TWILIO_FORWARD_TO_NUMBER` (your phone; lead gets bridged to this when they answer)
   - Optional: `TWILIO_CALL_URL` (advanced override for custom TwiML URL)
6. Start the app with `npm run dev`.

### Production (Vercel)

Add the same environment variables to your Vercel project settings for Preview and Production environments:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- Optional but recommended: `SUPABASE_SERVICE_ROLE_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

## Lead flow

- `/get-cash-offer` submits the intake answers to `POST /api/leads`.
- Data is persisted to Supabase in the `public.leads` table.
- Admin signs in at `/admin/login` and manages leads at `/admin/leads`.
- Admin can initiate outbound calls to leads via Twilio Voice from the lead card.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
