"""Service for generating Mermaid.js flowchart code from document content."""

import os
import re

try:
    from groq import Groq
except Exception:
    Groq = None

from config.settings import MODEL_NAME
from rag_pipeline.embeddings import get_embedding_model
from rag_pipeline.retriever import retrieve
from services import document_service


client = None
api_key = os.getenv('GROQ_API_KEY')

if Groq is not None and api_key:
    try:
        client = Groq(api_key=api_key)
    except Exception:
        client = None


def _clean_mermaid(raw: str) -> str:
    """Extract only the mermaid code block from LLM output."""
    # Try to find ```mermaid ... ``` block first
    match = re.search(r'```mermaid\s*\n(.*?)```', raw, re.DOTALL)
    if match:
        return match.group(1).strip()

    # Try to find ``` ... ``` block
    match = re.search(r'```\s*\n(.*?)```', raw, re.DOTALL)
    if match:
        return match.group(1).strip()

    # If the output already starts with flowchart/graph, return it as-is
    stripped = raw.strip()
    if stripped.startswith('flowchart') or stripped.startswith('graph'):
        return stripped

    return stripped


def _sanitize_mermaid(mermaid_code: str) -> str:
    """
    Fix common Mermaid syntax issues in LLM-generated flowcharts.

    Handles:
    - "Label"[[text]] -> node1["text"]
    - "Label"[["text"]] -> node1["text"]  (already quoted label)
    - "Label"[(ShapeType)text] -> node1["text"]  (shape hint in content)
    - Duplicate node IDs
    - Shape type names in labels like (Cylinder), (Rounded)
    - Unquoted special characters
    """
    lines = mermaid_code.split('\n')
    node_counter = 0
    node_id_map = {}  # Maps (base_id, label) to unique node_id
    node_definitions = []  # List of (node_id, label) tuples in order
    edges = []  # List of (from_id, to_id) tuples

    def get_unique_node_id(base_id, label):
        """Get or create a unique node ID for a given base_id and label combination."""
        nonlocal node_counter
        key = f"{base_id}:{label}"
        if key not in node_id_map:
            node_counter += 1
            node_id_map[key] = f'n{node_counter}'
            node_definitions.append((node_id_map[key], label))
        return node_id_map[key]

    def clean_label(text):
        """Remove shape hints and clean up label text."""
        # Remove shape type hints like (Cylinder), (Rounded), {Hexagon}
        text = re.sub(r'\(Cylinder\)|\(Rounded\)|\(Square\)|\{Hexagon\}|Hexagon', '', text, flags=re.IGNORECASE)
        # Strip surrounding quotes if present
        if text.startswith('"') and text.endswith('"'):
            text = text[1:-1]
        # Remove any remaining bracket artifacts
        text = re.sub(r'^[\[\(\{]+|[\]\)\}]+$', '', text)
        return text.strip().replace('"', "'")

    def extract_node_info(text):
        """Extract node ID and label from various formats."""
        text = text.strip()

        # Pattern 1: "Label"[["text"]] - quoted ID with quoted label (standard mermaid)
        match = re.match(r'"([^"]+)"\["([^"]*)"\]', text)
        if match:
            label = clean_label(match.group(2))
            return get_unique_node_id(match.group(1), label), label

        # Pattern 2: "Label"[[...]] or "Label"[(...)] - malformed LLM output
        # The quoted part BEFORE the brackets is the intended label
        match = re.match(r'"([^"]+)"([\[\(\{]{1,2})(.*?)([\]\)\}]{1,2})', text)
        if match:
            # Use the quoted ID as the primary label source
            label = clean_label(match.group(1))
            # Also check if there's additional meaningful content after shape hints
            content = match.group(3)
            content_clean = clean_label(content)
            # If content is different from ID and not just a shape hint, use it
            if content_clean and content_clean.lower() not in ['cylinder', 'rounded', 'square', 'hexagon'] and content_clean != label:
                label = content_clean
            return get_unique_node_id(match.group(1), label), label

        # Pattern 3: "Label"{Hexagon}Text - decision node with text after
        match = re.match(r'"([^"]+)"\{([^}]*)\}(.+)', text)
        if match:
            label = clean_label(match.group(3))
            return get_unique_node_id(match.group(1), label), label

        # Pattern 4: node_id["text"] - standard format
        match = re.match(r'(\w+)\["([^"]*)"\]', text)
        if match:
            label = clean_label(match.group(2))
            return get_unique_node_id(match.group(1), label), label

        # Fallback: use text as label
        label = clean_label(text)
        return get_unique_node_id('node', label), label

    # Parse all lines
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith('flowchart'):
            continue

        # Split by edge patterns
        parts = re.split(r'\s*-->\s*|\s*---\s*|\s*-\.\-\>\s*', stripped)
        parts = [p.strip() for p in parts if p.strip()]

        if len(parts) >= 2:
            # Has edges
            for i in range(len(parts) - 1):
                from_id, _ = extract_node_info(parts[i])
                to_id, _ = extract_node_info(parts[i + 1])
                edges.append((from_id, to_id))
        elif len(parts) == 1:
            # Just a node definition
            extract_node_info(parts[0])

    # Build output - first define all nodes, then all edges
    output_lines = ['flowchart TD']

    # Add node definitions
    for node_id, label in node_definitions:
        output_lines.append(f'    {node_id}["{label}"]')

    # Add edges - remove duplicates
    seen_edges = set()
    for from_id, to_id in edges:
        edge_key = f"{from_id}:{to_id}"
        if edge_key not in seen_edges:
            output_lines.append(f'    {from_id} --> {to_id}')
            seen_edges.add(edge_key)

    return '\n'.join(output_lines)


def _heuristic_flowchart(chunks) -> str:
    """Generate a basic mermaid flowchart from document chunks without LLM.

    Shows internal structure: sections/topics within the document connected sequentially.
    """

    sections = []
    for chunk in chunks:
        # Extract first meaningful line as section title
        lines = [ln.strip() for ln in chunk.page_content.split('\n') if ln.strip()]
        if lines:
            title = lines[0][:60]  # Keep concise
            sections.append(title)

    if not sections:
        return 'flowchart TD\n    empty["No content available"]'

    lines = ['flowchart TD']
    lines.append('    start["Document Start"]')
    prev_id = 'start'
    node_id = 1

    # Limit sections for readability (max 12 nodes)
    for section in sections[:12]:
        sec_id = f's{node_id}'
        safe_section = section.replace('"', "'").replace('\n', ' ')
        lines.append(f'    {sec_id}["{safe_section}"]')
        lines.append(f'    {prev_id} --> {sec_id}')
        node_id += 1
        prev_id = sec_id

    lines.append(f'    end{{"Document End"}}')
    lines.append(f'    {prev_id} --> end')

    return '\n'.join(lines)


def generate_flowchart(document_name: str | None = None) -> dict:
    """Generate a Mermaid flowchart representing the internal structure of a document."""

    if document_service.VECTOR_INDEX is None or not document_service.DOCUMENT_CHUNKS:
        return {
            'mermaid': '',
            'error': 'No documents uploaded yet. Please upload documents first.'
        }

    # Filter chunks by document name if specified
    if document_name:
        normalized = os.path.basename(document_name)
        target_chunks = [
            chunk for chunk in document_service.DOCUMENT_CHUNKS
            if os.path.basename(chunk.metadata.get('source', '')) == normalized
        ]
        if not target_chunks:
            return {
                'mermaid': '',
                'error': f'Document "{document_name}" not found in indexed documents.'
            }
    else:
        target_chunks = document_service.DOCUMENT_CHUNKS

    # Build context from the document chunks
    context_parts = []
    for chunk in target_chunks[:15]:  # Limit to avoid token overflow
        source = os.path.basename(chunk.metadata.get('source', 'unknown'))
        context_parts.append(f"Document: {source}\n{chunk.page_content}")

    context = '\n\n---\n\n'.join(context_parts)

    if client is None:
        # No LLM available, use heuristic
        mermaid_code = _heuristic_flowchart(target_chunks)
        mermaid_code = _sanitize_mermaid(mermaid_code)
        return {
            'mermaid': mermaid_code,
            'method': 'heuristic'
        }

    prompt = f"""You are a document analysis expert. Analyze the following document content and generate a Mermaid.js flowchart that represents the INTERNAL STRUCTURE and KEY CONCEPTS of the document.

The flowchart should show:
- Main sections/topics within the document as nodes
- How different parts of the document connect to each other
- Key concepts, policies, rules, or processes described in the document
- The logical flow of information within the document itself

IMPORTANT: This flowchart should show the document's internal structure ONLY - not how it connects to other documents or external systems. Focus on what's inside this single document.

Rules for the Mermaid code:
1. Use 'flowchart TD' (top-down) direction
2. Use descriptive but concise node labels (max 40 characters)
3. Use different node shapes for different types of content:
   - [Square] for main sections/topics
   - ([Rounded]) for processes/procedures
   - {{Hexagon}} for decision points
   - [(Cylinder)] for data/records
4. Use meaningful edge labels where appropriate
5. Keep it readable - max 15-20 nodes
6. Wrap all node labels in double quotes to avoid syntax errors
7. Do NOT use special characters like parentheses, brackets, or pipes inside node labels
8. Return ONLY the Mermaid code, nothing else. No explanations.

Document Content:
{context}"""

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{'role': 'user', 'content': prompt}],
        )

        content = response.choices[0].message.content
        if content and content.strip():
            mermaid_code = _clean_mermaid(content)
            mermaid_code = _sanitize_mermaid(mermaid_code)
            return {
                'mermaid': mermaid_code,
                'method': 'llm'
            }
    except Exception:
        pass

    # Fallback to heuristic
    mermaid_code = _heuristic_flowchart(target_chunks)
    mermaid_code = _sanitize_mermaid(mermaid_code)
    return {
        'mermaid': mermaid_code,
        'method': 'heuristic_fallback'
    }
