import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { getDocuments } from '../api/axios';
import { ShieldCheck, ShieldAlert, FileText, TrendingUp, AlertTriangle, AlertOctagon, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay },
});

function normalizeDocuments(payload) {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (Array.isArray(payload?.documents)) {
        return payload.documents;
    }

    return [];
}

function readCachedAnalysis() {
    const cached = localStorage.getItem('compliance:lastAnalysis');

    if (!cached) {
        return null;
    }

    try {
        return JSON.parse(cached);
    } catch {
        return null;
    }
}

function StatCard({ icon: Icon, label, value, color, bg, delay }) {
    void Icon;

    return (
        <motion.div {...fadeUp(delay)} className="glass-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={22} color={color} strokeWidth={2} />
            </div>
            <div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'Outfit', color }}>{value}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>{label}</div>
            </div>
        </motion.div>
    );
}

function ComplianceGauge({ score }) {
    const data = [
        { name: 'Score', value: score, fill: score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444' },
        { name: 'Remaining', value: 100 - score, fill: 'rgba(255,255,255,0.05)' },
    ];
    const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
    const label = score >= 80 ? 'Strong Compliance' : score >= 60 ? 'Moderate Risk' : 'High Risk';

    return (
        <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto' }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%" cy="50%"
                        innerRadius={70} outerRadius={90}
                        startAngle={90} endAngle={-270}
                        dataKey="value"
                        strokeWidth={0}
                    >
                        {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '2.4rem', fontWeight: 800, fontFamily: 'Outfit', color }}>{score}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>/ 100</span>
                <span style={{ fontSize: '0.7rem', color, fontWeight: 600, marginTop: 4 }}>{label}</span>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastAnalysis] = useState(readCachedAnalysis);
    const navigate = useNavigate();

    useEffect(() => {
        getDocuments()
            .then((response) => setDocs(normalizeDocuments(response.data)))
            .catch(() => setDocs([]))
            .finally(() => setLoading(false));
    }, []);

    const score = Number.isFinite(lastAnalysis?.score) ? lastAnalysis.score : 0;
    const severityCounts = lastAnalysis?.severityCounts || { high: 0, medium: 0, low: 0 };

    const stats = [
        { icon: AlertOctagon, label: 'High Risk Issues', value: severityCounts.high, color: '#f87171', bg: 'rgba(239,68,68,0.12)', delay: 0.1 },
        { icon: AlertTriangle, label: 'Medium Risk Issues', value: severityCounts.medium, color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', delay: 0.15 },
        { icon: Info, label: 'Low Risk Issues', value: severityCounts.low, color: '#34d399', bg: 'rgba(16,185,129,0.12)', delay: 0.2 },
        { icon: FileText, label: 'Documents Indexed', value: docs.length, color: '#60a5fa', bg: 'rgba(59,130,246,0.12)', delay: 0.25 },
    ];

    const quickActions = [
        { label: 'Upload Document', color: '#3b82f6', path: '/upload' },
        { label: 'Analyze Risk', color: '#06b6d4', path: '/analyze' },
        { label: 'Start Chat', color: '#8b5cf6', path: '/chat' },
        { label: 'Generate Report', color: '#10b981', path: '/report' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
                <motion.div {...fadeUp(0)} className="glass-card" style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}>
                        <ShieldCheck size={18} color="var(--accent-blue-light)" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Overall Compliance Score</span>
                    </div>
                    <ComplianceGauge score={score} />
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        {lastAnalysis?.updatedAt ? `Updated: ${new Date(lastAnalysis.updatedAt).toLocaleString()}` : 'Run Analyze or Report to generate score'}
                    </div>
                </motion.div>

                <motion.div {...fadeUp(0.05)} className="glass-card" style={{ padding: 28 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <TrendingUp size={16} color="var(--accent-blue-light)" />
                        Quick Actions
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {quickActions.map(({ label, color, path }) => (
                            <motion.button
                                key={path}
                                whileHover={{ scale: 1.03, y: -2 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => navigate(path)}
                                style={{
                                    background: `${color}15`,
                                    border: `1px solid ${color}30`,
                                    borderRadius: 12, padding: '16px 14px',
                                    color, fontWeight: 600, fontSize: '0.85rem',
                                    cursor: 'pointer', textAlign: 'left',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                {label}
                            </motion.button>
                        ))}
                    </div>

                    <div style={{ marginTop: 24 }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 10, fontWeight: 500 }}>Recently Uploaded</div>
                        {loading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {[1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 36 }} />)}
                            </div>
                        ) : docs.length === 0 ? (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
                                No documents uploaded yet.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {docs.slice(0, 4).map((doc, i) => (
                                    <div key={typeof doc === 'string' ? doc : doc?.source || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border)' }}>
                                        <FileText size={14} color="var(--accent-blue-light)" />
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {typeof doc === 'string' ? doc : doc?.name || doc?.source || 'Document'}
                                        </span>
                                        <span className="badge badge-info">Indexed</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 18 }}>
                {stats.map((s) => <StatCard key={s.label} {...s} />)}
            </div>

            <motion.div {...fadeUp(0.3)} style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(6,182,212,0.05))',
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: 14, padding: '18px 22px',
                display: 'flex', alignItems: 'center', gap: 14,
            }}>
                <ShieldAlert size={22} color="#60a5fa" />
                <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        Platform ready: upload documents to begin compliance analysis
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 3 }}>
                        Supports PDF. Powered by FAISS, Groq LLM, and Retrieval Augmented Generation.
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
