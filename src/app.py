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


def wrap_sentence(sentence: str, width: int = 120) -> str:
    if len(sentence) <= width:
        return sentence

    parts = re.findall(rf".{{1,{width}}}(?:\s|$)", sentence)
    wrapped = "\n".join(part.strip() for part in parts if part.strip())
    return wrapped or sentence


def build_preview_blocks(text: str) -> list[str]:
    normalized_text = normalize_text(text)
    if not normalized_text:
        return ["Metin gelmedi. Soldaki alana içerik ekleyin."]

    sentences = [part.strip() for part in re.split(r"(?<=[.!?])\s+", normalized_text) if part.strip()]
    if not sentences:
        return ["Metin gelmedi. Soldaki alana içerik ekleyin."]

    blocks: list[str] = []
    for index, sentence in enumerate(sentences):
        shortened = wrap_sentence(sentence)
        blocks.append(shortened if index % 2 == 0 else f"• {shortened}")
    return blocks


def interval_from_speed(speed: int) -> int:
    return max(40, 380 - speed * 28)


@app.get("/")
def read_root() -> FileResponse:
    return FileResponse(INDEX_FILE)


@app.post("/api/preview")
def preview_text(payload: PreviewRequest) -> JSONResponse:
    blocks = build_preview_blocks(payload.text)
    return JSONResponse(
        {
            "blocks": blocks,
            "interval_ms": interval_from_speed(payload.speed),
            "source_length": len(payload.text),
        }
    )