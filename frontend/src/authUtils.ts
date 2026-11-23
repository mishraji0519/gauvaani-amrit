// Small helpers shared by the login page and the profile editor.
// normalizePhone mirrors the backend rules exactly.

const DEVANAGARI_DIGITS = '०१२३४५६७८९';

// Indian mobile number -> 10 digits, or null. Accepts +91 / 91 / 0 prefixes, spaces, dashes,
// brackets and Devanagari digits (a Hindi keyboard types those).
export function normalizePhone(raw: string): string | null {
  let d = raw
    .replace(/[०-९]/g, (ch) => String(DEVANAGARI_DIGITS.indexOf(ch)))
    .replace(/[\s\-().]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  if (!/^[0-9]+$/.test(d)) return null;
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9][0-9]{9}$/.test(d) ? d : null;
}

export const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.trim());

// Server messages are in English; show the Hindi version when the page is in Hindi.
const HI: Record<string, string> = {
  'Incorrect email/mobile number or password': 'ईमेल/मोबाइल नंबर या पासवर्ड गलत है।',
  'Incorrect email or password': 'ईमेल या पासवर्ड गलत है।',
  'An account with this email already exists': 'इस ईमेल से अकाउंट पहले से बना है।',
  'An account with this mobile number already exists': 'इस मोबाइल नंबर से अकाउंट पहले से बना है।',
  'An account with these details already exists': 'इन विवरणों से अकाउंट पहले से बना है।',
  'Please enter a valid email address': 'कृपया सही ईमेल पता लिखें।',
  'Please enter a valid 10-digit mobile number': 'कृपया सही 10 अंकों का मोबाइल नंबर लिखें।',
  'Please enter an email address or a mobile number': 'कृपया ईमेल पता या मोबाइल नंबर लिखें।',
  'Enter your email or mobile number': 'अपना ईमेल या मोबाइल नंबर लिखें।',
  'Enter a valid email or 10-digit mobile number': 'सही ईमेल या 10 अंकों का मोबाइल नंबर लिखें।',
  'This email is already used by another account': 'यह ईमेल किसी और अकाउंट में इस्तेमाल हो रहा है।',
  'This mobile number is already used by another account': 'यह मोबाइल नंबर किसी और अकाउंट में इस्तेमाल हो रहा है।',
  'You need an email or a mobile number to sign in': 'साइन इन के लिए ईमेल या मोबाइल नंबर में से एक रखना जरूरी है।',
  'Too many requests. Please wait a moment and try again.': 'बहुत ज्यादा कोशिशें हो गईं। थोड़ी देर रुककर फिर कोशिश करें।',
  'Cannot reach the server. Check your connection and try again.': 'सर्वर से जुड़ नहीं पा रहे। इंटरनेट जाँचकर फिर कोशिश करें।'
};

export function localizeError(message: string, lang: 'hi' | 'en'): string {
  if (!message) return lang === 'hi' ? 'कुछ गड़बड़ हो गई। फिर कोशिश करें।' : 'Something went wrong. Try again.';
  return lang === 'hi' ? HI[message] || message : message;
}
