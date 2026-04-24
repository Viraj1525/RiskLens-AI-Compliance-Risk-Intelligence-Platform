import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

void motion;
import { generateFlowchart, getDocuments, getApiErrorMessage } from '../api/axios';
import {
    GitBranch, Loader2, FileText, Download, Copy, Check,
    Maximize2, Minimize2, RefreshCw, Sparkles, ZoomIn, ZoomOut,
} from 'lucide-react';
import toast from 'react-hot-toast';

function normalizeDocuments(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.documents)) return payload.documents;
    return [];
}

const MERMAID_CDN = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

export default function Flowchart() {
    const [docs, setDocs] = useState([]);
    const [loadingDocs, setLoadingDocs] = useState(true);
    const [selectedDoc, setSelectedDoc] = useState('');
    const [loading, setLoading] = useState(false);
    const [mermaidCode, setMermaidCode] = useState('');
    const [svgContent, setSvgContent] = useState('');
    const [renderError, setRenderError] = useState('');
    const [copied, setCopied] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [showCode, setShowCode] = useState(false);
    const [scale, setScale] = useState(1);
    const mermaidRef = useRef(null);
    const containerRef = useRef(null);
    const mermaidModuleRef = useRef(null);

    // Fetch documents on mount
    useEffect(() => {
        getDocuments()
            .then((res) => setDocs(normalizeDocuments(res.data)))
            .catch(() => setDocs([]))
            .finally(() => setLoadingDocs(false));
    }, []);

    // Load mermaid module once
    useEffect(() => {
        let cancelled = false;

        import(/* @vite-ignore */ MERMAID_CDN)
            .then((mod) => {
                if (cancelled) return;
                const mermaid = mod.default;
                mermaid.initialize({
                    startOnLoad: false,
                    theme: 'dark',
                    themeVariables: {
                        primaryColor: '#1e3a5f',
                        primaryTextColor: '#f1f5f9',
                        primaryBorderColor: '#3b82f6',
                        lineColor: '#60a5fa',
                        secondaryColor: '#162032',
                        tertiaryColor: '#0f172a',
                        noteTextColor: '#94a3b8',
                        noteBkgColor: '#1e293b',
                        mainBkg: '#162032',
                        nodeBorder: '#3b82f6',
                        clusterBkg: '#0f172a',
                        clusterBorder: '#1e3a5f',
                        titleColor: '#f1f5f9',
                        edgeLabelBackground: '#0f172a',
                        fontFamily: 'Inter, Outfit, sans-serif',
                    },
                    flowchart: {
                        htmlLabels: true,
                        curve: 'basis',
                        padding: 16,
                        nodeSpacing: 50,
                        rankSpacing: 60,
                    },
                    securityLevel: 'loose',
                });
                mermaidModuleRef.current = mermaid;
            })
            .catch((err) => {
                console.error('Failed to load Mermaid:', err);
            });

        return () => { cancelled = true; };
    }, []);

    // Render mermaid diagram whenever mermaidCode changes
    const renderMermaid = useCallback(async (code) => {
        if (!code || !mermaidModuleRef.current) return;

        setRenderError('');
        setSvgContent('');

        try {
            const id = `flowchart-${Date.now()}`;
            const { svg } = await mermaidModuleRef.current.render(id, code);
            setSvgContent(svg);
        } catch (err) {
            console.error('Mermaid render error:', err);
            setRenderError(err?.message || 'Failed to render the flowchart diagram.');
        }
    }, []);

    useEffect(() => {
        if (mermaidCode) {
            // Small delay to ensure mermaid module is ready
            const timer = setTimeout(() => renderMermaid(mermaidCode), 300);
            return () => clearTimeout(timer);
        }
    }, [mermaidCode, renderMermaid]);

    const generate = async () => {
        setLoading(true);
        setMermaidCode('');
        setSvgContent('');
        setRenderError('');
        setScale(1);

        try {
            const response = await generateFlowchart(selectedDoc || null);

            if (response.data?.error) {
                toast.error(response.data.error);
                return;
            }

            const code = response.data?.mermaid || '';
            if (!code) {
                toast.error('No flowchart data returned.');
                return;
            }

            setMermaidCode(code);
            toast.success('Flowchart generated successfully!');
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Failed to generate flowchart. Is the backend running?'));
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(mermaidCode);
            setCopied(true);
            toast.success('Mermaid code copied!');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Failed to copy.');
        }
    };

    const handleDownloadSVG = () => {
        if (!svgContent) return;
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `document-flowchart-${Date.now()}.svg`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('SVG downloaded!');
    };

    const handleDownloadPNG = () => {
        if (!svgContent) return;

        const svgEl = containerRef.current?.querySelector('svg');
        if (!svgEl) return;

        const canvas = document.createElement('canvas');
        const bbox = svgEl.getBoundingClientRect();
        const dpr = 2;
        canvas.width = bbox.width * dpr;
        canvas.height = bbox.height * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        const img = new Image();
        const svgData = new XMLSerializer().serializeToString(svgEl);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);

        img.onload = () => {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, bbox.width, bbox.height);
            URL.revokeObjectURL(svgUrl);

            canvas.toBlob((blob) => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `document-flowchart-${Date.now()}.png`;
                a.click();
                URL.revokeObjectURL(a.href);
                toast.success('PNG downloaded!');
            });
        };

        img.src = svgUrl;
    };

    const docName = (doc) => typeof doc === 'string' ? doc : doc?.name || doc?.filename || 'Document';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: expanded ? '100%' : 960 }}>

            {/* Header Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ padding: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 15px rgba(139,92,246,0.35)',
                    }}>
                        <GitBranch size={20} color="white" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontFamily: 'Outfit', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                            Document Flowchart Generator
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            Visualize the internal structure and key concepts of your documents
                        </div>
                    </div>
                </div>

                {/* Document Picker */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>
                        Select Document
                    </label>
                    {loadingDocs ? (
                        <div className="skeleton" style={{ height: 44, borderRadius: 10 }} />
                    ) : docs.length === 0 ? (
                        <div style={{
                            padding: '12px 16px', borderRadius: 10,
                            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                            fontSize: '0.84rem', color: '#f87171',
                        }}>
                            No documents uploaded. Please upload documents first.
                        </div>
                    ) : (
                        <select
                            className="input-field"
                            value={selectedDoc}
                            onChange={(e) => setSelectedDoc(e.target.value)}
                            style={{
                                cursor: 'pointer',
                                appearance: 'none',
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 14px center',
                                paddingRight: 36,
                            }}
                        >
                            <option value="">All Documents (combined)</option>
                            {docs.map((doc, i) => {
                                const name = docName(doc);
                                return <option key={name + i} value={name}>{name}</option>;
                            })}
                        </select>
                    )}
                </div>

                {/* Generate Button */}
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        className="btn btn-primary"
                        onClick={generate}
                        disabled={loading || docs.length === 0}
                        style={{
                            opacity: (loading || docs.length === 0) ? 0.6 : 1,
                            background: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
                            boxShadow: '0 4px 15px rgba(139,92,246,0.35)',
                        }}
                    >
                        {loading
                            ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</>
                            : <><Sparkles size={16} /> Generate Flowchart</>
                        }
                    </button>
                    {mermaidCode && (
                        <button className="btn btn-secondary" onClick={generate} disabled={loading}
                            style={{ opacity: loading ? 0.6 : 1 }}>
                            <RefreshCw size={15} /> Regenerate
                        </button>
                    )}
                </div>
            </motion.div>

            {/* Loading Skeletons */}
            {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
                    <div className="skeleton" style={{ height: 48, borderRadius: 12 }} />
                </div>
            )}

            {/* Flowchart Render */}
            <AnimatePresence>
                {!loading && svgContent && (
                    <motion.div
                        key="flowchart-render"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="glass-card"
                        style={{ overflow: 'hidden' }}
                    >
                        {/* Toolbar */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '14px 20px',
                            borderBottom: '1px solid var(--border)',
                            flexWrap: 'wrap', gap: 10,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <GitBranch size={16} color="#a855f7" />
                                <span style={{ fontWeight: 700, fontFamily: 'Outfit', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                    Document Structure
                                </span>
                                <span className="badge badge-info" style={{ background: 'rgba(139,92,246,0.15)', color: '#a855f7', borderColor: 'rgba(139,92,246,0.3)' }}>
                                    Mermaid.js
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn btn-secondary" onClick={() => setScale((s) => Math.min(s + 0.2, 3))}
                                    style={{ padding: '6px 10px', fontSize: '0.75rem' }} title="Zoom In">
                                    <ZoomIn size={14} />
                                </button>
                                <button className="btn btn-secondary" onClick={() => setScale((s) => Math.max(s - 0.2, 0.3))}
                                    style={{ padding: '6px 10px', fontSize: '0.75rem' }} title="Zoom Out">
                                    <ZoomOut size={14} />
                                </button>
                                <button className="btn btn-secondary" onClick={() => setScale(1)}
                                    style={{ padding: '6px 10px', fontSize: '0.75rem' }} title="Reset Zoom">
                                    100%
                                </button>
                                <button className="btn btn-secondary" onClick={() => setExpanded((v) => !v)}
                                    style={{ padding: '6px 10px', fontSize: '0.75rem' }} title={expanded ? 'Collapse' : 'Expand'}>
                                    {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                                </button>
                            </div>
                        </div>

                        {/* Diagram */}
                        <div
                            ref={containerRef}
                            style={{
                                padding: 28,
                                overflowX: 'auto',
                                overflowY: 'auto',
                                maxHeight: expanded ? '80vh' : 520,
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'flex-start',
                                background: 'radial-gradient(circle at center, rgba(139,92,246,0.03) 0%, transparent 70%)',
                                minHeight: 200,
                            }}
                        >
                            <div
                                ref={mermaidRef}
                                style={{
                                    transform: `scale(${scale})`,
                                    transformOrigin: 'top center',
                                    transition: 'transform 0.25s ease',
                                }}
                                dangerouslySetInnerHTML={{ __html: svgContent }}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Render Error */}
            {!loading && renderError && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{
                        padding: '16px 20px', borderRadius: 12,
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                    }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#f87171', marginBottom: 6 }}>
                        Flowchart Render Error
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {renderError}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                        Try regenerating — the AI may produce slightly different valid output.
                    </div>
                </motion.div>
            )}

            {/* Actions & Code Panel */}
            <AnimatePresence>
                {!loading && mermaidCode && (
                    <motion.div
                        key="actions"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                    >
                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <button className="btn btn-secondary" onClick={handleCopy}>
                                {copied ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
                                {copied ? 'Copied!' : 'Copy Mermaid Code'}
                            </button>
                            {svgContent && (
                                <>
                                    <button className="btn btn-secondary" onClick={handleDownloadSVG}>
                                        <Download size={15} /> Download SVG
                                    </button>
                                    <button className="btn btn-secondary" onClick={handleDownloadPNG}>
                                        <Download size={15} /> Download PNG
                                    </button>
                                </>
                            )}
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowCode((v) => !v)}
                                style={{
                                    background: showCode ? 'rgba(139,92,246,0.15)' : undefined,
                                    borderColor: showCode ? '#8b5cf6' : undefined,
                                    color: showCode ? '#a855f7' : undefined,
                                }}
                            >
                                <FileText size={15} />
                                {showCode ? 'Hide Code' : 'Show Mermaid Code'}
                            </button>
                        </div>

                        {/* Collapsible Code View */}
                        <AnimatePresence>
                            {showCode && (
                                <motion.div
                                    key="code-view"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                    style={{ overflow: 'hidden' }}
                                >
                                    <div className="glass-card" style={{ padding: 20 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                Mermaid Source
                                            </span>
                                            <button
                                                onClick={handleCopy}
                                                style={{
                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                    color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4,
                                                    fontSize: '0.75rem',
                                                }}
                                            >
                                                {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                                                {copied ? 'Copied' : 'Copy'}
                                            </button>
                                        </div>
                                        <pre style={{
                                            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                            fontSize: '0.8rem', color: '#a855f7',
                                            lineHeight: 1.7, fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                            borderRadius: 10, padding: '14px 16px',
                                            background: 'rgba(0,0,0,0.3)',
                                            border: '1px solid rgba(139,92,246,0.2)',
                                            maxHeight: 350, overflowY: 'auto',
                                        }}>
                                            {mermaidCode}
                                        </pre>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Empty State */}
            {!loading && !mermaidCode && docs.length > 0 && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.2 } }}
                    style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}
                >
                    <GitBranch size={56} style={{ margin: '0 auto 16px', opacity: 0.15 }} />
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        No flowchart generated yet
                    </div>
                    <div style={{ fontSize: '0.82rem', maxWidth: 400, margin: '0 auto' }}>
                        Select a document and click "Generate Flowchart" to visualize its internal structure, sections, and key concepts.
                    </div>
                </motion.div>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .flowchart-container svg {
                    max-width: 100%;
                    height: auto;
                }
            `}</style>
        </div>
    );
}
