from rag_pipeline.document_loader import SimpleDocument


def _fallback_split(documents, chunk_size=1000, chunk_overlap=200):
    """Fallback text splitter when langchain_text_splitters is unavailable."""
    chunks = []

    stride = max(1, chunk_size - chunk_overlap)

    for doc in documents:
        text = doc.page_content or ''
        metadata = dict(getattr(doc, 'metadata', {}) or {})

        if not text.strip():
            continue

        start = 0
        while start < len(text):
            end = min(len(text), start + chunk_size)
            chunk_text = text[start:end]
            chunk_meta = dict(metadata)
            chunk_meta['start'] = start
            chunk_meta['end'] = end
            chunks.append(SimpleDocument(page_content=chunk_text, metadata=chunk_meta))

            if end >= len(text):
                break
            start += stride

    return chunks


def split_documents(documents):
    """Split documents into chunks for embedding."""

    try:
        from langchain_text_splitters import RecursiveCharacterTextSplitter

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )

        return splitter.split_documents(documents)
    except Exception:
        return _fallback_split(documents)
