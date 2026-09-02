import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sendChatMessage, getApiErrorMessage } from '../api/axios';
import { Send, Loader2, Bot, User } from 'lucide-react';
import toast from 'react-hot-toast';

const SUGGESTIONS = [
    'What compliance risks exist in this contract?',
    'Does this policy comply with GDPR?',
    'Summarize the security risks in this document.',
    'What are the data retention issues?',
];

function Message({ msg }) {
    const isUser = msg.role === 'user';

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                display: 'flex',
                gap: 12,
                flexDirection: isUser ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
            }}
        >
            <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: isUser
                    ? 'linear-gradient(135deg, #3b82f6, #06b6d4)'
                    : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isUser ? '0 2px 10px rgba(59,130,246,0.3)' : '0 2px 10px rgba(124,58,237,0.3)',
            }}>
                {isUser ? <User size={16} color="white" /> : <Bot size={16} color="white" />}
            </div>

            <div style={{
                maxWidth: '72%',
                background: isUser
                    ? 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(6,182,212,0.15))'
                    : 'rgba(255,255,255,0.04)',
                border: isUser ? '1px solid rgba(59,130,246,0.3)' : '1px solid var(--border)',
                borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                padding: '12px 16px',
            }}>
                <pre style={{
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    fontSize: '0.875rem', color: 'var(--text-primary)',
                    lineHeight: 1.65, fontFamily: 'Inter, sans-serif', margin: 0,
                }}>
                    {msg.content}
                </pre>
            </div>
        </motion.div>
    );
}

export default function Chat() {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello. I am your AI compliance assistant. Ask about uploaded documents, GDPR compliance, risk findings, or security clauses.' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const send = async (text) => {
        const msg = text || input;

        if (!msg.trim()) {
            return;
        }

        const userMessage = { role: 'user', content: msg };
        const nextMessages = [...messages, userMessage];

        setInput('');
        setMessages(nextMessages);
        setLoading(true);

        try {
            const history = nextMessages.slice(-10).map((item) => ({
                role: item.role,
                content: item.content,
            }));

            const response = await sendChatMessage(msg, history);
            const reply = response.data?.answer || response.data?.response || response.data?.message || JSON.stringify(response.data);
            setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
        } catch (error) {
            const errMsg = getApiErrorMessage(error, 'Chat failed. Make sure the backend is running and documents are uploaded.');
            toast.error(errMsg);
            setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${errMsg}` }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKey = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            send();
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 68px - 56px)', maxWidth: 860, gap: 0 }}>
            <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>

                <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Bot size={17} color="white" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontFamily: 'Outfit', fontSize: '0.95rem', color: 'var(--text-primary)' }}>AI Compliance Assistant</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} /> Online and connected to RAG pipeline
                        </div>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {messages.map((msg, i) => <Message key={i} msg={msg} />)}

                    {loading && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Bot size={16} color="white" />
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '4px 16px 16px 16px', padding: '14px 18px', display: 'flex', gap: 6, alignItems: 'center' }}>
                                {[0, 0.2, 0.4].map((delay, i) => (
                                    <motion.div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#7c3aed' }}
                                        animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay }} />
                                ))}
                            </div>
                        </motion.div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {messages.length <= 1 && (
                    <div style={{ padding: '0 22px 12px', display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                        {SUGGESTIONS.map((suggestion) => (
                            <button key={suggestion} onClick={() => send(suggestion)} style={{
                                background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)',
                                borderRadius: 999, padding: '5px 14px', fontSize: '0.75rem',
                                color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                                transition: 'all 0.2s',
                            }}
                                onMouseEnter={(event) => { event.target.style.color = '#a78bfa'; event.target.style.borderColor = '#7c3aed'; }}
                                onMouseLeave={(event) => { event.target.style.color = 'var(--text-secondary)'; event.target.style.borderColor = 'rgba(124,58,237,0.2)'; }}
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                )}

                <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'flex-end', flexShrink: 0 }}>
                    <textarea
                        className="input-field"
                        rows={1}
                        placeholder="Ask about compliance, risks, clauses..."
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        onKeyDown={handleKey}
                        disabled={loading}
                        style={{ resize: 'none', flex: 1, fontFamily: 'Inter, sans-serif', maxHeight: 120, overflowY: 'auto' }}
                    />
                    <motion.button
                        whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
                        className="btn btn-primary"
                        onClick={() => send()}
                        disabled={loading || !input.trim()}
                        style={{ padding: '10px 16px', flexShrink: 0, opacity: (loading || !input.trim()) ? 0.5 : 1 }}
                    >
                        {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
                    </motion.button>
                </div>
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
