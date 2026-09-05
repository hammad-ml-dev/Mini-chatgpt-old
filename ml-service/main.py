"""
Lightweight NLP helper service for the portfolio chat app.
Provides language detection and simple keyword extraction without large model downloads.
"""

from __future__ import annotations

import re
from collections import Counter

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langdetect import LangDetectException, detect
from pydantic import BaseModel, Field

app = FastAPI(title="Mini ChatGPT ML Service", version="1.0.0")

# Allow local dev origins; tighten in production behind a reverse proxy.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# English stopwords subset keeps the dependency footprint small (no NLTK download).
_STOPWORDS = frozenset(
    {
        "the",
        "a",
        "an",
        "and",
        "or",
        "but",
        "in",
        "on",
        "at",
        "to",
        "for",
        "of",
        "as",
        "by",
        "with",
        "is",
        "are",
        "was",
        "were",
        "be",
        "been",
        "being",
        "have",
        "has",
        "had",
        "do",
        "does",
        "did",
        "will",
        "would",
        "could",
        "should",
        "may",
        "might",
        "must",
        "this",
        "that",
        "these",
        "those",
        "i",
        "you",
        "he",
        "she",
        "it",
        "we",
        "they",
        "what",
        "which",
        "who",
        "whom",
        "from",
        "into",
        "about",
        "than",
        "then",
        "there",
        "when",
        "where",
        "why",
        "how",
        "all",
        "each",
        "every",
        "both",
        "few",
        "more",
        "most",
        "other",
        "some",
        "such",
        "no",
        "nor",
        "not",
        "only",
        "own",
        "same",
        "so",
        "too",
        "very",
        "can",
        "just",
        "if",
        "because",
    }
)


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50000)


class AnalyzeResponse(BaseModel):
    language: str | None
    keywords: list[str]
    word_count: int
    char_count: int


def _tokenize(text: str) -> list[str]:
    lowered = text.lower()
    # Alphanumeric tokens; drops punctuation for frequency counting.
    return re.findall(r"[a-z0-9_]{2,}", lowered)


def extract_keywords(tokens: list[str], top_n: int = 8) -> list[str]:
    filtered = [t for t in tokens if t not in _STOPWORDS and not t.isdigit()]
    counts = Counter(filtered)
    return [word for word, _ in counts.most_common(top_n)]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/ml/analyze", response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    raw = payload.text.strip()
    tokens = _tokenize(raw)
    try:
        language = detect(raw[:2000]) if raw else None
    except LangDetectException:
        language = None

    return AnalyzeResponse(
        language=language,
        keywords=extract_keywords(tokens),
        word_count=len(tokens),
        char_count=len(raw),
    )
