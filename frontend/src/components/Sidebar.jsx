import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

void motion;
import {
    LayoutDashboard,
    Upload,
    ShieldAlert,
    MessageSquare,
    FileText,
    GitBranch,
    Shield,
    ChevronRight,
} from 'lucide-react';

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/upload', icon: Upload, label: 'Upload Docs' },
    { to: '/analyze', icon: ShieldAlert, label: 'Risk Analysis' },
    { to: '/chat', icon: MessageSquare, label: 'AI Chat' },
    { to: '/report', icon: FileText, label: 'Compliance Report' },
    { to: '/flowchart', icon: GitBranch, label: 'Doc Flowchart' },
];

export default function Sidebar() {
    const location = useLocation();

    return (
        <aside
            style={{
                width: 240,
                minHeight: '100vh',
                background: 'linear-gradient(180deg, #0d1b2e 0%, #0f172a 100%)',
                borderRight: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
                position: 'sticky',
                top: 0,
                height: '100vh',
                zIndex: 100,
            }}
        >
            {/* Logo */}
            <div style={{ padding: '28px 20px 24px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                        style={{
                            width: 40, height: 40,
                            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                            borderRadius: 12,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 15px rgba(59,130,246,0.4)',
                        }}
                    >
                        <Shield size={20} color="white" strokeWidth={2.5} />
                    </div>
                    <div>
                        <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                            AI Compliance
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', fontWeight: 500, letterSpacing: '0.06em' }}>
                            RISK INTELLIGENCE
                        </div>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {navItems.map(({ to, icon: Icon, label }) => {
                    const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
                    void Icon;
                    return (
                        <NavLink to={to} key={to} style={{ textDecoration: 'none' }}>
                            <motion.div
                                whileHover={{ x: 4 }}
                                whileTap={{ scale: 0.97 }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '10px 14px',
                                    borderRadius: 10,
                                    cursor: 'pointer',
                                    background: active
                                        ? 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(6,182,212,0.1))'
                                        : 'transparent',
                                    border: active ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
                                    color: active ? 'var(--accent-blue-light)' : 'var(--text-secondary)',
                                    transition: 'all 0.2s ease',
                                    position: 'relative',
                                }}
                            >
                                {active && (
                                    <motion.div
                                        layoutId="activeIndicator"
                                        style={{
                                            position: 'absolute',
                                            left: 0, top: '20%', bottom: '20%',
                                            width: 3, borderRadius: 999,
                                            background: 'linear-gradient(180deg, #3b82f6, #06b6d4)',
                                        }}
                                    />
                                )}
                                <Icon size={17} strokeWidth={active ? 2.5 : 2} />
                                <span style={{ fontWeight: active ? 600 : 400, fontSize: '0.875rem', flex: 1 }}>
                                    {label}
                                </span>
                                {active && <ChevronRight size={14} style={{ opacity: 0.5 }} />}
                            </motion.div>
                        </NavLink>
                    );
                })}
            </nav>

            {/* Footer */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
                <div style={{
                    background: 'rgba(59,130,246,0.08)',
                    border: '1px solid rgba(59,130,246,0.2)',
                    borderRadius: 10,
                    padding: '10px 14px',
                }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>Powered by</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--accent-blue-light)', fontWeight: 600 }}>
                        Groq LLM  -  FAISS  -  RAG
                    </div>
                </div>
            </div>
        </aside>
    );
}


