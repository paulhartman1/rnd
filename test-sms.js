#!/usr/bin/env node

/**
 * Quick test script to verify Twilio SMS is working
 * Run with: node test-sms.js
 */

require('dotenv').config({ path: '.env.local' });
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;
const toPhone = process.env.ADMIN_NOTIFICATION_PHONE;

console.log('🧪 Testing Twilio SMS Configuration...\n');

// Check environment variables
console.log('Environment Variables:');
console.log('✓ TWILIO_ACCOUNT_SID:', accountSid ? `${accountSid.substring(0, 10)}...` : '❌ MISSING');
console.log('✓ TWILIO_AUTH_TOKEN:', authToken ? `${authToken.substring(0, 10)}...` : '❌ MISSING');
console.log('✓ TWILIO_PHONE_NUMBER:', fromPhone || '❌ MISSING');
console.log('✓ ADMIN_NOTIFICATION_PHONE:', toPhone || '❌ MISSING');
console.log('');

if (!accountSid || !authToken || !fromPhone || !toPhone) {
  console.error('❌ Missing required environment variables!');
  console.error('Make sure .env.local has all Twilio variables set.');
  process.exit(1);
}

// Initialize Twilio client
console.log('📞 Initializing Twilio client...');
const client = twilio(accountSid, authToken);

// Send test SMS
console.log(`📤 Sending test SMS from ${fromPhone} to ${toPhone}...`);

client.messages
  .create({
    body: '🏠 TEST: This is a test notification from Rush N Dush. If you received this, SMS notifications are working!',
    from: fromPhone,
    to: toPhone,
  })
  .then((message) => {
    console.log('');
    console.log('✅ SUCCESS! SMS sent successfully!');
    console.log('');
    console.log('Message Details:');
    console.log('  - Message SID:', message.sid);
    console.log('  - Status:', message.status);
    console.log('  - To:', message.to);
    console.log('  - From:', message.from);
    console.log('');
    console.log('📱 Check your phone for the test message!');
    console.log('');
    console.log('If you received it, notifications are working correctly! 🎉');
    process.exit(0);
  })
  .catch((error) => {
    console.log('');
    console.error('❌ ERROR: Failed to send SMS');
    console.error('');
    console.error('Error Details:');
    console.error('  - Code:', error.code);
    console.error('  - Message:', error.message);
    console.error('');
    
    // Common error messages and fixes
    if (error.code === 20003) {
      console.error('🔧 FIX: Authenticate to Twilio. Your credentials may be invalid.');
      console.error('   Check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
    } else if (error.code === 21211) {
      console.error('🔧 FIX: Invalid "To" phone number format.');
      console.error('   Make sure ADMIN_NOTIFICATION_PHONE is in E.164 format: +1XXXXXXXXXX');
    } else if (error.code === 21606) {
      console.error('🔧 FIX: The "From" phone number is not a valid Twilio number.');
      console.error('   Verify TWILIO_PHONE_NUMBER in your Twilio console.');
    } else if (error.code === 21608) {
      console.error('🔧 FIX: The "From" number cannot send SMS.');
      console.error('   Make sure your Twilio number has SMS capability enabled.');
    } else if (error.message.includes('balance')) {
      console.error('🔧 FIX: Insufficient Twilio account balance.');
      console.error('   Add funds to your Twilio account.');
    }
    
    console.error('');
    console.error('📚 Twilio Error Codes: https://www.twilio.com/docs/api/errors');
    process.exit(1);
  });
