from rag_pipeline.embeddings import get_embedding_model
from rag_pipeline.retriever import retrieve
from risk_engine.compliance_checker import analyze_compliance
from risk_engine.risk_scoring import calculate_compliance_score

from services import document_service
from config.supabase_client import log_risk_analysis


def run_analysis(query, session_id: str | None = None):

    if document_service.VECTOR_INDEX is None:
        return {
            'analysis': 'No documents uploaded yet.',
            'compliance_score': 0
        }

    query_embedding = get_embedding_model().encode([query])[0]

    results = retrieve(
        query_embedding,
        document_service.VECTOR_INDEX,
        document_service.DOCUMENT_CHUNKS
    )

    if not results:
        return {
            'analysis': 'No relevant document context found for this query.',
            'compliance_score': 0
        }

    context_parts = []

    for doc in results:
        source = doc.metadata.get('source', 'unknown')
        text = doc.page_content
        context_parts.append(f'Document: {source}\n{text}')

    context = '\n\n'.join(context_parts)

    analysis = analyze_compliance(context, question=query)

    score = calculate_compliance_score(analysis)

    # Best-effort logging of analysis to Supabase (if configured)
    log_risk_analysis(
        session_id=session_id,
        query=query,
        risk_summary=analysis,
        risk_score=score,
        metadata={"result_count": len(results)},
    )

    return {
        'analysis': analysis,
        'compliance_score': score
    }
