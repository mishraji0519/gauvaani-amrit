"""
Checks whether this computer can use the Google AI from your backend.

Run it from the backend folder (virtual environment active):

    python check_ai.py

It never prints your API key.
"""
import os
import socket
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
import httpx
from modelpick import pick_flash

HOST = "generativelanguage.googleapis.com"
ENV = Path(__file__).resolve().parent / ".env"


def ok(msg):   print(f"  [ OK ] {msg}")
def bad(msg):  print(f"  [FAIL] {msg}")
def info(msg): print(f"  [ .. ] {msg}")


def explain(exc: Exception) -> str:
    text = f"{type(exc).__name__}: {str(exc)[:200]}"
    low = text.lower()
    if "certificate" in low or "ssl" in low:
        text += "\n         -> HTTPS is being intercepted (antivirus 'web shield', company proxy or VPN). Turn that HTTPS scanning off or try another network."
    elif "timed out" in low or "timeout" in low:
        text += "\n         -> Connection is very slow or blocked (firewall/VPN). Try another network, e.g. a phone hotspot."
    elif "getaddrinfo" in low or "name or service" in low or "nodename" in low:
        text += "\n         -> DNS problem. Check the internet connection or try DNS 8.8.8.8."
    return text


print("\n1) Settings")
print(f"  .env file: {ENV} -> {'FOUND' if ENV.exists() else 'NOT FOUND'}")
load_dotenv(ENV, override=True, encoding="utf-8-sig")
key = (os.getenv("GEMMA_API_KEY") or os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY") or "").strip().strip("\"'")
if not key:
    bad("GEMMA_API_KEY is empty. Put your Google AI Studio key in backend/.env")
    sys.exit(1)
ok(f"API key loaded ({len(key)} characters, not shown)")
model = os.getenv("GEMMA_MODEL", "gemma-4-31b-it").strip()
fallbacks = [m.strip() for m in os.getenv("FALLBACK_MODELS", "").split(",") if m.strip()]
models = [model] + [m for m in fallbacks if m != model]
info(f"Models the app will try, in order: {', '.join(models)}")
proxies = [n for n in ("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy") if os.getenv(n)]
if proxies:
    info(f"A proxy is configured in your environment ({', '.join(proxies)}). If the next steps fail, that is the first suspect.")

print("\n2) Can this computer find Google?")
try:
    addrs = {a[4][0] for a in socket.getaddrinfo(HOST, 443)}
    ok(f"{HOST} -> {', '.join(sorted(addrs))[:80]}")
except Exception as exc:
    bad(explain(exc))
    sys.exit(1)

print("\n3) Can it talk to Google over HTTPS, and does your key work?")
headers = {"x-goog-api-key": key}
try:
    r = httpx.get(f"https://{HOST}/v1beta/models?pageSize=200", headers=headers, timeout=httpx.Timeout(15.0, connect=8.0))
except Exception as exc:
    bad(explain(exc))
    sys.exit(1)
if r.status_code == 200:
    names = []
    for m in r.json().get("models", []):
        if "generateContent" in m.get("supportedGenerationMethods", []):
            names.append(m["name"].replace("models/", ""))
    ok(f"Key accepted. {len(names)} models can generate text with this key.")
    shown = [n for n in names if n.startswith(("gemma", "gemini-2.5", "gemini-3"))]
    info("Some of them: " + ", ".join(sorted(shown)[:14]))
    for m in models:
        (ok if m in names else bad)(f"Model '{m}' {'is available' if m in names else 'is NOT available to your key: change it in .env'}")
    auto = pick_flash(names, 3)
    info(f"Fallback models the app picks automatically: {', '.join(auto) or 'none found'}")
    models = [m for m in models if m in names] + [m for m in auto if m not in models]
    if os.getenv("AI_MODEL_ORDER", "fast").strip().lower() != "configured":
        models = [m for m in models if m.startswith("gemini")] + [m for m in models if not m.startswith("gemini")]
        info("The app asks these in this order (fastest first): " + ", ".join(models[:4]))
else:
    try:
        err = r.json().get("error", {})
        bad(f"Google answered HTTP {r.status_code}: {err.get('status')} - {err.get('message', '')[:200]}")
    except Exception:
        bad(f"Google answered HTTP {r.status_code}")
    sys.exit(1)

print("\n4) Real test message for each model (up to 30 s each)")
for m in models:
    t0 = time.perf_counter()
    try:
        r = httpx.post(
            f"https://{HOST}/v1beta/models/{m}:generateContent",
            headers={**headers, "Content-Type": "application/json"},
            json={"contents": [{"parts": [{"text": "Reply with the single word: ok"}]}]},
            timeout=httpx.Timeout(30.0, connect=8.0),
        )
    except Exception as exc:
        bad(f"{m}: {explain(exc)}  (after {time.perf_counter() - t0:.0f}s)")
        continue
    dt = time.perf_counter() - t0
    if r.status_code == 200:
        try:
            reply = r.json()["candidates"][0]["content"]["parts"][0]["text"].strip()[:30]
        except Exception:
            reply = "(empty answer)"
        ok(f"{m}: answered '{reply}' in {dt:.1f}s")
    else:
        try:
            err = r.json().get("error", {})
            bad(f"{m}: HTTP {r.status_code} {err.get('status')} - {err.get('message', '')[:160]}")
        except Exception:
            bad(f"{m}: HTTP {r.status_code}")

# ---- 5) The exact kind of request the chat sends: JSON answer + low thinking
print("\n5) The same settings the chat uses (JSON answer, low thinking)")
fast = [m for m in models if m.startswith("gemini")][:1]
if not fast:
    info("No Gemini model available to your key, so the app will use Gemma without these settings.")
for m in fast:
    cfg = {"responseMimeType": "application/json", "maxOutputTokens": 2048}
    if m.startswith("gemini-3"):
        cfg["thinkingConfig"] = {"thinkingLevel": "low"}
    t0 = time.perf_counter()
    try:
        r = httpx.post(
            f"https://{HOST}/v1beta/models/{m}:generateContent",
            headers={**headers, "Content-Type": "application/json"},
            json={"contents": [{"parts": [{"text": 'Return exactly this JSON and nothing else: {"reply":"ok","actions":[]}'}]}], "generationConfig": cfg},
            timeout=httpx.Timeout(30.0, connect=8.0),
        )
    except Exception as exc:
        bad(f"{m}: {explain(exc)}")
        continue
    dt = time.perf_counter() - t0
    if r.status_code == 200:
        ok(f"{m} answered in {dt:.1f}s with these settings. A chat message normally takes about this long, plus a second or two for the longer prompt.")
        if dt > 8:
            info("That is slow. Your internet or Google's free tier is the bottleneck, not the app.")
    else:
        try:
            err = r.json().get("error", {})
            bad(f"{m}: HTTP {r.status_code} {err.get('status')} - {err.get('message', '')[:160]}")
        except Exception:
            bad(f"{m}: HTTP {r.status_code}")
        info("The app handles this automatically: it asks again without these settings.")

# ---- 6) A request as big as a real chat message (about 17 KB): some networks stall large uploads
print("\n6) A request as large as a real chat message (about 17 KB)")
if fast:
    m = fast[0]
    filler = ("The dairy has cows and buffaloes; today's records are listed below. " * 240)[:17000]
    prompts = {"small (about 1 KB)": filler[:1000], "large (about 17 KB)": filler}
    times = {}
    for label, pad in prompts.items():
        t0 = time.perf_counter()
        try:
            r = httpx.post(
                f"https://{HOST}/v1beta/models/{m}:generateContent",
                headers={**headers, "Content-Type": "application/json"},
                json={"contents": [{"parts": [{"text": pad + "\n\nIgnore the text above and reply with the single word: ok"}]}],
                      "generationConfig": {"maxOutputTokens": 50, **({"thinkingConfig": {"thinkingLevel": "low"}} if m.startswith("gemini-3") else {})}},
                timeout=httpx.Timeout(40.0, connect=8.0),
            )
            times[label] = (time.perf_counter() - t0, r.status_code)
            (ok if r.status_code == 200 else bad)(f"{label}: HTTP {r.status_code} in {times[label][0]:.1f}s")
        except Exception as exc:
            times[label] = (time.perf_counter() - t0, None)
            bad(f"{label}: {explain(exc)} (after {times[label][0]:.0f}s)")
    small, large = list(times.values())
    if small[1] == 200 and large[1] is None:
        info("Small requests work but large ones stall: your network, VPN, proxy or antivirus is interfering with bigger uploads.")
        info("Try a phone hotspot or turn the VPN / antivirus web shield off, then run this again.")
    elif small[1] == 200 and large[1] == 200 and large[0] > 12:
        info("Large requests are slow but work: Google or your internet is the bottleneck.")
else:
    info("No Gemini model available to your key, so this step was skipped.")

print("\nDone. If at least one model says [ OK ] in step 4, the app will work with it.\n")
