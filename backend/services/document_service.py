import os
import pickle
import shutil

import numpy as np

from rag_pipeline.document_loader import load_pdf
from rag_pipeline.text_splitter import split_documents
from rag_pipeline.embeddings import generate_embeddings
from rag_pipeline.vector_store import create_faiss_index, load_faiss_index, save_index


INDEX_PATH = 'embeddings/faiss_index.bin'
CHUNKS_PATH = 'embeddings/chunks.pkl'
UPLOAD_FOLDER = 'data/documents'
EMBEDDINGS_FOLDER = 'embeddings'
REPORTS_FOLDER = 'reports'


VECTOR_INDEX = load_faiss_index()

if os.path.exists(CHUNKS_PATH):
    try:
        with open(CHUNKS_PATH, 'rb') as f:
            DOCUMENT_CHUNKS = pickle.load(f)
    except Exception:
        DOCUMENT_CHUNKS = []
else:
    DOCUMENT_CHUNKS = []


def _persist_chunks():
    os.makedirs(EMBEDDINGS_FOLDER, exist_ok=True)
    with open(CHUNKS_PATH, 'wb') as f:
        pickle.dump(DOCUMENT_CHUNKS, f)


def _rebuild_vector_index():
    global VECTOR_INDEX

    if not DOCUMENT_CHUNKS:
        VECTOR_INDEX = None
        if os.path.exists(INDEX_PATH):
            os.remove(INDEX_PATH)
        return

    rebuilt = np.array(generate_embeddings(DOCUMENT_CHUNKS)).astype('float32')
    VECTOR_INDEX = create_faiss_index(rebuilt)
    save_index(VECTOR_INDEX)


# Rebuild index when chunks exist but persisted index cannot be loaded.
if VECTOR_INDEX is None and DOCUMENT_CHUNKS:
    try:
        _rebuild_vector_index()
    except Exception:
        VECTOR_INDEX = None


def _clear_directory(path):
    removed_paths = []

    if not os.path.exists(path):
        return removed_paths

    for entry in os.listdir(path):
        entry_path = os.path.join(path, entry)
        if os.path.isdir(entry_path):
            shutil.rmtree(entry_path, ignore_errors=True)
        else:
            os.remove(entry_path)
        removed_paths.append(entry_path)

    return removed_paths


def clear_analysis_session():
    global VECTOR_INDEX
    global DOCUMENT_CHUNKS

    removed_files = []

    for path in (UPLOAD_FOLDER, EMBEDDINGS_FOLDER, REPORTS_FOLDER):
        os.makedirs(path, exist_ok=True)
        removed_files.extend(_clear_directory(path))

    VECTOR_INDEX = None
    DOCUMENT_CHUNKS = []

    return {
        'cleared': True,
        'removed_files': removed_files,
    }


def _delete_document(document_name, delete_files=True):
    global DOCUMENT_CHUNKS

    normalized_name = os.path.basename(document_name or '')
    if not normalized_name:
        return {
            'deleted': False,
            'document': '',
            'removed_chunks': 0,
            'detail': 'Invalid document name'
        }

    before_count = len(DOCUMENT_CHUNKS)
    matched_sources = {
        chunk.metadata.get('source')
        for chunk in DOCUMENT_CHUNKS
        if os.path.basename(chunk.metadata.get('source', '')) == normalized_name
    }

    DOCUMENT_CHUNKS = [
        chunk for chunk in DOCUMENT_CHUNKS
        if os.path.basename(chunk.metadata.get('source', '')) != normalized_name
    ]

    removed_chunks = before_count - len(DOCUMENT_CHUNKS)

    removed_files = []

    if delete_files:
        candidates = set(matched_sources)
        default_path = os.path.join(UPLOAD_FOLDER, normalized_name)
        candidates.add(default_path)

        for source in candidates:
            if source and os.path.exists(source):
                os.remove(source)
                removed_files.append(source)

    if removed_chunks == 0 and not removed_files:
        return {
            'deleted': False,
            'document': normalized_name,
            'removed_chunks': 0,
            'detail': 'Document not found'
        }

    _persist_chunks()
    _rebuild_vector_index()

    return {
        'deleted': True,
        'document': normalized_name,
        'removed_chunks': removed_chunks,
        'removed_files': removed_files
    }


def delete_document(document_name):
    return _delete_document(document_name, delete_files=True)


def process_document(file_path):
    global VECTOR_INDEX
    global DOCUMENT_CHUNKS

    docs = load_pdf(file_path)

    chunks = split_documents(docs)

    for chunk in chunks:
        chunk.metadata['source'] = file_path

    embeddings = generate_embeddings(chunks)
    embeddings = np.array(embeddings).astype('float32')

    if VECTOR_INDEX is None:
        VECTOR_INDEX = create_faiss_index(embeddings)
    else:
        VECTOR_INDEX.add(embeddings)

    save_index(VECTOR_INDEX)

    DOCUMENT_CHUNKS.extend(chunks)
    _persist_chunks()

    return {
        'chunks': chunks
    }
