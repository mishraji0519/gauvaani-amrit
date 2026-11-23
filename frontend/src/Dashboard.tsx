// Gauvaani Amrit - Dairy Sathi ERP dashboard
// Layout: left sidebar + Vaani (AI assistant) home + daily production register.

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Milk, ShieldCheck, ShieldAlert, TrendingUp, TrendingDown, Wallet, Package, Sparkles, Volume2, VolumeX,
  Languages, Plus, Minus, CheckCircle2, AlertTriangle, Clock, Droplets, IndianRupee, Users, Calculator,
  Award, ArrowUpRight, Menu, X, Home, Mic, MicOff, Send, ChevronRight, ChevronLeft, Zap, Sun, Moon,
  Activity, FileText, RefreshCw, Search, Printer, LogOut, Undo2, Download, Pencil, Trash2, CalendarDays,
  RotateCcw, Thermometer, Wifi, PawPrint, Stethoscope, HeartPulse, ClipboardList, Phone, Mail
} from 'lucide-react';
import { api } from './api';
import type { User as AuthUser } from './api';
import {
  executeActions, buildAiState, recordTotals, todayStr, addDays, prettyDate, toNum, emptyRecord, batchPnl,
  ageMonthsOf, formatAge, cattleTotal, latestReport, checkupState, STATUS_LABEL, KIND_LABEL, HEALTH_STATUSES, CATTLE_KINDS
} from './aiActions';
import type { WorkState, ActionOutcome, DailyRecord, Cattle, HealthStatus, CattleKind } from './aiActions';
import { speak, stopSpeaking } from './voice';
import { getInitialDark, writeThemePref } from './theme';
import { isEmail, localizeError, normalizePhone } from './authUtils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  ComposedChart, Line, ReferenceLine, AreaChart, Area
} from 'recharts';

// ==========================================
// BILINGUAL DICTIONARY
// ==========================================
const TRANSLATIONS = {
  hi: {
    appName: 'GAUVAANI AMRIT',
    appSub: 'डेयरी साथी ERP',
    langToggle: 'EN',
    listenBtn: 'सुनें',
    stopBtn: 'रोकें',
    tabs: {
      home: 'होम',
      lab: 'मिल्क लैब',
      charts: 'वित्त व रोज़ का हिसाब',
      khata: 'लोन खाता',
      inventory: 'इन्वेंटरी',
      cattle: 'पशु प्रबंधन',
    },
    home: {
      heroTitle: 'गौवाणी AI कमांड सेंटर',
      micStart: 'वॉयस कमांड',
      micListening: 'सुन रहा हूँ...',
      inputPlaceholder: 'कमांड लिखें या बोलें (जैसे: "32°C पर शेल्फ-लाइफ", "मासिक मुनाफा")...',
      sendBtn: 'पूछें',
      quickVoiceTitle: 'त्वरित कमांड',
      liveSnapshot: 'सिस्टम मॉड्यूल'
    },
    kpis: {
      todayMilk: 'दैनिक दूध संकलन',
      avgGrade: 'गुणवत्ता व दर',
      monthlyProfit: 'मासिक शुद्ध लाभ',
      pendingLoans: 'बकाया उधार'
    },
    lab: {
      title: 'दूध गुणवत्ता व शेल्फ-लाइफ विश्लेषक',
      iotSimulateBtn: 'IoT सेंसर रीडिंग',
      iotSimulating: 'स्कैनिंग...',
      receiptBtn: 'डिजिटल पर्ची',
      farmerName: 'सप्लायर व आईडी',
      cattleType: 'पशु श्रेणी',
      cow: 'गाय',
      buffalo: 'भैंस',
      quantity: 'मात्रा (L)',
      fat: 'फैट (%)',
      snf: 'एसएनएफ (%)',
      ph: 'pH स्तर',
      temp: 'तापमान (°C)',
      targetHours: 'लक्ष्य स्टोरेज (घंटे)',
      clr: 'लैक्टोमीटर (CLR)',
      stripTests: 'रासायनिक मिलावट जांच',
      urea: 'यूरिया',
      starch: 'स्टार्च',
      detergent: 'डिटर्जेंट',
      neutralizer: 'न्यूट्रलाइज़र',
      peroxide: 'पेरोक्साइड',
      clean: 'शुद्ध',
      detected: 'मिलावट',
      saveBatchBtn: 'लेजर में सेव करें',
      savedSuccess: 'बैच सेव हो गया',
      decayChartTitle: 'थर्मल शेल्फ-लाइफ कर्व',
      results: {
        qualityTitle: 'ग्रेड और मूल्यांकन',
        gradeA: 'ग्रेड A+ (प्रीमियम)',
        gradeB: 'ग्रेड B (मानक)',
        gradeC: 'ग्रेड C (अस्वीकृत)',
        ratePerLiter: 'दर / लीटर',
        totalPayout: 'कुल भुगतान',
        shelfLifeTitle: 'शेल्फ-लाइफ और कूलिंग',
        safeFor: 'सुरक्षित समय',
        hours: 'घंटे',
        reqTemp: 'आवश्यक तापमान',
        coolingAction: 'तुरंत चिलिंग आवश्यक',
        tempSafe: 'तापमान अनुकूल है',
        boilAlert: 'खराब होने का जोखिम! तुरंत 4°C पर ठंडा करें',
        purityTitle: 'शुद्धता स्थिति',
        pureBadge: '100% शुद्ध प्रमाणित',
        waterAlert: 'पानी की मिलावट संदिग्ध (कम CLR)',
        chemAlert: 'रासायनिक मिलावट पाई गई!'
      },
      gemmaTitle: 'AI विश्लेषण',
      askGemmaBtn: 'AI विश्लेषण'
    },
    charts: {
      pnlTitle: 'आय और व्यय (P&L)',
      income: 'आय',
      expense: 'व्यय',
      netProfit: 'शुद्ध लाभ',
      loanChartTitle: 'लोन वसूली अनुपात',
      recovered: 'वसूल',
      pending: 'बकाया',
      txType: 'प्रकार',
      txIncome: 'आय (बिक्री)',
      txExpense: 'व्यय (खर्च)',
      txAmount: 'राशि (₹)',
      txNote: 'विवरण',
      addTxBtn: 'जोड़ें'
    },
    khata: {
      title: 'ग्राहक व किसान लोन खाता',
      searchPlaceholder: 'नाम खोजें...',
      addLoanBtn: 'नया लोन',
      colName: 'खाताधारक',
      colTotal: 'कुल लोन',
      colPaid: 'वसूल',
      colPending: 'बकाया',
      colProgress: 'प्रगति',
      colAction: 'किस्त कटौती',
      deductBtn: '₹500 काटें',
      settled: 'चुकता'
    },
    inventory: {
      title: 'चारा और स्टॉक प्रबंधन',
      daysLeft: 'दिन शेष',
      dailyUse: 'दैनिक खपत:',
      lowStock: 'कम स्टॉक',
      goodStock: 'पर्याप्त',
      restockBtn: '+50 स्टॉक',
      consumeBtn: '-1 दिन खपत'
    },
  },
  en: {
    appName: 'GAUVAANI AMRIT',
    appSub: 'Dairy Sathi ERP',
    langToggle: 'HI',
    listenBtn: 'Listen',
    stopBtn: 'Stop',
    tabs: {
      home: 'Home',
      lab: 'Milk Lab',
      charts: 'Financials & Daily Log',
      khata: 'Loan Khata',
      inventory: 'Inventory',
      cattle: 'Cattle Management',
    },
    home: {
      heroTitle: 'Gauvaani AI Command Center',
      micStart: 'Voice Command',
      micListening: 'Listening...',
      inputPlaceholder: 'Ask AI or run a command (e.g., "Shelf-life at 32°C", "Monthly P&L")...',
      sendBtn: 'Send',
      quickVoiceTitle: 'Quick Actions',
      liveSnapshot: 'System Modules'
    },
    kpis: {
      todayMilk: 'Daily Milk Pool',
      avgGrade: 'Quality & Rate',
      monthlyProfit: 'Monthly Net Profit',
      pendingLoans: 'Active Credit'
    },
    lab: {
      title: 'Milk Quality & Shelf-Life Analyzer',
      iotSimulateBtn: 'Read IoT Probe',
      iotSimulating: 'Scanning...',
      receiptBtn: 'Batch Receipt',
      farmerName: 'Supplier & ID',
      cattleType: 'Cattle Type',
      cow: 'Cow',
      buffalo: 'Buffalo',
      quantity: 'Volume (L)',
      fat: 'Fat (%)',
      snf: 'SNF (%)',
      ph: 'pH Level',
      temp: 'Temperature (°C)',
      targetHours: 'Target Storage (Hrs)',
      clr: 'Lactometer (CLR)',
      stripTests: 'Rapid Adulteration Strip Tests',
      urea: 'Urea',
      starch: 'Starch',
      detergent: 'Detergent',
      neutralizer: 'Neutralizer',
      peroxide: 'Peroxide',
      clean: 'Pure',
      detected: 'Positive',
      saveBatchBtn: 'Record Batch',
      savedSuccess: 'Batch Recorded',
      decayChartTitle: 'Thermal Shelf-Life Curve',
      results: {
        qualityTitle: 'Grading & Valuation',
        gradeA: 'Grade A+ (Premium)',
        gradeB: 'Grade B (Standard)',
        gradeC: 'Grade C (Reject)',
        ratePerLiter: 'Rate / Liter',
        totalPayout: 'Net Payout',
        shelfLifeTitle: 'Shelf-Life & Thermal Status',
        safeFor: 'Safe Window',
        hours: 'Hrs',
        reqTemp: 'Target Chilling',
        coolingAction: 'Immediate Chilling Required',
        tempSafe: 'Temperature Optimal',
        boilAlert: 'Spoilage Risk! Chill to 4°C Immediately',
        purityTitle: 'Purity Verification',
        pureBadge: '100% Pure Verified',
        waterAlert: 'Suspected Water Dilution (Low CLR)',
        chemAlert: 'Chemical Adulteration Detected!'
      },
      gemmaTitle: 'AI Advisory',
      askGemmaBtn: 'Run AI Analysis'
    },
    charts: {
      pnlTitle: 'Revenue & Expense (P&L)',
      income: 'Revenue',
      expense: 'Expense',
      netProfit: 'Net Profit',
      loanChartTitle: 'Credit Recovery',
      recovered: 'Recovered',
      pending: 'Pending',
      txType: 'Type',
      txIncome: 'Revenue (Sales)',
      txExpense: 'Expense (Payout/Feed)',
      txAmount: 'Amount (₹)',
      txNote: 'Reference',
      addTxBtn: 'Log Entry'
    },
    khata: {
      title: 'Farmer & Buyer Credit Ledger',
      searchPlaceholder: 'Filter accounts...',
      addLoanBtn: 'New Credit',
      colName: 'Account',
      colTotal: 'Principal',
      colPaid: 'Recovered',
      colPending: 'Balance',
      colProgress: 'Recovery',
      colAction: 'EMI Action',
      deductBtn: 'Deduct ₹500',
      settled: 'Settled'
    },
    inventory: {
      title: 'Fodder & Stock Control',
      daysLeft: 'd left',
      dailyUse: 'Burn rate:',
      lowStock: 'Reorder Needed',
      goodStock: 'Optimal',
      restockBtn: '+50 Units',
      consumeBtn: '-1d Usage'
    },
  }
};


// ==========================================
// INITIAL REALISTIC INDIAN DAIRY DATA
// ==========================================
const INITIAL_PNL_DATA = [
  { month: 'Jun', income: 142000, expense: 98000, profit: 44000 },
  { month: 'Jul', income: 155000, expense: 104000, profit: 51000 },
  { month: 'Aug', income: 168000, expense: 112000, profit: 56000 },
  { month: 'Sep', income: 161000, expense: 108000, profit: 53000 },
  { month: 'Oct', income: 184000, expense: 119000, profit: 65000 },
  { month: 'Nov', income: 196000, expense: 121000, profit: 75000 }
];

const INITIAL_LOANS = [
  {
    id: 1,
    nameHi: 'रामेश्वर यादव (#104)',
    nameEn: 'Rameshwar Yadav (#104)',
    purposeHi: 'पशु आहार एडवांस',
    purposeEn: 'Cattle Feed Advance',
    totalLoan: 25000,
    recovered: 16500,
    dailyEmi: 500
  },
  {
    id: 2,
    nameHi: 'सुनीता देवी (#112)',
    nameEn: 'Sunita Devi (#112)',
    purposeHi: 'मिनरल मिक्चर व बीज',
    purposeEn: 'Mineral Mix Credit',
    totalLoan: 12000,
    recovered: 9500,
    dailyEmi: 500
  },
  {
    id: 3,
    nameHi: 'प्रयाग डेयरी (थोक)',
    nameEn: 'Prayag Dairy (Bulk)',
    purposeHi: 'साप्ताहिक पनीर बिल',
    purposeEn: 'Weekly Bulk Credit',
    totalLoan: 40000,
    recovered: 28000,
    dailyEmi: 500
  },
  {
    id: 4,
    nameHi: 'महेश पटेल (#119)',
    nameEn: 'Mahesh Patel (#119)',
    purposeHi: 'पशु चिकित्सा एडवांस',
    purposeEn: 'Vet Care Advance',
    totalLoan: 18000,
    recovered: 8000,
    dailyEmi: 500
  }
];

const INITIAL_INVENTORY = [
  {
    id: 'green_fodder',
    nameHi: 'हरा चारा (नेपियर)',
    nameEn: 'Green Fodder (Napier)',
    stock: 420,
    unitHi: 'kg',
    unitEn: 'kg',
    dailyBurn: 120,
    category: 'fodder'
  },
  {
    id: 'dry_fodder',
    nameHi: 'सूखा चारा (भूसा)',
    nameEn: 'Dry Fodder (Straw)',
    stock: 850,
    unitHi: 'kg',
    unitEn: 'kg',
    dailyBurn: 70,
    category: 'fodder'
  },
  {
    id: 'concentrate',
    nameHi: 'संतुलित पशु आहार (खल)',
    nameEn: 'Bypass Protein Feed',
    stock: 160,
    unitHi: 'kg',
    unitEn: 'kg',
    dailyBurn: 45,
    category: 'feed'
  },
  {
    id: 'mineral_mix',
    nameHi: 'चीलेटेड मिनरल मिक्चर',
    nameEn: 'Chelated Mineral Mix',
    stock: 28,
    unitHi: 'kg',
    unitEn: 'kg',
    dailyBurn: 2,
    category: 'supplement'
  },
  {
    id: 'test_strips',
    nameHi: 'मिलावट जांच स्ट्रिप्स',
    nameEn: 'Adulteration Test Strips',
    stock: 35,
    unitHi: 'pcs',
    unitEn: 'pcs',
    dailyBurn: 10,
    category: 'lab'
  }
];

// ==========================================
// VAANI (AI ASSISTANT) SUGGESTIONS
// ==========================================
const SUGGESTIONS: {
  id: string;
  icon: 'plus' | 'trend' | 'box' | 'thermo';
  labelEn: string;
  labelHi: string;
  textEn: string;
  textHi: string;
  send: boolean; // false = just fill the box so the user can complete the numbers
}[] = [
  {
    id: 's_record', icon: 'plus', send: false,
    labelEn: "Record today's milk", labelHi: 'आज का दूध दर्ज करें',
    textEn: "Add today's record: morning 12 L, evening 10 L, selling rate ₹52 per litre, feed cost ₹400",
    textHi: 'आज का रिकॉर्ड जोड़ो: सुबह 12 लीटर, शाम 10 लीटर, बिक्री दर 52 रुपये प्रति लीटर, चारा खर्च 400 रुपये'
  },
  {
    id: 's_month', icon: 'trend', send: true,
    labelEn: 'How is this month going?', labelHi: 'यह महीना कैसा चल रहा है?',
    textEn: 'How is this month going? Tell me production and profit or loss from my daily records.',
    textHi: 'यह महीना कैसा चल रहा है? मेरे रोज़ के रिकॉर्ड से उत्पादन और मुनाफा या घाटा बताइए।'
  },
  {
    id: 's_stock', icon: 'box', send: true,
    labelEn: 'What stock is running low?', labelHi: 'कौन सा स्टॉक कम है?',
    textEn: 'Which stock items will finish in less than 5 days?',
    textHi: 'कौन सा सामान 5 दिन से कम चलेगा?'
  },
  {
    id: 's_shelf', icon: 'thermo', send: true,
    labelEn: 'Shelf-life at 32°C', labelHi: '32°C पर शेल्फ-लाइफ',
    textEn: 'The milk is at 32 degrees. How many hours is it safe, and what temperature should I chill it to?',
    textHi: 'दूध का तापमान 32 डिग्री है। यह कितने घंटे सुरक्षित रहेगा और कितने डिग्री पर ठंडा करें?'
  }
];

type ChatEntry = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  hi: boolean; // language used for the action chips
  outcomes?: ActionOutcome[];
  tab?: string | null;
  retry?: string; // on a failed answer: the message to send again
};

type Draft = {
  date: string; morningL: string; eveningL: string; soldL: string; ratePerL: string; otherIncome: string;
  feedCost: string; labourCost: string; medicineCost: string; otherCost: string; note: string;
};
const blankDraft = (date: string, rate = ''): Draft => ({
  date, morningL: '', eveningL: '', soldL: '', ratePerL: rate, otherIncome: '',
  feedCost: '', labourCost: '', medicineCost: '', otherCost: '', note: ''
});
const draftFromRecord = (r: DailyRecord): Draft => {
  const s = (n: number) => (n ? String(n) : '');
  return {
    date: r.date, morningL: s(r.morningL), eveningL: s(r.eveningL), soldL: String(r.soldL), ratePerL: s(r.ratePerL),
    otherIncome: s(r.otherIncome), feedCost: s(r.feedCost), labourCost: s(r.labourCost),
    medicineCost: s(r.medicineCost), otherCost: s(r.otherCost), note: r.note
  };
};

const shiftMonth = (ym: string, delta: number): string => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

type CattleDraft = {
  tag: string; kind: CattleKind; breed: string; ageYears: string; ageMonths: string; count: string;
  status: HealthStatus; notes: string;
};
const blankCattle = (): CattleDraft => ({ tag: '', kind: 'cow', breed: '', ageYears: '', ageMonths: '', count: '1', status: 'healthy', notes: '' });

type ReportDraft = { date: string; status: HealthStatus; note: string; treatment: string; vet: string; nextCheck: string };
const blankReport = (status: HealthStatus = 'healthy'): ReportDraft => ({
  date: todayStr(), status, note: '', treatment: '', vet: '', nextCheck: ''
});

// Common Indian dairy breeds, offered as suggestions (any breed can be typed)
const BREEDS = [
  'Gir', 'Sahiwal', 'Red Sindhi', 'Tharparkar', 'Rathi', 'Kankrej', 'Hariana', 'Ongole', 'Jersey (cross)',
  'Holstein Friesian (cross)', 'Murrah', 'Jaffarabadi', 'Nili-Ravi', 'Mehsana', 'Surti', 'Bhadawari', 'Banni',
  'Pandharpuri', 'Nagpuri', 'Desi / local'
];

const STATUS_STYLE: Record<HealthStatus, string> = {
  healthy: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  observation: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  sick: 'bg-red-500/15 text-red-400 border-red-500/30',
  recovering: 'bg-sky-500/15 text-sky-400 border-sky-500/30'
};

// A soft glowing orb used as Vaani's avatar
function VaaniOrb({ size = 36, active = false }: { size?: number; active?: boolean }) {
  return (
    <div
      className="relative shrink-0 rounded-full"
      style={{ width: size, height: size, boxShadow: `0 0 ${Math.round(size * 0.7)}px rgba(45,212,191,0.35)` }}
      aria-hidden="true"
    >
      <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-emerald-300 via-teal-400 to-sky-500 ${active ? 'animate-pulse' : ''}`} />
      <div
        className="absolute rounded-full bg-white/55 blur-[2px]"
        style={{ width: size * 0.32, height: size * 0.32, top: size * 0.16, left: size * 0.2 }}
      />
      <div className="absolute inset-0 rounded-full ring-1 ring-white/25" />
    </div>
  );
}

// Debounced save of one piece of per-user data to the backend
function usePersist(key: string, value: unknown, ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const h = setTimeout(() => {
      api.saveData(key, value).catch(() => {});
    }, 600);
    return () => clearTimeout(h);
  }, [key, value, ready]);
}

export default function Dashboard({ user, onLogout, onUserUpdate }: { user: AuthUser; onLogout: () => void; onUserUpdate?: (u: AuthUser) => void }) {
  // Theme, language & navigation (the theme starts from the saved choice, or the device's light/dark setting)
  const [darkMode, setDarkMode] = useState<boolean>(getInitialDark);
  const [lang, setLang] = useState<'hi' | 'en'>(() => {
    try { return (localStorage.getItem('ga_lang') as 'hi' | 'en') || 'en'; } catch { return 'en'; }
  });
  const tr = (en: string, hi: string) => (lang === 'hi' ? hi : en);
  const [activeTab, setActiveTab] = useState('home');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [batchSavedToast, setBatchSavedToast] = useState(false);

  // Milk-lab AI advisory
  const [isCallingGemma, setIsCallingGemma] = useState(false);
  const [liveGemmaPoints, setLiveGemmaPoints] = useState<string[] | null>(null);

  // Vaani chat
  const [isListening, setIsListening] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiSlow, setAiSlow] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatEntry[]>([]);
  const [undoMsgId, setUndoMsgId] = useState<string | null>(null);
  const undoRef = useRef<{ id: string; ws: WorkState } | null>(null);
  const recognitionRef = useRef<any>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Milk Lab parameters
  const [farmerName, setFarmerName] = useState('Rameshwar Yadav (#104)');
  const [cattleType, setCattleType] = useState<'cow' | 'buffalo'>('buffalo');
  const [milkQty, setMilkQty] = useState(45);
  const [fat, setFat] = useState(6.2);
  const [snf, setSnf] = useState(8.8);
  const [ph, setPh] = useState(6.62);
  const [temp, setTemp] = useState(24);
  const [targetHours, setTargetHours] = useState(18);
  const [clr, setClr] = useState(28.5);
  const [strips, setStrips] = useState({ urea: false, starch: false, detergent: false, neutralizer: false, peroxide: false });
  const [isSimulatingIot, setIsSimulatingIot] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Financials: monthly P&L, credit, daily records
  const [pnlData, setPnlData] = useState(INITIAL_PNL_DATA);
  const [newTxType, setNewTxType] = useState('income');
  const [newTxAmount, setNewTxAmount] = useState(12500);
  const [newTxNote, setNewTxNote] = useState('');
  const [loans, setLoans] = useState(INITIAL_LOANS);
  const [loanSearch, setLoanSearch] = useState('');
  const [newLoanName, setNewLoanName] = useState('');
  const [newLoanAmount, setNewLoanAmount] = useState(10000);
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [financeMonth, setFinanceMonth] = useState(() => todayStr().slice(0, 7));
  const [draft, setDraft] = useState<Draft>(() => blankDraft(todayStr()));
  const [dailyToast, setDailyToast] = useState('');

  // Inventory & farm profile
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [cattleCount, setCattleCount] = useState(15);
  const [dailyYield, setDailyYield] = useState(165);
  const [chillingCap, setChillingCap] = useState(250);

  // Cattle management
  const [cattle, setCattle] = useState<Cattle[]>([]);
  const [cattleDraft, setCattleDraft] = useState<CattleDraft>(blankCattle);
  const [editingCattleTag, setEditingCattleTag] = useState<string | null>(null);
  const [cattleSearch, setCattleSearch] = useState('');
  const [cattleFilter, setCattleFilter] = useState<'all' | HealthStatus | 'due'>('all');
  const [expandedCattleId, setExpandedCattleId] = useState<string | null>(null);
  const [reportDraft, setReportDraft] = useState<ReportDraft>(() => blankReport());
  const [cattleToast, setCattleToast] = useState('');
  const cattleFormRef = useRef<HTMLDivElement>(null);

  // Contact details (email / mobile number used to sign in)
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ==========================================
  // PER-USER DATA: LOAD FROM + SAVE TO BACKEND
  // ==========================================
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .getData()
      .then((d) => {
        if (!alive) return;
        if (Array.isArray(d.pnlData) && d.pnlData.length) setPnlData(d.pnlData);
        if (Array.isArray(d.loans)) setLoans(d.loans);
        if (Array.isArray(d.inventory)) setInventory(d.inventory);
        if (Array.isArray(d.cattle)) setCattle(d.cattle);
        if (Array.isArray(d.dailyRecords)) {
          setDailyRecords(d.dailyRecords);
          const lastRate = [...d.dailyRecords].sort((a: DailyRecord, b: DailyRecord) => b.date.localeCompare(a.date)).find((r: DailyRecord) => r.ratePerL > 0)?.ratePerL;
          if (lastRate) setDraft((x) => ({ ...x, ratePerL: String(lastRate) }));
        }
        if (d.farm) {
          if (typeof d.farm.cattleCount === 'number') setCattleCount(d.farm.cattleCount);
          if (typeof d.farm.dailyYield === 'number') setDailyYield(d.farm.dailyYield);
          if (typeof d.farm.chillingCap === 'number') setChillingCap(d.farm.chillingCap);
        }
        if (d.settings) {
          if (typeof d.settings.darkMode === 'boolean') setDarkMode(d.settings.darkMode);
          if (d.settings.lang === 'hi' || d.settings.lang === 'en') setLang(d.settings.lang);
          if (typeof d.settings.autoSpeak === 'boolean') setAutoSpeak(d.settings.autoSpeak);
        }
        setDataLoaded(true);
      })
      .catch(() => {
        // Do NOT enable saving if loading failed - we could overwrite real data with defaults
        if (alive) setLoadError(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const farmSettings = useMemo(() => ({ cattleCount, dailyYield, chillingCap }), [cattleCount, dailyYield, chillingCap]);
  const uiSettings = useMemo(() => ({ darkMode, lang, autoSpeak }), [darkMode, lang, autoSpeak]);
  usePersist('pnlData', pnlData, dataLoaded);
  usePersist('loans', loans, dataLoaded);
  usePersist('inventory', inventory, dataLoaded);
  usePersist('dailyRecords', dailyRecords, dataLoaded);
  usePersist('cattle', cattle, dataLoaded);
  usePersist('farm', farmSettings, dataLoaded);
  usePersist('settings', uiSettings, dataLoaded);
  useEffect(() => {
    try { localStorage.setItem('ga_lang', lang); } catch { /* ignore */ }
  }, [lang]);
  useEffect(() => {
    if (dataLoaded) writeThemePref(darkMode ? 'dark' : 'light');
  }, [darkMode, dataLoaded]);

  const t = TRANSLATIONS[lang];

  // Snapshot of everything the assistant is allowed to read and edit
  const getWs = (): WorkState => ({
    pnlData, loans, inventory, dailyRecords, cattle,
    farm: { cattleCount, dailyYield, chillingCap },
    lab: { farmerName, cattleType, milkQty, fat, snf, ph, temp, clr, targetHours, strips }
  });
  // Always points at the newest data, so async work never uses stale values
  const wsRef = useRef<WorkState>(getWs());
  wsRef.current = getWs();

  // ==========================================
  // AI & SCIENTIFIC DAIRY CALCULATIONS
  // ==========================================
  const milkAnalysis = useMemo(() => {
    const hasChemicalAdulteration =
      strips.urea ||
      strips.starch ||
      strips.detergent ||
      strips.neutralizer ||
      strips.peroxide;

    const expectedSnf = clr / 4 + 0.21 * fat + 0.36;
    const isWaterDiluted = clr < 25 || snf < 7.8 || Math.abs(expectedSnf - snf) > 1.35;
    const isAcidityAbnormal = ph < 6.45 || ph > 6.85;

    let grade = 'A+';
    let gradeLabel = t.lab.results.gradeA;
    let gradeColor = 'emerald';

    if (hasChemicalAdulteration || ph < 6.3 || ph > 7.0) {
      grade = 'C';
      gradeLabel = t.lab.results.gradeC;
      gradeColor = 'red';
    } else if (isWaterDiluted || isAcidityAbnormal || fat < 3.8 || snf < 8.2) {
      grade = 'B';
      gradeLabel = t.lab.results.gradeB;
      gradeColor = 'amber';
    }

    let ratePerLiter = 0;
    if (grade === 'C') {
      ratePerLiter = 22;
    } else {
      const baseRate = fat * 4.8 + snf * 2.6;
      const gradeBonus = grade === 'A+' ? 4.5 : 0;
      ratePerLiter = Math.round((baseRate + gradeBonus) * 10) / 10;
    }
    const totalPayout = Math.round(ratePerLiter * milkQty);

    let pHFactor = 1.0;
    if (ph < 6.5 || ph > 6.75) pHFactor = 0.65;
    if (ph < 6.4 || ph > 6.85) pHFactor = 0.3;

    const rawSafeHours = 72 * Math.pow(0.55, (temp - 4) / 6.5) * pHFactor;
    const predictedSafeHours = Math.max(1, Math.min(72, Math.round(rawSafeHours * 10) / 10));

    let requiredTemp = 4;
    if (targetHours <= 4 && pHFactor >= 0.8) {
      requiredTemp = 25;
    } else if (targetHours <= 8 && pHFactor >= 0.8) {
      requiredTemp = 15;
    } else if (targetHours <= 14 && pHFactor >= 0.8) {
      requiredTemp = 10;
    } else if (targetHours <= 24) {
      requiredTemp = 6;
    } else {
      requiredTemp = 4;
    }

    const needsImmediateCooling = temp > requiredTemp || predictedSafeHours < targetHours;

    const decayCurveData = [4, 8, 12, 16, 20, 24, 28, 32, 36, 40].map((tempPoint) => {
      const hrs = Math.max(
        1,
        Math.min(72, Math.round(72 * Math.pow(0.55, (tempPoint - 4) / 6.5) * pHFactor * 10) / 10)
      );
      return {
        tempLabel: `${tempPoint}°C`,
        tempValue: tempPoint,
        safeHours: hrs,
        targetLine: targetHours
      };
    });

    let purityStatus = 'PURE';
    let purityMessage = t.lab.results.pureBadge;
    if (hasChemicalAdulteration) {
      purityStatus = 'CHEMICAL';
      purityMessage = t.lab.results.chemAlert;
    } else if (isWaterDiluted) {
      purityStatus = 'WATER';
      purityMessage = t.lab.results.waterAlert;
    }

    const detectedChemsHi = [
      strips.urea && 'यूरिया',
      strips.starch && 'स्टार्च',
      strips.detergent && 'डिटर्जेंट',
      strips.neutralizer && 'न्यूट्रलाइज़र',
      strips.peroxide && 'पेरोक्साइड'
    ]
      .filter(Boolean)
      .join(', ');

    const detectedChemsEn = [
      strips.urea && 'Urea',
      strips.starch && 'Starch',
      strips.detergent && 'Detergent',
      strips.neutralizer && 'Neutralizers',
      strips.peroxide && 'Peroxide'
    ]
      .filter(Boolean)
      .join(', ');

    const gemmaPointsHi = [
      `मूल्यांकन: ग्रेड '${grade}' | फैट ${fat}%, SNF ${snf}% | दर ₹${ratePerLiter}/L (कुल ₹${totalPayout.toLocaleString('en-IN')})।`,
      `शेल्फ-लाइफ: ${temp}°C पर ${predictedSafeHours} घंटे सुरक्षित। ${targetHours} घंटे स्टोरेज हेतु ${requiredTemp}°C पर ठंडा करें।`,
      purityStatus === 'PURE'
        ? `शुद्धता: CLR ${clr} और 5-स्ट्रिप जांच में 100% शुद्ध।`
        : purityStatus === 'WATER'
        ? `मिलावट अलर्ट: कम CLR (${clr}) — लगभग ${Math.max(5, Math.round((28 - clr) * 3))}% पानी संदिग्ध।`
        : `गंभीर अलर्ट: रासायनिक तत्व (${detectedChemsHi}) पाए गए। बैच अलग करें।`,
      `राशन सुझाव: 50g चीलेटेड मिनरल मिक्चर दें, SNF +0.3% और दर +₹2.5/L बढ़ेगी।`
    ];

    const gemmaPointsEn = [
      `Valuation: Grade '${grade}' | Fat ${fat}%, SNF ${snf}% | Fair Rate ₹${ratePerLiter}/L (Total ₹${totalPayout.toLocaleString('en-IN')}).`,
      `Thermal Control: Safe for ${predictedSafeHours}h at ${temp}°C. Chill to ${requiredTemp}°C for ${targetHours}h target.`,
      purityStatus === 'PURE'
        ? `Purity: CLR (${clr}) and 5-parameter strip test verified 100% pure.`
        : purityStatus === 'WATER'
        ? `Dilution Alert: Low CLR (${clr}) indicates ~${Math.max(5, Math.round((28 - clr) * 3))}% water addition.`
        : `Critical Alert: Adulterants (${detectedChemsEn}) detected. Quarantine batch immediately.`,
      `Ration Tip: Add 50g chelated mineral mix + bypass protein to boost SNF by +0.3%.`
    ];

    return {
      grade,
      gradeLabel,
      gradeColor,
      ratePerLiter,
      totalPayout,
      predictedSafeHours,
      requiredTemp,
      needsImmediateCooling,
      purityStatus,
      purityMessage,
      decayCurveData,
      gemmaAdvice: liveGemmaPoints || (lang === 'hi' ? gemmaPointsHi : gemmaPointsEn)
    };
  }, [fat, snf, ph, temp, targetHours, clr, strips, milkQty, lang, t, liveGemmaPoints]);

  useEffect(() => {
    setLiveGemmaPoints(null);
  }, [fat, snf, ph, temp, targetHours, clr, strips, lang]);

  // ==========================================
  // BUSINESS, LOAN & INVENTORY AGGREGATIONS
  // ==========================================
  const loanSummary = useMemo(() => {
    const totalLoan = loans.reduce((acc, item) => acc + item.totalLoan, 0);
    const totalRecovered = loans.reduce((acc, item) => acc + item.recovered, 0);
    const totalPending = Math.max(0, totalLoan - totalRecovered);
    return {
      totalLoan,
      totalRecovered,
      totalPending,
      pieData: [
        {
          name: t.charts.recovered,
          value: totalRecovered,
          color: '#10b981'
        },
        {
          name: t.charts.pending,
          value: totalPending,
          color: '#f59e0b'
        }
      ]
    };
  }, [loans, t]);

  const filteredLoans = useMemo(() => {
    if (!loanSearch.trim()) return loans;
    const q = loanSearch.toLowerCase();
    return loans.filter(
      (l) =>
        l.nameHi.toLowerCase().includes(q) ||
        l.nameEn.toLowerCase().includes(q) ||
        l.purposeHi.toLowerCase().includes(q) ||
        l.purposeEn.toLowerCase().includes(q)
    );
  }, [loans, loanSearch]);

  const lowStockItems = useMemo(() => {
    return inventory.filter((item) => item.stock / item.dailyBurn < 5);
  }, [inventory]);

  const latestMonthPnl = pnlData[pnlData.length - 1];

  // ==========================================
  // DAILY RECORD AGGREGATIONS
  // ==========================================
  const todayKey = todayStr();
  const todayRecord = dailyRecords.find((r) => r.date === todayKey);
  const todayTotals = todayRecord ? recordTotals(todayRecord) : null;

  const monthRecords = useMemo(
    () => dailyRecords.filter((r) => r.date.startsWith(financeMonth)).sort((a, b) => a.date.localeCompare(b.date)),
    [dailyRecords, financeMonth]
  );

  const monthSummary = useMemo(() => {
    let produced = 0, sold = 0, revenue = 0, expense = 0;
    let best: { date: string; profit: number } | null = null;
    let worst: { date: string; profit: number } | null = null;
    for (const r of monthRecords) {
      const x = recordTotals(r);
      produced += x.produced; sold += r.soldL; revenue += x.revenue; expense += x.expense;
      if (!best || x.profit > best.profit) best = { date: r.date, profit: x.profit };
      if (!worst || x.profit < worst.profit) worst = { date: r.date, profit: x.profit };
    }
    const days = monthRecords.length;
    return {
      produced, sold, revenue, expense, profit: revenue - expense, days,
      avg: days ? produced / days : 0, best, worst
    };
  }, [monthRecords]);

  const monthChart = useMemo(
    () => monthRecords.map((r) => {
      const x = recordTotals(r);
      return { day: r.date.slice(8), produced: x.produced, profit: Math.round(x.profit) };
    }),
    [monthRecords]
  );

  const last7 = useMemo(() => {
    const out: { label: string; produced: number; profit: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = addDays(todayKey, -i);
      const rec = dailyRecords.find((r) => r.date === date);
      const x = rec ? recordTotals(rec) : null;
      out.push({ label: prettyDate(date), produced: x ? x.produced : 0, profit: x ? Math.round(x.profit) : 0 });
    }
    return out;
  }, [dailyRecords, todayKey]);

  const num = (s: string) => toNum(s) ?? 0;
  const draftPreview = useMemo(() => {
    const produced = num(draft.morningL) + num(draft.eveningL);
    const sold = draft.soldL.trim() === '' ? produced : num(draft.soldL);
    const revenue = sold * num(draft.ratePerL) + num(draft.otherIncome);
    const expense = num(draft.feedCost) + num(draft.labourCost) + num(draft.medicineCost) + num(draft.otherCost);
    return { produced, sold, revenue, expense, profit: revenue - expense };
  }, [draft]);

  // ==========================================
  // CATTLE AGGREGATIONS
  // ==========================================
  const cattleStats = useMemo(() => {
    const today = todayStr();
    const st = { total: cattleTotal(cattle), records: cattle.length, cow: 0, buffalo: 0, bull: 0, calf: 0, healthy: 0, attention: 0, due: 0 };
    for (const c of cattle) {
      st[c.kind] += c.count;
      if (c.status === 'healthy') st.healthy += c.count;
      else st.attention += c.count;
      if (checkupState(c, today)) st.due += 1;
    }
    return st;
  }, [cattle]);

  const filteredCattle = useMemo(() => {
    const q = cattleSearch.trim().toLowerCase();
    return cattle
      .filter((c) => (cattleFilter === 'all' ? true : cattleFilter === 'due' ? !!checkupState(c) : c.status === cattleFilter))
      .filter((c) => !q || c.tag.toLowerCase().includes(q) || c.breed.toLowerCase().includes(q))
      .sort((a, b) => a.tag.localeCompare(b.tag, undefined, { numeric: true }));
  }, [cattle, cattleSearch, cattleFilter]);

  // The farm profile's animal count follows the cattle records once there are any
  useEffect(() => {
    if (dataLoaded && cattle.length) setCattleCount(cattleTotal(cattle));
  }, [cattle, dataLoaded]);

  // Keep the assistant's chat scrolled to the newest message
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatMessages, isAiThinking]);

  // Voices load asynchronously in most browsers
  useEffect(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
    return () => stopSpeaking();
  }, []);

  // ==========================================
  // VOICE OUTPUT (Vaani speaks softly)
  // ==========================================
  const speakText = (text: string) =>
    speak(text, { lang, onStart: () => setIsSpeaking(true), onEnd: () => setIsSpeaking(false) });

  const handleSpeakAdvisory = () => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }
    speakText(milkAnalysis.gemmaAdvice.join(' '));
  };

  // ==========================================
  // APPLY / UNDO CHANGES MADE BY VAANI OR THE FORMS
  // ==========================================
  const commitWs = (next: WorkState) => {
    const cur = wsRef.current;
    const differs = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);
    if (differs(next.pnlData, cur.pnlData)) setPnlData(next.pnlData);
    if (differs(next.loans, cur.loans)) setLoans(next.loans);
    if (differs(next.inventory, cur.inventory)) setInventory(next.inventory);
    if (differs(next.dailyRecords, cur.dailyRecords)) setDailyRecords(next.dailyRecords);
    if (differs(next.cattle, cur.cattle)) setCattle(next.cattle);
    if (next.farm.cattleCount !== cur.farm.cattleCount) setCattleCount(next.farm.cattleCount);
    if (next.farm.dailyYield !== cur.farm.dailyYield) setDailyYield(next.farm.dailyYield);
    if (next.farm.chillingCap !== cur.farm.chillingCap) setChillingCap(next.farm.chillingCap);
    const a = next.lab, b = cur.lab;
    if (a.farmerName !== b.farmerName) setFarmerName(a.farmerName);
    if (a.cattleType !== b.cattleType) setCattleType(a.cattleType);
    if (a.milkQty !== b.milkQty) setMilkQty(a.milkQty);
    if (a.fat !== b.fat) setFat(a.fat);
    if (a.snf !== b.snf) setSnf(a.snf);
    if (a.ph !== b.ph) setPh(a.ph);
    if (a.temp !== b.temp) setTemp(a.temp);
    if (a.clr !== b.clr) setClr(a.clr);
    if (a.targetHours !== b.targetHours) setTargetHours(a.targetHours);
    if (differs(a.strips, b.strips)) setStrips(a.strips);
  };

  const handleUndo = (id: string) => {
    const snap = undoRef.current;
    if (!snap || snap.id !== id) return;
    commitWs(snap.ws);
    undoRef.current = null;
    setUndoMsgId(null);
    const text = tr("Done. I've put everything back the way it was.", 'ठीक है, मैंने सब कुछ पहले जैसा कर दिया।');
    setChatMessages((prev) => [...prev, { id: `ai-${Date.now()}`, role: 'assistant', text, hi: lang === 'hi' }]);
    if (autoSpeak) speakText(text);
  };

  const tabForActions = (types: string[]): string | null => {
    for (const ty of types) {
      if (ty.includes('cattle') || ty === 'add_health_report') return 'cattle';
      if (ty.includes('daily') || ty === 'add_transaction' || ty === 'set_month_pnl') return 'charts';
      if (ty === 'set_lab' || ty === 'save_batch') return 'lab';
      if (ty.includes('loan')) return 'khata';
      if (ty.includes('inventory')) return 'inventory';
    }
    return null;
  };

  // ==========================================
  // VAANI: ONE TURN OF CONVERSATION
  // ==========================================
  const processAiCommand = async (raw: string, retryOf?: string) => {
    const query = (raw || '').trim();
    if (!query || isAiThinking) return;
    stopSpeaking();
    setIsSpeaking(false);

    const userMsg: ChatEntry = { id: `user-${Date.now()}`, role: 'user', text: query, hi: /[\u0900-\u097F]/.test(query) };
    // "Try again" replaces the failed answer; the user's own message is already in the chat
    const history = retryOf ? chatMessages.filter((m) => m.id !== retryOf) : [...chatMessages, userMsg];
    setChatMessages(history);
    if (!retryOf) setAiInput('');
    setIsAiThinking(true);
    setAiSlow(false);
    const slowTimer = window.setTimeout(() => setAiSlow(true), 7000);

    const id = `ai-${Date.now()}`;
    let entry: ChatEntry;
    try {
      const today = todayStr();
      const res = await api.chat({
        messages: history.slice(-8).map((m) => ({ role: m.role, text: m.text })),
        state: buildAiState(wsRef.current, today),
        lang,
        today
      });

      const hindi = /[\u0900-\u097F]/.test(res.reply) || userMsg.hi || (!/[a-zA-Z]{3}/.test(res.reply) && lang === 'hi');
      let replyText = res.reply;
      let outcomes: ActionOutcome[] = [];
      let tab: string | null = null;

      if (Array.isArray(res.actions) && res.actions.length) {
        const base = wsRef.current; // newest data, in case the user edited while Vaani was thinking
        const result = executeActions(res.actions, base);
        outcomes = result.outcomes;

        if (result.changed) {
          commitWs(result.ws);
          undoRef.current = { id, ws: base };
          setUndoMsgId(id);
          if (result.batch) {
            api.saveBatch(result.batch).catch(() => {});
            setBatchSavedToast(true);
            setTimeout(() => setBatchSavedToast(false), 3000);
          }
        }
        if (result.ui.lang) setLang(result.ui.lang);
        if (typeof result.ui.darkMode === 'boolean') setDarkMode(result.ui.darkMode);
        if (typeof result.ui.autoSpeak === 'boolean') setAutoSpeak(result.ui.autoSpeak);
        tab = result.ui.tab || tabForActions(res.actions.map((a: any) => String(a?.type)));

        // Never let a cheerful reply hide a change that did not happen
        const failed = outcomes.filter((o) => !o.ok).map((o) => (hindi ? o.msg.hi : o.msg.en));
        if (failed.length) {
          replyText = outcomes.every((o) => !o.ok)
            ? failed.join(' ')
            : `${replyText} ${hindi ? 'एक बात नहीं हो पाई:' : "One thing didn't go through:"} ${failed.join(' ')}`;
        }
      }
      entry = { id, role: 'assistant', text: replyText, hi: hindi, outcomes, tab };
    } catch (err: any) {
      const detail = err?.message ? ` (${err.message})` : '';
      entry = {
        id, role: 'assistant', hi: lang === 'hi', retry: query,
        text: tr(
          `I'm sorry, I couldn't think that through just now. Please try again in a moment.${detail}`,
          `माफ़ कीजिए, अभी मैं जवाब नहीं दे पाई। थोड़ी देर में फिर कोशिश कीजिए।${detail}`
        )
      };
    }

    window.clearTimeout(slowTimer);
    setAiSlow(false);
    setChatMessages((prev) => [...prev, entry]);
    setIsAiThinking(false);
    if (autoSpeak) speakText(entry.text);
  };

  const startNewChat = () => {
    stopSpeaking();
    setIsSpeaking(false);
    setChatMessages([]);
    undoRef.current = null;
    setUndoMsgId(null);
    setAiInput('');
  };

  // ==========================================
  // SPEECH-TO-TEXT (MICROPHONE)
  // ==========================================
  const handleVoiceMicToggle = () => {
    const SpeechRecognition =
      typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (!SpeechRecognition) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`, role: 'assistant', hi: lang === 'hi',
          text: tr(
            "This browser can't listen yet, so please type to me. Chrome or Edge work well for voice.",
            'यह ब्राउज़र अभी सुन नहीं सकता, कृपया लिखकर बताइए। आवाज़ के लिए Chrome या Edge ठीक रहते हैं।'
          )
        }
      ]);
      return;
    }
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    try {
      stopSpeaking();
      const recognition = new SpeechRecognition();
      recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) processAiCommand(transcript);
      };
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // ==========================================
  // MILK LAB HANDLERS
  // ==========================================
  const handleRunLiveGemmaAnalysis = async () => {
    setIsCallingGemma(true);
    const prompt = `You are the advisor inside a dairy ERP. Analyze this milk batch:
- Supplier: ${farmerName} (${cattleType})
- Volume: ${milkQty}L | Fat: ${fat}% | SNF: ${snf}% | CLR: ${clr} | pH: ${ph}
- Temp: ${temp}°C | Target Storage: ${targetHours}h
- Grade: ${milkAnalysis.grade} | Rate: ₹${milkAnalysis.ratePerLiter}/L | Safe Window: ${milkAnalysis.predictedSafeHours}h
- Purity: ${milkAnalysis.purityStatus}

Return exactly 4 concise bullet points in ${lang === 'hi' ? 'Hindi (Devanagari)' : 'English'} covering:
1) Grade & payout valuation 2) Chilling temperature & shelf-life window 3) Purity & adulteration status 4) Ration optimization tip.`;
    try {
      const result = await api.ai({ prompt });
      const lines = (result.text || '')
        .split('\n')
        .map((l: string) => l.replace(/^[-*•\d.)\s]+/, '').replace(/\*\*/g, '').trim())
        .filter((l: string) => l.length > 12)
        .slice(0, 4);
      if (lines.length >= 2) {
        setLiveGemmaPoints(lines);
        if (autoSpeak) speakText(lines.join('. '));
      }
    } catch {
      /* the built-in advisory stays visible */
    } finally {
      setIsCallingGemma(false);
    }
  };

  const handleSimulateIotProbe = () => {
    setIsSimulatingIot(true);
    setTimeout(() => {
      const isBuff = Math.random() > 0.35;
      setCattleType(isBuff ? 'buffalo' : 'cow');
      setFat(isBuff ? Number((5.8 + Math.random() * 1.4).toFixed(1)) : Number((3.9 + Math.random() * 0.9).toFixed(1)));
      setSnf(isBuff ? Number((8.7 + Math.random() * 0.6).toFixed(1)) : Number((8.3 + Math.random() * 0.5).toFixed(1)));
      setClr(Number((27.0 + Math.random() * 2.5).toFixed(1)));
      setPh(Number((6.56 + Math.random() * 0.14).toFixed(2)));
      setTemp(Math.round(18 + Math.random() * 13));
      setStrips({ urea: false, starch: false, detergent: false, neutralizer: false, peroxide: false });
      setIsSimulatingIot(false);
    }, 500);
  };

  const toggleStrip = (key: keyof typeof strips) => {
    setStrips((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveMilkBatch = () => {
    api
      .saveBatch({
        farmerName, cattleType, milkQty, fat, snf, clr, ph, temp, targetHours,
        grade: milkAnalysis.grade,
        ratePerLiter: milkAnalysis.ratePerLiter,
        totalPayout: milkAnalysis.totalPayout,
        purity: milkAnalysis.purityStatus,
        strips
      })
      .catch(() => {});
    setPnlData((prev) => batchPnl(prev, milkAnalysis.totalPayout));
    setBatchSavedToast(true);
    setTimeout(() => setBatchSavedToast(false), 3000);
  };

  // ==========================================
  // FINANCE HANDLERS
  // ==========================================
  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(newTxAmount) || 0;
    if (amount <= 0) return;
    setPnlData((prev) => {
      const updated = [...prev];
      const lastIdx = updated.length - 1;
      const current = updated[lastIdx];
      const updatedIncome = newTxType === 'income' ? current.income + amount : current.income;
      const updatedExpense = newTxType === 'expense' ? current.expense + amount : current.expense;
      updated[lastIdx] = { ...current, income: updatedIncome, expense: updatedExpense, profit: updatedIncome - updatedExpense };
      return updated;
    });
    setNewTxNote('');
  };

  const showDailyToast = (msg: string) => {
    setDailyToast(msg);
    setTimeout(() => setDailyToast(''), 3500);
  };

  const setDraftField = (key: keyof Draft, value: string) => setDraft((d) => ({ ...d, [key]: value }));

  // Picking a date that already has a record loads it for editing
  const handleDraftDate = (date: string) => {
    const existing = dailyRecords.find((r) => r.date === date);
    if (existing) setDraft(draftFromRecord(existing));
    else setDraft((d) => ({ ...blankDraft(date, d.ratePerL) }));
  };

  const handleSaveDaily = (e: React.FormEvent) => {
    e.preventDefault();
    const hasAny = draftPreview.produced > 0 || draftPreview.expense > 0 || num(draft.otherIncome) > 0;
    if (!draft.date || !hasAny) {
      showDailyToast(tr('Please enter some litres or costs first.', 'पहले कुछ लीटर या खर्च भरिए।'));
      return;
    }
    const result = executeActions(
      [{
        type: 'add_daily_record', date: draft.date,
        morningL: num(draft.morningL), eveningL: num(draft.eveningL), soldL: draftPreview.sold,
        ratePerL: num(draft.ratePerL), otherIncome: num(draft.otherIncome), feedCost: num(draft.feedCost),
        labourCost: num(draft.labourCost), medicineCost: num(draft.medicineCost), otherCost: num(draft.otherCost),
        note: draft.note
      }],
      wsRef.current
    );
    const o = result.outcomes[0];
    if (o?.ok) {
      commitWs(result.ws);
      setFinanceMonth(draft.date.slice(0, 7));
      setDraft(blankDraft(todayStr(), draft.ratePerL));
    }
    showDailyToast(o ? (lang === 'hi' ? o.msg.hi : o.msg.en) : '');
  };

  const handleEditDaily = (r: DailyRecord) => {
    setDraft(draftFromRecord(r));
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDeleteDaily = (r: DailyRecord) => {
    if (!window.confirm(tr(`Delete the record for ${prettyDate(r.date)}?`, `${prettyDate(r.date, 'hi')} का रिकॉर्ड हटाएँ?`))) return;
    const result = executeActions([{ type: 'delete_daily_record', date: r.date }], wsRef.current);
    if (result.outcomes[0]?.ok) commitWs(result.ws);
    if (draft.date === r.date) setDraft(blankDraft(todayStr(), draft.ratePerL));
  };

  const handleExportCsv = () => {
    const cell = (v: string | number) => {
      let s = String(v);
      if (/^[=+\-@]/.test(s)) s = `'${s}`; // stop spreadsheet formula injection
      return `"${s.replace(/"/g, '""')}"`;
    };
    const rows: (string | number)[][] = [[
      'Date', 'Morning L', 'Evening L', 'Produced L', 'Sold L', 'Rate/L', 'Other income', 'Feed', 'Labour',
      'Medicine', 'Other cost', 'Revenue', 'Expense', 'Profit/Loss', 'Note'
    ]];
    for (const r of monthRecords) {
      const x = recordTotals(r);
      rows.push([r.date, r.morningL, r.eveningL, x.produced, r.soldL, r.ratePerL, r.otherIncome, r.feedCost,
        r.labourCost, r.medicineCost, r.otherCost, x.revenue, x.expense, x.profit, r.note]);
    }
    const blob = new Blob(['\ufeff' + rows.map((r) => r.map(cell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gauvaani-daily-${financeMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ==========================================
  // CREDIT & INVENTORY HANDLERS
  // ==========================================
  const handleDeductEmi = (id: number) => {
    setLoans((prev) =>
      prev.map((loan) => (loan.id !== id ? loan : { ...loan, recovered: Math.min(loan.totalLoan, loan.recovered + 500) }))
    );
  };

  const handleAddNewLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoanName.trim() || Number(newLoanAmount) <= 0) return;
    setLoans((prev) => [
      {
        id: Date.now(), nameHi: `${newLoanName}`, nameEn: `${newLoanName}`,
        purposeHi: 'डेयरी एडवांस', purposeEn: 'Dairy Credit',
        totalLoan: Number(newLoanAmount), recovered: 0, dailyEmi: 500
      },
      ...prev
    ]);
    setNewLoanName('');
  };

  const handleInventoryChange = (id: string, delta: number) => {
    setInventory((prev) =>
      prev.map((item) => (item.id !== id ? item : { ...item, stock: Math.max(0, item.stock + delta) }))
    );
  };

  // ==========================================
  // CONTACT DETAILS (sign-in email / mobile number)
  // ==========================================
  const openProfile = () => {
    setProfileEmail(user.email || '');
    setProfilePhone(user.phone || '');
    setProfileMsg(null);
    setProfileOpen(true);
    setIsDrawerOpen(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileBusy) return;
    const em = profileEmail.trim();
    const ph = profilePhone.trim();
    const fail = (en: string, hi: string) => setProfileMsg({ ok: false, text: tr(en, hi) });
    if (!em && !ph) return fail('Keep at least an email or a mobile number.', 'कम से कम ईमेल या मोबाइल नंबर में से एक रखें।');
    if (em && !isEmail(em)) return fail('Please enter a valid email address.', 'कृपया सही ईमेल पता लिखें।');
    if (ph && !normalizePhone(ph)) return fail('Please enter a valid 10-digit mobile number.', 'कृपया सही 10 अंकों का मोबाइल नंबर लिखें।');
    setProfileBusy(true);
    try {
      const res = await api.updateContact({ email: em, phone: ph });
      onUserUpdate?.(res.user);
      setProfileEmail(res.user.email);
      setProfilePhone(res.user.phone);
      setProfileMsg({ ok: true, text: tr('Saved. You can sign in with either one.', 'सेव हो गया। अब आप दोनों में से किसी से भी साइन इन कर सकते हैं।') });
    } catch (err: any) {
      setProfileMsg({ ok: false, text: localizeError(err?.message || '', lang) });
    } finally {
      setProfileBusy(false);
    }
  };

  // ==========================================
  // CATTLE HANDLERS
  // ==========================================
  const flashCattle = (msg: string) => {
    setCattleToast(msg);
    setTimeout(() => setCattleToast(''), 3500);
  };
  const setCDraft = (k: keyof CattleDraft, v: string) => setCattleDraft((d) => ({ ...d, [k]: v }));
  const setRDraft = (k: keyof ReportDraft, v: string) => setReportDraft((d) => ({ ...d, [k]: v }));
  const msgOf = (o?: ActionOutcome) => (o ? (lang === 'hi' ? o.msg.hi : o.msg.en) : '');

  const handleSaveCattle = (e: React.FormEvent) => {
    e.preventDefault();
    const editing = editingCattleTag !== null;
    const result = executeActions(
      [{
        type: editing ? 'update_cattle' : 'add_cattle',
        tag: editing ? editingCattleTag : cattleDraft.tag,
        ...(editing ? { newTag: cattleDraft.tag } : {}),
        kind: cattleDraft.kind,
        breed: cattleDraft.breed.trim(),
        ageYears: cattleDraft.ageYears.trim() === '' ? undefined : num(cattleDraft.ageYears),
        ageMonths: cattleDraft.ageMonths.trim() === '' ? undefined : num(cattleDraft.ageMonths),
        count: num(cattleDraft.count) || 1,
        status: cattleDraft.status,
        notes: cattleDraft.notes.trim()
      }],
      wsRef.current
    );
    const o = result.outcomes[0];
    if (o?.ok) {
      commitWs(result.ws);
      setCattleDraft(blankCattle());
      setEditingCattleTag(null);
    }
    flashCattle(msgOf(o));
  };

  const handleEditCattle = (c: Cattle) => {
    const m = c.dob ? ageMonthsOf(c.dob) : null;
    setCattleDraft({
      tag: c.tag, kind: c.kind, breed: c.breed,
      ageYears: m === null ? '' : String(Math.floor(m / 12)),
      ageMonths: m === null ? '' : String(m % 12),
      count: String(c.count), status: c.status, notes: c.notes
    });
    setEditingCattleTag(c.tag);
    cattleFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDeleteCattle = (c: Cattle) => {
    if (!window.confirm(tr(`Remove #${c.tag} and its health reports?`, `#${c.tag} और उसकी स्वास्थ्य रिपोर्ट हटाएँ?`))) return;
    const result = executeActions([{ type: 'delete_cattle', tag: c.tag }], wsRef.current);
    if (result.outcomes[0]?.ok) {
      commitWs(result.ws);
      if (editingCattleTag === c.tag) { setEditingCattleTag(null); setCattleDraft(blankCattle()); }
      if (expandedCattleId === c.id) setExpandedCattleId(null);
    }
  };

  const toggleCattleReports = (c: Cattle) => {
    if (expandedCattleId === c.id) { setExpandedCattleId(null); return; }
    setExpandedCattleId(c.id);
    setReportDraft(blankReport(c.status));
  };

  const handleAddReport = (e: React.FormEvent, c: Cattle) => {
    e.preventDefault();
    const result = executeActions(
      [{
        type: 'add_health_report', tag: c.tag, date: reportDraft.date, status: reportDraft.status,
        note: reportDraft.note, treatment: reportDraft.treatment, vet: reportDraft.vet, nextCheck: reportDraft.nextCheck
      }],
      wsRef.current
    );
    const o = result.outcomes[0];
    if (o?.ok) {
      commitWs(result.ws);
      setReportDraft(blankReport(reportDraft.status));
    }
    flashCattle(msgOf(o));
  };

  const handleDeleteReport = (c: Cattle, reportId: string) => {
    if (!window.confirm(tr('Delete this health report?', 'यह स्वास्थ्य रिपोर्ट हटाएँ?'))) return;
    setCattle((prev) =>
      prev.map((x) => {
        if (x.id !== c.id) return x;
        const reports = x.reports.filter((r) => r.id !== reportId);
        const newest = latestReport({ ...x, reports });
        return { ...x, reports, status: newest ? newest.status : x.status };
      })
    );
  };

  const navItems = [
    { id: 'home', label: t.tabs.home, icon: Home, badge: '' },
    { id: 'lab', label: t.tabs.lab, icon: Milk, badge: milkAnalysis.grade },
    { id: 'charts', label: t.tabs.charts, icon: TrendingUp, badge: todayTotals ? `${todayTotals.profit >= 0 ? '+' : '−'}₹${Math.abs(Math.round(todayTotals.profit))}` : '' },
    { id: 'khata', label: t.tabs.khata, icon: Wallet, badge: `${loans.length}` },
    { id: 'inventory', label: t.tabs.inventory, icon: Package, badge: lowStockItems.length > 0 ? `${lowStockItems.length}!` : '' },
    { id: 'cattle', label: t.tabs.cattle, icon: PawPrint, badge: cattleStats.attention > 0 ? `${cattleStats.attention}!` : cattleStats.total ? `${cattleStats.total}` : '' }
  ];

  // Theme tokens
  const bgMain = darkMode ? 'bg-[#0A0F18] text-slate-100' : 'bg-[#F5F7FA] text-slate-900';
  const cardBg = darkMode ? 'bg-[#111827] border-slate-800/90 text-slate-100' : 'bg-white border-slate-200/90 text-slate-900';
  const subCardBg = darkMode ? 'bg-slate-900/90 border-slate-800 text-slate-200' : 'bg-slate-50/90 border-slate-200/80 text-slate-800';
  const mutedText = darkMode ? 'text-slate-400' : 'text-slate-500';
  const inputCls = `w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:border-emerald-500 ${
    darkMode ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
  }`;
  const sideBg = darkMode ? 'bg-[#0C121C] border-slate-800/80 text-slate-100' : 'bg-white border-slate-200 text-slate-900';
  const firstName = (user.name || '').trim().split(/\s+/)[0] || '';

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#0A0F18] text-slate-200 p-6 text-center">
        <p className="font-semibold">Could not load your data.</p>
        <p className="text-sm text-slate-400">Saving is paused so nothing gets overwritten. Check the server and try again.</p>
        <div className="flex gap-2">
          <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold cursor-pointer">Retry</button>
          <button onClick={onLogout} className="px-4 py-2 rounded-lg border border-slate-700 text-sm font-semibold cursor-pointer">Sign out</button>
        </div>
      </div>
    );
  }
  if (!dataLoaded) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0A0F18] text-emerald-400 text-sm">Loading your dairy…</div>;
  }

  // The same sidebar is used on desktop (fixed) and mobile (slide-in drawer)
  const sidebar = (
    <div className="flex flex-col h-full">
      <button
        onClick={() => { setActiveTab('home'); setIsDrawerOpen(false); }}
        className="px-5 pt-6 pb-5 flex items-center gap-3 text-left cursor-pointer"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Milk className="w-5 h-5 text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-black tracking-tight">{t.appName}</div>
          <div className={`text-[11px] ${mutedText}`}>{t.appSub}</div>
        </div>
      </button>

      <nav className="px-3 space-y-1 flex-1 overflow-y-auto" aria-label="Main">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsDrawerOpen(false); }}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full px-3 py-2.5 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer text-sm ${
                isActive
                  ? darkMode ? 'bg-emerald-500/12 text-emerald-300 font-semibold' : 'bg-emerald-50 text-emerald-700 font-semibold'
                  : darkMode ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon className="w-[18px] h-[18px]" />
                <span>{item.label}</span>
              </span>
              {item.badge && (
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                  isActive ? 'bg-emerald-500/20' : darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                }`}>{item.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className={`p-3 space-y-3 border-t ${darkMode ? 'border-slate-800/80' : 'border-slate-200'}`}>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => { if (isSpeaking) { stopSpeaking(); setIsSpeaking(false); } setAutoSpeak((p) => !p); }}
            title={tr('Vaani speaks replies', 'वाणी जवाब बोलकर सुनाती है')}
            aria-pressed={autoSpeak}
            className={`py-2 rounded-xl border flex items-center justify-center cursor-pointer ${
              autoSpeak ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : darkMode ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
            }`}
          >
            {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setDarkMode((p) => !p)}
            title={tr('Switch theme', 'थीम बदलें')}
            className={`py-2 rounded-xl border flex items-center justify-center cursor-pointer ${darkMode ? 'border-slate-800 text-slate-300 hover:bg-slate-800/60' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => { stopSpeaking(); setIsSpeaking(false); setLang((p) => (p === 'hi' ? 'en' : 'hi')); }}
            title={tr('Switch language', 'भाषा बदलें')}
            className={`py-2 rounded-xl border flex items-center justify-center gap-1 text-xs font-bold cursor-pointer ${darkMode ? 'border-slate-800 text-slate-200 hover:bg-slate-800/60' : 'border-slate-200 text-slate-700 hover:bg-slate-100'}`}
          >
            <Languages className="w-3.5 h-3.5 text-emerald-400" />
            {t.langToggle}
          </button>
        </div>

        <div className={`flex items-center gap-2.5 p-2.5 rounded-xl ${darkMode ? 'bg-slate-900/70' : 'bg-slate-50'}`}>
          <button
            type="button"
            onClick={openProfile}
            title={tr('Edit sign-in email / mobile number', 'साइन-इन ईमेल / मोबाइल नंबर बदलें')}
            className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer rounded-lg"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-sm font-bold shrink-0">
              {(user.name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-xs font-semibold truncate">{user.business_name || user.name}</div>
              <div className={`text-[10px] truncate ${mutedText}`}>{user.email || (user.phone ? `+91 ${user.phone}` : '')}</div>
            </div>
          </button>
          <button
            onClick={onLogout}
            aria-label={tr('Sign out', 'साइन आउट')}
            title={tr('Sign out', 'साइन आउट')}
            className={`p-1.5 rounded-lg cursor-pointer ${darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'}`}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${bgMain} font-sans transition-colors duration-200 selection:bg-emerald-500 selection:text-slate-950`}>
      {/* ==========================================
          DIGITAL MILK COLLECTION RECEIPT MODAL
      ========================================== */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white text-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Milk className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">GAUVAANI AMRIT ERP</h3>
                  <p className="text-[11px] text-slate-500">Batch Settlement Receipt</p>
                </div>
              </div>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-2 text-xs border-b border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Receipt ID:</span>
                <span className="font-mono font-semibold">#GA-{milkQty}9 • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Supplier:</span>
                <span className="font-semibold">{farmerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Category & Volume:</span>
                <span className="font-semibold uppercase">
                  {cattleType} • {milkQty} L
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-center">
                  <div className="text-[10px] text-slate-500">FAT / SNF</div>
                  <div className="font-bold text-xs text-slate-900">
                    {fat}% / {snf}%
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-center">
                  <div className="text-[10px] text-slate-500">CLR / pH</div>
                  <div className="font-bold text-xs text-slate-900">
                    {clr} / {ph}
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-center">
                  <div className="text-[10px] text-slate-500">TEMP / SAFE</div>
                  <div className="font-bold text-xs text-sky-700">
                    {temp}°C / {milkAnalysis.predictedSafeHours}h
                  </div>
                </div>
              </div>
            </div>

            <div className="py-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Quality Grade:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                  Grade {milkAnalysis.grade} ({milkAnalysis.purityStatus})
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Unit Rate:</span>
                <span className="font-bold text-slate-900">₹{milkAnalysis.ratePerLiter} / L</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-900">Net Payable:</span>
                <span className="text-lg font-black text-emerald-600">
                  ₹{milkAnalysis.totalPayout.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="mt-2 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
              <button
                onClick={() => {
                  handleSaveMilkBatch();
                  setShowReceiptModal(false);
                }}
                className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Save to Ledger</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          SIGN-IN DETAILS EDITOR
      ========================================== */}
      {profileOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-title"
          onKeyDown={(e) => { if (e.key === 'Escape') setProfileOpen(false); }}
        >
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs" onClick={() => setProfileOpen(false)} />
          <form onSubmit={handleSaveProfile} noValidate className={`relative w-full max-w-sm rounded-2xl border p-5 shadow-2xl space-y-4 ${cardBg}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="profile-title" className="text-base font-bold">{tr('Sign-in details', 'साइन-इन विवरण')}</h2>
                <p className={`text-xs mt-1 ${mutedText}`}>
                  {tr('Add your mobile number to sign in with it. You can use either the email or the mobile number.', 'मोबाइल नंबर जोड़ें ताकि उससे साइन इन कर सकें। ईमेल या मोबाइल, दोनों में से कोई भी चलेगा।')}
                </p>
              </div>
              <button type="button" onClick={() => setProfileOpen(false)} aria-label={tr('Close', 'बंद करें')} className={`p-1.5 rounded-lg cursor-pointer ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <label className="block">
              <span className={`flex items-center gap-1.5 text-[11px] font-semibold mb-1 ${mutedText}`}><Mail className="w-3.5 h-3.5" />{tr('Email address', 'ईमेल पता')}</span>
              <input type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} autoComplete="email" placeholder="name@example.com" className={inputCls} />
            </label>
            <label className="block">
              <span className={`flex items-center gap-1.5 text-[11px] font-semibold mb-1 ${mutedText}`}><Phone className="w-3.5 h-3.5" />{tr('Mobile number (10 digits)', 'मोबाइल नंबर (10 अंक)')}</span>
              <input type="tel" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} autoComplete="tel" placeholder="98765 43210" autoFocus className={inputCls} />
            </label>

            <div aria-live="polite" role="status">
              {profileMsg && (
                <p className={`text-xs ${profileMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{profileMsg.text}</p>
              )}
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={profileBusy} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold text-sm cursor-pointer">
                {profileBusy ? tr('Saving…', 'सेव हो रहा है…') : tr('Save', 'सेव करें')}
              </button>
              <button type="button" onClick={() => setProfileOpen(false)} className={`px-4 py-2.5 rounded-xl border text-sm font-semibold cursor-pointer ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'}`}>
                {tr('Close', 'बंद करें')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==========================================
          LEFT SIDEBAR (desktop) + DRAWER & TOP BAR (mobile)
      ========================================== */}
      <aside className={`hidden lg:block fixed inset-y-0 left-0 w-64 border-r z-30 ${sideBg}`}>{sidebar}</aside>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs" onClick={() => setIsDrawerOpen(false)} />
          <div className={`relative w-72 max-w-[85vw] h-full shadow-2xl border-r z-10 ${sideBg}`}>
            <button
              onClick={() => setIsDrawerOpen(false)}
              aria-label="Close menu"
              className={`absolute top-4 right-3 p-1.5 rounded-lg cursor-pointer ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
            >
              <X className="w-4 h-4" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <header className={`lg:hidden sticky top-0 z-30 border-b backdrop-blur-md ${darkMode ? 'bg-[#0A0F18]/90 border-slate-800/90' : 'bg-white/95 border-slate-200'}`}>
        <div className="px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open menu"
            className={`p-2 rounded-lg border cursor-pointer ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}
          >
            <Menu className="w-4 h-4" />
          </button>
          <button onClick={() => setActiveTab('home')} className="flex items-center gap-2 cursor-pointer">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <Milk className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-black tracking-tight">{t.appName}</span>
          </button>
          <button onClick={() => setActiveTab('home')} aria-label="Vaani" className="p-1 cursor-pointer">
            <VaaniOrb size={28} active={isAiThinking || isSpeaking} />
          </button>
        </div>
      </header>

      <div className="lg:pl-64">
        <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6 pb-16 space-y-5">
        {/* ==========================================
            HOME: VAANI CHAT ON TOP, THEN OVERVIEW
        ========================================== */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* ---------- Vaani chat ---------- */}
            <section
              aria-label="Vaani assistant"
              className={`rounded-3xl border overflow-hidden shadow-sm ${
                darkMode
                  ? 'bg-gradient-to-b from-[#101C2C] via-[#0E1623] to-[#0B121D] border-slate-800'
                  : 'bg-gradient-to-b from-white via-white to-emerald-50/50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between px-5 pt-4">
                <div className="flex items-center gap-2.5">
                  <VaaniOrb size={26} active={isAiThinking || isSpeaking || isListening} />
                  <div className="leading-tight">
                    <div className="text-sm font-bold">{tr('Vaani', 'वाणी')}</div>
                    <div className={`text-[11px] ${mutedText}`}>{tr('Your dairy assistant', 'आपकी डेयरी सहायक')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {isSpeaking && (
                    <button
                      onClick={() => { stopSpeaking(); setIsSpeaking(false); }}
                      className="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-emerald-500/30 text-emerald-400 flex items-center gap-1 cursor-pointer"
                    >
                      <VolumeX className="w-3 h-3" /> {tr('Stop', 'रोकें')}
                    </button>
                  )}
                  {chatMessages.length > 0 && (
                    <button
                      onClick={startNewChat}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1 cursor-pointer ${darkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}
                    >
                      <RotateCcw className="w-3 h-3" /> {tr('New chat', 'नई बातचीत')}
                    </button>
                  )}
                </div>
              </div>

              {chatMessages.length === 0 ? (
                <div className="px-5 pt-8 pb-2 flex flex-col items-center text-center">
                  <VaaniOrb size={64} active={isListening} />
                  <h1 className="mt-5 text-2xl sm:text-3xl font-bold tracking-tight">
                    {tr('Hello', 'नमस्ते')}
                    {firstName && (
                      <>
                        {' '}
                        <span className="bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-transparent">{firstName}</span>
                      </>
                    )}
                    {lang === 'hi' ? ' जी' : ''}
                  </h1>
                  <p className={`mt-2 text-sm sm:text-base max-w-md ${mutedText}`}>
                    {tr(
                      "I'm Vaani. Tell me what happened on the farm today and I'll write it down, or ask me anything about your dairy.",
                      'मैं वाणी हूँ। आज डेयरी में क्या हुआ बताइए, मैं लिख लूँगी। या अपनी डेयरी के बारे में कुछ भी पूछिए।'
                    )}
                  </p>
                </div>
              ) : (
                <div ref={threadRef} className="px-4 sm:px-6 pt-4 pb-2 max-h-[440px] overflow-y-auto space-y-4" aria-live="polite">
                  {chatMessages.map((msg) => {
                    if (msg.role === 'user') {
                      return (
                        <div key={msg.id} className="flex justify-end">
                          <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 bg-emerald-600 text-white text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {msg.text}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={msg.id} className="flex items-start gap-2.5">
                        <div className="mt-1"><VaaniOrb size={24} /></div>
                        <div className="min-w-0 max-w-[88%] space-y-2">
                          <div className={`rounded-2xl rounded-tl-md px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words border ${subCardBg}`}>
                            {msg.text}
                          </div>
                          {msg.outcomes && msg.outcomes.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                              {msg.outcomes.map((o, i) => (
                                <div
                                  key={i}
                                  className={`flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg border text-[12px] leading-snug ${
                                    o.ok
                                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                                      : 'bg-amber-500/10 border-amber-500/25 text-amber-500'
                                  }`}
                                >
                                  {o.ok ? <CheckCircle2 className="w-3.5 h-3.5 mt-px shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />}
                                  <span>{msg.hi ? o.msg.hi : o.msg.en}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {msg.retry && !isAiThinking && (
                              <button
                                onClick={() => processAiCommand(msg.retry!, msg.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" /> {tr('Try again', 'फिर कोशिश करें')}
                              </button>
                            )}
                            {undoMsgId === msg.id && (
                              <button
                                onClick={() => handleUndo(msg.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-amber-500/40 text-amber-500 hover:bg-amber-500/10 cursor-pointer"
                              >
                                <Undo2 className="w-3 h-3" /> {tr('Undo', 'वापस करें')}
                              </button>
                            )}
                            {msg.tab && msg.tab !== 'home' && (
                              <button
                                onClick={() => setActiveTab(msg.tab!)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                              >
                                {tr('Open page', 'पेज खोलें')} <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={() => speakText(msg.text)}
                              aria-label={t.listenBtn}
                              title={t.listenBtn}
                              className={`p-1.5 rounded-full cursor-pointer ${mutedText} hover:text-emerald-400`}
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {isAiThinking && (
                    <div className="flex items-center gap-2.5">
                      <VaaniOrb size={24} active />
                      <div className={`flex items-center gap-1.5 text-xs ${mutedText}`}>
                        <span className="flex gap-1" aria-hidden="true">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:120ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:240ms]" />
                        </span>
                        {aiSlow
                          ? tr('Still thinking… the AI is a little slow right now.', 'अभी भी सोच रही हूँ… AI थोड़ा धीमा चल रहा है।')
                          : tr('Thinking…', 'सोच रही हूँ…')}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Composer */}
              <div className="px-4 sm:px-6 pt-3 pb-5">
                <form
                  onSubmit={(e) => { e.preventDefault(); processAiCommand(aiInput); }}
                  className={`flex items-center gap-2 rounded-2xl border pl-4 pr-2 py-2 shadow-sm transition ${
                    darkMode
                      ? 'bg-slate-900/80 border-slate-700/70 focus-within:border-emerald-500/60'
                      : 'bg-white border-slate-300 focus-within:border-emerald-500'
                  }`}
                >
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    maxLength={1500}
                    aria-label={tr('Message Vaani', 'वाणी को संदेश')}
                    placeholder={isListening ? tr('Listening…', 'सुन रही हूँ…') : tr('Message Vaani…  e.g. "Evening milk was 9 litres"', 'वाणी से कहिए…  जैसे "शाम का दूध 9 लीटर था"')}
                    className={`flex-1 min-w-0 bg-transparent text-sm sm:text-[15px] py-1.5 focus:outline-none ${darkMode ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
                  />
                  <button
                    type="button"
                    onClick={handleVoiceMicToggle}
                    aria-label={isListening ? tr('Stop listening', 'सुनना रोकें') : t.home.micStart}
                    className={`p-2.5 rounded-xl cursor-pointer transition ${
                      isListening ? 'bg-red-600 text-white animate-pulse' : darkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {isListening ? <MicOff className="w-[18px] h-[18px]" /> : <Mic className="w-[18px] h-[18px]" />}
                  </button>
                  <button
                    type="submit"
                    disabled={isAiThinking || !aiInput.trim()}
                    aria-label={t.home.sendBtn}
                    className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <Send className="w-[18px] h-[18px]" />
                  </button>
                </form>

                {chatMessages.length === 0 && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SUGGESTIONS.map((s) => {
                      const Icon = s.icon === 'plus' ? Plus : s.icon === 'trend' ? TrendingUp : s.icon === 'box' ? Package : Thermometer;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => (s.send ? processAiCommand(lang === 'hi' ? s.textHi : s.textEn) : setAiInput(lang === 'hi' ? s.textHi : s.textEn))}
                          className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left text-sm transition cursor-pointer ${
                            darkMode ? 'bg-slate-900/50 border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900' : 'bg-white border-slate-200 hover:border-emerald-400'
                          }`}
                        >
                          <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4" />
                          </span>
                          <span className="font-medium">{lang === 'hi' ? s.labelHi : s.labelEn}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className={`mt-3 text-center text-[11px] ${mutedText}`}>
                  {tr(
                    'Vaani can add, change or remove your records when you ask. Every change can be undone.',
                    'कहने पर वाणी आपके रिकॉर्ड जोड़, बदल या हटा सकती है। हर बदलाव वापस किया जा सकता है।'
                  )}
                </p>
              </div>
            </section>

            {/* ---------- KPI strip ---------- */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <button onClick={() => setActiveTab('charts')} className={`${cardBg} rounded-2xl p-4 border text-left hover:border-emerald-500/40 transition cursor-pointer`}>
                <div className="flex items-center justify-between">
                  <p className={`text-[11px] font-semibold uppercase tracking-wider ${mutedText}`}>{tr("Today's milk", 'आज का दूध')}</p>
                  <span className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center"><Droplets className="w-4 h-4" /></span>
                </div>
                <p className="mt-2 text-2xl font-bold">{todayTotals ? todayTotals.produced : dailyYield} <span className="text-sm font-semibold">L</span></p>
                <p className={`text-[11px] mt-0.5 ${mutedText}`}>{todayTotals ? tr('Recorded today', 'आज दर्ज') : tr('Estimate · not recorded yet', 'अनुमान · अभी दर्ज नहीं')}</p>
              </button>

              <button onClick={() => setActiveTab('charts')} className={`${cardBg} rounded-2xl p-4 border text-left hover:border-emerald-500/40 transition cursor-pointer`}>
                <div className="flex items-center justify-between">
                  <p className={`text-[11px] font-semibold uppercase tracking-wider ${mutedText}`}>{tr("Today's profit / loss", 'आज का मुनाफा / घाटा')}</p>
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${todayTotals && todayTotals.profit < 0 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {todayTotals && todayTotals.profit < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                  </span>
                </div>
                {todayTotals ? (
                  <p className={`mt-2 text-2xl font-bold ${todayTotals.profit < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {todayTotals.profit < 0 ? '−' : '+'}₹{Math.abs(Math.round(todayTotals.profit)).toLocaleString('en-IN')}
                  </p>
                ) : (
                  <p className={`mt-2 text-2xl font-bold ${mutedText}`}>—</p>
                )}
                <p className={`text-[11px] mt-0.5 ${mutedText}`}>{todayTotals ? (todayTotals.profit < 0 ? tr('Loss', 'घाटा') : tr('Profit', 'मुनाफा')) : tr('Tell Vaani today’s numbers', 'वाणी को आज के आँकड़े बताइए')}</p>
              </button>

              <button onClick={() => setActiveTab('charts')} className={`${cardBg} rounded-2xl p-4 border text-left hover:border-emerald-500/40 transition cursor-pointer`}>
                <div className="flex items-center justify-between">
                  <p className={`text-[11px] font-semibold uppercase tracking-wider ${mutedText}`}>{t.kpis.monthlyProfit}</p>
                  <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center"><IndianRupee className="w-4 h-4" /></span>
                </div>
                <p className={`mt-2 text-2xl font-bold ${latestMonthPnl.profit < 0 ? 'text-red-400' : ''}`}>₹{latestMonthPnl.profit.toLocaleString('en-IN')}</p>
                <p className={`text-[11px] mt-0.5 ${mutedText}`}>{latestMonthPnl.month}</p>
              </button>

              <button onClick={() => setActiveTab('khata')} className={`${cardBg} rounded-2xl p-4 border text-left hover:border-amber-500/40 transition cursor-pointer`}>
                <div className="flex items-center justify-between">
                  <p className={`text-[11px] font-semibold uppercase tracking-wider ${mutedText}`}>{t.kpis.pendingLoans}</p>
                  <span className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center"><Wallet className="w-4 h-4" /></span>
                </div>
                <p className="mt-2 text-2xl font-bold text-amber-400">₹{loanSummary.totalPending.toLocaleString('en-IN')}</p>
                <p className={`text-[11px] mt-0.5 ${mutedText}`}>{loans.length} {tr('accounts', 'खाते')}</p>
              </button>
            </div>

            {/* ---------- 7-day chart + side cards ---------- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className={`lg:col-span-8 ${cardBg} rounded-2xl border p-5`}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-emerald-400" /> {tr('Last 7 days', 'पिछले 7 दिन')}
                  </h2>
                  <button onClick={() => setActiveTab('charts')} className="text-[11px] font-semibold text-emerald-400 hover:underline cursor-pointer">
                    {tr('Daily records', 'रोज़ का हिसाब')} →
                  </button>
                </div>
                {dailyRecords.length === 0 ? (
                  <div className={`h-52 flex flex-col items-center justify-center text-center text-sm ${mutedText}`}>
                    <Droplets className="w-6 h-6 mb-2 text-emerald-400/70" />
                    {tr('No daily records yet. Tell Vaani how much milk you got today.', 'अभी कोई रोज़ का रिकॉर्ड नहीं। वाणी को बताइए आज कितना दूध मिला।')}
                  </div>
                ) : (
                  <div className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={last7} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#1e293b' : '#e2e8f0'} vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} />
                        <YAxis yAxisId="l" tick={{ fontSize: 10, fill: '#64748b' }} />
                        <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10, fill: '#64748b' }} />
                        <ReferenceLine yAxisId="r" y={0} stroke="#64748b" strokeDasharray="2 2" />
                        <Tooltip contentStyle={{ backgroundColor: darkMode ? '#0f172a' : '#fff', borderRadius: 10, border: '1px solid #334155', fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar yAxisId="l" dataKey="produced" name={tr('Milk (L)', 'दूध (L)')} fill="#38bdf8" radius={[4, 4, 0, 0]} />
                        <Line yAxisId="r" type="monotone" dataKey="profit" name={tr('Profit / loss (₹)', 'मुनाफा / घाटा (₹)')} stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="lg:col-span-4 space-y-4">
                <div className={`${cardBg} rounded-2xl border p-4`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${mutedText}`}>{t.tabs.lab}</span>
                    <span className="text-xs font-mono font-semibold text-sky-400">{temp}°C · {milkAnalysis.predictedSafeHours}h</span>
                  </div>
                  <p className="text-sm font-bold">{milkAnalysis.gradeLabel} — ₹{milkAnalysis.ratePerLiter}/L</p>
                  <p className={`text-xs mt-1 ${mutedText}`}>Fat {fat}% · SNF {snf}% · CLR {clr} · pH {ph}</p>
                  <button onClick={() => setActiveTab('lab')} className="mt-2 text-[11px] font-semibold text-emerald-400 hover:underline cursor-pointer">{t.tabs.lab} →</button>
                </div>

                <div className={`${cardBg} rounded-2xl border p-4`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${mutedText}`}>{t.tabs.inventory}</span>
                    <span className={`text-xs font-mono font-semibold ${lowStockItems.length ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {lowStockItems.length ? `${lowStockItems.length} ${tr('low', 'कम')}` : 'OK'}
                    </span>
                  </div>
                  <p className="text-sm font-bold">
                    {lowStockItems.length ? lowStockItems.map((i) => (lang === 'hi' ? i.nameHi : i.nameEn)).slice(0, 2).join(', ') : t.inventory.goodStock}
                  </p>
                  <button onClick={() => setActiveTab('inventory')} className="mt-2 text-[11px] font-semibold text-emerald-400 hover:underline cursor-pointer">{t.tabs.inventory} →</button>
                </div>

                <div className={`${cardBg} rounded-2xl border p-4`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${mutedText}`}>{t.tabs.cattle}</span>
                    <span className={`text-xs font-mono font-semibold ${cattleStats.attention || cattleStats.due ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {cattleStats.total ? `${cattleStats.total} ${tr('animals', 'पशु')}` : '—'}
                    </span>
                  </div>
                  <p className="text-sm font-bold">
                    {cattleStats.total === 0
                      ? tr('No cattle recorded yet', 'अभी कोई पशु दर्ज नहीं')
                      : cattleStats.attention || cattleStats.due
                        ? `${cattleStats.attention} ${tr('need attention', 'को ध्यान चाहिए')} · ${cattleStats.due} ${tr('checkups due', 'जाँच बाकी')}`
                        : tr('All healthy', 'सभी स्वस्थ')}
                  </p>
                  <button onClick={() => setActiveTab('cattle')} className="mt-2 text-[11px] font-semibold text-emerald-400 hover:underline cursor-pointer">{t.tabs.cattle} →</button>
                </div>

                <div className={`${cardBg} rounded-2xl border p-4`}>
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${mutedText}`}>{tr('Farm profile', 'फार्म प्रोफाइल')}</span>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {([
                      [tr('Animals', 'पशु'), cattleCount, setCattleCount, cattle.length > 0],
                      [tr('L / day', 'L / दिन'), dailyYield, setDailyYield, false],
                      [tr('Cooler L', 'कूलर L'), chillingCap, setChillingCap, false]
                    ] as [string, number, (n: number) => void, boolean][]).map(([label, value, setter, locked]) => (
                      <label key={label} className="block">
                        <span className={`block text-[10px] mb-0.5 ${mutedText}`}>{label}</span>
                        <input
                          type="number"
                          min={0}
                          value={value}
                          disabled={locked}
                          title={locked ? tr('Counted from your cattle records', 'पशु रिकॉर्ड से गिना गया') : undefined}
                          onChange={(e) => setter(Math.max(0, Number(e.target.value) || 0))}
                          className={`w-full px-2 py-1.5 rounded-lg border text-xs font-mono focus:outline-none focus:border-emerald-500 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'}`}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 1: MILK LAB, IOT PROBE & SHELF-LIFE AI
        ========================================== */}
        {activeTab === 'lab' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Controls */}
              <div className={`lg:col-span-7 ${cardBg} rounded-xl border p-5`}>
                <div className="border-b border-slate-800/60 pb-3.5 mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <Milk className="w-4 h-4 text-emerald-400" />
                    {t.lab.title}
                  </h2>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSimulateIotProbe}
                      disabled={isSimulatingIot}
                      className="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Wifi className={`w-3.5 h-3.5 ${isSimulatingIot ? 'animate-spin' : ''}`} />
                      <span>{isSimulatingIot ? t.lab.iotSimulating : t.lab.iotSimulateBtn}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowReceiptModal(true)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{t.lab.receiptBtn}</span>
                    </button>
                  </div>
                </div>

                {/* Supplier & Cattle Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="sm:col-span-2">
                    <label className={`block text-[11px] font-semibold ${mutedText} mb-1`}>
                      {t.lab.farmerName}
                    </label>
                    <input
                      type="text"
                      value={farmerName}
                      onChange={(e) => setFarmerName(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-lg border text-xs font-semibold focus:outline-none focus:border-emerald-500 ${
                        darkMode
                          ? 'bg-slate-900 border-slate-800 text-white'
                          : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[11px] font-semibold ${mutedText} mb-1`}>
                      {t.lab.cattleType}
                    </label>
                    <div
                      className={`grid grid-cols-2 gap-1 p-1 rounded-lg ${
                        darkMode ? 'bg-slate-900' : 'bg-slate-100'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setCattleType('cow');
                          setFat(4.2);
                          setSnf(8.5);
                        }}
                        className={`py-1 rounded text-xs font-semibold cursor-pointer ${
                          cattleType === 'cow' ? 'bg-emerald-600 text-white' : mutedText
                        }`}
                      >
                        {t.lab.cow}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCattleType('buffalo');
                          setFat(6.4);
                          setSnf(9.0);
                        }}
                        className={`py-1 rounded text-xs font-semibold cursor-pointer ${
                          cattleType === 'buffalo' ? 'bg-emerald-600 text-white' : mutedText
                        }`}
                      >
                        {t.lab.buffalo}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Parameter Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className={`${subCardBg} p-3 rounded-lg border`}>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span>{t.lab.quantity}</span>
                      <span className="font-mono text-emerald-400">{milkQty} L</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="200"
                      step="1"
                      value={milkQty}
                      onChange={(e) => setMilkQty(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div className={`${subCardBg} p-3 rounded-lg border`}>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span>{t.lab.fat}</span>
                      <span className="font-mono text-emerald-400">{fat}%</span>
                    </div>
                    <input
                      type="range"
                      min="2.5"
                      max="9.0"
                      step="0.1"
                      value={fat}
                      onChange={(e) => setFat(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div className={`${subCardBg} p-3 rounded-lg border`}>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span>{t.lab.snf}</span>
                      <span className="font-mono text-emerald-400">{snf}%</span>
                    </div>
                    <input
                      type="range"
                      min="6.5"
                      max="10.5"
                      step="0.1"
                      value={snf}
                      onChange={(e) => setSnf(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div className={`${subCardBg} p-3 rounded-lg border`}>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span>{t.lab.clr}</span>
                      <span className={`font-mono ${clr < 25 ? 'text-amber-400' : 'text-sky-400'}`}>
                        {clr}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="18"
                      max="34"
                      step="0.5"
                      value={clr}
                      onChange={(e) => setClr(Number(e.target.value))}
                      className="w-full accent-sky-500 cursor-pointer"
                    />
                  </div>

                  <div className={`${subCardBg} p-3 rounded-lg border`}>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span>{t.lab.ph}</span>
                      <span
                        className={`font-mono ${
                          ph < 6.45 || ph > 6.8 ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        {ph}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5.8"
                      max="7.4"
                      step="0.02"
                      value={ph}
                      onChange={(e) => setPh(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div className={`${subCardBg} p-3 rounded-lg border`}>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span>{t.lab.temp}</span>
                      <span className={`font-mono ${temp > 15 ? 'text-amber-400' : 'text-sky-400'}`}>
                        {temp}°C
                      </span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="38"
                      step="1"
                      value={temp}
                      onChange={(e) => setTemp(Number(e.target.value))}
                      className="w-full accent-sky-500 cursor-pointer"
                    />
                  </div>

                  <div className={`sm:col-span-2 ${subCardBg} p-3 rounded-lg border`}>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span>{t.lab.targetHours}</span>
                      <span className="font-mono text-sky-400">
                        {targetHours} {t.lab.results.hours}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="48"
                      step="2"
                      value={targetHours}
                      onChange={(e) => setTargetHours(Number(e.target.value))}
                      className="w-full accent-sky-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* 5-Parameter Adulteration Strip Tests */}
                <div className="mt-4 pt-4 border-t border-slate-800/60">
                  <label className={`block text-[11px] font-semibold uppercase tracking-wider ${mutedText} mb-2.5`}>
                    {t.lab.stripTests}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { key: 'urea' as const, label: t.lab.urea },
                      { key: 'starch' as const, label: t.lab.starch },
                      { key: 'detergent' as const, label: t.lab.detergent },
                      { key: 'neutralizer' as const, label: t.lab.neutralizer },
                      { key: 'peroxide' as const, label: t.lab.peroxide }
                    ].map((item) => {
                      const isPositive = strips[item.key];
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => toggleStrip(item.key)}
                          className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                            isPositive
                              ? 'bg-red-500/15 border-red-500/50 text-red-300'
                              : `${subCardBg} hover:border-emerald-500/40`
                          }`}
                        >
                          <div className="text-xs font-semibold truncate">{item.label}</div>
                          <div className="mt-1 flex items-center gap-1 text-[11px] font-medium">
                            {isPositive ? (
                              <>
                                <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                                <span className="text-red-400">{t.lab.detected}</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span className="text-emerald-400">{t.lab.clean}</span>
                              </>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveMilkBatch}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{t.lab.saveBatchBtn}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRunLiveGemmaAnalysis}
                      disabled={isCallingGemma}
                      className={`px-4 py-2 rounded-lg border font-semibold text-xs flex items-center gap-1.5 cursor-pointer ${subCardBg} hover:border-emerald-500/50`}
                    >
                      <Sparkles className={`w-3.5 h-3.5 text-emerald-400 ${isCallingGemma ? 'animate-spin' : ''}`} />
                      <span>{isCallingGemma ? '...' : t.lab.askGemmaBtn}</span>
                    </button>
                  </div>

                  {batchSavedToast && (
                    <span className="text-xs font-semibold text-emerald-400">
                      ✓ {t.lab.savedSuccess}
                    </span>
                  )}
                </div>
              </div>

              {/* Right Column: Analytical Output */}
              <div className="lg:col-span-5 space-y-4">
                {/* Valuation Card */}
                <div className={`${cardBg} rounded-xl border p-4`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${mutedText}`}>
                      {t.lab.results.qualityTitle}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        milkAnalysis.grade === 'A+'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : milkAnalysis.grade === 'B'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-red-500/15 text-red-400'
                      }`}
                    >
                      {milkAnalysis.gradeLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className={`${subCardBg} p-3 rounded-lg border`}>
                      <span className={`text-[11px] ${mutedText} block`}>
                        {t.lab.results.ratePerLiter}
                      </span>
                      <span className="text-lg font-bold">₹{milkAnalysis.ratePerLiter}/L</span>
                    </div>
                    <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                      <span className="text-[11px] text-emerald-400 block">
                        {t.lab.results.totalPayout} ({milkQty}L)
                      </span>
                      <span className="text-lg font-bold text-emerald-400">
                        ₹{milkAnalysis.totalPayout.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Thermal & Shelf-Life Card */}
                <div className={`${cardBg} rounded-xl border p-4`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${mutedText}`}>
                      {t.lab.results.shelfLifeTitle}
                    </span>
                    <Thermometer className="w-4 h-4 text-sky-400" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className={`${subCardBg} p-3 rounded-lg border`}>
                      <span className={`text-[11px] ${mutedText} block`}>
                        {t.lab.results.safeFor} ({temp}°C)
                      </span>
                      <span className="text-lg font-bold text-sky-400">
                        {milkAnalysis.predictedSafeHours} {t.lab.results.hours}
                      </span>
                    </div>

                    <div className={`${subCardBg} p-3 rounded-lg border`}>
                      <span className={`text-[11px] ${mutedText} block`}>
                        {t.lab.results.reqTemp} ({targetHours}h)
                      </span>
                      <span className="text-lg font-bold text-indigo-400">
                        {milkAnalysis.requiredTemp}°C
                      </span>
                    </div>
                  </div>

                  {/* Decay Chart */}
                  <div className="h-32 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={milkAnalysis.decayCurveData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#1e293b' : '#e2e8f0'} />
                        <XAxis dataKey="tempLabel" tick={{ fontSize: 10, fill: '#64748b' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} unit="h" width={28} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '11px'
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="safeHours"
                          name="Safe Window (h)"
                          stroke="#38bdf8"
                          fill="#0284c7"
                          fillOpacity={0.25}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div
                    className={`mt-3 p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
                      milkAnalysis.predictedSafeHours <= 4
                        ? 'bg-red-500/10 border-red-500/30 text-red-300'
                        : milkAnalysis.needsImmediateCooling
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {milkAnalysis.predictedSafeHours <= 4
                        ? t.lab.results.boilAlert
                        : milkAnalysis.needsImmediateCooling
                        ? `${t.lab.results.coolingAction}: ${temp}°C → ${milkAnalysis.requiredTemp}°C`
                        : t.lab.results.tempSafe}
                    </span>
                  </div>
                </div>

                {/* Purity Card */}
                <div className={`${cardBg} rounded-xl border p-4`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${mutedText}`}>
                      {t.lab.results.purityTitle}
                    </span>
                    <span className={`text-[11px] font-mono ${mutedText}`}>
                      SG {(1 + clr / 1000).toFixed(3)}
                    </span>
                  </div>

                  <div
                    className={`p-3 rounded-lg border flex items-center gap-2.5 text-xs font-semibold ${
                      milkAnalysis.purityStatus === 'PURE'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : milkAnalysis.purityStatus === 'WATER'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}
                  >
                    {milkAnalysis.purityStatus === 'PURE' ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span>{milkAnalysis.purityMessage}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Gemma Advisory Strip */}
            <div className={`${cardBg} rounded-xl p-4 border`}>
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold">{t.lab.gemmaTitle}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRunLiveGemmaAnalysis}
                    disabled={isCallingGemma}
                    className={`p-1.5 rounded-lg border cursor-pointer ${subCardBg}`}
                    title="Refresh"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCallingGemma ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={handleSpeakAdvisory}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    <span>{isSpeaking ? t.stopBtn : t.listenBtn}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {milkAnalysis.gemmaAdvice.map((point, idx) => (
                  <div
                    key={idx}
                    className={`${subCardBg} border rounded-lg p-3 text-xs leading-relaxed flex items-start gap-2`}
                  >
                    <span className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            FINANCIALS: DAILY REGISTER + MONTHLY P&L + CREDIT
        ========================================== */}
        {activeTab === 'charts' && (() => {
          const monthName = new Date(Number(financeMonth.slice(0, 4)), Number(financeMonth.slice(5, 7)) - 1, 1)
            .toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { month: 'long', year: 'numeric' });
          const isEditing = dailyRecords.some((r) => r.date === draft.date);
          const money = (n: number) => `₹${Math.abs(Math.round(n)).toLocaleString('en-IN')}`;
          const plBadge = (p: number) => (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold ${
              p < 0 ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'
            }`}>
              {p < 0 ? '−' : '+'}{money(p)}
            </span>
          );
          const field = (key: keyof Draft, label: string, opts?: { ph?: string; step?: string }) => (
            <label className="block">
              <span className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>{label}</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step={opts?.step || 'any'}
                value={draft[key]}
                placeholder={opts?.ph ?? '0'}
                onChange={(e) => setDraftField(key, e.target.value)}
                className={inputCls}
              />
            </label>
          );

          return (
            <div className="space-y-5">
              {/* Header + month switcher */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold">{tr('Daily Production & Profit / Loss', 'रोज़ का उत्पादन व मुनाफा / घाटा')}</h1>
                  <p className={`text-sm ${mutedText}`}>{tr('Register every day’s milk and money here, or just tell Vaani.', 'हर दिन का दूध और पैसा यहाँ दर्ज कीजिए, या बस वाणी को बता दीजिए।')}</p>
                </div>
                <div className={`flex items-center gap-1 rounded-xl border p-1 ${cardBg}`}>
                  <button onClick={() => setFinanceMonth((m) => shiftMonth(m, -1))} aria-label={tr('Previous month', 'पिछला महीना')} className="p-2 rounded-lg hover:bg-emerald-500/10 cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="px-2 text-sm font-semibold min-w-[130px] text-center">{monthName}</span>
                  <button onClick={() => setFinanceMonth((m) => shiftMonth(m, 1))} aria-label={tr('Next month', 'अगला महीना')} className="p-2 rounded-lg hover:bg-emerald-500/10 cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>

              {/* Month summary */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className={`${cardBg} rounded-2xl border p-4`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wider ${mutedText}`}>{tr('Milk produced', 'कुल दूध')}</p>
                  <p className="mt-1.5 text-2xl font-bold">{Math.round(monthSummary.produced * 10) / 10} <span className="text-sm">L</span></p>
                  <p className={`text-[11px] ${mutedText}`}>{monthSummary.days} {tr('days', 'दिन')} · {tr('avg', 'औसत')} {Math.round(monthSummary.avg * 10) / 10} L</p>
                </div>
                <div className={`${cardBg} rounded-2xl border p-4`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wider ${mutedText}`}>{tr('Income', 'आय')}</p>
                  <p className="mt-1.5 text-2xl font-bold text-emerald-400">{money(monthSummary.revenue)}</p>
                  <p className={`text-[11px] ${mutedText}`}>{Math.round(monthSummary.sold * 10) / 10} L {tr('sold', 'बिका')}</p>
                </div>
                <div className={`${cardBg} rounded-2xl border p-4`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wider ${mutedText}`}>{tr('Expenses', 'खर्च')}</p>
                  <p className="mt-1.5 text-2xl font-bold text-red-400">{money(monthSummary.expense)}</p>
                  <p className={`text-[11px] ${mutedText}`}>{tr('feed, labour, medicine…', 'चारा, मज़दूरी, दवा…')}</p>
                </div>
                <div className={`${cardBg} rounded-2xl border p-4 ${monthSummary.days && monthSummary.profit < 0 ? 'border-red-500/40' : ''}`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wider ${mutedText}`}>
                    {monthSummary.profit < 0 ? tr('Net loss', 'कुल घाटा') : tr('Net profit', 'कुल मुनाफा')}
                  </p>
                  <p className={`mt-1.5 text-2xl font-bold ${monthSummary.profit < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {monthSummary.profit < 0 ? '−' : ''}{money(monthSummary.profit)}
                  </p>
                  <p className={`text-[11px] ${mutedText}`}>
                    {monthSummary.best ? `${tr('Best day', 'सबसे अच्छा दिन')}: ${prettyDate(monthSummary.best.date, lang)}` : '—'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Entry form */}
                <div ref={formRef} className={`lg:col-span-5 ${cardBg} rounded-2xl border p-5 scroll-mt-20`}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold flex items-center gap-2">
                      <Plus className="w-4 h-4 text-emerald-400" />
                      {isEditing ? tr('Edit this day', 'यह दिन बदलें') : tr('Add a day', 'दिन जोड़ें')}
                    </h2>
                    {isEditing && (
                      <button type="button" onClick={() => setDraft(blankDraft(todayStr(), draft.ratePerL))} className="text-[11px] font-semibold text-emerald-400 hover:underline cursor-pointer">
                        {tr('Start new', 'नया शुरू करें')}
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleSaveDaily} className="space-y-3">
                    <label className="block">
                      <span className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>{tr('Date', 'तारीख')}</span>
                      <input type="date" required value={draft.date} max={todayKey} onChange={(e) => e.target.value && handleDraftDate(e.target.value)} className={inputCls} />
                    </label>

                    <p className={`text-[11px] font-bold uppercase tracking-wider pt-1 ${mutedText}`}>{tr('Milk', 'दूध')}</p>
                    <div className="grid grid-cols-2 gap-3">
                      {field('morningL', tr('Morning (L)', 'सुबह (L)'))}
                      {field('eveningL', tr('Evening (L)', 'शाम (L)'))}
                      {field('soldL', tr('Sold (L)', 'बिका (L)'), { ph: draftPreview.produced ? String(draftPreview.produced) : tr('auto', 'अपने आप') })}
                      {field('ratePerL', tr('Rate per L (₹)', 'दर प्रति L (₹)'))}
                    </div>

                    <p className={`text-[11px] font-bold uppercase tracking-wider pt-1 ${mutedText}`}>{tr('Other income', 'अन्य आय')}</p>
                    {field('otherIncome', tr('Ghee, dung, calves… (₹)', 'घी, गोबर, बछड़े… (₹)'))}

                    <p className={`text-[11px] font-bold uppercase tracking-wider pt-1 ${mutedText}`}>{tr('Expenses', 'खर्च')}</p>
                    <div className="grid grid-cols-2 gap-3">
                      {field('feedCost', tr('Feed & fodder (₹)', 'चारा व दाना (₹)'))}
                      {field('labourCost', tr('Labour (₹)', 'मज़दूरी (₹)'))}
                      {field('medicineCost', tr('Medicine / vet (₹)', 'दवा / डॉक्टर (₹)'))}
                      {field('otherCost', tr('Other (₹)', 'अन्य (₹)'))}
                    </div>

                    <label className="block">
                      <span className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>{tr('Note (optional)', 'टिप्पणी (वैकल्पिक)')}</span>
                      <input type="text" maxLength={200} value={draft.note} onChange={(e) => setDraftField('note', e.target.value)} className={inputCls} />
                    </label>

                    {/* Live result */}
                    <div className={`rounded-xl border p-3 flex items-center justify-between ${
                      draftPreview.profit < 0 ? 'bg-red-500/5 border-red-500/30' : 'bg-emerald-500/5 border-emerald-500/30'
                    }`}>
                      <div className="text-xs leading-relaxed">
                        <div className={mutedText}>{draftPreview.produced} L · {tr('income', 'आय')} {money(draftPreview.revenue)} · {tr('cost', 'खर्च')} {money(draftPreview.expense)}</div>
                        <div className="font-semibold">{draftPreview.profit < 0 ? tr('Loss for the day', 'आज का घाटा') : tr('Profit for the day', 'आज का मुनाफा')}</div>
                      </div>
                      <div className={`text-xl font-bold ${draftPreview.profit < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {draftPreview.profit < 0 ? '−' : ''}{money(draftPreview.profit)}
                      </div>
                    </div>

                    <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer">
                      <CheckCircle2 className="w-4 h-4" />
                      {isEditing ? tr('Update record', 'रिकॉर्ड अपडेट करें') : tr('Save record', 'रिकॉर्ड सेव करें')}
                    </button>
                    {dailyToast && <p role="status" className="text-xs text-emerald-400 text-center">{dailyToast}</p>}
                  </form>
                </div>

                {/* Chart */}
                <div className={`lg:col-span-7 ${cardBg} rounded-2xl border p-5`}>
                  <h2 className="text-base font-bold flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    {tr('Milk and profit / loss by day', 'दिन के हिसाब से दूध व मुनाफा / घाटा')}
                  </h2>
                  {monthChart.length === 0 ? (
                    <div className={`h-80 flex flex-col items-center justify-center text-center text-sm ${mutedText}`}>
                      <CalendarDays className="w-7 h-7 mb-2 text-emerald-400/70" />
                      {tr(`No records for ${monthName} yet.`, `${monthName} का कोई रिकॉर्ड नहीं है।`)}
                    </div>
                  ) : (
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={monthChart} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#1e293b' : '#e2e8f0'} vertical={false} />
                          <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
                          <YAxis yAxisId="l" tick={{ fontSize: 11, fill: '#64748b' }} />
                          <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} />
                          <ReferenceLine yAxisId="r" y={0} stroke="#64748b" strokeDasharray="2 2" />
                          <Tooltip contentStyle={{ backgroundColor: darkMode ? '#0f172a' : '#fff', borderRadius: 10, border: '1px solid #334155', fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar yAxisId="l" dataKey="produced" name={tr('Milk (L)', 'दूध (L)')} fill="#38bdf8" radius={[4, 4, 0, 0]} />
                          <Line yAxisId="r" type="monotone" dataKey="profit" name={tr('Profit / loss (₹)', 'मुनाफा / घाटा (₹)')} stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              {/* Records table */}
              <div className={`${cardBg} rounded-2xl border p-5`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    {tr('Daily records', 'रोज़ के रिकॉर्ड')} · {monthName}
                  </h2>
                  <button
                    onClick={handleExportCsv}
                    disabled={monthRecords.length === 0}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${subCardBg}`}
                  >
                    <Download className="w-3.5 h-3.5" /> {tr('Export CSV', 'CSV निकालें')}
                  </button>
                </div>
                {monthRecords.length === 0 ? (
                  <p className={`text-sm py-6 text-center ${mutedText}`}>{tr('Nothing recorded for this month.', 'इस महीने कुछ दर्ज नहीं है।')}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[720px]">
                      <thead>
                        <tr className={`text-left ${mutedText} border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                          {[tr('Date', 'तारीख'), tr('Morning', 'सुबह'), tr('Evening', 'शाम'), tr('Sold', 'बिका'), tr('Rate', 'दर'), tr('Income', 'आय'), tr('Expense', 'खर्च'), tr('Profit / loss', 'मुनाफा / घाटा'), ''].map((h, i) => (
                            <th key={i} className="py-2 pr-3 font-semibold whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...monthRecords].reverse().map((r) => {
                          const x = recordTotals(r);
                          return (
                            <tr key={r.id} className={`border-b last:border-0 ${darkMode ? 'border-slate-800/70' : 'border-slate-100'}`}>
                              <td className="py-2.5 pr-3 font-semibold whitespace-nowrap">
                                {prettyDate(r.date, lang)}
                                {r.note && <div className={`font-normal text-[10px] max-w-[140px] truncate ${mutedText}`} title={r.note}>{r.note}</div>}
                              </td>
                              <td className="pr-3 font-mono">{r.morningL}</td>
                              <td className="pr-3 font-mono">{r.eveningL}</td>
                              <td className="pr-3 font-mono">{r.soldL}</td>
                              <td className="pr-3 font-mono">₹{r.ratePerL}</td>
                              <td className="pr-3 font-mono text-emerald-400">{money(x.revenue)}</td>
                              <td className="pr-3 font-mono text-red-400">{money(x.expense)}</td>
                              <td className="pr-3">{plBadge(x.profit)}</td>
                              <td className="text-right whitespace-nowrap">
                                <button onClick={() => handleEditDaily(r)} aria-label={tr('Edit', 'बदलें')} title={tr('Edit', 'बदलें')} className={`p-1.5 rounded-md cursor-pointer ${mutedText} hover:text-emerald-400`}><Pencil className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleDeleteDaily(r)} aria-label={tr('Delete', 'हटाएँ')} title={tr('Delete', 'हटाएँ')} className={`p-1.5 rounded-md cursor-pointer ${mutedText} hover:text-red-400`}><Trash2 className="w-3.5 h-3.5" /></button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Monthly overview (existing P&L + credit recovery) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className={`lg:col-span-8 ${cardBg} rounded-2xl border p-5`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <h2 className="text-base font-bold flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      {t.charts.pnlTitle}
                    </h2>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400">{t.charts.income}: ₹{latestMonthPnl.income.toLocaleString('en-IN')}</span>
                      <span className="px-2.5 py-1 rounded bg-red-500/10 text-red-400">{t.charts.expense}: ₹{latestMonthPnl.expense.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pnlData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#1e293b' : '#e2e8f0'} />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                        <Tooltip
                          formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`}
                          contentStyle={{ backgroundColor: darkMode ? '#0f172a' : '#ffffff', borderRadius: '8px', border: '1px solid #334155', fontSize: '12px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="income" name={t.charts.income} fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expense" name={t.charts.expense} fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="profit" name={t.charts.netProfit} fill="#38bdf8" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <form onSubmit={handleAddTransaction} className={`mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end ${darkMode ? 'border-slate-800/60' : 'border-slate-200'}`}>
                    <div>
                      <label className={`block text-[11px] font-semibold ${mutedText} mb-1`}>{t.charts.txType}</label>
                      <select value={newTxType} onChange={(e) => setNewTxType(e.target.value)} className={inputCls}>
                        <option value="income">{t.charts.txIncome}</option>
                        <option value="expense">{t.charts.txExpense}</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-[11px] font-semibold ${mutedText} mb-1`}>{t.charts.txAmount}</label>
                      <input type="number" min="100" step="100" value={newTxAmount} onChange={(e) => setNewTxAmount(Number(e.target.value))} className={inputCls} />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-semibold ${mutedText} mb-1`}>{t.charts.txNote}</label>
                      <input type="text" value={newTxNote} onChange={(e) => setNewTxNote(e.target.value)} placeholder="Ref..." className={inputCls} />
                    </div>
                    <button type="submit" className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-1 cursor-pointer">
                      <Plus className="w-4 h-4" />
                      <span>{t.charts.addTxBtn}</span>
                    </button>
                  </form>
                </div>

                <div className={`lg:col-span-4 ${cardBg} rounded-2xl border p-5 flex flex-col justify-between`}>
                  <div>
                    <h2 className="text-base font-bold flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-amber-400" />
                      {t.charts.loanChartTitle}
                    </h2>
                    <div className="h-56 w-full mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={loanSummary.pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                            {loanSummary.pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className={`space-y-2 pt-3 border-t ${darkMode ? 'border-slate-800/60' : 'border-slate-200'}`}>
                    {loans.slice(0, 3).map((loan) => {
                      const pct = loan.totalLoan > 0 ? Math.round((loan.recovered / loan.totalLoan) * 100) : 0;
                      return (
                        <div key={loan.id} className="text-xs">
                          <div className="flex justify-between font-semibold mb-1">
                            <span className="truncate max-w-[170px]">{lang === 'hi' ? loan.nameHi : loan.nameEn}</span>
                            <span className="font-mono text-emerald-400">{pct}%</span>
                          </div>
                          <div className={`w-full h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ==========================================
            TAB 3: CUSTOMER LOAN KHATA
        ========================================== */}
        {activeTab === 'khata' && (
          <div className={`${cardBg} rounded-xl border p-5 space-y-4`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800/60 pb-3.5">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                {t.khata.title}
              </h2>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder={t.khata.searchPlaceholder}
                    value={loanSearch}
                    onChange={(e) => setLoanSearch(e.target.value)}
                    className={`pl-8 pr-3 py-1.5 rounded-lg border text-xs ${
                      darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>

                <form onSubmit={handleAddNewLoan} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={lang === 'hi' ? 'नाम...' : 'Account name...'}
                    value={newLoanName}
                    onChange={(e) => setNewLoanName(e.target.value)}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs ${
                      darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    value={newLoanAmount}
                    onChange={(e) => setNewLoanAmount(Number(e.target.value))}
                    className={`w-24 px-2.5 py-1.5 rounded-lg border text-xs font-mono ${
                      darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.khata.addLoanBtn}</span>
                  </button>
                </form>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b border-slate-800/60 text-[11px] uppercase ${mutedText} font-semibold`}>
                    <th className="py-2.5 px-3">{t.khata.colName}</th>
                    <th className="py-2.5 px-3">{t.khata.colTotal}</th>
                    <th className="py-2.5 px-3">{t.khata.colPaid}</th>
                    <th className="py-2.5 px-3">{t.khata.colPending}</th>
                    <th className="py-2.5 px-3 w-44">{t.khata.colProgress}</th>
                    <th className="py-2.5 px-3 text-right">{t.khata.colAction}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-xs">
                  {filteredLoans.map((loan) => {
                    const pending = Math.max(0, loan.totalLoan - loan.recovered);
                    const pct = Math.round((loan.recovered / loan.totalLoan) * 100);
                    return (
                      <tr key={loan.id} className="hover:bg-slate-800/20">
                        <td className="py-3 px-3">
                          <div className="font-semibold">
                            {lang === 'hi' ? loan.nameHi : loan.nameEn}
                          </div>
                          <div className={`text-[11px] ${mutedText}`}>
                            {lang === 'hi' ? loan.purposeHi : loan.purposeEn}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold">
                          ₹{loan.totalLoan.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-emerald-400">
                          ₹{loan.recovered.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-amber-400">
                          ₹{pending.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px]">{pct}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {pending > 0 ? (
                            <button
                              onClick={() => handleDeductEmi(loan.id)}
                              className="px-3 py-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold cursor-pointer"
                            >
                              {t.khata.deductBtn}
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[11px] font-semibold">
                              <CheckCircle2 className="w-3 h-3" />
                              {t.khata.settled}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 4: SMART INVENTORY
        ========================================== */}
        {activeTab === 'inventory' && (
          <div className={`${cardBg} rounded-xl border p-5`}>
            <h2 className="text-base font-bold flex items-center gap-2 mb-4">
              <Package className="w-4 h-4 text-emerald-400" />
              {t.inventory.title}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inventory.map((item) => {
                const daysRemaining = Math.round((item.stock / item.dailyBurn) * 10) / 10;
                const isLow = daysRemaining < 5;
                return (
                  <div
                    key={item.id}
                    className={`rounded-xl p-4 border flex flex-col justify-between ${
                      isLow ? 'bg-red-500/5 border-red-500/30' : subCardBg
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-sm">
                          {lang === 'hi' ? item.nameHi : item.nameEn}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold shrink-0 ${
                            isLow
                              ? 'bg-red-500/20 text-red-300'
                              : 'bg-emerald-500/15 text-emerald-400'
                          }`}
                        >
                          {daysRemaining} {t.inventory.daysLeft}
                        </span>
                      </div>

                      <div className="mt-3 flex items-baseline justify-between">
                        <div>
                          <span className="text-2xl font-bold font-mono">{item.stock}</span>
                          <span className={`text-xs ${mutedText} ml-1`}>
                            {lang === 'hi' ? item.unitHi : item.unitEn}
                          </span>
                        </div>
                        <span className={`text-[11px] ${mutedText}`}>
                          {t.inventory.dailyUse} {item.dailyBurn}/d
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2.5">
                        <div
                          className={`h-full rounded-full ${
                            isLow ? 'bg-red-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, daysRemaining * 8)}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800/50">
                      <button
                        onClick={() => handleInventoryChange(item.id, -item.dailyBurn)}
                        className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                        <span>{t.inventory.consumeBtn}</span>
                      </button>
                      <button
                        onClick={() => handleInventoryChange(item.id, 50)}
                        className="py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{t.inventory.restockBtn}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==========================================
            CATTLE MANAGEMENT: RECORDS + HEALTH REPORTS
        ========================================== */}
        {activeTab === 'cattle' && (() => {
          const today = todayStr();
          const editing = editingCattleTag !== null;
          const locale = lang === 'hi' ? 'hi-IN' : 'en-IN';
          const fullDate = (s: string) => {
            if (!s) return '';
            const [y, m, d] = s.split('-').map(Number);
            return new Date(y, m - 1, d).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
          };
          const stLabel = (s: HealthStatus) => (lang === 'hi' ? STATUS_LABEL[s].hi : STATUS_LABEL[s].en);
          const kLabel = (k: CattleKind) => (lang === 'hi' ? KIND_LABEL[k].hi : KIND_LABEL[k].en);
          const statusBadge = (s: HealthStatus) => (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold ${STATUS_STYLE[s]}`}>{stLabel(s)}</span>
          );
          const one = (n: number, singular: string, plural: string) => (n === 1 ? singular : plural);
          const mix = ([
            [cattleStats.cow, tr(one(cattleStats.cow, 'cow', 'cows'), 'गाय')],
            [cattleStats.buffalo, tr(one(cattleStats.buffalo, 'buffalo', 'buffaloes'), 'भैंस')],
            [cattleStats.bull, tr(one(cattleStats.bull, 'bull', 'bulls'), 'सांड')],
            [cattleStats.calf, tr(one(cattleStats.calf, 'calf', 'calves'), 'बछड़े')]
          ] as [number, string][]).filter((x) => x[0] > 0).map((x) => `${x[0]} ${x[1]}`).join(' · ');
          const filters: { id: 'all' | HealthStatus | 'due'; label: string }[] = [
            { id: 'all', label: tr('All', 'सभी') },
            { id: 'healthy', label: stLabel('healthy') },
            { id: 'observation', label: stLabel('observation') },
            { id: 'sick', label: stLabel('sick') },
            { id: 'recovering', label: stLabel('recovering') },
            { id: 'due', label: tr('Checkup due', 'जाँच बाकी') }
          ];

          return (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-bold">{tr('Cattle Management', 'पशु प्रबंधन')}</h1>
                <p className={`text-sm ${mutedText}`}>
                  {tr('Keep every animal’s number, breed, age and health reports in one place, or tell Vaani.', 'हर पशु का नंबर, नस्ल, उम्र और स्वास्थ्य रिपोर्ट एक जगह रखिए, या बस वाणी को बता दीजिए।')}
                </p>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className={`${cardBg} rounded-2xl border p-4`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wider ${mutedText}`}>{tr('Total cattle', 'कुल पशु')}</p>
                  <p className="mt-1.5 text-2xl font-bold">{cattleStats.total}</p>
                  <p className={`text-[11px] ${mutedText}`}>{cattleStats.records} {tr('records', 'रिकॉर्ड')}</p>
                </div>
                <div className={`${cardBg} rounded-2xl border p-4`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wider ${mutedText}`}>{tr('Herd mix', 'पशु प्रकार')}</p>
                  <p className="mt-2 text-sm font-bold leading-snug">{mix || '—'}</p>
                </div>
                <div className={`${cardBg} rounded-2xl border p-4 ${cattleStats.attention ? 'border-amber-500/40' : ''}`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wider ${mutedText}`}>{tr('Needs attention', 'ध्यान चाहिए')}</p>
                  <p className={`mt-1.5 text-2xl font-bold ${cattleStats.attention ? 'text-amber-400' : 'text-emerald-400'}`}>{cattleStats.attention}</p>
                  <p className={`text-[11px] ${mutedText}`}>{cattleStats.healthy} {tr('healthy', 'स्वस्थ')}</p>
                </div>
                <div className={`${cardBg} rounded-2xl border p-4 ${cattleStats.due ? 'border-red-500/40' : ''}`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wider ${mutedText}`}>{tr('Checkups due', 'जाँच बाकी')}</p>
                  <p className={`mt-1.5 text-2xl font-bold ${cattleStats.due ? 'text-red-400' : ''}`}>{cattleStats.due}</p>
                  <p className={`text-[11px] ${mutedText}`}>{tr('overdue or within 7 days', 'देर या 7 दिन के भीतर')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Add / edit form */}
                <div ref={cattleFormRef} className={`lg:col-span-4 ${cardBg} rounded-2xl border p-5 self-start scroll-mt-20`}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold flex items-center gap-2">
                      <PawPrint className="w-4 h-4 text-emerald-400" />
                      {editing ? `${tr('Edit', 'बदलें')} #${editingCattleTag}` : tr('Add cattle', 'पशु जोड़ें')}
                    </h2>
                    {editing && (
                      <button
                        type="button"
                        onClick={() => { setEditingCattleTag(null); setCattleDraft(blankCattle()); }}
                        className="text-[11px] font-semibold text-emerald-400 hover:underline cursor-pointer"
                      >
                        {tr('Cancel', 'रद्द करें')}
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleSaveCattle} className="space-y-3">
                    <label className="block">
                      <span className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>{tr('Cattle number / tag', 'पशु नंबर / टैग')} *</span>
                      <input type="text" required maxLength={30} value={cattleDraft.tag} onChange={(e) => setCDraft('tag', e.target.value)} placeholder="e.g. 112" className={inputCls} />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>{tr('Type', 'प्रकार')}</span>
                        <select value={cattleDraft.kind} onChange={(e) => setCDraft('kind', e.target.value)} className={inputCls}>
                          {CATTLE_KINDS.map((k) => <option key={k} value={k}>{kLabel(k)}</option>)}
                        </select>
                      </label>
                      <label className="block">
                        <span className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>{tr('Count', 'संख्या')}</span>
                        <input type="number" min="1" max="1000" step="1" value={cattleDraft.count} onChange={(e) => setCDraft('count', e.target.value)} className={inputCls} />
                      </label>
                    </div>

                    <label className="block">
                      <span className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>{tr('Breed', 'नस्ल')}</span>
                      <input type="text" list="breed-list" maxLength={40} value={cattleDraft.breed} onChange={(e) => setCDraft('breed', e.target.value)} placeholder={tr('e.g. Gir, Murrah, Sahiwal', 'जैसे गिर, मुर्रा, साहीवाल')} className={inputCls} />
                      <datalist id="breed-list">{BREEDS.map((b) => <option key={b} value={b} />)}</datalist>
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>{tr('Age (years)', 'उम्र (वर्ष)')}</span>
                        <input type="number" min="0" max="40" step="1" value={cattleDraft.ageYears} onChange={(e) => setCDraft('ageYears', e.target.value)} placeholder="0" className={inputCls} />
                      </label>
                      <label className="block">
                        <span className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>{tr('Age (months)', 'उम्र (माह)')}</span>
                        <input type="number" min="0" max="11" step="1" value={cattleDraft.ageMonths} onChange={(e) => setCDraft('ageMonths', e.target.value)} placeholder="0" className={inputCls} />
                      </label>
                    </div>

                    <label className="block">
                      <span className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>{tr('Health status', 'स्वास्थ्य स्थिति')}</span>
                      <select value={cattleDraft.status} onChange={(e) => setCDraft('status', e.target.value)} className={inputCls}>
                        {HEALTH_STATUSES.map((s) => <option key={s} value={s}>{stLabel(s)}</option>)}
                      </select>
                    </label>

                    <label className="block">
                      <span className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>{tr('Notes (optional)', 'टिप्पणी (वैकल्पिक)')}</span>
                      <input type="text" maxLength={200} value={cattleDraft.notes} onChange={(e) => setCDraft('notes', e.target.value)} placeholder={tr('e.g. pregnant, 3rd calving', 'जैसे गाभिन, तीसरा ब्यांत')} className={inputCls} />
                    </label>

                    <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer">
                      <CheckCircle2 className="w-4 h-4" />
                      {editing ? tr('Update record', 'रिकॉर्ड अपडेट करें') : tr('Save cattle', 'पशु सेव करें')}
                    </button>
                    {cattleToast && <p role="status" className="text-xs text-emerald-400 text-center">{cattleToast}</p>}
                  </form>
                </div>

                {/* Herd list */}
                <div className={`lg:col-span-8 ${cardBg} rounded-2xl border p-5`}>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <h2 className="text-base font-bold flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-emerald-400" />
                      {tr('Herd records', 'पशु रिकॉर्ड')}
                    </h2>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border w-full sm:w-56 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'}`}>
                      <Search className={`w-3.5 h-3.5 ${mutedText}`} />
                      <input
                        type="text"
                        value={cattleSearch}
                        onChange={(e) => setCattleSearch(e.target.value)}
                        aria-label={tr('Search by number or breed', 'नंबर या नस्ल से खोजें')}
                        placeholder={tr('Search number or breed', 'नंबर या नस्ल खोजें')}
                        className="bg-transparent text-xs flex-1 min-w-0 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2">
                    {filters.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setCattleFilter(f.id)}
                        aria-pressed={cattleFilter === f.id}
                        className={`px-3 py-1 rounded-full border text-[11px] font-semibold whitespace-nowrap cursor-pointer ${
                          cattleFilter === f.id
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : darkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {cattle.length === 0 ? (
                    <div className={`py-12 flex flex-col items-center text-center text-sm ${mutedText}`}>
                      <PawPrint className="w-8 h-8 mb-2 text-emerald-400/70" />
                      {tr('No cattle added yet. Fill the form, or tell Vaani: “Add cow 112, Gir breed, 4 years old”.', 'अभी कोई पशु नहीं जोड़ा। फ़ॉर्म भरिए, या वाणी से कहिए: “गाय 112 जोड़ो, गिर नस्ल, 4 साल”।')}
                    </div>
                  ) : filteredCattle.length === 0 ? (
                    <p className={`py-10 text-center text-sm ${mutedText}`}>{tr('No animals match this search.', 'इस खोज से कोई पशु नहीं मिला।')}</p>
                  ) : (
                    <ul className="space-y-3">
                      {filteredCattle.map((c) => {
                        const last = latestReport(c);
                        const due = checkupState(c, today);
                        const open = expandedCattleId === c.id;
                        const reports = [...c.reports].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
                        return (
                          <li key={c.id} className={`rounded-2xl border overflow-hidden ${subCardBg}`}>
                            <div className="p-4 flex flex-wrap items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                                  <PawPrint className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-base font-bold">#{c.tag}</span>
                                    {statusBadge(c.status)}
                                    {c.count > 1 && <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded-md ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>×{c.count}</span>}
                                    {due && (
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${due === 'overdue' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
                                        <Clock className="w-3 h-3" />
                                        {due === 'overdue' ? tr('Checkup overdue', 'जाँच में देर') : tr('Checkup soon', 'जाँच जल्द')}
                                      </span>
                                    )}
                                  </div>
                                  <p className={`text-xs mt-1 ${mutedText}`}>
                                    {kLabel(c.kind)} · {c.breed || tr('breed not set', 'नस्ल नहीं भरी')} · {c.dob ? formatAge(ageMonthsOf(c.dob), lang) : tr('age not set', 'उम्र नहीं भरी')}
                                  </p>
                                  {c.notes && <p className="text-xs mt-1">{c.notes}</p>}
                                  {last && (
                                    <p className={`text-[11px] mt-1.5 ${mutedText}`}>
                                      {tr('Last report', 'पिछली रिपोर्ट')} {fullDate(last.date)}{last.note ? ` · ${last.note}` : ''}
                                      {last.nextCheck ? ` · ${tr('next check', 'अगली जाँच')} ${fullDate(last.nextCheck)}` : ''}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => toggleCattleReports(c)}
                                  aria-expanded={open}
                                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                                    open ? 'bg-emerald-600 border-emerald-600 text-white' : darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'
                                  }`}
                                >
                                  <Stethoscope className="w-3.5 h-3.5" />
                                  {tr('Health', 'स्वास्थ्य')} ({c.reports.length})
                                </button>
                                <button onClick={() => handleEditCattle(c)} aria-label={tr('Edit', 'बदलें')} title={tr('Edit', 'बदलें')} className={`p-2 rounded-lg cursor-pointer ${mutedText} hover:text-emerald-400`}><Pencil className="w-4 h-4" /></button>
                                <button onClick={() => handleDeleteCattle(c)} aria-label={tr('Delete', 'हटाएँ')} title={tr('Delete', 'हटाएँ')} className={`p-2 rounded-lg cursor-pointer ${mutedText} hover:text-red-400`}><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </div>

                            {open && (
                              <div className={`border-t px-4 py-4 space-y-4 ${darkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-white/60'}`}>
                                <form onSubmit={(e) => handleAddReport(e, c)} className="space-y-3">
                                  <p className="text-sm font-bold flex items-center gap-2"><HeartPulse className="w-4 h-4 text-emerald-400" />{tr('New health report', 'नई स्वास्थ्य रिपोर्ट')}</p>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <label className="block">
                                      <span className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>{tr('Date', 'तारीख')}</span>
                                      <input type="date" required max={today} value={reportDraft.date} onChange={(e) => setRDraft('date', e.target.value)} className={inputCls} />
                                    </label>
                                    <label className="block">
                                      <span className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>{tr('Status', 'स्थिति')}</span>
                                      <select value={reportDraft.status} onChange={(e) => setRDraft('status', e.target.value)} className={inputCls}>
                                        {HEALTH_STATUSES.map((s) => <option key={s} value={s}>{stLabel(s)}</option>)}
                                      </select>
                                    </label>
                                    <label className="block col-span-2 sm:col-span-1">
                                      <span className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>{tr('Next checkup', 'अगली जाँच')}</span>
                                      <input type="date" min={today} value={reportDraft.nextCheck} onChange={(e) => setRDraft('nextCheck', e.target.value)} className={inputCls} />
                                    </label>
                                  </div>
                                  <label className="block">
                                    <span className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>{tr('Findings / symptoms', 'लक्षण / जाँच में मिला')}</span>
                                    <input type="text" maxLength={300} value={reportDraft.note} onChange={(e) => setRDraft('note', e.target.value)} placeholder={tr('e.g. fever, not eating well', 'जैसे बुखार, चारा कम खा रही')} className={inputCls} />
                                  </label>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <label className="block">
                                      <span className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>{tr('Treatment / vaccine', 'इलाज / टीका')}</span>
                                      <input type="text" maxLength={200} value={reportDraft.treatment} onChange={(e) => setRDraft('treatment', e.target.value)} className={inputCls} />
                                    </label>
                                    <label className="block">
                                      <span className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>{tr('Vet name', 'डॉक्टर का नाम')}</span>
                                      <input type="text" maxLength={80} value={reportDraft.vet} onChange={(e) => setRDraft('vet', e.target.value)} className={inputCls} />
                                    </label>
                                  </div>
                                  <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center gap-2 cursor-pointer">
                                    <Plus className="w-4 h-4" /> {tr('Save report', 'रिपोर्ट सेव करें')}
                                  </button>
                                </form>

                                <div>
                                  <p className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${mutedText}`}>{tr('Health history', 'स्वास्थ्य इतिहास')}</p>
                                  {reports.length === 0 ? (
                                    <p className={`text-sm ${mutedText}`}>{tr('No health reports yet.', 'अभी कोई स्वास्थ्य रिपोर्ट नहीं।')}</p>
                                  ) : (
                                    <ol className="space-y-2">
                                      {reports.map((r) => (
                                        <li key={r.id} className={`rounded-xl border p-3 text-xs ${subCardBg}`}>
                                          <div className="flex items-center justify-between gap-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <span className="font-semibold">{fullDate(r.date)}</span>
                                              {statusBadge(r.status)}
                                            </div>
                                            <button onClick={() => handleDeleteReport(c, r.id)} aria-label={tr('Delete report', 'रिपोर्ट हटाएँ')} title={tr('Delete report', 'रिपोर्ट हटाएँ')} className={`p-1 rounded-md cursor-pointer ${mutedText} hover:text-red-400`}><Trash2 className="w-3.5 h-3.5" /></button>
                                          </div>
                                          {r.note && <p className="mt-1.5">{r.note}</p>}
                                          {(r.treatment || r.vet) && (
                                            <p className={`mt-1 ${mutedText}`}>
                                              {r.treatment && <>{tr('Treatment', 'इलाज')}: {r.treatment}</>}
                                              {r.treatment && r.vet ? ' · ' : ''}
                                              {r.vet && <>{tr('Vet', 'डॉक्टर')}: {r.vet}</>}
                                            </p>
                                          )}
                                          {r.nextCheck && <p className={`mt-1 ${mutedText}`}>{tr('Next checkup', 'अगली जाँच')}: {fullDate(r.nextCheck)}</p>}
                                        </li>
                                      ))}
                                    </ol>
                                  )}
                                </div>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        </main>
      </div>
    </div>
  );
}
