from __future__ import annotations

from collections import Counter
from hashlib import blake2b
from math import sqrt

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()


class EmbeddingRequest(BaseModel):
    text: str = Field(min_length=1)
    dimensions: int = Field(default=16, ge=8, le=128)


def _tokenize(text: str) -> list[str]:
    return [
        token
        for token in (
            part.strip(".,;:()[]{}<>!?\"'`").lower()
            for part in text.split()
        )
        if token
    ]


def _embed(text: str, dimensions: int) -> list[float]:
    counts = Counter(_tokenize(text))
    vector = [0.0] * dimensions
    for token, weight in counts.items():
        digest = blake2b(token.encode("utf-8"), digest_size=8).digest()
        bucket = int.from_bytes(digest, "big") % dimensions
        vector[bucket] += float(weight)
    norm = sqrt(sum(value * value for value in vector)) or 1.0
    return [round(value / norm, 6) for value in vector]


@router.post("/v1/embeddings")
def api_embeddings(payload: EmbeddingRequest):
    return {
        "dimensions": payload.dimensions,
        "embedding": _embed(payload.text, payload.dimensions),
    }

