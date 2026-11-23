// Text-to-speech for Vaani, the assistant. Picks the most natural-sounding
// female voice the browser/OS offers and speaks slowly and softly.
// Which voices exist depends on the device (Windows, Android and Chrome ship
// good Hindi and Indian-English female voices; others fall back to the default).

const FEMALE_HINTS = [
  'female', 'woman', 'swara', 'heera', 'kalpana', 'neerja', 'veena', 'lekha', 'priya', 'aditi',
  'raveena', 'zira', 'hazel', 'samantha', 'karen', 'tessa', 'moira', 'susan', 'sonia', 'libby',
  'jenny', 'aria', 'natasha', 'google हिन्दी', 'google hindi'
];
const MALE_HINTS = ['madhur', 'hemant', 'ravi', 'prabhat', 'rishi', 'david', 'mark', 'james', 'george', 'daniel', 'fred', 'guy', 'alex'];

function scoreVoice(v: SpeechSynthesisVoice, lang: string): number {
  const name = v.name.toLowerCase();
  const vl = v.lang.replace('_', '-').toLowerCase();
  const want = lang.toLowerCase();
  let score = 0;
  if (vl === want) score += 50;
  else if (vl.startsWith(want.slice(0, 2))) score += 25;
  else return -1000;
  if (FEMALE_HINTS.some((h) => name.includes(h))) score += 30;
  if (/\bmale\b/.test(name) || MALE_HINTS.some((h) => name.includes(h))) score -= 40;
  if (name.includes('natural') || name.includes('online')) score += 8;
  if (name.includes('google')) score += 4;
  return score;
}

export function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  if (!('speechSynthesis' in window)) return undefined;
  const voices = window.speechSynthesis.getVoices();
  let best: SpeechSynthesisVoice | undefined;
  let bestScore = -999;
  for (const v of voices) {
    const s = scoreVoice(v, lang);
    if (s > bestScore) { best = v; bestScore = s; }
  }
  return bestScore > 0 ? best : undefined;
}

// Prepare text for speaking: no markdown, "₹500" -> "500 rupees"
function cleanForSpeech(text: string, hindi: boolean): string {
  return text
    .replace(/[*_`#>]/g, '')
    .replace(/₹\s?([\d,]+(?:\.\d+)?)/g, (_m, n) => `${n} ${hindi ? 'रुपये' : 'rupees'}`)
    .replace(/\s+/g, ' ')
    .trim();
}

export function speak(text: string, opts: { lang: 'hi' | 'en'; onStart?: () => void; onEnd?: () => void }) {
  if (!('speechSynthesis' in window) || !text.trim()) { opts.onEnd?.(); return; }
  // Speak Hindi whenever the text is mostly Devanagari, regardless of UI language
  const hindi = /[\u0900-\u097F]/.test(text) || opts.lang === 'hi';
  const tag = hindi ? 'hi-IN' : 'en-IN';
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(cleanForSpeech(text, hindi));
  u.lang = tag;
  const voice = pickVoice(tag) || (hindi ? undefined : pickVoice('en-GB')) ;
  if (voice) u.voice = voice;
  u.rate = 0.92;   // unhurried
  u.pitch = 1.08;  // soft and warm
  u.volume = 0.95;
  u.onstart = () => opts.onStart?.();
  u.onend = () => opts.onEnd?.();
  u.onerror = () => opts.onEnd?.();
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
