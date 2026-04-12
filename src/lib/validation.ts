/**
 * Validates an email address using a comprehensive regex pattern
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

/**
 * Validates a US phone number (allows various formats)
 * Accepts: (123) 456-7890, 123-456-7890, 1234567890, +1 123 456 7890, etc.
 */
export function isValidPhone(phone: string): boolean {
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Check if it has 10 digits (US) or 11 digits (with country code)
  return digitsOnly.length === 10 || (digitsOnly.length === 11 && digitsOnly.startsWith('1'));
}

/**
 * Formats a phone number to (XXX) XXX-XXXX format
 */
export function formatPhone(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (digitsOnly.length === 10) {
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  }
  
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `(${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`;
  }
  
  return phone;
}
