from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from services.flowchart_service import generate_flowchart

router = APIRouter()


class FlowchartRequest(BaseModel):
    document_name: Optional[str] = None


@router.post("/generate-flowchart")
def create_flowchart(request: Optional[FlowchartRequest] = None):
    doc_name = None
    if request and request.document_name:
        doc_name = request.document_name.strip()

    result = generate_flowchart(doc_name)
    return result
