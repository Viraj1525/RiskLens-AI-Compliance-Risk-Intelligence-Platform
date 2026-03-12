from rag_pipeline.embeddings import get_embedding_model
from rag_pipeline.retriever import retrieve
from risk_engine.compliance_checker import answer_question

from services import document_service


def chat_with_documents(question, history=None):

    if document_service.VECTOR_INDEX is None:
        return 'No documents uploaded.'

    query_embedding = get_embedding_model().encode([question])[0]

    results = retrieve(
        query_embedding,
        document_service.VECTOR_INDEX,
        document_service.DOCUMENT_CHUNKS,
        k=3
    )

    if not results:
        return 'No relevant context found in uploaded documents.'

    context_parts = []
    for doc in results:
        source = doc.metadata.get('source', 'unknown')
        context_parts.append(f"Document: {source}\n{doc.page_content}")

    context = '\n\n'.join(context_parts)

    answer = answer_question(context, question=question, history=history)

    return answer
