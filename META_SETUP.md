# Meta Social Media Integration Setup

This guide walks you through setting up the Meta (Facebook/Instagram) Business integration so Deshawn can post to social media from the admin panel.

## Prerequisites

- Meta Developer account (free at developers.facebook.com)
- Facebook Page with admin access
- (Optional) Instagram Business account linked to the Facebook Page

## Step 1: Create Meta Developer App

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Log in with Deshawn's Meta/Facebook account
3. Click **My Apps** > **Create App**
4. Select **Business** as the app type
5. Fill in app details:
   - **App Name**: "Rush N Dush Social Manager" (or any name)
   - **App Contact Email**: Deshawn's email
   - Click **Create App**

## Step 2: Add Required Products

In your new app dashboard:

1. Find **Add Products to Your App** section
2. Add **Facebook Login**:
   - Click **Set Up** on Facebook Login
   - Select **Settings** > **Web**
   - Leave defaults and save

3. Add **Instagram Graph API**:
   - Find Instagram Graph API in products
   - Click **Set Up**

## Step 3: Configure OAuth Settings

1. In the left sidebar, go to **Facebook Login** > **Settings**
2. Add **Valid OAuth Redirect URIs**:
   ```
   https://yourdomain.com/api/social/auth/meta/callback
   http://localhost:3000/api/social/auth/meta/callback
   ```
   (Replace `yourdomain.com` with your actual production domain)
3. Click **Save Changes**

## Step 4: Get App Credentials

1. In the left sidebar, go to **Settings** > **Basic**
2. Copy the following:
   - **App ID**
   - **App Secret** (click Show button)

## Step 5: Request Permissions

1. Go to **App Review** > **Permissions and Features**
2. Request the following permissions (you may need to submit for review later):
   - `pages_manage_posts` - Post to Facebook pages
   - `pages_read_engagement` - Read page data
   - `instagram_basic` - Basic Instagram access
   - `instagram_content_publish` - Publish to Instagram
   - `business_management` - Access business accounts

**Note:** For testing, your app starts in **Development Mode**, which allows you to test with accounts that are added as app developers/testers. You don't need approval for development testing.

## Step 6: Add Test Users (Optional for Testing)

If you want to test before Deshawn connects his real account:

1. Go to **Roles** > **Test Users**
2. Click **Add** to create test users
3. Test users can fully test the integration without needing app review

## Step 7: Configure Environment Variables

Add the credentials to your `.env.local` file:

```bash
# Social Media Integration (Meta/Facebook)
META_APP_ID=your_app_id_here
META_APP_SECRET=your_app_secret_here
NEXT_PUBLIC_META_REDIRECT_URI=https://yourdomain.com/api/social/auth/meta/callback
```

For local development:
```bash
NEXT_PUBLIC_META_REDIRECT_URI=http://localhost:3000/api/social/auth/meta/callback
```

## Step 8: Run Database Migration

Run the database migration to create the required tables:

```bash
# If using Supabase CLI
supabase db push

# Or run the SQL directly in Supabase SQL Editor:
# Execute the file: supabase/migrations/20260418141900_add_social_media_integration.sql
```

## Step 9: Connect Deshawn's Account

1. Restart your Next.js app: `npm run dev`
2. Log in to the admin panel: `http://localhost:3000/admin/login`
3. Navigate to **Social Media** from the admin dashboard
4. Click **Connect Meta Account**
5. Log in with Deshawn's Facebook account
6. Select which Facebook pages to connect
7. Grant the requested permissions
8. You'll be redirected back with connected accounts

## Step 10: Test Posting

1. Go to **Admin** > **Social Media** > **Create New Post**
2. Write a message
3. (Optional) Add an image URL
4. Select which accounts to post to
5. Click **Publish Post**

## For Production Deployment

### Vercel Environment Variables

Add these to your Vercel project settings:

```
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
NEXT_PUBLIC_META_REDIRECT_URI=https://your-production-domain.com/api/social/auth/meta/callback
```

### App Review (If Needed)

If you plan to allow other users (not just Deshawn) to connect their accounts, you'll need to submit your app for Meta's App Review:

1. Go to **App Review** in Meta Developer Console
2. Request review for the permissions listed above
3. Provide:
   - Privacy Policy URL
   - Terms of Service URL  
   - Video demo of the app
   - Detailed description of how you use each permission

**For Deshawn's personal use only:** You can skip App Review by keeping the app in Development Mode and adding Deshawn as an app developer/tester.

## Troubleshooting

### "Invalid OAuth Redirect URI"
- Make sure the redirect URI in Meta app settings **exactly** matches the one in your env vars
- Include the protocol (`https://` or `http://`)
- No trailing slashes

### "No Facebook pages found"
- Ensure Deshawn has admin access to at least one Facebook page
- The account used to connect must manage the page

### "Instagram posts require an image"
- Instagram doesn't support text-only posts via the API
- Always include an image URL when posting to Instagram

### Token Expired
- Page access tokens don't expire, but user tokens do
- If issues occur, disconnect and reconnect the account

## Security Notes

- Access tokens are stored in Supabase database
- Consider encrypting tokens using Supabase Vault for added security
- Never commit the `.env.local` file to git
- Keep Meta App Secret confidential

## Support

- Meta Developer Docs: https://developers.facebook.com/docs
- Meta Graph API Explorer: https://developers.facebook.com/tools/explorer
- Instagram API Docs: https://developers.facebook.com/docs/instagram-api
