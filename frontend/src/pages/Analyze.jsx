import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { analyzeRisk, getApiErrorMessage } from '../api/axios';
import { ShieldAlert, Search, Loader2, ChevronDown, ChevronUp, AlertOctagon, AlertTriangle, Info, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const SUGGESTIONS = [
    'What compliance risks exist in this contract?',
    'Does this policy comply with GDPR?',
    'Identify all data privacy issues in the documents.',
    'What security weaknesses are present?',
    'Check for missing regulatory clauses.',
];

function SeverityBadge({ text = '' }) {
    const t = text.toLowerCase();
    if (t.includes('high')) return <span className="badge badge-high"><AlertOctagon size={11} />High</span>;
    if (t.includes('medium')) return <span className="badge badge-medium"><AlertTriangle size={11} />Medium</span>;
    if (t.includes('low')) return <span className="badge badge-low"><Info size={11} />Low</span>;
    return <span className="badge badge-info">Unknown</span>;
}

function parseRisks(text) {
    const blocks = text.split(/(?=Risk:|^\d+\.)/m).filter((block) => block.trim());

    if (blocks.length <= 1) {
        return null;
    }

    return blocks.map((block) => {
        const get = (key) => {
            const match = block.match(new RegExp(`${key}[:\\s]+(.+?)(?=\\n[A-Z]|$)`, 's'));
            return match ? match[1].trim() : '';
        };

        return {
            risk: get('Risk'),
            section: get('Section'),
            issue: get('Issue'),
            severity: get('Severity'),
            recommendation: get('Recommendation'),
            raw: block.trim(),
        };
    });
}

function calculateSeverityCounts(analysisText = '') {
    const lower = analysisText.toLowerCase();

    return {
        high: (lower.match(/severity\s*:\s*high/g) || []).length,
        medium: (lower.match(/severity\s*:\s*medium/g) || []).length,
        low: (lower.match(/severity\s*:\s*low/g) || []).length,
    };
}

function RiskCard({ item, index }) {
    const [open, setOpen] = useState(true);

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }}
            style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                overflow: 'hidden',
            }}
        >
            <div
                onClick={() => setOpen((value) => !value)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer', userSelect: 'none' }}
            >
                <SeverityBadge text={item.severity} />
                <span style={{ flex: 1, fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    {item.risk || `Risk Finding #${index + 1}`}
                </span>
                {open ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
            </div>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ overflow: 'hidden', borderTop: '1px solid var(--border)' }}
                    >
                        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[
                                { label: 'Section', value: item.section },
                                { label: 'Issue', value: item.issue },
                                { label: 'Recommendation', value: item.recommendation },
                            ].map(({ label, value }) => value ? (
                                <div key={label}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{value}</div>
                                </div>
                            ) : null)}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default function Analyze() {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [rawText, setRawText] = useState('');
    const [score, setScore] = useState(null);

    const run = async (q) => {
        const finalQuery = q || query;

        if (!finalQuery.trim()) {
            toast.error('Enter a query first.');
            return;
        }

        setLoading(true);
        setResult(null);
        setRawText('');
        setScore(null);

        try {
            const response = await analyzeRisk(finalQuery);
            const analysis = response.data?.analysis || '';
            const complianceScore = response.data?.compliance_score;

            setScore(complianceScore);

            const parsed = parseRisks(analysis);
            if (parsed && parsed.length > 0) {
                setResult(parsed);
            } else {
                setRawText(analysis);
            }

            localStorage.setItem('compliance:lastAnalysis', JSON.stringify({
                score: complianceScore,
                analysis,
                severityCounts: calculateSeverityCounts(analysis),
                query: finalQuery,
                updatedAt: new Date().toISOString(),
            }));
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Analysis failed. Is the backend running?'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ padding: 28 }}>
                <div style={{ fontWeight: 700, fontFamily: 'Outfit', fontSize: '1rem', marginBottom: 16, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={18} color="#60a5fa" /> Run AI Compliance Analysis
                </div>
                <textarea
                    className="input-field"
                    rows={3}
                    placeholder="e.g. What compliance risks exist in this policy document?"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            run();
                        }
                    }}
                    style={{ resize: 'vertical', fontFamily: 'Inter, sans-serif' }}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12, marginBottom: 16 }}>
                    {SUGGESTIONS.map((suggestion) => (
                        <button
                            key={suggestion}
                            onClick={() => {
                                setQuery(suggestion);
                                run(suggestion);
                            }}
                            style={{
                                background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                                borderRadius: 999, padding: '5px 12px', fontSize: '0.75rem',
                                color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s',
                                fontFamily: 'Inter, sans-serif',
                            }}
                            onMouseEnter={(event) => { event.target.style.color = '#60a5fa'; event.target.style.borderColor = '#3b82f6'; }}
                            onMouseLeave={(event) => { event.target.style.color = 'var(--text-secondary)'; event.target.style.borderColor = 'rgba(59,130,246,0.2)'; }}
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
                <button className="btn btn-primary" onClick={() => run()} disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
                    {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={16} />}
                    {loading ? 'Analyzing...' : 'Analyze Risk'}
                </button>
            </motion.div>

            <AnimatePresence>
                {score !== null && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 16, padding: '16px 22px',
                            background: score >= 80 ? 'rgba(16,185,129,0.08)' : score >= 60 ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
                            border: `1px solid ${score >= 80 ? 'rgba(16,185,129,0.25)' : score >= 60 ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.25)'}`,
                            borderRadius: 12,
                        }}>
                        <ShieldAlert size={22} color={score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'} />
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Compliance Score: {score} / 100</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                {score >= 80 ? 'Strong compliance posture.' : score >= 60 ? 'Moderate risks detected, review recommended.' : 'High risk detected, immediate action required.'}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 12 }} />)}
                </div>
            )}

            {!loading && result && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12, fontWeight: 500 }}>
                        {result.length} risk finding{result.length !== 1 ? 's' : ''} detected
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {result.map((item, i) => <RiskCard key={i} item={item} index={i} />)}
                    </div>
                </motion.div>
            )}

            {!loading && rawText && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ padding: 24 }}>
                    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7, fontFamily: 'Inter, sans-serif' }}>
                        {rawText}
                    </pre>
                </motion.div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

