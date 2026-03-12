import re

import numpy as np

from config.settings import (
    EMBEDDING_MODEL_CACHE_DIR,
    EMBEDDING_MODEL_NAME,
    EMBEDDING_MODEL_OFFLINE,
)

try:
    from sentence_transformers import SentenceTransformer
except Exception:
    SentenceTransformer = None


class LocalEmbeddingModel:
    """Lightweight embedding fallback when sentence-transformers is unavailable."""

    def __init__(self, dimension=384):
        self.dimension = dimension

    def encode(self, texts):
        vectors = []

        for text in texts:
            vec = np.zeros(self.dimension, dtype='float32')
            tokens = re.findall(r"[a-zA-Z0-9_]+", (text or '').lower())

            if not tokens:
                vectors.append(vec)
                continue

            for token in tokens:
                idx = hash(token) % self.dimension
                vec[idx] += 1.0

            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm

            vectors.append(vec.astype('float32'))

        return np.array(vectors, dtype='float32')


_model = None


def _build_sentence_transformer():
    kwargs = {}

    if EMBEDDING_MODEL_CACHE_DIR:
        kwargs["cache_folder"] = EMBEDDING_MODEL_CACHE_DIR

    if EMBEDDING_MODEL_OFFLINE:
        kwargs["local_files_only"] = True

    return SentenceTransformer(EMBEDDING_MODEL_NAME, **kwargs)


def get_embedding_model():
    global _model

    if _model is not None:
        return _model

    if SentenceTransformer is not None:
        try:
            _model = _build_sentence_transformer()
            return _model
        except Exception:
            pass

    _model = LocalEmbeddingModel()
    return _model


def generate_embeddings(chunks):
    texts = [chunk.page_content for chunk in chunks]
    embeddings = get_embedding_model().encode(texts)
    return np.array(embeddings).astype('float32')
