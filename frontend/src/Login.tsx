
import React, { useEffect, useState } from 'react';
import {
  Milk, Eye, EyeOff, Loader2, AlertCircle,
  Thermometer, Sun, Moon, Monitor
} from 'lucide-react';
import { api, tokenStore } from './api';
import type { User } from './api';
import { isEmail, localizeError, normalizePhone } from './authUtils';
import {
  readThemePref, resolveDark, systemPrefersDark, writeThemePref
} from './theme';
import type { ThemePref } from './theme';

type Lang = 'hi' | 'en';

const COPY = {
  en: {
    brand: 'GAUVAANI AMRIT',
    sub: 'Dairy Sathi ERP',
    heroTitle: 'Every litre, recorded and accounted for.',
    heroBody: 'Test milk, settle farmer payments, track credit and feed stock in one place. Your data stays private to your account.',
    slipTitle: 'Batch slip',
    slipRows: [
      ['Supplier', 'Rameshwar Yadav'],
      ['Volume', '45 L'],
      ['Fat / SNF', '6.2% / 8.8%'],
      ['Grade', 'A+']
    ],
    slipPayable: 'Net payable',
    slipChill: 'Chill to 4°C within 14 h',
    loginTitle: 'Sign in to your dairy',
    registerTitle: 'Create your dairy account',
    loginTab: 'Sign in',
    registerTab: 'Create account',
    name: 'Your name',
    business: 'Dairy or society name',
    optional: 'optional',
    identifier: 'Email or mobile number',
    identifierPlaceholder: 'name@example.com or 98765 43210',
    identifierHint: 'Use the email or mobile number you signed up with.',
    email: 'Email address',
    mobile: 'Mobile number',
    mobilePlaceholder: '98765 43210',
    contactHint: 'Enter at least one. You can sign in with either.',
    password: 'Password',
    passwordHint: 'At least 8 characters',
    show: 'Show password',
    hide: 'Hide password',
    loginBtn: 'Sign in',
    registerBtn: 'Create account',
    working: 'Please wait…',
    switchToRegister: 'New here?',
    switchToLogin: 'Already have an account?',
    language: 'Language',
    theme: {
      auto: 'Theme: automatic (follows your device)',
      light: 'Theme: light',
      dark: 'Theme: dark',
      change: 'Click to change'
    },
    errName: 'Please enter your name.',
    errNeedContact: 'Please enter an email address or a mobile number.',
    errEmail: 'Please enter a valid email address.',
    errMobile: 'Please enter a valid 10-digit mobile number.',
    errNeedIdentifier: 'Please enter your email or mobile number.',
    errIdentifier: 'Enter a valid email or a 10-digit mobile number.',
    errPwShort: 'The password must be at least 8 characters.',
    errPwEmpty: 'Please enter your password.',
    otpTitle: 'Verify your email',
    otpBody: 'We sent a 6-digit verification code to',
    otpLabel: 'Enter verification code',
    otpPlaceholder: '000000',
    otpHint: 'The code expires in 5 minutes.',
    verifyOtp: 'Verify and sign in',
    resendOtp: 'Resend code',
    otpBack: 'Back to login',
    otpWorking: 'Verifying…',
    resendWorking: 'Sending…',
    otpSent: 'A new verification code has been sent.',
    otpInvalid: 'Please enter the complete 6-digit code.'
  },
  hi: {
    brand: 'गौवाणी अमृत',
    sub: 'डेयरी साथी ERP',
    heroTitle: 'हर लीटर का हिसाब, एक जगह।',
    heroBody: 'दूध की जांच, किसान भुगतान, उधार खाता और चारे का स्टॉक — सब एक ही जगह। आपका डेटा सिर्फ आपके अकाउंट में सुरक्षित रहता है।',
    slipTitle: 'बैच पर्ची',
    slipRows: [
      ['सप्लायर', 'रामेश्वर यादव'],
      ['मात्रा', '45 L'],
      ['फैट / SNF', '6.2% / 8.8%'],
      ['ग्रेड', 'A+']
    ],
    slipPayable: 'कुल भुगतान',
    slipChill: '14 घंटे में 4°C तक ठंडा करें',
    loginTitle: 'अपनी डेयरी में साइन इन करें',
    registerTitle: 'अपना डेयरी अकाउंट बनाएं',
    loginTab: 'साइन इन',
    registerTab: 'अकाउंट बनाएं',
    name: 'आपका नाम',
    business: 'डेयरी या समिति का नाम',
    optional: 'वैकल्पिक',
    identifier: 'ईमेल या मोबाइल नंबर',
    identifierPlaceholder: 'name@example.com या 98765 43210',
    identifierHint: 'जिस ईमेल या मोबाइल नंबर से अकाउंट बनाया था, वही लिखें।',
    email: 'ईमेल पता',
    mobile: 'मोबाइल नंबर',
    mobilePlaceholder: '98765 43210',
    contactHint: 'कम से कम एक लिखें। आप दोनों में से किसी से भी साइन इन कर सकेंगे।',
    password: 'पासवर्ड',
    passwordHint: 'कम से कम 8 अक्षर',
    show: 'पासवर्ड दिखाएं',
    hide: 'पासवर्ड छुपाएं',
    loginBtn: 'साइन इन करें',
    registerBtn: 'अकाउंट बनाएं',
    working: 'कृपया प्रतीक्षा करें…',
    switchToRegister: 'पहली बार आए हैं?',
    switchToLogin: 'पहले से अकाउंट है?',
    language: 'भाषा',
    theme: {
      auto: 'थीम: अपने आप (आपके डिवाइस जैसी)',
      light: 'थीम: हल्की',
      dark: 'थीम: गहरी',
      change: 'बदलने के लिए दबाएं'
    },
    errName: 'कृपया अपना नाम लिखें।',
    errNeedContact: 'कृपया ईमेल पता या मोबाइल नंबर लिखें।',
    errEmail: 'कृपया सही ईमेल पता लिखें।',
    errMobile: 'कृपया सही 10 अंकों का मोबाइल नंबर लिखें।',
    errNeedIdentifier: 'कृपया अपना ईमेल या मोबाइल नंबर लिखें।',
    errIdentifier: 'सही ईमेल या 10 अंकों का मोबाइल नंबर लिखें।',
    errPwShort: 'पासवर्ड कम से कम 8 अक्षर का होना चाहिए।',
    errPwEmpty: 'कृपया अपना पासवर्ड लिखें।',
    otpTitle: 'ईमेल सत्यापित करें',
    otpBody: 'हमने 6 अंकों का कोड इस ईमेल पर भेजा है:',
    otpLabel: 'सत्यापन कोड दर्ज करें',
    otpPlaceholder: '000000',
    otpHint: 'यह कोड 5 मिनट में समाप्त हो जाएगा।',
    verifyOtp: 'सत्यापित करें और साइन इन करें',
    resendOtp: 'कोड दोबारा भेजें',
    otpBack: 'लॉगिन पर वापस जाएं',
    otpWorking: 'सत्यापन हो रहा है…',
    resendWorking: 'भेजा जा रहा है…',
    otpSent: 'नया सत्यापन कोड भेज दिया गया है।',
    otpInvalid: 'कृपया पूरा 6 अंकों का कोड दर्ज करें।'
  }
} as const;

const NEXT_THEME: Record<ThemePref, ThemePref> = {
  auto: 'light',
  light: 'dark',
  dark: 'auto'
};

export default function Login({
  onAuth
}: {
  onAuth: (user: User) => void
}) {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      return (localStorage.getItem('ga_lang') as Lang) === 'hi' ? 'hi' : 'en';
    } catch {
      return 'en';
    }
  });

  const [themePref, setThemePref] = useState<ThemePref>(readThemePref);
  const [, setSystemTick] = useState(0);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [business, setBusiness] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  // OTP login state
  const [otpMode, setOtpMode] = useState(false);
  const [otp, setOtp] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [otpEmail, setOtpEmail] = useState('');

  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const c = COPY[lang];
  const isRegister = mode === 'register';
  const dark = themePref === 'auto'
    ? systemPrefersDark()
    : resolveDark(themePref);

  useEffect(() => {
    if (themePref !== 'auto') return;

    let mq: MediaQueryList;

    try {
      mq = window.matchMedia('(prefers-color-scheme: dark)');
    } catch {
      return;
    }

    const onChange = () => setSystemTick((n) => n + 1);

    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [themePref]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const chooseLang = (next: Lang) => {
    setLang(next);
    setError(null);

    try {
      localStorage.setItem('ga_lang', next);
    } catch {
      /* ignore */
    }
  };

  const cycleTheme = () => {
    const next = NEXT_THEME[themePref];
    setThemePref(next);
    writeThemePref(next);
  };

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    setOtpMode(false);
    setOtp('');
    setChallengeId('');
    setOtpEmail('');
    setError(null);
  };

  const backToLogin = () => {
    setOtpMode(false);
    setOtp('');
    setChallengeId('');
    setOtpEmail('');
    setPassword('');
    setError(null);
  };

  const validate = (): string | null => {
    if (otpMode) {
      if (!/^\d{6}$/.test(otp)) return c.otpInvalid;
      return null;
    }

    if (isRegister) {
      if (name.trim().length < 2) return c.errName;

      const e = email.trim();
      const m = mobile.trim();

      if (!e && !m) return c.errNeedContact;
      if (e && !isEmail(e)) return c.errEmail;
      if (m && !normalizePhone(m)) return c.errMobile;
      if (password.length < 8) return c.errPwShort;

      return null;
    }

    const id = identifier.trim();

    if (!id) return c.errNeedIdentifier;
    if (id.includes('@') ? !isEmail(id) : !normalizePhone(id)) {
      return c.errIdentifier;
    }
    if (!password) return c.errPwEmpty;

    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (busy) return;

    const problem = validate();

    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    setBusy(true);

    try {
      // OTP verification step
      if (otpMode) {
        const res = await api.verifyOtp({
          challenge_id: challengeId,
          otp: otp
        });

        tokenStore.set(res.token);
        onAuth(res.user);
        return;
      }

      // Registration keeps the existing registration flow
      if (isRegister) {
        const res = await api.register({
          name: name.trim(),
          email: email.trim(),
          phone: mobile.trim(),
          password,
          business_name: business.trim()
        });

        tokenStore.set(res.token);
        onAuth(res.user);
        return;
      }

      // Password login: backend sends OTP instead of returning a token
      const res = await api.login({
        identifier: identifier.trim(),
        password
      });

      setChallengeId(res.challenge_id);
      setOtpEmail(res.email);
      setOtp('');
      setOtpMode(true);
    } catch (err: any) {
      setError(localizeError(err?.message || '', lang));
    } finally {
      setBusy(false);
    }
  };

  const handleResendOtp = async () => {
    if (resending || !challengeId) return;

    setError(null);
    setResending(true);

    try {
      const res = await api.resendOtp({
        challenge_id: challengeId
      });

      setChallengeId(res.challenge_id);
      setOtpEmail(res.email);
      setOtp('');
      setError(c.otpSent);
    } catch (err: any) {
      setError(localizeError(err?.message || '', lang));
    } finally {
      setResending(false);
    }
  };

  const inputCls =
    'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 placeholder:text-slate-400 ' +
    'focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/25 ' +
    'dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/30';

  const labelCls =
    'block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5';

  const hintCls =
    'mt-1.5 text-sm text-slate-500 dark:text-slate-400';

  const ThemeIcon =
    themePref === 'auto' ? Monitor :
    themePref === 'light' ? Sun : Moon;

  const themeLabel = `${c.theme[themePref]}. ${c.theme.change}`;

  return (
    <div
      className={`${dark ? 'dark' : ''} min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-[#F5F8F6] text-slate-900 dark:bg-[#0A0F18] dark:text-slate-100 transition-colors`}
      style={{ colorScheme: dark ? 'dark' : 'light' }}
    >
      {/* Brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between bg-[#0B1F1A] text-emerald-50 p-12 overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500 text-[#0B1F1A] flex items-center justify-center">
            <Milk className="w-5 h-5" />
          </div>

          <div className="leading-tight">
            <div className="font-extrabold tracking-tight text-lg">
              {c.brand}
            </div>
            <div className="text-sm text-emerald-200/70">
              {c.sub}
            </div>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="text-4xl xl:text-5xl font-extrabold leading-[1.1] tracking-tight">
            {c.heroTitle}
          </h1>
          <p className="mt-5 text-emerald-100/75 text-lg leading-relaxed">
            {c.heroBody}
          </p>
        </div>

        {/* Milk batch slip */}
        <div
          className="self-start w-full max-w-sm rotate-[-2deg] rounded-md bg-[#FBFBF8] text-slate-900 shadow-2xl"
          style={{
            clipPath: 'polygon(0 0,100% 0,100% calc(100% - 10px),96% 100%,92% calc(100% - 10px),88% 100%,84% calc(100% - 10px),80% 100%,76% calc(100% - 10px),72% 100%,68% calc(100% - 10px),64% 100%,60% calc(100% - 10px),56% 100%,52% calc(100% - 10px),48% 100%,44% calc(100% - 10px),40% 100%,36% calc(100% - 10px),32% 100%,28% calc(100% - 10px),24% 100%,20% calc(100% - 10px),16% 100%,12% calc(100% - 10px),8% 100%,4% calc(100% - 10px),0 100%)'
          }}
          aria-hidden="true"
        >
          <div className="px-6 pt-5 pb-7">
            <div className="flex items-center justify-between border-b border-dashed border-slate-300 pb-3">
              <span className="font-bold">{c.slipTitle}</span>
              <span className="font-mono text-xs text-slate-500">#GA-104</span>
            </div>

            <dl className="py-3 space-y-1.5 text-sm">
              {c.slipRows.map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="flex items-center gap-2 rounded bg-sky-50 text-sky-800 text-xs font-semibold px-2.5 py-1.5">
              <Thermometer className="w-3.5 h-3.5" />
              {c.slipChill}
            </div>

            <div className="mt-3 pt-3 border-t border-dashed border-slate-300 flex items-baseline justify-between">
              <span className="font-semibold">{c.slipPayable}</span>
              <span className="text-2xl font-extrabold text-emerald-700">
                ₹2,529
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between lg:justify-end gap-3">
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <Milk className="w-4 h-4" />
            </div>
            <span className="font-extrabold tracking-tight">{c.brand}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Language selector */}
            <div
              role="group"
              aria-label={c.language}
              className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900"
            >
              {([['hi', 'हिन्दी'], ['en', 'English']] as const).map(([code, label]) => (
                <button
                  key={code}
                  type="button"
                  lang={code}
                  aria-pressed={lang === code}
                  onClick={() => chooseLang(code)}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600 ${
                    lang === code
                      ? 'bg-emerald-700 text-white dark:bg-emerald-600'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Theme selector */}
            <button
              type="button"
              onClick={cycleTheme}
              aria-label={themeLabel}
              title={themeLabel}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ThemeIcon className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center py-8">
          <div className="w-full max-w-md">
            <h2 className="text-3xl font-extrabold tracking-tight">
              {otpMode
                ? c.otpTitle
                : isRegister
                  ? c.registerTitle
                  : c.loginTitle}
            </h2>

            {/* Login/register tabs are hidden during OTP verification */}
            {!otpMode && (
              <div
                role="tablist"
                className="mt-6 grid grid-cols-2 rounded-lg bg-slate-200/70 p-1 dark:bg-slate-800"
              >
                {(['login', 'register'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={mode === m}
                    onClick={() => switchMode(m)}
                    className={`rounded-md py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600 ${
                      mode === m
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                    }`}
                  >
                    {m === 'login' ? c.loginTab : c.registerTab}
                  </button>
                ))}
              </div>
            )}

            {/* OTP destination information */}
            {otpMode && (
              <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <p className="text-sm text-emerald-900 dark:text-emerald-200">
                  {c.otpBody}
                </p>
                <p className="mt-1 font-semibold text-emerald-900 dark:text-emerald-100">
                  {otpEmail}
                </p>
              </div>
            )}

            <form
              onSubmit={submit}
              className="mt-6 space-y-4"
              noValidate
            >
              {/* Registration fields */}
              {!otpMode && isRegister && (
                <>
                  <div>
                    <label htmlFor="name" className={labelCls}>
                      {c.name}
                    </label>
                    <input
                      id="name"
                      className={inputCls}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                    />
                  </div>

                  <div>
                    <label htmlFor="biz" className={labelCls}>
                      {c.business}{' '}
                      <span className="font-normal text-slate-500 dark:text-slate-400">
                        ({c.optional})
                      </span>
                    </label>
                    <input
                      id="biz"
                      className={inputCls}
                      value={business}
                      onChange={(e) => setBusiness(e.target.value)}
                      autoComplete="organization"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className={labelCls}>
                      {c.email}
                    </label>
                    <input
                      id="email"
                      type="email"
                      inputMode="email"
                      className={inputCls}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      placeholder="name@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="mobile" className={labelCls}>
                      {c.mobile}
                    </label>
                    <input
                      id="mobile"
                      type="tel"
                      inputMode="tel"
                      className={inputCls}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      autoComplete="tel"
                      placeholder={c.mobilePlaceholder}
                    />
                    <p className={hintCls}>{c.contactHint}</p>
                  </div>
                </>
              )}

              {/* Login identifier */}
              {!otpMode && !isRegister && (
                <div>
                  <label htmlFor="identifier" className={labelCls}>
                    {c.identifier}
                  </label>
                  <input
                    id="identifier"
                    type="text"
                    className={inputCls}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoComplete="username"
                    placeholder={c.identifierPlaceholder}
                    autoFocus
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                  <p className={hintCls}>{c.identifierHint}</p>
                </div>
              )}

              {/* Password field */}
              {!otpMode && (
                <div>
                  <label htmlFor="password" className={labelCls}>
                    {c.password}
                  </label>

                  <div className="relative">
                    <input
                      id="password"
                      type={showPw ? 'text' : 'password'}
                      className={`${inputCls} pr-11`}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={isRegister ? 'new-password' : 'current-password'}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      aria-label={showPw ? c.hide : c.show}
                      className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-600 rounded-r-lg"
                    >
                      {showPw
                        ? <EyeOff className="w-4.5 h-4.5" />
                        : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>

                  {isRegister && (
                    <p className={hintCls}>{c.passwordHint}</p>
                  )}
                </div>
              )}

              {/* OTP field */}
              {otpMode && (
                <div>
                  <label htmlFor="otp" className={labelCls}>
                    {c.otpLabel}
                  </label>

                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    className={`${inputCls} text-center text-2xl font-bold tracking-[0.5em]`}
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                      setError(null);
                    }}
                    placeholder={c.otpPlaceholder}
                    autoFocus
                  />

                  <p className={hintCls}>{c.otpHint}</p>
                </div>
              )}

              {/* Error/status message */}
              <div aria-live="polite" role="status">
                {error && (
                  <div className={`flex items-start gap-2 rounded-lg border px-3.5 py-2.5 text-sm ${
                    error === c.otpSent
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                      : 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'
                  }`}>
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:opacity-70 text-white font-bold py-3 text-base inline-flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {busy
                  ? otpMode ? c.otpWorking : c.working
                  : otpMode
                    ? c.verifyOtp
                    : isRegister
                      ? c.registerBtn
                      : c.loginBtn}
              </button>
            </form>

            {/* OTP actions */}
            {otpMode && (
              <div className="mt-5 space-y-4 text-center">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resending || busy}
                  className="font-semibold text-emerald-800 dark:text-emerald-400 underline underline-offset-2 disabled:opacity-50"
                >
                  {resending && (
                    <Loader2 className="inline w-4 h-4 animate-spin mr-1" />
                  )}
                  {resending ? c.resendWorking : c.resendOtp}
                </button>

                <div>
                  <button
                    type="button"
                    onClick={backToLogin}
                    disabled={busy || resending}
                    className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 disabled:opacity-50"
                  >
                    ← {c.otpBack}
                  </button>
                </div>
              </div>
            )}

            {/* Login/register switch */}
            {!otpMode && (
              <p className="mt-6 text-sm text-slate-600 dark:text-slate-400 text-center">
                {isRegister ? c.switchToLogin : c.switchToRegister}{' '}
                <button
                  type="button"
                  onClick={() => switchMode(isRegister ? 'login' : 'register')}
                  className="font-semibold text-emerald-800 dark:text-emerald-400 underline underline-offset-2 hover:text-emerald-900 dark:hover:text-emerald-300"
                >
                  {isRegister ? c.loginTab : c.registerTab}
                </button>
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
