import os
import re
from difflib import SequenceMatcher

try:
    from dotenv import load_dotenv
except Exception:
    def load_dotenv():
        return False

try:
    from groq import Groq
except Exception:
    Groq = None

from config.settings import MODEL_NAME

load_dotenv()


def _build_heuristic_findings(context):
    text = (context or '').lower()

    rules = [
        ('Data Retention Policy', 'Data lifecycle', ['indefinite', 'no retention', 'retain forever'], 'High', 'Define explicit retention periods and deletion procedures.'),
        ('Encryption Controls', 'Security controls', ['unencrypted', 'no encryption', 'without encryption'], 'High', 'Require encryption at rest and in transit for sensitive data.'),
        ('Access Control Gaps', 'Identity and access', ['shared password', 'no mfa', 'public access'], 'Medium', 'Enforce least privilege, MFA, and role-based access control.'),
        ('Consent and Privacy Notice', 'Privacy compliance', ['no consent', 'without consent', 'missing privacy notice'], 'Medium', 'Add lawful basis and consent language aligned with GDPR/CCPA.'),
        ('Incident Response Readiness', 'Security operations', ['no incident response', 'breach not reported'], 'Low', 'Document an incident response and breach notification workflow.'),
    ]

    findings = []

    for risk, section, patterns, severity, recommendation in rules:
        if any(pattern in text for pattern in patterns):
            findings.append({
                'risk': risk,
                'section': section,
                'issue': f"Potential issue detected based on keywords: {', '.join(patterns)}",
                'severity': severity,
                'recommendation': recommendation,
            })

    if not findings:
        findings.append({
            'risk': 'General Compliance Review',
            'section': 'Document-wide',
            'issue': 'No explicit high-confidence compliance violations were detected by the fallback analyzer.',
            'severity': 'Low',
            'recommendation': 'Run a deeper legal and security review for final sign-off.',
        })

    return findings


def _format_findings(findings):
    parts = []

    for item in findings:
        parts.append(
            "\n".join([
                f"Risk: {item['risk']}",
                f"Section: {item['section']}",
                f"Issue: {item['issue']}",
                f"Severity: {item['severity']}",
                f"Recommendation: {item['recommendation']}",
            ])
        )

    return "\n\n".join(parts)


def _heuristic_analyze(context, question=None):
    combined_context = context or ''

    if question and question.strip():
        combined_context = f"{combined_context}\n\nQuestion: {question.strip()}"

    findings = _build_heuristic_findings(combined_context)

    if question and question.strip():
        heading = f"Focus Question: {question.strip()}"
        return f"{heading}\n\n{_format_findings(findings)}"

    return _format_findings(findings)


def _normalize_token(token):
    token = token.lower()
    for suffix in ('tion', 'sion', 'ment', 'ness', 'ing', 'edly', 'edly', 'edly', 'ed', 'es', 's'):
        if token.endswith(suffix) and len(token) - len(suffix) >= 4:
            token = token[:-len(suffix)]
            break
    return token


def _tokenize(text):
    raw = re.findall(r"[a-z0-9]+", (text or '').lower())
    return set(_normalize_token(token) for token in raw)


def _extract_keywords(text):
    stopwords = {
        'the', 'a', 'an', 'is', 'are', 'what', 'does', 'it', 'about', 'and', 'or', 'to', 'for',
        'of', 'in', 'on', 'with', 'this', 'that', 'say', 'says', 'please', 'tell', 'me'
    }
    return [token for token in _tokenize(text) if len(token) > 2 and token not in stopwords]


def _keyword_overlap_score(question_keywords, sentence_tokens):
    score = 0

    for keyword in question_keywords:
        for token in sentence_tokens:
            if keyword == token:
                score += 3
                break
            if keyword in token or token in keyword:
                score += 2
                break
            if keyword[:5] == token[:5]:
                score += 1
                break
            if SequenceMatcher(None, keyword, token).ratio() >= 0.72:
                score += 1
                break

    return score


def _extract_relevant_sentences(context, question, limit=3):
    sentences = re.split(r"(?<=[.!?])\s+|\n+", context or '')
    question_keywords = _extract_keywords(question)
    ranked = []

    for sentence in sentences:
        clean = sentence.strip()
        if not clean:
            continue

        sentence_tokens = _tokenize(clean)
        score = _keyword_overlap_score(question_keywords, sentence_tokens)
        if score > 0:
            ranked.append((score, clean))

    ranked.sort(key=lambda item: item[0], reverse=True)
    return [text for _, text in ranked[:limit]]


def _heuristic_chat_answer(context, question, history=None):
    relevant = _extract_relevant_sentences(context, question, limit=3)

    if relevant:
        if len(relevant) == 1:
            return relevant[0]
        return "\n".join([f"- {line}" for line in relevant])

    return (
        f"I could not find a direct answer for \"{question.strip()}\" in the indexed text. "
        "Try a more specific clause, policy term, or section name."
    )


client = None
api_key = os.getenv('GROQ_API_KEY')

if Groq is not None and api_key:
    try:
        client = Groq(api_key=api_key)
    except Exception:
        client = None


def analyze_compliance(context, question=None):

    if client is None:
        return _heuristic_analyze(context, question=question)

    user_focus = question.strip() if isinstance(question, str) else ''

    prompt = f"""
You are a compliance risk analyst.

Analyze the following company policy text and identify:

Risk:
Section:
Issue:
Severity:
Recommendation:

User Question (focus your analysis on this, if provided):
{user_focus or 'General compliance and security risk review'}

Document Text:
{context}

Note that not every document is a correct policy document, some of them can be invoices, resumes, etc. 
so, analyze the document text and check for compliance and security risks. Also check if it is a policy document or not. If it is not a policy document, return "Not a policy document".
"""

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {'role': 'user', 'content': prompt}
            ],
        )

        content = response.choices[0].message.content

        if content and content.strip():
            return content
    except Exception:
        pass

    return _heuristic_analyze(context, question=question)


def answer_question(context, question, history=None):
    user_question = (question or '').strip()
    if not user_question:
        return 'Please ask a specific compliance question.'

    if client is None:
        return _heuristic_chat_answer(context, user_question, history=history)

    history_lines = []
    for item in (history or [])[-8:]:
        role = item.get('role', 'user')
        content = (item.get('content') or '').strip()
        if not content:
            continue
        history_lines.append(f"{role.title()}: {content}")

    history_block = '\n'.join(history_lines) if history_lines else 'No prior conversation.'

    prompt = f"""
You are a conversational compliance assistant.
Answer the user's question directly based only on the document context.
Do not output the risk template (Risk/Section/Issue/Severity/Recommendation) unless explicitly asked.
If context is insufficient, say what is missing and ask one clarifying question.
Keep responses concise and specific.

Conversation History:
{history_block}

Current User Question:
{user_question}

Document Context:
{context}
"""

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{'role': 'user', 'content': prompt}],
        )
        content = response.choices[0].message.content
        if content and content.strip():
            return content
    except Exception:
        pass

    return _heuristic_chat_answer(context, user_question, history=history)
