# Microphone Permissions for Calling

## Overview
To make phone calls through the Rush N Dush admin dashboard, your browser needs permission to access your device's microphone. This is a security requirement enforced by all modern browsers.

## Common Error Messages
- "Microphone permission denied"
- "The request is not allowed by the user agent or the platform"
- "Permission denied"

## How to Enable Microphone Access

### Chrome (Desktop)
1. Click the 🔒 lock icon or camera icon in the address bar (left of the URL)
2. Find "Microphone" in the permissions list
3. Select "Allow"
4. Refresh the page

**Alternative via Settings:**
1. Click the three dots menu (⋮) → Settings
2. Go to Privacy and Security → Site Settings
3. Click Microphone
4. Find your site in the blocked list and remove it, or add it to the allowed list
5. Refresh the page

### Safari (Desktop)
1. Go to Safari menu → Settings (or Preferences)
2. Click the "Websites" tab
3. Select "Microphone" from the left sidebar
4. Find your site and set it to "Allow"
5. Refresh the page

### Safari (iOS/iPhone/iPad)
1. Go to iPhone/iPad Settings
2. Scroll down and tap Safari
3. Scroll down to "Settings for Websites"
4. Tap "Microphone"
5. Change from "Ask" or "Deny" to "Allow"
6. Close settings and refresh the page in Safari

**Alternative:**
When Safari prompts for microphone access, tap "Allow"

### Firefox (Desktop)
1. Click the 🔒 lock icon in the address bar
2. Click the arrow next to "Permissions"
3. Find "Use the Microphone" and select "Allow"
4. Refresh the page

**Alternative via Settings:**
1. Click the three lines menu (☰) → Settings
2. Go to Privacy & Security
3. Scroll to Permissions → Microphone
4. Click Settings next to Microphone
5. Find your site and remove it from blocked list
6. Refresh the page

### Edge (Desktop)
1. Click the 🔒 lock icon in the address bar
2. Find "Microphone" and select "Allow"
3. Refresh the page

## Mobile Browsers

### Chrome (Android)
1. Tap the lock icon in the address bar
2. Tap "Permissions"
3. Find "Microphone" and enable it
4. Refresh the page

### Chrome (iOS)
Chrome on iOS uses Safari's WebKit engine, so you need to:
1. Go to iPhone Settings → Chrome
2. Enable Microphone
3. Refresh the page in Chrome

## Verifying Permissions
After granting permission, you should see:
- A microphone icon may appear in your browser's address bar/tab
- The call button should work without showing permission errors
- A small indicator light may appear on your device showing microphone access

## Troubleshooting

### Permission Already Granted But Still Not Working?
1. **Check system permissions** (macOS/Windows):
   - macOS: System Settings → Privacy & Security → Microphone
   - Windows: Settings → Privacy → Microphone
   - Ensure your browser is allowed at the OS level

2. **Try a different browser** to isolate the issue

3. **Check for browser extensions** that might block microphone access

4. **Ensure you're using HTTPS** - microphone access requires a secure connection in production

5. **Test your microphone**:
   - Go to a test site like https://webcammictest.com/
   - Verify your microphone actually works

### "No Microphone Found"
- Check that your microphone is properly connected
- Check system sound settings to ensure the microphone is recognized
- Try unplugging and replugging (for external mics)
- Restart your browser

### Still Having Issues?
- Clear your browser cache and cookies
- Update your browser to the latest version
- Restart your computer
- Contact support with:
  - Browser name and version
  - Operating system
  - Screenshot of the error message
  - Whether you see a microphone icon in the address bar

## Security Note
Granting microphone permission to the Rush N Dush admin dashboard only allows the app to access your microphone when you're actively using the calling feature. The permission is limited to the specific domain and can be revoked at any time through your browser settings.
