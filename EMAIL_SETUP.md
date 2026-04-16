# Email Setup Guide (Resend)

Send professional emails directly to leads from the admin dashboard.

---

## 🎯 Overview

The admin dashboard now has a **Contact → Email** option that allows you to:
- Compose and send emails directly to leads
- Professional branded email template
- Replies go directly to your admin email
- No external email client needed

---

## 📧 Setup (15 minutes)

### 1. Create Resend Account

1. Go to https://resend.com
2. Sign up (free tier: 3,000 emails/month, 100/day)
3. Verify your email

### 2. Get API Key

1. Go to **Settings → API Keys**
2. Click **Create API Key**
3. Name it "Rush N Dush"
4. Copy the key (starts with `re_`)

### 3. Configure Domain (Production Only)

For production, you need to verify your domain:

1. Go to **Domains → Add Domain**
2. Add: `rushndush.com`
3. Add DNS records provided by Resend:
   - SPF (TXT record)
   - DKIM (TXT record)
   - Return-Path (CNAME)
4. Wait for verification (~5-15 minutes)

**For development/testing**: Skip this step - Resend allows sending from `onboarding@resend.dev` for testing

### 4. Add Environment Variables

Add to `.env.local`:

```bash
# Resend API key
RESEND_API_KEY=re_abc123xyz789

# Your admin email (where replies go)
ADMIN_NOTIFICATION_EMAIL=youremail@example.com

# From email (use your verified domain in production)
NOTIFICATION_FROM_EMAIL=noreply@rushndush.com
```

**For development**, you can use:
```bash
NOTIFICATION_FROM_EMAIL=onboarding@resend.dev
```

### 5. Restart Dev Server

```bash
npm run dev
```

### 6. Test It

1. Go to `/admin/leads`
2. Click **Contact → Email** on any lead
3. Compose and send a test email
4. Check the lead's inbox

---

## ✨ Features

### Email Compose Modal
- Pre-filled subject line with property address
- Pre-filled greeting with lead's first name
- Large message textarea for composing
- Real-time validation

### Email Template
- Professional branded design (Rush N Dush colors)
- Responsive HTML email
- Reply-to configured to your admin email
- Property context in footer

### User Experience
- Success confirmation with auto-close
- Clear error messages
- Disabled send button while sending
- No page refresh needed

---

## 💰 Pricing

### Free Tier (Resend)
- **3,000 emails/month**
- **100 emails/day**
- Perfect for small to medium lead volume

### Paid Plans
- **$20/month**: 50,000 emails
- **$80/month**: 1M emails

For most real estate investors: **FREE tier is sufficient**

---

## 🔧 Configuration

### Customize Email Template

Edit `/src/app/api/admin/leads/[leadId]/email/route.ts`

Look for the HTML template section (around line 76-155):
```typescript
html: `
  <!DOCTYPE html>
  <html>
    ...
  </html>
`
```

### Change "From" Name

In the same file, line 72:
```typescript
from: `Your Company Name <${fromEmail}>`,
```

### Add CC/BCC

In the same file, add after line 74:
```typescript
cc: ['manager@example.com'],
bcc: ['archive@example.com'],
```

---

## 🚀 Production Deployment (Vercel)

1. Go to **Vercel Dashboard → Your Project → Settings → Environment Variables**

2. Add:
   ```
   RESEND_API_KEY=re_abc123xyz789
   ADMIN_NOTIFICATION_EMAIL=youremail@example.com
   NOTIFICATION_FROM_EMAIL=noreply@rushndush.com
   ```

3. Make sure your domain is verified in Resend

4. Redeploy

---

## 🧪 Testing

### Test Email Sending

```bash
curl -X POST http://localhost:3000/api/admin/leads/LEAD_ID/email \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Test Email",
    "message": "Hi there,\n\nThis is a test email.\n\nBest regards,\nRush N Dush Team"
  }'
```

Replace `LEAD_ID` with an actual lead ID from your database.

### Check Delivery

1. Log into Resend dashboard
2. Go to **Logs** section
3. See all sent emails with delivery status

---

## ❓ Troubleshooting

### Email not sending?

1. Check browser console for errors
2. Check server logs: `npm run dev` output
3. Verify `RESEND_API_KEY` is set correctly
4. Check Resend dashboard → Logs for delivery errors

### Emails going to spam?

**In production:**
- Verify your domain in Resend
- Add all DNS records (SPF, DKIM, Return-Path)
- Use your own domain, not `onboarding@resend.dev`

**In development:**
- This is normal with `onboarding@resend.dev`
- Check spam folder

### "Resend is not configured" error?

Add these to `.env.local`:
```bash
RESEND_API_KEY=re_...
ADMIN_NOTIFICATION_EMAIL=youremail@example.com
```

### Replies not reaching you?

Verify `ADMIN_NOTIFICATION_EMAIL` is set to your actual email address. Replies will go there.

---

## 📊 Email vs mailto:

| Feature | Resend Email | mailto: Link |
|---------|--------------|--------------|
| **Professional branding** | ✅ Yes | ❌ Plain text |
| **Works on all devices** | ✅ Yes | ⚠️ Needs email client |
| **Track delivery** | ✅ Yes | ❌ No |
| **Reply-to configuration** | ✅ Yes | ❌ No control |
| **Works on mobile** | ✅ Yes | ⚠️ Maybe |
| **Cost** | 💵 Free tier | 🆓 Free |

**Recommendation**: Use Resend for professional, reliable email delivery.

---

## 🔮 Future Enhancements

Possible features to add:
- Email templates (multiple pre-written messages)
- Email history/log per lead
- Attachment support
- Rich text editor
- Email scheduling
- Follow-up reminders

Let me know if you want any of these!

---

## 📚 Resources

- Resend Docs: https://resend.com/docs
- Resend Dashboard: https://resend.com/overview
- Domain Verification Guide: https://resend.com/docs/dashboard/domains/introduction

---

## Need Help?

Check Resend's excellent documentation or the server logs for detailed error messages.
