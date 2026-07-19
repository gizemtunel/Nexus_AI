from pathlib import Path
import re

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field


BASE_DIR = Path(__file__).resolve().parent.parent
UI_DIR = BASE_DIR / "ui"
INDEX_FILE = UI_DIR / "index.html"


class PreviewRequest(BaseModel):
    text: str = Field(default="", min_length=0)
    speed: int = Field(default=5, ge=1, le=12)


app = FastAPI(title="Nexus AI", version="0.1.0")
app.mount("/ui", StaticFiles(directory=UI_DIR), name="ui")


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def split_sentences(text: str) -> list[str]:
    normalized_text = normalize_text(text)
    if not normalized_text:
        return []

    return [part.strip() for part in re.split(r"(?<=[.!?])\s+", normalized_text) if part.strip()]


def wrap_sentence(sentence: str, width: int = 120) -> str:
    if len(sentence) <= width:
        return sentence

    parts = re.findall(rf".{{1,{width}}}(?:\s|$)", sentence)
    wrapped = "\n".join(part.strip() for part in parts if part.strip())
    return wrapped or sentence


def make_tldr(sentences: list[str]) -> list[str]:
    if not sentences:
        return ["Metin gelmedi.", "Soldaki alana içerik ekleyin."]

    summary_source = sentences[:3]
    return [wrap_sentence(sentence, 90) for sentence in summary_source]


def estimate_read_time_minutes(text: str) -> int:
    words = re.findall(r"\w+", text, flags=re.UNICODE)
    if not words:
        return 0

    return max(1, round(len(words) / 180))


def build_bionic_html(sentence: str) -> str:
    parts = sentence.split(" ")
    rendered_parts: list[str] = []

    for part in parts:
        cleaned = part.strip()
        if not cleaned:
            continue

        match = re.match(r"^([\wçğıöşüÇĞİÖŞÜ'-]+)(.*)$", cleaned, flags=re.UNICODE)
        if not match:
            rendered_parts.append(cleaned)
            continue

        word, suffix = match.groups()
        if len(word) <= 3:
            bold_length = 1
        elif len(word) <= 6:
            bold_length = 2
        else:
            bold_length = 3

        bold_part = word[:bold_length]
        rest_part = word[bold_length:]
        rendered_parts.append(f"<strong>{bold_part}</strong>{rest_part}{suffix}")

    return " ".join(rendered_parts)


def build_preview_blocks(text: str) -> list[str]:
    sentences = split_sentences(text)
    if not sentences:
        return ["Metin gelmedi. Soldaki alana içerik ekleyin."]

    blocks: list[str] = []
    for index, sentence in enumerate(sentences):
        shortened = wrap_sentence(sentence)
        blocks.append(build_bionic_html(shortened) if index % 2 == 0 else f"• {build_bionic_html(shortened)}")
    return blocks


def interval_from_speed(speed: int) -> int:
    return max(1000, 2600 - speed * 130)


@app.get("/")
def read_root() -> FileResponse:
    return FileResponse(INDEX_FILE)


@app.post("/api/preview")
def preview_text(payload: PreviewRequest) -> JSONResponse:
    sentences = split_sentences(payload.text)
    blocks = build_preview_blocks(payload.text)
    return JSONResponse(
        {
            "blocks": blocks,
            "tldr": make_tldr(sentences),
            "read_time_minutes": estimate_read_time_minutes(payload.text),
            "interval_ms": interval_from_speed(payload.speed),
            "source_length": len(payload.text),
        }
    )