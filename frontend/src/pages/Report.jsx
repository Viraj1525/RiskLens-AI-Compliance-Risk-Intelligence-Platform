import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

void motion;
import { generateReport, getApiErrorMessage } from '../api/axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FileText, Loader2, ShieldAlert, Printer, Download, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';

const RISK_COLORS = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' };

function extractSeverityCounts(text = '') {
    const matches = (text || '').match(/severity\s*[:\-]?\s*(high|medium|low)/gi) || [];
    const counts = { high: 0, medium: 0, low: 0 };

    matches.forEach((match) => {
        const normalized = match.toLowerCase();
        if (normalized.includes('high')) counts.high += 1;
        if (normalized.includes('medium')) counts.medium += 1;
        if (normalized.includes('low')) counts.low += 1;
    });

    return counts;
}

function parseReportStats(text) {
    const counts = extractSeverityCounts(text);

    return [
        { name: 'High', value: counts.high },
        { name: 'Medium', value: counts.medium },
        { name: 'Low', value: counts.low },
    ];
}

export default function Report() {
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState('');
    const [stats, setStats] = useState(null);
    const [score, setScore] = useState(null);
    const [downloadUrl, setDownloadUrl] = useState('');

    const generate = async () => {
        setLoading(true);
        setReport('');
        setStats(null);
        setScore(null);
        setDownloadUrl('');

        try {
            const response = await generateReport();
            const analysisText = response.data?.analysis || '';
            const reportPath = response.data?.report_path || '';
            const complianceScore = response.data?.compliance_score;
            const severityCounts = extractSeverityCounts(analysisText);

            setReport(analysisText);
            setStats(parseReportStats(analysisText));
            setScore(complianceScore);

            if (reportPath) {
                setDownloadUrl(`/api/${reportPath.replace(/^\/+/, '').replace(/\\/g, '/')}`);
            }

            localStorage.setItem('compliance:lastAnalysis', JSON.stringify({
                score: complianceScore,
                analysis: analysisText,
                severityCounts,
                query: 'Analyze this document for compliance risks',
                updatedAt: new Date().toISOString(),
            }));

            toast.success('Compliance report generated.');
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Failed to generate report. Is the backend running?'));
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const hasChartData = Array.isArray(stats) && stats.some((item) => item.value > 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ padding: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div style={{ fontWeight: 700, fontFamily: 'Outfit', fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ShieldAlert size={19} color="#60a5fa" /> AI Compliance Audit Report
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Generate a comprehensive audit report for indexed documents
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {report && (
                            <motion.button
                                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                className="btn btn-secondary" onClick={handlePrint}
                            >
                                <Printer size={15} /> Print / Save PDF
                            </motion.button>
                        )}
                        {downloadUrl && (
                            <a className="btn btn-secondary" href={downloadUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                                <Download size={15} /> Open Backend PDF
                            </a>
                        )}
                        <motion.button
                            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            className="btn btn-primary" onClick={generate} disabled={loading}
                            style={{ opacity: loading ? 0.7 : 1 }}
                        >
                            {loading
                                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</>
                                : <><FileText size={16} /> Generate Report</>}
                        </motion.button>
                    </div>
                </div>
            </motion.div>

            {score !== null && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ padding: '14px 18px' }}>
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>Compliance Score</div>
                    <div style={{ fontFamily: 'Outfit', fontSize: '1.8rem', fontWeight: 800, color: score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444' }}>{score}/100</div>
                </motion.div>
            )}

            {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[120, 80, 100, 60, 90].map((h, i) => <div key={i} className="skeleton" style={{ height: h, borderRadius: 12 }} />)}
                </div>
            )}

            <AnimatePresence>
                {!loading && report && (
                    <motion.div key="report" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                        {stats && (
                            <div className="glass-card" style={{ padding: 24 }}>
                                <div style={{ fontWeight: 700, fontFamily: 'Outfit', fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: 18 }}>
                                    Risk Distribution
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 18 }}>
                                    {stats.map((item) => (
                                        <div
                                            key={item.name}
                                            style={{
                                                border: '1px solid var(--border)',
                                                borderRadius: 12,
                                                padding: '12px 14px',
                                                background: 'rgba(255,255,255,0.02)',
                                            }}
                                        >
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>{item.name}</div>
                                            <div style={{ fontFamily: 'Outfit', fontSize: '1.4rem', fontWeight: 700, color: RISK_COLORS[item.name] }}>{item.value}</div>
                                        </div>
                                    ))}
                                </div>

                                {hasChartData ? (
                                    <div style={{ width: '100%', height: 220 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={stats} barSize={40} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                                                <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 13 }} axisLine={false} tickLine={false} />
                                                <YAxis
                                                    allowDecimals={false}
                                                    domain={[0, (dataMax) => Math.max(1, dataMax)]}
                                                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <Tooltip
                                                    contentStyle={{ background: '#1e293b', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }}
                                                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                                                />
                                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                                    {stats.map((entry, i) => (
                                                        <Cell key={i} fill={RISK_COLORS[entry.name]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            padding: '18px 16px',
                                            borderRadius: 12,
                                            border: '1px solid var(--border)',
                                            background: 'rgba(255,255,255,0.02)',
                                        }}
                                    >
                                        <BarChart3 size={20} color="#60a5fa" />
                                        <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                                            No structured severity labels were detected in the generated report, so the graph has no bars to plot yet.
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="glass-card" id="report-content" style={{ padding: 28 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                <div style={{ fontWeight: 700, fontFamily: 'Outfit', fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <FileText size={18} color="#60a5fa" /> Report Content
                                </div>
                                <span className="badge badge-info">AI Generated</span>
                            </div>
                            <pre style={{
                                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                fontSize: '0.84rem', color: 'var(--text-secondary)',
                                lineHeight: 1.8, fontFamily: 'Inter, sans-serif',
                                borderRadius: 10, padding: '16px 18px',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid var(--border)',
                                maxHeight: 520, overflowY: 'auto',
                            }}>
                                {report}
                            </pre>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {!loading && !report && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.2 } }}
                    style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                    <FileText size={56} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>No report yet</div>
                    <div style={{ fontSize: '0.82rem' }}>Click "Generate Report" to create an AI compliance audit report</div>
                </motion.div>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @media print {
                    aside, header, .btn { display: none !important; }
                    #report-content { box-shadow: none; border: 1px solid #ccc; }
                    body { background: white; color: black; }
                }
            `}</style>
        </div>
    );
}
