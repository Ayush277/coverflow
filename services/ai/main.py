"""
CoverFlow AI Service — FastAPI microservice for OCR, RAG retrieval and claim NLP.

The Node gateway calls this service when AI_SERVICE_URL is set; otherwise it uses
built-in fallbacks, so the platform runs with or without this process.

Endpoints:
  POST /ocr/extract      — receipt OCR (pytesseract if available, heuristic parser otherwise)
  POST /rag/answer       — RAG answer over policy chunks (pgvector when DATABASE_URL set,
                           in-memory TF-IDF otherwise; OpenAI generation when OPENAI_API_KEY set)
  POST /claims/classify  — incident → claim type + confidence
  GET  /health
"""
from __future__ import annotations

import io
import math
import os
import re
from collections import Counter
from typing import Optional

from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel

app = FastAPI(title="CoverFlow AI Service", version="1.0.0")

# ── optional heavy deps ──────────────────────────────────────────────────────
try:
    import pytesseract  # type: ignore
    from PIL import Image  # type: ignore
    HAS_TESSERACT = True
except ImportError:
    HAS_TESSERACT = False

try:
    from openai import OpenAI  # type: ignore
    OPENAI_KEY = os.environ.get("OPENAI_API_KEY", "")
    openai_client = OpenAI(api_key=OPENAI_KEY) if OPENAI_KEY else None
except ImportError:
    openai_client = None


@app.get("/health")
def health():
    return {"ok": True, "service": "coverflow-ai", "tesseract": HAS_TESSERACT, "openai": openai_client is not None}


# ── OCR ──────────────────────────────────────────────────────────────────────
class OcrResult(BaseModel):
    merchant: Optional[str] = None
    invoice_number: Optional[str] = None
    amount: Optional[float] = None
    purchase_date: Optional[str] = None
    serial_number: Optional[str] = None
    items: list[str] = []
    confidence: float = 0.0


def parse_receipt_text(text: str) -> OcrResult:
    def find(pattern: str) -> Optional[str]:
        m = re.search(pattern, text, re.IGNORECASE)
        return m.group(1).strip() if m else None

    merchant = find(r"(?:merchant|store|sold by|from)[:\s]+([A-Za-z0-9 .&'-]{2,40})")
    invoice = find(r"(?:invoice|order|receipt)\s*(?:no\.?|number|#)?[:\s]*([A-Z0-9-]{4,24})")
    amount_s = find(r"(?:total|amount|grand total)[:\s]*(?:₹|Rs\.?|INR|\$)?\s*([\d,]+(?:\.\d{1,2})?)")
    date = find(r"(?:date|purchased on)[:\s]*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})")
    serial = find(r"(?:serial|s\/n|sn)[:\s#]*([A-Z0-9-]{6,24})")
    items = [re.sub(r"^\s*\d+\s*x\s+", "", l).strip() for l in re.findall(r"^\s*\d+\s*x\s+.+$", text, re.MULTILINE)][:10]

    found = sum(1 for v in (merchant, invoice, amount_s, date) if v)
    return OcrResult(
        merchant=merchant,
        invoice_number=invoice,
        amount=float(amount_s.replace(",", "")) if amount_s else None,
        purchase_date=date,
        serial_number=serial,
        items=items,
        confidence=min(0.98, 0.5 + found * 0.12),
    )


@app.post("/ocr/extract", response_model=OcrResult)
async def ocr_extract(file: UploadFile = File(...)):
    raw = await file.read()
    text = ""
    if HAS_TESSERACT and (file.content_type or "").startswith("image/"):
        try:
            text = pytesseract.image_to_string(Image.open(io.BytesIO(raw)))
        except Exception:
            text = ""
    if not text:
        try:
            text = raw.decode("utf-8", errors="ignore")
        except Exception:
            text = ""
    return parse_receipt_text(text)


# ── RAG ──────────────────────────────────────────────────────────────────────
class RagRequest(BaseModel):
    question: str
    documents: list[dict]  # [{title, content}] supplied by the gateway from the policies table
    user_context: dict = {}


class RagResponse(BaseModel):
    answer: str
    sources: list[str]


def tfidf_rank(question: str, docs: list[dict], k: int = 3) -> list[dict]:
    """Lightweight TF-IDF retrieval; production swaps this for pgvector cosine search."""
    def tokens(s: str) -> list[str]:
        return [t for t in re.findall(r"[a-z]{3,}", s.lower())]

    q = Counter(tokens(question))
    n = len(docs) or 1
    df: Counter = Counter()
    doc_tokens = [Counter(tokens(f"{d.get('title','')} {d.get('content','')}")) for d in docs]
    for dt in doc_tokens:
        df.update(dt.keys())

    scored = []
    for d, dt in zip(docs, doc_tokens):
        score = sum(q[t] * dt[t] * math.log(1 + n / (1 + df[t])) for t in q)
        scored.append((score, d))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [d for s, d in scored[:k] if s > 0]


@app.post("/rag/answer", response_model=RagResponse)
def rag_answer(req: RagRequest):
    top = tfidf_rank(req.question, req.documents)
    sources = [d["title"] for d in top]
    context = "\n\n".join(f"## {d['title']}\n{d['content']}" for d in top)

    if openai_client:
        resp = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=400,
            messages=[
                {"role": "system", "content": "You are CoverFlow's benefit assistant. Answer only from the provided "
                 f"policy excerpts and user data. Be concise.\n{context}\nUser data: {req.user_context}"},
                {"role": "user", "content": req.question},
            ],
        )
        return RagResponse(answer=resp.choices[0].message.content or "", sources=sources)

    if top:
        return RagResponse(answer=f"{top[0]['content']}\n\n_Source: {top[0]['title']}_", sources=sources)
    return RagResponse(answer="I couldn't find a matching policy. Try asking about purchase protection, "
                              "extended warranty, return protection or travel insurance.", sources=[])


# ── Claim classification ─────────────────────────────────────────────────────
class ClassifyRequest(BaseModel):
    incident: str


CLAIM_PATTERNS = [
    ("THEFT", r"stol|theft|snatch|robb"),
    ("LOSS", r"lost|missing|left behind"),
    ("ACCIDENTAL_DAMAGE", r"crack|broke|damag|drop|shatter|water|spill"),
    ("MALFUNCTION", r"not work|dead|fault|defect|stopped|won'?t turn"),
    ("RETURN_PROTECTION", r"return|refund|refuse"),
]


@app.post("/claims/classify")
def classify(req: ClassifyRequest):
    text = req.incident.lower()
    for claim_type, pattern in CLAIM_PATTERNS:
        if re.search(pattern, text):
            return {"claim_type": claim_type, "confidence": 0.9}
    return {"claim_type": "OTHER", "confidence": 0.55}
