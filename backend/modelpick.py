"""Chooses fallback models from the list Google reports for your API key."""
import re


def pick_flash(names, limit=3):
    """Newest stable 'gemini-<version>-flash' models first.
    Preview / lite / image / tts / live variants never match, on purpose."""
    found = []
    for n in names:
        m = re.fullmatch(r"gemini-(\d+(?:\.\d+)?)-flash", n)
        if m:
            found.append((tuple(int(x) for x in m.group(1).split(".")), n))
    found.sort(reverse=True)
    return [n for _, n in found[:limit]]


def pick_lite(names, limit=1):
    """Newest stable 'gemini-<version>-flash-lite' models: smaller and usually the quickest to answer."""
    found = []
    for n in names:
        m = re.fullmatch(r"gemini-(\d+(?:\.\d+)?)-flash-lite", n)
        if m:
            found.append((tuple(int(x) for x in m.group(1).split(".")), n))
    found.sort(reverse=True)
    return [n for _, n in found[:limit]]
