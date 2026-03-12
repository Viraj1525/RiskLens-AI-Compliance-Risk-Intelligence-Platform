import os
import shutil
from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile

from services.document_service import clear_analysis_session, process_document

router = APIRouter()

UPLOAD_FOLDER = 'data/documents'
ALLOWED_EXTENSIONS = {'.pdf'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def _normalize_filename(upload: UploadFile) -> str:
    return os.path.basename(upload.filename or '')


def _validate_uploads(files: List[UploadFile]) -> List[str]:
    if not files:
        raise HTTPException(status_code=400, detail='At least one PDF document is required')

    filenames = []
    seen = set()

    for upload in files:
        filename = _normalize_filename(upload)

        if not filename:
            raise HTTPException(status_code=400, detail='Invalid filename')

        extension = os.path.splitext(filename)[1].lower()
        if extension not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail='Only PDF documents are supported')

        lowered = filename.lower()
        if lowered in seen:
            raise HTTPException(status_code=400, detail=f'Duplicate filename detected: {filename}')

        seen.add(lowered)
        filenames.append(filename)

    return filenames


def _save_upload(upload: UploadFile, filename: str) -> str:
    file_path = os.path.join(UPLOAD_FOLDER, filename)

    with open(file_path, 'wb') as buffer:
        shutil.copyfileobj(upload.file, buffer)

    return file_path


def _process_upload_batch(files: List[UploadFile]):
    filenames = _validate_uploads(files)
    saved_paths = []
    processed_files = []
    total_chunks = 0

    clear_analysis_session()

    try:
        for upload, filename in zip(files, filenames):
            file_path = _save_upload(upload, filename)
            saved_paths.append(file_path)

            result = process_document(file_path)
            processed_files.append(filename)
            total_chunks += len(result['chunks'])
    except Exception as exc:
        clear_analysis_session()

        for file_path in saved_paths:
            if os.path.exists(file_path):
                os.remove(file_path)

        raise HTTPException(status_code=500, detail=f'Document processing failed: {str(exc)}') from exc
    finally:
        for upload in files:
            upload.file.close()

    return {
        'message': 'Documents uploaded and processed successfully. Previous session data was cleared.',
        'files': processed_files,
        'documents_indexed': len(processed_files),
        'chunks_created': total_chunks,
    }


@router.post('/upload-document')
async def upload_document(file: UploadFile = File(...)):
    result = _process_upload_batch([file])

    return {
        'message': result['message'],
        'file': result['files'][0],
        'files': result['files'],
        'documents_indexed': result['documents_indexed'],
        'chunks_created': result['chunks_created'],
    }


@router.post('/upload-documents')
async def upload_documents(files: List[UploadFile] = File(...)):
    return _process_upload_batch(files)
