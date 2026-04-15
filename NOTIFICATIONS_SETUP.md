# Mobile Notifications Setup Guide

Get instant SMS and email alerts when new leads arrive—no app store required!

---

## 🎯 Overview

This app supports **two types of instant notifications**:

1. **📱 SMS Notifications** (Recommended) - Text message to your phone
2. **📧 Email Notifications** - Email to your inbox

Both work immediately without needing a mobile app. Choose one or use both for redundancy.

---

## 📱 SMS Notifications Setup (5 minutes)

### What You Need
- Your existing Twilio account (already configured for calling)
- Your mobile phone number

### Setup Steps

1. **Add your phone number to `.env.local`**:
   ```bash
   ADMIN_NOTIFICATION_PHONE=+15555551234  # Your cell phone
   ```
   - Use E.164 format: `+1` followed by 10-digit US number
   - Example: `+15555551234`

2. **Set your site URL** (for links in SMS):
   ```bash
   NEXT_PUBLIC_SITE_URL=https://yoursite.com
   ```

3. **Restart your development server**:
   ```bash
   npm run dev
   ```

4. **Test it**:
   - Fill out a lead form at `/get-cash-offer`
   - You should receive an SMS within seconds

### SMS Cost
- **~$0.0075 per SMS** (less than 1 cent per lead)
- 1,000 leads/month = **$7.50/month** in SMS costs
- Uses your existing Twilio account balance

### SMS Format
```
🏠 NEW LEAD ALERT

Name: John Smith
Location: Austin, TX
Property: Single Family
Repairs: Minor Renovations $$
Timeline: 0-14 Days

Contact: (555) 123-4567

View: https://yoursite.com/admin/leads
```

---

## 📧 Email Notifications Setup (15 minutes)

### What You Need
- Free Resend account (3,000 emails/month free)

### Setup Steps

1. **Create Resend account**:
   - Go to https://resend.com
   - Sign up (free tier: 3,000 emails/month)
   - Verify your email

2. **Get API key**:
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Copy the key (starts with `re_`)

3. **Add domain** (for production):
   - Go to Domains → Add Domain
   - Add your domain: `rushndush.com`
   - Add DNS records (MX, TXT, DKIM)
   - Wait for verification (~5 minutes)

4. **Add to `.env.local`**:
   ```bash
   RESEND_API_KEY=re_abc123xyz789
   ADMIN_NOTIFICATION_EMAIL=youremail@gmail.com
   NOTIFICATION_FROM_EMAIL=noreply@rushndush.com
   NEXT_PUBLIC_SITE_URL=https://yoursite.com
   ```

5. **Test it**:
   - Fill out a lead form
   - Check your email inbox (may take 10-30 seconds)

### Email Features
- **Branded design** (Rush N Dush colors/logo)
- **All lead details** in formatted table
- **Click-to-call** phone number link
- **Direct link** to lead in CRM

### Email Cost
- **Free tier**: 3,000 emails/month
- **Paid tier**: $20/month for 50,000 emails
- For 100 leads/month: **FREE**

---

## ⚙️ Configuration Options

### Skip Notifications During Development
Don't want notifications while testing? Simply don't set the env vars:
```bash
# Comment out or remove these lines
# ADMIN_NOTIFICATION_PHONE=+15555551234
# ADMIN_NOTIFICATION_EMAIL=admin@example.com
```

The app will log `"Notification skipped"` to console but continue working.

### Multiple Recipients (Email only)
To send emails to multiple people:

Edit `src/lib/notifications.ts`:
```typescript
to: [adminEmail, 'person2@example.com', 'person3@example.com'],
```

### Customize Email Template
Edit the HTML in `src/lib/notifications.ts` → `sendLeadEmailNotification()`

### Customize SMS Message
Edit the message text in `src/lib/notifications.ts` → `sendLeadSmsNotification()`

---

## 🚀 Production Deployment (Vercel)

Add these environment variables to your Vercel project:

1. Go to Vercel dashboard → Your Project → Settings → Environment Variables

2. Add:
   ```
   ADMIN_NOTIFICATION_PHONE=+15555551234
   RESEND_API_KEY=re_abc123xyz789
   ADMIN_NOTIFICATION_EMAIL=admin@yourcompany.com
   NOTIFICATION_FROM_EMAIL=noreply@rushndush.com
   NEXT_PUBLIC_SITE_URL=https://yoursite.com
   ```

3. Redeploy your app

---

## 🧪 Testing

### Test SMS Notification
```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "listedWithAgent": "No",
    "propertyType": "Single Family",
    "ownsLand": "Yes",
    "repairsNeeded": "Minor Renovations",
    "closeTimeline": "0-14 Days",
    "sellReason": "Inherited",
    "acceptableOffer": "$200,000",
    "streetAddress": "123 Main St",
    "city": "Austin",
    "state": "TX",
    "postalCode": "78701",
    "fullName": "Test Lead",
    "email": "test@example.com",
    "phone": "(555) 123-4567",
    "smsConsent": true
  }'
```

Check your phone for SMS and inbox for email within 30 seconds.

---

## ❓ Troubleshooting

### SMS not arriving?
1. Check Twilio dashboard for delivery status
2. Verify phone number format: `+15555551234`
3. Check Twilio balance ($1+ required)
4. Look at server logs: `console.log("SMS notification...")`

### Email not arriving?
1. Check spam folder
2. Verify Resend domain is verified (production)
3. Check Resend dashboard → Logs for delivery status
4. In development, use testing email or your personal email

### Notifications slowing down response?
No! Notifications run in the background (`Promise.allSettled`) and don't block the API response. The lead is saved immediately, then notifications fire.

### Want to disable notifications temporarily?
Comment out the env vars in `.env.local`:
```bash
# ADMIN_NOTIFICATION_PHONE=+15555551234
# ADMIN_NOTIFICATION_EMAIL=admin@example.com
```

---

## 🔮 Future: PWA Push Notifications

Want true mobile push notifications (like apps)?

**Coming Soon**: Progressive Web App (PWA) push notifications
- Works in mobile browsers (no app store)
- Rich notifications with images
- Works offline
- Free (no SMS costs)

Let me know if you want this feature!

---

## 📊 Notification Log

All notifications are logged to console. Check server logs to debug:

```bash
# Development
npm run dev

# Look for these logs:
"SMS notification sent successfully"
"Email notification sent successfully"
"Notification skipped: Twilio not configured"
```

In production (Vercel), check the **Functions** logs.

---

## 💰 Cost Summary

| Method | Free Tier | Cost Per Lead | Best For |
|--------|-----------|---------------|----------|
| **SMS** | None | $0.0075 | Instant, reliable |
| **Email** | 3,000/month | $0 (free tier) | Detailed info |
| **PWA Push** | Unlimited | $0 | Future option |

**Recommendation**: Use **both** SMS + Email for redundancy. Total cost: **~$0.0075/lead**

---

## Need Help?

- Twilio docs: https://www.twilio.com/docs
- Resend docs: https://resend.com/docs
- Issues? Check server logs first

Happy lead hunting! 🏠
