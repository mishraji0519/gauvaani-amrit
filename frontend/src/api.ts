
// Thin client for the FastAPI backend. All auth + AI calls go through here,
// so no API keys ever reach the browser.

const BASE: string = (import.meta as any).env?.VITE_API_BASE || '';
const TOKEN_KEY = 'ga_token';

export type User = {
  id: number;
  email: string;
  phone: string;
  name: string;
  business_name: string;
};

export type LoginResponse = {
  message: string;
  challenge_id: string;
  email: string;
};

export type OTPVerifyResponse = {
  token: string;
  user: User;
};

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  set: (t: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, t);
    } catch {
      /* storage blocked */
    }
  },

  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage blocked */
    }
  }
};

async function request<T>(
  path: string,
  init: RequestInit = {},
  auth = true,
  timeoutMs = 0
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  const token = tokenStore.get();

  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;

  const controller = timeoutMs ? new AbortController() : null;
  const timer = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      ...(controller ? { signal: controller.signal } : {}),
      headers: {
        ...headers,
        ...(init.headers as any)
      }
    });
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new Error('The AI is taking too long to answer.');
    }

    throw new Error(
      'Cannot reach the server. Check your connection and try again.'
    );
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (res.status === 401 && auth) {
    tokenStore.clear();
    window.dispatchEvent(new Event('ga-unauthorized'));
  }

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;

    try {
      const body = await res.json();

      if (typeof body.detail === 'string') {
        msg = body.detail;
      } else if (
        Array.isArray(body.detail) &&
        body.detail[0]?.msg
      ) {
        msg = body.detail[0].msg;
      }
    } catch {
      /* non-JSON error */
    }

    throw new Error(msg);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Register a new account
  register: (b: {
    name: string;
    email: string;
    phone: string;
    password: string;
    business_name: string;
  }) =>
    request<{ token: string; user: User }>(
      '/api/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(b)
      },
      false
    ),

  // Step 1: Login with email/mobile and password.
  // Backend sends an OTP and returns a challenge ID.
  login: (b: {
    identifier: string;
    password: string;
  }) =>
    request<LoginResponse>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(b)
      },
      false
    ),

  // Step 2: Verify OTP and receive authentication token.
  verifyOtp: (b: {
    challenge_id: string;
    otp: string;
  }) =>
    request<OTPVerifyResponse>(
      '/api/auth/verify-otp',
      {
        method: 'POST',
        body: JSON.stringify(b)
      },
      false
    ),

  // Resend OTP for an existing login challenge.
  resendOtp: (b: {
    challenge_id: string;
  }) =>
    request<LoginResponse>(
      '/api/auth/resend-otp',
      {
        method: 'POST',
        body: JSON.stringify(b)
      },
      false
    ),

  // Get currently authenticated user
  me: () => request<{ user: User }>('/api/auth/me'),

  // Add, change or remove the email / mobile number used to sign in
  updateContact: (b: {
    email?: string;
    phone?: string;
  }) =>
    request<{ user: User }>(
      '/api/auth/contact',
      {
        method: 'PUT',
        body: JSON.stringify(b)
      }
    ),

  getData: () => request<Record<string, any>>('/api/data'),

  saveData: (key: string, value: unknown) =>
    request<{ ok: boolean }>(
      `/api/data/${key}`,
      {
        method: 'PUT',
        body: JSON.stringify({ value })
      }
    ),

  saveBatch: (value: unknown) =>
    request<{ ok: boolean; id: number }>(
      '/api/batches',
      {
        method: 'POST',
        body: JSON.stringify({ value })
      }
    ),

  listBatches: () => request<any[]>('/api/batches'),

  // Vaani, the conversational assistant
  chat: (b: {
    messages: { role: 'user' | 'assistant'; text: string }[];
    state: unknown;
    lang: 'hi' | 'en';
    today: string;
  }) =>
    request<{
      reply: string;
      actions: any[];
      model: string;
      latency_ms: number;
    }>(
      '/api/ai/chat',
      {
        method: 'POST',
        body: JSON.stringify(b)
      },
      true,
      55000
    ),

  // AI text generation
  ai: (b: {
    prompt: string;
    system?: string;
    model?: string;
    json?: boolean;
  }) =>
    request<{
      text: string;
      json: any | null;
      model: string;
      latency_ms: number;
    }>(
      '/api/ai/generate',
      {
        method: 'POST',
        body: JSON.stringify({
          prompt: b.prompt,
          system: b.system,
          model: b.model,
          json_mode: !!b.json
        })
      }
    )
};
