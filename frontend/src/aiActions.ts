// Pure (React-free) logic shared by the dashboard and the AI assistant.
//
// The assistant never touches React state directly. It returns a list of
// "actions" (JSON). `executeActions` validates every action, applies the valid
// ones to a *copy* of the data and reports what happened, so a bad or
// half-understood command can never corrupt the real records.

export type PnlRow = { month: string; income: number; expense: number; profit: number };

export type Loan = {
  id: number;
  nameHi: string;
  nameEn: string;
  purposeHi: string;
  purposeEn: string;
  totalLoan: number;
  recovered: number;
  dailyEmi: number;
};

export type InventoryItem = {
  id: string;
  nameHi: string;
  nameEn: string;
  stock: number;
  unitHi: string;
  unitEn: string;
  dailyBurn: number;
  category: string;
};

export type Farm = { cattleCount: number; dailyYield: number; chillingCap: number };

export type Strips = {
  urea: boolean;
  starch: boolean;
  detergent: boolean;
  neutralizer: boolean;
  peroxide: boolean;
};

export type LabParams = {
  farmerName: string;
  cattleType: 'cow' | 'buffalo';
  milkQty: number;
  fat: number;
  snf: number;
  ph: number;
  temp: number;
  clr: number;
  targetHours: number;
  strips: Strips;
};

// One record per calendar day.
export type DailyRecord = {
  id: string;
  date: string; // YYYY-MM-DD
  morningL: number;
  eveningL: number;
  soldL: number;
  ratePerL: number; // selling price per litre
  otherIncome: number; // ghee, dung, etc.
  feedCost: number;
  labourCost: number;
  medicineCost: number;
  otherCost: number;
  note: string;
};

export type HealthStatus = 'healthy' | 'observation' | 'sick' | 'recovering';
export type CattleKind = 'cow' | 'buffalo' | 'bull' | 'calf';

export type HealthReport = {
  id: string;
  date: string; // YYYY-MM-DD
  status: HealthStatus;
  note: string; // symptoms / findings
  treatment: string;
  vet: string;
  nextCheck: string; // YYYY-MM-DD or ''
};

// One record = one animal, or a group when count > 1 (e.g. "5 calves")
export type Cattle = {
  id: string;
  tag: string; // cattle number
  kind: CattleKind;
  breed: string;
  dob: string; // approximate date of birth derived from the age entered ('' = unknown)
  count: number;
  status: HealthStatus;
  notes: string;
  reports: HealthReport[];
};

export type WorkState = {
  pnlData: PnlRow[];
  loans: Loan[];
  inventory: InventoryItem[];
  dailyRecords: DailyRecord[];
  cattle: Cattle[];
  farm: Farm;
  lab: LabParams;
};

export type Bi = { en: string; hi: string };
export type ActionOutcome = { ok: boolean; msg: Bi };
export type UiEffects = { lang?: 'hi' | 'en'; darkMode?: boolean; autoSpeak?: boolean; tab?: string };

export type ExecResult = {
  ws: WorkState;
  outcomes: ActionOutcome[];
  ui: UiEffects;
  batch: Record<string, unknown> | null; // milk batch to post to the ledger endpoint
  changed: boolean; // true if any stored data changed (=> offer Undo)
};

export const TABS = ['home', 'lab', 'charts', 'khata', 'inventory', 'cattle'] as const;
export const MAX_ACTIONS = 10;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');
const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
export const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export function toNum(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = parseFloat(v.replace(/[,₹\s]/g, ''));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export function todayStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return todayStr(new Date(y, m - 1, d + delta));
}

export function monthLabel(dateStr: string): string {
  return MONTHS[Number(dateStr.slice(5, 7)) - 1] || 'Jan';
}

export function prettyDate(dateStr: string, lang: 'hi' | 'en' = 'en'): string {
  if (!isValidDate(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short'
  });
}

function resolveDate(v: unknown): string | null {
  if (v === undefined || v === null || v === '') return todayStr();
  const s = String(v).trim().toLowerCase();
  if (s === 'today' || s === 'आज') return todayStr();
  if (s === 'yesterday' || s === 'कल') return addDays(todayStr(), -1);
  return isValidDate(s) ? s : null;
}

export function recordTotals(r: DailyRecord) {
  const produced = round(r.morningL + r.eveningL, 2);
  const revenue = round(r.soldL * r.ratePerL + r.otherIncome, 2);
  const expense = round(r.feedCost + r.labourCost + r.medicineCost + r.otherCost, 2);
  return { produced, revenue, expense, profit: round(revenue - expense, 2) };
}

export function emptyRecord(date: string, ratePerL = 0): DailyRecord {
  return {
    id: `d_${date}`,
    date,
    morningL: 0,
    eveningL: 0,
    soldL: 0,
    ratePerL,
    otherIncome: 0,
    feedCost: 0,
    labourCost: 0,
    medicineCost: 0,
    otherCost: 0,
    note: ''
  };
}

// Keep the monthly P&L chart in step with the daily records.
export function pnlDelta(pnl: PnlRow[], label: string, dIncome: number, dExpense: number): PnlRow[] {
  if (dIncome === 0 && dExpense === 0) return pnl;
  const next = pnl.map((r) => ({ ...r }));
  let idx = next.findIndex((r) => r.month === label);
  if (idx === -1) {
    next.push({ month: label, income: 0, expense: 0, profit: 0 });
    idx = next.length - 1;
  }
  const row = next[idx];
  row.income = Math.max(0, round(row.income + dIncome, 2));
  row.expense = Math.max(0, round(row.expense + dExpense, 2));
  row.profit = round(row.income - row.expense, 2);
  return next.length > 12 ? next.slice(next.length - 12) : next;
}

// Shared milk grading maths (mirrors the live analysis on the Milk Lab tab).
export function milkCore(
  p: { milkQty: number; fat: number; snf: number; ph: number; clr: number },
  strips: Strips
) {
  const hasChem = Object.values(strips).some(Boolean);
  const expectedSnf = p.clr / 4 + 0.21 * p.fat + 0.36;
  const isWaterDiluted = p.clr < 25 || p.snf < 7.8 || Math.abs(expectedSnf - p.snf) > 1.35;
  const isAcidityAbnormal = p.ph < 6.45 || p.ph > 6.85;
  let grade = 'A+';
  if (hasChem || p.ph < 6.3 || p.ph > 7.0) grade = 'C';
  else if (isWaterDiluted || isAcidityAbnormal || p.fat < 3.8 || p.snf < 8.2) grade = 'B';
  const ratePerLiter =
    grade === 'C' ? 22 : Math.round((p.fat * 4.8 + p.snf * 2.6 + (grade === 'A+' ? 4.5 : 0)) * 10) / 10;
  return {
    grade,
    ratePerLiter,
    totalPayout: Math.round(ratePerLiter * p.milkQty),
    purityStatus: hasChem ? 'CHEMICAL' : isWaterDiluted ? 'WATER' : 'PURE'
  };
}

export function batchPnl(pnl: PnlRow[], payout: number): PnlRow[] {
  if (!pnl.length) return pnl;
  const updated = pnl.map((r) => ({ ...r }));
  const last = updated[updated.length - 1];
  const addedRevenue = Math.round(payout * 1.24);
  last.income += addedRevenue;
  last.expense += payout;
  last.profit = last.income - last.expense;
  return updated;
}

// ---------------------------------------------------------------------------
// Cattle helpers
// ---------------------------------------------------------------------------
export const HEALTH_STATUSES: HealthStatus[] = ['healthy', 'observation', 'sick', 'recovering'];
export const CATTLE_KINDS: CattleKind[] = ['cow', 'buffalo', 'bull', 'calf'];

const STATUS_ALIASES: Record<string, HealthStatus> = {
  healthy: 'healthy', good: 'healthy', fine: 'healthy', well: 'healthy', normal: 'healthy',
  observation: 'observation', 'under observation': 'observation', watch: 'observation', monitor: 'observation',
  sick: 'sick', ill: 'sick', unwell: 'sick', infected: 'sick',
  recovering: 'recovering', recovery: 'recovering', improving: 'recovering'
};
const KIND_ALIASES: Record<string, CattleKind> = {
  cow: 'cow', gay: 'cow', buffalo: 'buffalo', bhains: 'buffalo', bull: 'bull', bullock: 'bull', ox: 'bull',
  calf: 'calf', heifer: 'calf', bachda: 'calf', katra: 'calf'
};

export const normTag = (s: unknown) => String(s ?? '').trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, ' ');

export function ageMonthsOf(dob: string, today: string = todayStr()): number {
  if (!isValidDate(dob)) return 0;
  const [y, m, d] = dob.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  let months = (ty - y) * 12 + (tm - m);
  if (td < d) months -= 1;
  return Math.max(0, months);
}

// The farmer enters an age; we store an approximate birth date so the age keeps growing by itself.
export function dobFromAge(totalMonths: number, today: string = todayStr()): string {
  const [y, m, d] = today.split('-').map(Number);
  const base = new Date(y, m - 1 - totalMonths, 1);
  const last = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  return todayStr(new Date(base.getFullYear(), base.getMonth(), Math.min(d, last)));
}

export function formatAge(months: number, lang: 'hi' | 'en' = 'en'): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (lang === 'hi') return y ? (m ? `${y} वर्ष ${m} माह` : `${y} वर्ष`) : `${m} माह`;
  return y ? (m ? `${y} yr ${m} mo` : `${y} yr`) : `${m} mo`;
}

export const cattleTotal = (list: Cattle[]) => list.reduce((n, c) => n + (c.count || 1), 0);

export function latestReport(c: Cattle): HealthReport | undefined {
  return [...c.reports].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))[0];
}

// 'overdue' | 'soon' (within 7 days) | null, based on the newest report's next-checkup date
export function checkupState(c: Cattle, today: string = todayStr()): 'overdue' | 'soon' | null {
  const next = latestReport(c)?.nextCheck;
  if (!next || !isValidDate(next)) return null;
  if (next < today) return 'overdue';
  return next <= addDays(today, 7) ? 'soon' : null;
}

export const STATUS_LABEL: Record<HealthStatus, Bi> = {
  healthy: { en: 'Healthy', hi: 'स्वस्थ' },
  observation: { en: 'Under observation', hi: 'निगरानी में' },
  sick: { en: 'Sick', hi: 'बीमार' },
  recovering: { en: 'Recovering', hi: 'ठीक हो रहा' }
};
export const KIND_LABEL: Record<CattleKind, Bi> = {
  cow: { en: 'Cow', hi: 'गाय' },
  buffalo: { en: 'Buffalo', hi: 'भैंस' },
  bull: { en: 'Bull', hi: 'सांड' },
  calf: { en: 'Calf / heifer', hi: 'बछड़ा / बछिया' }
};

// ---------------------------------------------------------------------------
// Compact snapshot of the data that is sent to the assistant as context
// ---------------------------------------------------------------------------
export function buildAiState(ws: WorkState, today: string) {
  const sorted = [...ws.dailyRecords].sort((a, b) => b.date.localeCompare(a.date));
  const monthKey = today.slice(0, 7);
  let mProduced = 0, mRevenue = 0, mExpense = 0, mDays = 0;
  for (const r of ws.dailyRecords) {
    if (!r.date.startsWith(monthKey)) continue;
    const t = recordTotals(r);
    mProduced += t.produced; mRevenue += t.revenue; mExpense += t.expense; mDays += 1;
  }
  return {
    today,
    milkLab: {
      supplier: ws.lab.farmerName, cattle: ws.lab.cattleType, litres: ws.lab.milkQty, fat: ws.lab.fat,
      snf: ws.lab.snf, ph: ws.lab.ph, tempC: ws.lab.temp, clr: ws.lab.clr, targetHours: ws.lab.targetHours
    },
    farm: ws.farm,
    cattle: {
      totalAnimals: cattleTotal(ws.cattle),
      records: ws.cattle.slice(0, 40).map((c) => {
        const last = latestReport(c);
        return {
          tag: c.tag, kind: c.kind, breed: c.breed, ageMonths: c.dob ? ageMonthsOf(c.dob, today) : null,
          count: c.count, status: c.status, notes: c.notes.slice(0, 60),
          // Healthy animals with nothing due need no report details: keeps the message small and quick
          lastReport:
            last && (c.status !== 'healthy' || checkupState(c, today))
              ? { date: last.date, status: last.status, note: last.note.slice(0, 80), treatment: last.treatment.slice(0, 60), nextCheck: last.nextCheck }
              : null
        };
      })
    },
    monthlyPnl: ws.pnlData.slice(-3),
    thisMonthFromDailyRecords: {
      days: mDays, litres: round(mProduced, 1), revenue: round(mRevenue, 0),
      expense: round(mExpense, 0), profit: round(mRevenue - mExpense, 0)
    },
    recentDailyRecords: sorted.slice(0, 10).map((r) => ({
      date: r.date, morningL: r.morningL, eveningL: r.eveningL, soldL: r.soldL, ratePerL: r.ratePerL,
      otherIncome: r.otherIncome, feedCost: r.feedCost, labourCost: r.labourCost,
      medicineCost: r.medicineCost, otherCost: r.otherCost, note: r.note, profit: recordTotals(r).profit
    })),
    loans: ws.loans.map((l) => ({
      name: l.nameEn, total: l.totalLoan, recovered: l.recovered, pending: Math.max(0, l.totalLoan - l.recovered)
    })),
    inventory: ws.inventory.map((i) => ({
      name: i.nameEn, stock: i.stock, unit: i.unitEn, dailyUse: i.dailyBurn,
      daysLeft: i.dailyBurn > 0 ? round(i.stock / i.dailyBurn, 1) : null
    }))
  };
}

// ---------------------------------------------------------------------------
// Action executor
// ---------------------------------------------------------------------------
type Raw = Record<string, unknown>;

const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

function findMatches<T>(list: T[], query: unknown, keys: (x: T) => string[]): T[] {
  const q = norm(query);
  if (!q) return [];
  const exact = list.filter((x) => keys(x).some((k) => norm(k) === q));
  if (exact.length) return exact;
  return list.filter((x) =>
    keys(x).some((k) => {
      const n = norm(k);
      return n.length > 0 && (n.includes(q) || q.includes(n));
    })
  );
}

function pickOne<T>(
  list: T[],
  query: unknown,
  keys: (x: T) => string[],
  label: (x: T) => string,
  what: Bi
): { item?: T; error?: ActionOutcome } {
  const hits = findMatches(list, query, keys);
  if (hits.length === 1) return { item: hits[0] };
  if (hits.length === 0) {
    return {
      error: {
        ok: false,
        msg: { en: `I couldn't find ${what.en} "${String(query ?? '')}".`, hi: `${what.hi} "${String(query ?? '')}" नहीं मिला।` }
      }
    };
  }
  const names = hits.slice(0, 4).map(label).join(', ');
  return {
    error: {
      ok: false,
      msg: {
        en: `Several ${what.en}s match "${String(query)}": ${names}. Which one did you mean?`,
        hi: `"${String(query)}" से कई मिलते-जुलते ${what.hi} हैं: ${names}। कौन सा?`
      }
    }
  };
}

const fail = (en: string, hi: string): ActionOutcome => ({ ok: false, msg: { en, hi } });
const good = (en: string, hi: string): ActionOutcome => ({ ok: true, msg: { en, hi } });

// Validate an optional numeric field. Returns undefined if absent, null if invalid.
function field(raw: Raw, key: string, min: number, max: number): number | undefined | null {
  if (raw[key] === undefined || raw[key] === null || raw[key] === '') return undefined;
  const n = toNum(raw[key]);
  if (n === undefined || n < min || n > max) return null;
  return n;
}

const DAILY_FIELDS: { key: keyof DailyRecord; min: number; max: number; en: string }[] = [
  { key: 'morningL', min: 0, max: 5000, en: 'morning litres' },
  { key: 'eveningL', min: 0, max: 5000, en: 'evening litres' },
  { key: 'soldL', min: 0, max: 10000, en: 'litres sold' },
  { key: 'ratePerL', min: 0, max: 1000, en: 'rate per litre' },
  { key: 'otherIncome', min: 0, max: 10_000_000, en: 'other income' },
  { key: 'feedCost', min: 0, max: 10_000_000, en: 'feed cost' },
  { key: 'labourCost', min: 0, max: 10_000_000, en: 'labour cost' },
  { key: 'medicineCost', min: 0, max: 10_000_000, en: 'medicine cost' },
  { key: 'otherCost', min: 0, max: 10_000_000, en: 'other cost' }
];

function upsertDaily(ws: WorkState, a: Raw): ActionOutcome {
  const date = resolveDate(a.date);
  if (!date) return fail(`I didn't understand the date "${String(a.date)}".`, `तारीख "${String(a.date)}" समझ नहीं आई।`);

  const incoming: Partial<DailyRecord> = {};
  for (const f of DAILY_FIELDS) {
    const v = field(a, f.key as string, f.min, f.max);
    if (v === null) return fail(`The ${f.en} value doesn't look right.`, `${f.en} की संख्या सही नहीं लग रही।`);
    if (v !== undefined) (incoming as Raw)[f.key as string] = v;
  }
  const note = typeof a.note === 'string' ? a.note.trim().slice(0, 200) : undefined;
  if (Object.keys(incoming).length === 0 && note === undefined) {
    return fail('There were no numbers to record.', 'दर्ज करने के लिए कोई संख्या नहीं मिली।');
  }

  const existing = ws.dailyRecords.find((r) => r.date === date);
  const lastRate =
    [...ws.dailyRecords].sort((x, y) => y.date.localeCompare(x.date)).find((r) => r.ratePerL > 0)?.ratePerL ?? 0;
  const before = existing ? { ...existing } : emptyRecord(date, lastRate);
  const next: DailyRecord = { ...before, ...(incoming as Partial<DailyRecord>) };
  if (note !== undefined) next.note = note;

  // Keep "sold" in step with production unless the user said otherwise
  if (incoming.soldL === undefined) {
    const oldProduced = before.morningL + before.eveningL;
    const newProduced = next.morningL + next.eveningL;
    if (newProduced !== oldProduced && (!existing || before.soldL === oldProduced)) next.soldL = newProduced;
  }

  const prevTotals = existing ? recordTotals(existing) : { revenue: 0, expense: 0 };
  const newTotals = recordTotals(next);
  ws.pnlData = pnlDelta(ws.pnlData, monthLabel(date), newTotals.revenue - prevTotals.revenue, newTotals.expense - prevTotals.expense);
  ws.dailyRecords = existing
    ? ws.dailyRecords.map((r) => (r.date === date ? next : r))
    : [...ws.dailyRecords, next];

  const pl = newTotals.profit;
  const verbEn = existing ? 'Updated' : 'Added';
  const verbHi = existing ? 'अपडेट किया' : 'जोड़ा';
  return good(
    `${verbEn} ${prettyDate(date)}: ${newTotals.produced} L produced, ${pl >= 0 ? 'profit' : 'loss'} ${inr(Math.abs(pl))}`,
    `${prettyDate(date, 'hi')} का रिकॉर्ड ${verbHi}: ${newTotals.produced} L उत्पादन, ${pl >= 0 ? 'मुनाफा' : 'घाटा'} ${inr(Math.abs(pl))}`
  );
}

function deleteDaily(ws: WorkState, a: Raw): ActionOutcome {
  const date = resolveDate(a.date);
  if (!date) return fail('I need a valid date to remove a record.', 'रिकॉर्ड हटाने के लिए सही तारीख चाहिए।');
  const rec = ws.dailyRecords.find((r) => r.date === date);
  if (!rec) return fail(`There is no record for ${prettyDate(date)}.`, `${prettyDate(date, 'hi')} का कोई रिकॉर्ड नहीं है।`);
  const t = recordTotals(rec);
  ws.pnlData = pnlDelta(ws.pnlData, monthLabel(date), -t.revenue, -t.expense);
  ws.dailyRecords = ws.dailyRecords.filter((r) => r.date !== date);
  return good(`Removed the record for ${prettyDate(date)}.`, `${prettyDate(date, 'hi')} का रिकॉर्ड हटा दिया।`);
}

// ---------------------------------------------------------------------------
// Cattle actions
// ---------------------------------------------------------------------------
function findCattle(list: Cattle[], q: unknown): { item?: Cattle; error?: ActionOutcome } {
  const n = normTag(q);
  if (!n) return { error: fail('Which animal? I need its tag number.', 'कौन सा पशु? उसका टैग नंबर चाहिए।') };
  // Exact match only: "12" must never silently match tag "112"
  let hits = list.filter((c) => normTag(c.tag) === n);
  if (!hits.length && /^\d+$/.test(n)) {
    hits = list.filter((c) => /^\d+$/.test(normTag(c.tag)) && Number(normTag(c.tag)) === Number(n)); // 007 = 7
  }
  if (hits.length === 1) return { item: hits[0] };
  return { error: fail(`I couldn't find an animal with tag "${String(q)}".`, `टैग "${String(q)}" वाला पशु नहीं मिला।`) };
}

function asStatus(v: unknown): HealthStatus | undefined | null {
  if (v === undefined || v === null || v === '') return undefined;
  return STATUS_ALIASES[norm(v)] ?? null;
}
function asKind(v: unknown): CattleKind | undefined | null {
  if (v === undefined || v === null || v === '') return undefined;
  return KIND_ALIASES[norm(v)] ?? null;
}
const text = (v: unknown, max: number): string | undefined =>
  typeof v === 'string' ? v.trim().slice(0, max) : typeof v === 'number' ? String(v).slice(0, max) : undefined;

// Age as total months, from ageYears and/or ageMonths. undefined = not given, null = invalid.
function ageFrom(a: Raw): number | undefined | null {
  const y = field(a, 'ageYears', 0, 40);
  const m = field(a, 'ageMonths', 0, 600);
  if (y === null || m === null) return null;
  if (y === undefined && m === undefined) return undefined;
  return Math.round((y ?? 0) * 12 + (m ?? 0));
}

function addCattle(ws: WorkState, a: Raw): ActionOutcome {
  const tag = text(a.tag, 30);
  if (!tag) return fail('I need a tag number for the animal.', 'पशु का टैग नंबर चाहिए।');
  if (ws.cattle.some((c) => normTag(c.tag) === normTag(tag))) {
    return fail(`Tag ${tag} already exists. Ask me to update it instead.`, `टैग ${tag} पहले से है। उसे अपडेट करने को कहिए।`);
  }
  const kind = asKind(a.kind);
  const status = asStatus(a.status);
  const months = ageFrom(a);
  const count = field(a, 'count', 1, 1000);
  if (kind === null) return fail('The animal type should be cow, buffalo, bull or calf.', 'पशु का प्रकार गाय, भैंस, सांड या बछड़ा होना चाहिए।');
  if (status === null) return fail('The health status should be healthy, under observation, sick or recovering.', 'स्वास्थ्य स्थिति स्वस्थ, निगरानी में, बीमार या ठीक हो रहा में से हो।');
  if (months === null) return fail('The age does not look right.', 'उम्र सही नहीं लग रही।');
  if (count === null) return fail('The number of animals does not look right.', 'पशुओं की संख्या सही नहीं लग रही।');

  const rec: Cattle = {
    id: `c_${Date.now()}_${ws.cattle.length}`,
    tag, kind: kind ?? 'cow', breed: text(a.breed, 40) ?? '',
    dob: months === undefined ? '' : dobFromAge(months),
    count: Math.round(count ?? 1), status: status ?? 'healthy', notes: text(a.notes, 200) ?? '', reports: []
  };
  ws.cattle = [...ws.cattle, rec];
  const k = KIND_LABEL[rec.kind];
  return good(
    `Added ${k.en.toLowerCase()} #${tag}${rec.breed ? ` (${rec.breed})` : ''}${rec.count > 1 ? `, ${rec.count} animals` : ''}.`,
    `${k.hi} #${tag}${rec.breed ? ` (${rec.breed})` : ''} जोड़ा${rec.count > 1 ? `, ${rec.count} पशु` : ''}।`
  );
}

function updateCattle(ws: WorkState, a: Raw): ActionOutcome {
  const { item: c, error } = findCattle(ws.cattle, a.tag);
  if (!c) return error!;
  const kind = asKind(a.kind);
  const status = asStatus(a.status);
  const months = ageFrom(a);
  const count = field(a, 'count', 1, 1000);
  if (kind === null || status === null || months === null || count === null) {
    return fail('One of those values does not look right.', 'इनमें से एक संख्या या मान सही नहीं लग रहा।');
  }
  const newTag = text(a.newTag, 30);
  if (newTag && normTag(newTag) !== normTag(c.tag)) {
    if (ws.cattle.some((x) => normTag(x.tag) === normTag(newTag))) {
      return fail(`Tag ${newTag} is already used by another animal.`, `टैग ${newTag} किसी और पशु का है।`);
    }
    c.tag = newTag;
  }
  if (kind !== undefined) c.kind = kind;
  if (status !== undefined) c.status = status;
  if (months !== undefined) c.dob = dobFromAge(months);
  if (count !== undefined) c.count = Math.round(count);
  const breed = text(a.breed, 40);
  if (breed !== undefined) c.breed = breed;
  const notes = text(a.notes, 200);
  if (notes !== undefined) c.notes = notes;
  return good(`Updated #${c.tag}.`, `#${c.tag} अपडेट किया।`);
}

function addHealthReport(ws: WorkState, a: Raw): ActionOutcome {
  const { item: c, error } = findCattle(ws.cattle, a.tag);
  if (!c) return error!;
  const date = resolveDate(a.date);
  if (!date) return fail(`I didn't understand the date "${String(a.date)}".`, `तारीख "${String(a.date)}" समझ नहीं आई।`);
  const status = asStatus(a.status);
  if (status === null) return fail('The health status should be healthy, under observation, sick or recovering.', 'स्वास्थ्य स्थिति स्वस्थ, निगरानी में, बीमार या ठीक हो रहा में से हो।');
  let nextCheck = '';
  if (a.nextCheck !== undefined && a.nextCheck !== null && a.nextCheck !== '') {
    const nc = String(a.nextCheck).trim();
    if (!isValidDate(nc)) return fail('The next checkup date does not look right.', 'अगली जाँच की तारीख सही नहीं लग रही।');
    nextCheck = nc;
  }
  const note = text(a.note, 300) ?? '';
  const treatment = text(a.treatment, 200) ?? '';
  const vet = text(a.vet, 80) ?? '';
  if (!note && !treatment && !vet && status === undefined && !nextCheck) {
    return fail('There was nothing to put in the health report.', 'स्वास्थ्य रिपोर्ट में लिखने के लिए कुछ नहीं मिला।');
  }
  const newest = latestReport(c);
  const report: HealthReport = {
    id: `r_${Date.now()}_${c.reports.length}`, date, status: status ?? c.status, note, treatment, vet, nextCheck
  };
  c.reports = [...c.reports, report];
  // A report older than the newest one must not change the animal's current status
  if (!newest || date >= newest.date) c.status = report.status;
  const st = STATUS_LABEL[report.status];
  return good(
    `Health report saved for #${c.tag}: ${st.en.toLowerCase()}${nextCheck ? `, next checkup ${prettyDate(nextCheck)}` : ''}.`,
    `#${c.tag} की स्वास्थ्य रिपोर्ट सेव: ${st.hi}${nextCheck ? `, अगली जाँच ${prettyDate(nextCheck, 'hi')}` : ''}।`
  );
}

export function executeActions(actions: unknown[], start: WorkState): ExecResult {
  const ws: WorkState = JSON.parse(JSON.stringify(start));
  const outcomes: ActionOutcome[] = [];
  const ui: UiEffects = {};
  let batch: Record<string, unknown> | null = null;
  let changed = false;

  const list = Array.isArray(actions) ? actions.slice(0, MAX_ACTIONS) : [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const a = item as Raw;
    const type = String(a.type ?? '');
    try {
      let out: ActionOutcome | null = null;
      let mutates = true;

      switch (type) {
        // ---------------- Milk lab ----------------
        case 'set_lab': {
          const L = ws.lab;
          const specs: [keyof LabParams, number, number, string, string][] = [
            ['milkQty', 1, 2000, 'Volume', 'मात्रा'],
            ['fat', 1.5, 12, 'Fat', 'फैट'],
            ['snf', 5, 13, 'SNF', 'SNF'],
            ['ph', 4, 9, 'pH', 'pH'],
            ['temp', 1, 50, 'Temperature', 'तापमान'],
            ['clr', 15, 40, 'CLR', 'CLR'],
            ['targetHours', 2, 72, 'Target hours', 'लक्ष्य घंटे']
          ];
          const doneEn: string[] = [];
          const doneHi: string[] = [];
          let bad: ActionOutcome | null = null;
          for (const [k, min, max, en, hi] of specs) {
            const v = field(a, k, min, max);
            if (v === null) { bad = fail(`The ${en} value looks out of range.`, `${hi} की संख्या सही सीमा में नहीं है।`); break; }
            if (v !== undefined) {
              (L as unknown as Raw)[k] = k === 'ph' ? round(v, 2) : round(v, 1);
              doneEn.push(`${en} ${(L as unknown as Raw)[k]}`);
              doneHi.push(`${hi} ${(L as unknown as Raw)[k]}`);
            }
          }
          if (!bad) {
            if (a.cattleType === 'cow' || a.cattleType === 'buffalo') {
              L.cattleType = a.cattleType;
              doneEn.push(a.cattleType === 'cow' ? 'Cow' : 'Buffalo');
              doneHi.push(a.cattleType === 'cow' ? 'गाय' : 'भैंस');
            }
            if (typeof a.farmerName === 'string' && a.farmerName.trim()) {
              L.farmerName = a.farmerName.trim().slice(0, 80);
              doneEn.push(`Supplier ${L.farmerName}`);
              doneHi.push(`सप्लायर ${L.farmerName}`);
            }
            if (a.strips && typeof a.strips === 'object') {
              for (const k of ['urea', 'starch', 'detergent', 'neutralizer', 'peroxide'] as const) {
                const v = (a.strips as Raw)[k];
                if (typeof v === 'boolean') { L.strips[k] = v; doneEn.push(`${k} strip ${v ? 'positive' : 'clear'}`); doneHi.push(`${k} स्ट्रिप ${v ? 'पॉज़िटिव' : 'साफ'}`); }
              }
            }
          }
          if (bad) out = bad;
          else if (!doneEn.length) out = fail('There was nothing to change in the milk lab.', 'मिल्क लैब में बदलने के लिए कुछ नहीं मिला।');
          else {
            const c = milkCore(L, L.strips);
            out = good(
              `Milk lab: ${doneEn.join(', ')} → Grade ${c.grade}, ${inr(c.ratePerLiter)}/L, payout ${inr(c.totalPayout)}`,
              `मिल्क लैब: ${doneHi.join(', ')} → ग्रेड ${c.grade}, ${inr(c.ratePerLiter)}/L, भुगतान ${inr(c.totalPayout)}`
            );
          }
          break;
        }
        case 'save_batch': {
          const L = ws.lab;
          const c = milkCore(L, L.strips);
          ws.pnlData = batchPnl(ws.pnlData, c.totalPayout);
          batch = {
            farmerName: L.farmerName, cattleType: L.cattleType, milkQty: L.milkQty, fat: L.fat, snf: L.snf,
            clr: L.clr, ph: L.ph, temp: L.temp, targetHours: L.targetHours, grade: c.grade,
            ratePerLiter: c.ratePerLiter, totalPayout: c.totalPayout, purity: c.purityStatus, strips: L.strips
          };
          out = good(
            `Saved the ${L.milkQty} L batch (${inr(c.totalPayout)}) to the ledger.`,
            `${L.milkQty} L का बैच (${inr(c.totalPayout)}) लेजर में सेव हो गया।`
          );
          break;
        }

        // ---------------- Daily production & profit/loss ----------------
        case 'add_daily_record':
        case 'update_daily_record':
        case 'set_daily_record':
          out = upsertDaily(ws, a);
          break;
        case 'delete_daily_record':
          out = deleteDaily(ws, a);
          break;

        // ---------------- Monthly P&L ----------------
        case 'add_transaction': {
          const kind = a.kind === 'income' || a.kind === 'expense' ? a.kind : null;
          const amt = toNum(a.amount);
          if (!kind || amt === undefined || amt <= 0 || amt > 100_000_000) {
            out = fail('I need whether it is income or expense, and an amount.', 'आय या खर्च और राशि दोनों चाहिए।');
            break;
          }
          const label = typeof a.month === 'string' && MONTHS.includes(a.month.slice(0, 3)) ? a.month.slice(0, 3) : ws.pnlData[ws.pnlData.length - 1]?.month || monthLabel(todayStr());
          ws.pnlData = pnlDelta(ws.pnlData, label, kind === 'income' ? amt : 0, kind === 'expense' ? amt : 0);
          out = good(
            `Logged ${kind} of ${inr(amt)} in ${label}.`,
            `${label} में ${kind === 'income' ? 'आय' : 'खर्च'} ${inr(amt)} दर्ज किया।`
          );
          break;
        }
        case 'set_month_pnl': {
          const label = typeof a.month === 'string' ? a.month.slice(0, 3) : '';
          if (!MONTHS.includes(label)) { out = fail('Which month should I edit?', 'कौन सा महीना बदलना है?'); break; }
          const inc = field(a, 'income', 0, 1e9);
          const exp = field(a, 'expense', 0, 1e9);
          if (inc === null || exp === null || (inc === undefined && exp === undefined)) {
            out = fail('I need valid income and/or expense numbers.', 'सही आय या खर्च की संख्या चाहिए।');
            break;
          }
          let row = ws.pnlData.find((r) => r.month === label);
          if (!row) { row = { month: label, income: 0, expense: 0, profit: 0 }; ws.pnlData.push(row); }
          if (inc !== undefined) row.income = inc;
          if (exp !== undefined) row.expense = exp;
          row.profit = row.income - row.expense;
          out = good(
            `${label}: income ${inr(row.income)}, expense ${inr(row.expense)}, profit ${inr(row.profit)}.`,
            `${label}: आय ${inr(row.income)}, खर्च ${inr(row.expense)}, लाभ ${inr(row.profit)}।`
          );
          break;
        }

        // ---------------- Loan khata ----------------
        case 'add_loan': {
          const name = typeof a.name === 'string' ? a.name.trim().slice(0, 80) : '';
          const amt = toNum(a.amount);
          if (!name || amt === undefined || amt <= 0 || amt > 100_000_000) {
            out = fail('I need a name and an amount for the new credit account.', 'नए खाते के लिए नाम और राशि चाहिए।');
            break;
          }
          const rec = field(a, 'recovered', 0, amt);
          const purpose = typeof a.purpose === 'string' && a.purpose.trim() ? a.purpose.trim().slice(0, 80) : '';
          ws.loans = [
            {
              id: Date.now() + ws.loans.length, nameHi: name, nameEn: name,
              purposeHi: purpose || 'डेयरी एडवांस', purposeEn: purpose || 'Dairy Credit',
              totalLoan: amt, recovered: rec ?? 0, dailyEmi: 500
            },
            ...ws.loans
          ];
          out = good(`Opened a ${inr(amt)} credit account for ${name}.`, `${name} के लिए ${inr(amt)} का खाता खोला।`);
          break;
        }
        case 'loan_payment':
        case 'update_loan':
        case 'delete_loan': {
          const { item: loan, error } = pickOne(
            ws.loans, a.name, (l) => [l.nameEn, l.nameHi], (l) => l.nameEn, { en: 'account', hi: 'खाता' }
          );
          if (!loan) { out = error!; break; }
          if (type === 'delete_loan') {
            ws.loans = ws.loans.filter((l) => l.id !== loan.id);
            out = good(`Removed ${loan.nameEn}'s account.`, `${loan.nameHi} का खाता हटाया।`);
          } else if (type === 'loan_payment') {
            const amt = toNum(a.amount);
            if (amt === undefined || amt <= 0) { out = fail('How much was paid?', 'कितनी राशि जमा हुई?'); break; }
            const applied = Math.min(amt, Math.max(0, loan.totalLoan - loan.recovered));
            loan.recovered += applied;
            const bal = loan.totalLoan - loan.recovered;
            out = good(
              `Recorded ${inr(applied)} from ${loan.nameEn}${applied < amt ? ' (account is now fully settled)' : ''}. Balance ${inr(bal)}.`,
              `${loan.nameHi} से ${inr(applied)} दर्ज किए${applied < amt ? ' (खाता पूरा चुकता)' : ''}। शेष ${inr(bal)}।`
            );
          } else {
            const total = field(a, 'totalLoan', 1, 100_000_000);
            const rec = field(a, 'recovered', 0, 100_000_000);
            if (total === null || rec === null) { out = fail('Those amounts do not look right.', 'ये राशियाँ सही नहीं लग रहीं।'); break; }
            if (total !== undefined) loan.totalLoan = total;
            if (rec !== undefined) loan.recovered = rec;
            loan.recovered = Math.min(loan.recovered, loan.totalLoan);
            if (typeof a.purpose === 'string' && a.purpose.trim()) { loan.purposeEn = loan.purposeHi = a.purpose.trim().slice(0, 80); }
            if (typeof a.newName === 'string' && a.newName.trim()) { loan.nameEn = loan.nameHi = a.newName.trim().slice(0, 80); }
            out = good(
              `Updated ${loan.nameEn}: total ${inr(loan.totalLoan)}, recovered ${inr(loan.recovered)}.`,
              `${loan.nameHi} अपडेट: कुल ${inr(loan.totalLoan)}, वसूल ${inr(loan.recovered)}।`
            );
          }
          break;
        }

        // ---------------- Inventory ----------------
        case 'add_inventory': {
          const name = typeof a.name === 'string' ? a.name.trim().slice(0, 80) : '';
          const stock = field(a, 'stock', 0, 1e7);
          const burn = field(a, 'dailyBurn', 0.1, 1e6);
          if (!name || stock === null || burn === null) { out = fail('I need an item name and a valid stock number.', 'आइटम का नाम और सही स्टॉक चाहिए।'); break; }
          const unit = typeof a.unit === 'string' && a.unit.trim() ? a.unit.trim().slice(0, 12) : 'kg';
          ws.inventory = [
            ...ws.inventory,
            { id: `item_${Date.now()}_${ws.inventory.length}`, nameHi: name, nameEn: name, stock: stock ?? 0, unitHi: unit, unitEn: unit, dailyBurn: burn ?? 1, category: 'other' }
          ];
          out = good(`Added ${name} (${stock ?? 0} ${unit}) to inventory.`, `${name} (${stock ?? 0} ${unit}) इन्वेंटरी में जोड़ा।`);
          break;
        }
        case 'update_inventory':
        case 'delete_inventory': {
          const { item: it, error } = pickOne(
            ws.inventory, a.name, (i) => [i.nameEn, i.nameHi], (i) => i.nameEn, { en: 'item', hi: 'आइटम' }
          );
          if (!it) { out = error!; break; }
          if (type === 'delete_inventory') {
            ws.inventory = ws.inventory.filter((i) => i.id !== it.id);
            out = good(`Removed ${it.nameEn} from inventory.`, `${it.nameHi} इन्वेंटरी से हटाया।`);
            break;
          }
          const stock = field(a, 'stock', 0, 1e7);
          const burn = field(a, 'dailyBurn', 0.1, 1e6);
          const deltaRaw = toNum(a.delta);
          if (stock === null || burn === null || (a.delta !== undefined && deltaRaw === undefined)) {
            out = fail('Those stock numbers do not look right.', 'स्टॉक की संख्याएँ सही नहीं लग रहीं।');
            break;
          }
          if (stock !== undefined) it.stock = stock;
          else if (deltaRaw !== undefined) it.stock = Math.max(0, round(it.stock + deltaRaw, 2));
          if (burn !== undefined) it.dailyBurn = burn;
          if (typeof a.unit === 'string' && a.unit.trim()) it.unitEn = it.unitHi = a.unit.trim().slice(0, 12);
          if (typeof a.newName === 'string' && a.newName.trim()) it.nameEn = it.nameHi = a.newName.trim().slice(0, 80);
          out = good(
            `${it.nameEn}: ${it.stock} ${it.unitEn} in stock (${round(it.stock / it.dailyBurn, 1)} days).`,
            `${it.nameHi}: ${it.stock} ${it.unitHi} स्टॉक (${round(it.stock / it.dailyBurn, 1)} दिन)।`
          );
          break;
        }

        // ---------------- Cattle management ----------------
        case 'add_cattle':
          out = addCattle(ws, a);
          break;
        case 'update_cattle':
          out = updateCattle(ws, a);
          break;
        case 'delete_cattle': {
          const { item: c, error } = findCattle(ws.cattle, a.tag);
          if (!c) { out = error!; break; }
          ws.cattle = ws.cattle.filter((x) => x.id !== c.id);
          out = good(`Removed #${c.tag} from the cattle records.`, `#${c.tag} को पशु रिकॉर्ड से हटाया।`);
          break;
        }
        case 'add_health_report':
          out = addHealthReport(ws, a);
          break;

        // ---------------- Farm profile ----------------
        case 'set_farm': {
          const c = field(a, 'cattleCount', 1, 1000);
          const y = field(a, 'dailyYield', 0, 20000);
          const k = field(a, 'chillingCap', 0, 50000);
          if (c === null || y === null || k === null || (c === undefined && y === undefined && k === undefined)) {
            out = fail('I need valid herd, daily yield or cooler numbers.', 'पशु संख्या, रोज़ का दूध या कूलर की सही संख्या चाहिए।');
            break;
          }
          if (c !== undefined) ws.farm.cattleCount = Math.round(c);
          if (y !== undefined) ws.farm.dailyYield = y;
          if (k !== undefined) ws.farm.chillingCap = k;
          out = good(
            `Farm: ${ws.farm.cattleCount} animals, ${ws.farm.dailyYield} L/day, ${ws.farm.chillingCap} L cooler.`,
            `फार्म: ${ws.farm.cattleCount} पशु, ${ws.farm.dailyYield} L/दिन, ${ws.farm.chillingCap} L कूलर।`
          );
          break;
        }

        // ---------------- App settings & navigation (not undoable data) ----------------
        case 'set_settings': {
          mutates = false;
          const bits: string[] = [];
          if (a.lang === 'hi' || a.lang === 'en') { ui.lang = a.lang; bits.push(a.lang === 'hi' ? 'Hindi' : 'English'); }
          if (typeof a.darkMode === 'boolean') { ui.darkMode = a.darkMode; bits.push(a.darkMode ? 'dark theme' : 'light theme'); }
          if (typeof a.autoSpeak === 'boolean') { ui.autoSpeak = a.autoSpeak; bits.push(a.autoSpeak ? 'voice on' : 'voice off'); }
          out = bits.length
            ? good(`Settings: ${bits.join(', ')}.`, `सेटिंग: ${bits.join(', ')}।`)
            : fail('Which setting should I change?', 'कौन सी सेटिंग बदलनी है?');
          break;
        }
        case 'navigate': {
          mutates = false;
          if (typeof a.tab === 'string' && (TABS as readonly string[]).includes(a.tab)) ui.tab = a.tab;
          out = null; // silent; the reply text explains
          break;
        }
        default:
          out = fail(`I can't do "${type.slice(0, 40)}" yet.`, `मैं अभी "${type.slice(0, 40)}" नहीं कर सकती।`);
          mutates = false;
      }

      if (out) {
        outcomes.push(out);
        if (out.ok && mutates) changed = true;
      }
    } catch {
      outcomes.push(fail('Something went wrong with one of the changes, so I skipped it.', 'एक बदलाव में दिक्कत आई, इसलिए उसे छोड़ दिया।'));
    }
  }

  // A failed action must not leave a batch queued for posting
  if (batch && !outcomes.some((o) => o.ok && o.msg.en.startsWith('Saved the'))) batch = null;
  return { ws, outcomes, ui, batch, changed };
}
