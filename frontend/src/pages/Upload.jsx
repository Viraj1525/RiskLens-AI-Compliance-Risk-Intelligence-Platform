import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';

void motion;
import { uploadDocuments, getDocuments, deleteDocument, getApiErrorMessage } from '../api/axios';
import { Upload as UploadIcon, FileText, Loader2, CloudUpload, Trash2, Files } from 'lucide-react';
import toast from 'react-hot-toast';

function normalizeDocuments(payload) {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (Array.isArray(payload?.documents)) {
        return payload.documents;
    }

    return [];
}

function DocItem({ doc, index, deleting, onDelete }) {
    const name = typeof doc === 'string' ? doc : doc?.name || doc?.filename || 'Document';

    return (
        <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
                borderRadius: 10,
            }}
        >
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={16} color="#60a5fa" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Indexed and ready for multi-document analysis</div>
            </div>
            <span className="badge badge-info">Indexed</span>
            <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onDelete(name)}
                disabled={deleting}
                style={{ padding: '7px 10px', fontSize: '0.75rem', opacity: deleting ? 0.6 : 1 }}
            >
                {deleting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
                {deleting ? 'Removing' : 'Remove'}
            </button>
        </motion.div>
    );
}

function UploadSummary({ files }) {
    if (!files.length) {
        return null;
    }

    return (
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Pending Batch
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 460, margin: '0 auto' }}>
                {files.slice(0, 4).map((file) => (
                    <div
                        key={`${file.name}-${file.size}`}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '10px 12px',
                            borderRadius: 10,
                            border: '1px solid rgba(59,130,246,0.18)',
                            background: 'rgba(59,130,246,0.06)',
                            textAlign: 'left',
                        }}
                    >
                        <FileText size={14} color="#60a5fa" />
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                            {file.name}
                        </span>
                    </div>
                ))}
                {files.length > 4 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        +{files.length - 4} more document{files.length - 4 === 1 ? '' : 's'}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Upload() {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [docs, setDocs] = useState([]);
    const [loadingDocs, setLoadingDocs] = useState(true);
    const [dragFiles, setDragFiles] = useState([]);
    const [deletingName, setDeletingName] = useState('');

    const fetchDocs = useCallback(async () => {
        setLoadingDocs(true);

        try {
            const response = await getDocuments();
            setDocs(normalizeDocuments(response.data));
        } catch {
            setDocs([]);
        } finally {
            setLoadingDocs(false);
        }
    }, []);

    useEffect(() => {
        fetchDocs();
    }, [fetchDocs]);

    const onDrop = useCallback(async (acceptedFiles) => {
        if (!acceptedFiles.length) return;

        setDragFiles(acceptedFiles);
        setUploading(true);
        setProgress(0);
        localStorage.removeItem('compliance:lastAnalysis');

        const formData = new FormData();
        acceptedFiles.forEach((file) => {
            formData.append('files', file);
        });

        try {
            const response = await uploadDocuments(formData, setProgress);
            const filesIndexed = response.data?.documents_indexed || acceptedFiles.length;
            toast.success(`${filesIndexed} PDF${filesIndexed === 1 ? '' : 's'} uploaded and indexed. Previous session cleared.`);
            await fetchDocs();
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Upload failed. Check if backend is running.'));
        } finally {
            setUploading(false);
            setDragFiles([]);
            setProgress(0);
        }
    }, [fetchDocs]);

    const onDeleteDocument = useCallback(async (name) => {
        const ok = window.confirm(`Remove "${name}" from storage and index?`);
        if (!ok) return;

        setDeletingName(name);

        try {
            await deleteDocument(name);
            toast.success(`"${name}" removed.`);
            await fetchDocs();
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Failed to remove document.'));
        } finally {
            setDeletingName('');
        }
    }, [fetchDocs]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        multiple: true,
        disabled: uploading,
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 900 }}>

            <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="glass-card"
                {...getRootProps()}
                style={{
                    padding: '48px 32px',
                    textAlign: 'center',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    border: isDragActive
                        ? '2px dashed #3b82f6'
                        : '2px dashed var(--border)',
                    background: isDragActive ? 'rgba(59,130,246,0.06)' : undefined,
                    transition: 'all 0.2s ease',
                    boxShadow: isDragActive ? 'var(--glow-blue)' : undefined,
                }}
            >
                <input {...getInputProps()} />

                <AnimatePresence mode="wait">
                    {uploading ? (
                        <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <Loader2 size={48} color="#60a5fa" style={{ margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
                            <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 8 }}>
                                Uploading {dragFiles.length} document{dragFiles.length === 1 ? '' : 's'}...
                            </div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                                {dragFiles.slice(0, 2).map((file) => file.name).join(', ')}
                                {dragFiles.length > 2 ? ` and ${dragFiles.length - 2} more` : ''}
                            </div>
                            <div style={{ width: '100%', maxWidth: 320, margin: '16px auto 0', height: 6, background: 'var(--bg-secondary)', borderRadius: 999, overflow: 'hidden' }}>
                                <motion.div
                                    style={{ height: '100%', background: 'linear-gradient(90deg, #3b82f6, #06b6d4)', borderRadius: 999 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>{progress}% complete</div>
                        </motion.div>
                    ) : (
                        <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div style={{
                                width: 80, height: 80,
                                background: isDragActive ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.08)',
                                borderRadius: 20,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 20px',
                                transition: 'all 0.2s ease',
                            }}>
                                <CloudUpload size={36} color={isDragActive ? '#60a5fa' : '#3b82f6'} strokeWidth={1.5} />
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: 8, fontFamily: 'Outfit' }}>
                                {isDragActive ? 'Drop your PDF batch here' : 'Drag and drop one or more PDFs'}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
                                or click to browse multiple files for a single analysis session
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <div className="badge badge-info">Multi-PDF upload</div>
                                <div className="badge badge-info">PDF only</div>
                            </div>
                            <UploadSummary files={dragFiles} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 700, fontFamily: 'Outfit', fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Files size={18} color="#60a5fa" />
                        Indexed Documents
                        <span style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', borderRadius: 999, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700 }}>
                            {docs.length}
                        </span>
                    </div>
                    <button className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '6px 14px' }} onClick={fetchDocs}>
                        Refresh
                    </button>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                    All indexed PDFs in this list are analyzed together as one batch until you upload a new batch.
                </div>

                {loadingDocs ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 52 }} />)}
                    </div>
                ) : docs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        <UploadIcon size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                        No documents uploaded yet. Drop one or more PDFs above to get started.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {docs.map((doc, i) => {
                            const name = typeof doc === 'string' ? doc : doc?.name || doc?.filename || '';
                            return (
                                <DocItem
                                    key={typeof doc === 'string' ? doc : doc?.source || i}
                                    doc={doc}
                                    index={i}
                                    deleting={deletingName === name}
                                    onDelete={onDeleteDocument}
                                />
                            );
                        })}
                    </div>
                )}
            </motion.div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
