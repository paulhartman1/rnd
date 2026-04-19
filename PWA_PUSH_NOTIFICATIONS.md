# PWA Push Notifications Setup

Get instant mobile push notifications when new leads arrive - works in mobile browsers without an app store!

---

## 🎯 Overview

This feature adds **Progressive Web App (PWA) push notifications** to your Rush N Dush CRM:

- ✅ **Works in mobile browsers** (Chrome, Firefox, Edge on Android; Safari on iOS 16.4+)
- ✅ **No app store required** - users can "install" the PWA to their home screen
- ✅ **Completely free** - no third-party service costs
- ✅ **Feature flagged** - enable/disable for specific users
- ✅ **Multiple devices** - each device subscribes independently

---

## 🚀 Quick Setup (5 minutes)

### 1. Run Database Migrations

Apply the new migrations to create the feature flag and subscriptions table:

```bash
# If using local Supabase
supabase db reset

# Or in production, migrations will auto-apply on next deploy
```

### 2. Add Environment Variables

Add these to your `.env.local`:

```bash
# VAPID keys for web push (already generated for you)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BE5ARLM2FmDQ-pcUT1Lke5eC7ZuoEHkwz57IbG0kgRWOypXpr-IS2-s3Vgn96NEnpGz_SsBGmQOg71mX0Fz0Mww
VAPID_PRIVATE_KEY=O_smANKJAaGXzBBWdvvLE0qTx3dKeOcVN58ngBx9hMA

# Optional: Email for VAPID identification (defaults to mailto:admin@rushndush.com)
VAPID_EMAIL=mailto:youremail@example.com
```

**Security note**: The VAPID private key should be kept secret. Don't commit it to version control.

### 3. Add PWA Icons

You need two icon sizes in your `/public` folder:
- `icon-192x192.png` (192x192 pixels)
- `icon-512x512.png` (512x512 pixels)
- `badge-72x72.png` (72x72 pixels, monochrome)

You can generate these from your logo using any image editor or online tool.

### 4. Enable the Feature Flag

1. Go to `/admin/feature-flags` (super admin only)
2. Find "PWA Push Notifications"
3. Toggle it **ON**
4. Add allowed user emails (or leave empty to allow all admins)

### 5. Subscribe on Your Device

1. Visit `/admin` on your mobile device or desktop browser
2. You'll see the "📱 Mobile Push Notifications" card
3. Click **Enable** and grant notification permission
4. Done! You'll now receive push notifications for new leads

---

## 📱 How It Works

### For Admins

1. **Enable feature flag** - Controls who can use push notifications
2. **Subscribe on device** - Each device registers for push independently
3. **Receive notifications** - Get instant alerts when leads are created from web forms

### Technical Flow

```
Lead Created (web form)
  ↓
API sends notifications in parallel:
  - SMS (Twilio)
  - Email (Resend)
  - Push (Web Push API) ← NEW!
  ↓
Service worker shows notification
  ↓
User clicks → Opens /admin/leads
```

### Feature Flag Check

Push notifications only send if:
- Feature flag `pwa_push_notifications` is enabled
- At least one active subscription exists in database
- VAPID keys are configured

---

## 🧪 Testing

### Test Push Notification

After subscribing, create a test lead:

```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "propertyType": "Single Family",
    "repairsNeeded": "Minor Renovations",
    "closeTimeline": "0-14 Days",
    "streetAddress": "123 Test St",
    "city": "Austin",
    "state": "TX",
    "postalCode": "78701",
    "fullName": "Test Lead",
    "email": "test@example.com",
    "phone": "(555) 123-4567"
  }'
```

You should receive a push notification within seconds.

---

## 🔧 Troubleshooting

### No notification received?

1. **Check feature flag** - Is `pwa_push_notifications` enabled?
2. **Check subscription** - Visit `/admin` and verify "Active" badge shows
3. **Check browser support** - Chrome/Edge/Firefox (desktop/Android), Safari 16.4+ (iOS)
4. **Check permissions** - Browser notification permission must be granted
5. **Check service worker** - Open DevTools → Application → Service Workers
6. **Check server logs** - Look for "Push notification sent" or error messages

### Notification permission denied?

Reset in browser settings:
- **Chrome**: Settings → Privacy → Site Settings → Notifications → Your Site
- **Firefox**: Settings → Privacy → Permissions → Notifications
- **Safari**: Settings → Websites → Notifications

### Service worker not registering?

- Service workers require **HTTPS** in production
- In development, `localhost` is allowed over HTTP
- Check browser console for service worker errors

### Icons not showing?

Make sure you have:
- `/public/icon-192x192.png`
- `/public/icon-512x512.png`
- `/public/badge-72x72.png`

---

## 🌐 Production Deployment (Vercel)

### 1. Add Environment Variables

In Vercel dashboard → Your Project → Settings → Environment Variables:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BE5ARLM2FmDQ-pcUT1Lke5eC7ZuoEHkwz57IbG0kgRWOypXpr-IS2-s3Vgn96NEnpGz_SsBGmQOg71mX0Fz0Mww
VAPID_PRIVATE_KEY=O_smANKJAaGXzBBWdvvLE0qTx3dKeOcVN58ngBx9hMA
VAPID_EMAIL=mailto:youremail@example.com
```

### 2. Redeploy

```bash
git push origin main
```

Vercel will automatically deploy with the new env vars.

### 3. Enable Feature Flag in Production

Visit your production site → `/admin/feature-flags` → Enable PWA Push Notifications

---

## 📊 Browser Support

| Browser | Desktop | Mobile | Notes |
|---------|---------|--------|-------|
| **Chrome** | ✅ | ✅ | Full support |
| **Edge** | ✅ | ✅ | Full support |
| **Firefox** | ✅ | ✅ | Full support |
| **Safari** | ✅ | ✅ | iOS 16.4+ only |
| **Opera** | ✅ | ✅ | Chromium-based |

---

## 💰 Cost

**Completely FREE!**

- No third-party service required
- Uses browser's native Push API
- Unlimited notifications
- Works offline (after PWA install)

Compare to:
- SMS: ~$0.0075 per notification
- Email: Free tier limits apply
- Push: **$0 always**

---

## 🔐 Security & Privacy

- **VAPID keys** authenticate your server to browser push services
- **Subscriptions** are stored securely in your Supabase database
- **Feature flag** controls access (super admins only by default)
- **Unsubscribe anytime** - devices can opt out independently
- **No tracking** - subscriptions don't contain personal info

---

## 📈 Future Enhancements

Potential additions:
- Rich notifications with lead preview images
- Action buttons (Call, Email, Mark as Read)
- Notification preferences (hot leads only, etc.)
- Desktop PWA installation prompt
- Offline lead form submission

---

## ❓ FAQ

**Q: Can I use this on iPhone?**  
A: Yes! iOS 16.4+ supports web push notifications in Safari.

**Q: Do users need to install an app?**  
A: No! It works in the browser. Users can optionally "Add to Home Screen" for a native app-like experience.

**Q: What happens if a user denies permission?**  
A: The toggle will show "Notification permission denied" - they can reset it in browser settings.

**Q: Can I disable push notifications temporarily?**  
A: Yes! Disable the feature flag in `/admin/feature-flags` and no push notifications will be sent.

**Q: How many devices can subscribe?**  
A: Unlimited! Each device/browser gets its own subscription.

---

## 🆘 Need Help?

- Check browser console for errors
- Check server logs for push notification attempts
- Verify service worker is registered: DevTools → Application → Service Workers
- Test with `curl` command above to isolate issues

Happy lead hunting! 🏠
