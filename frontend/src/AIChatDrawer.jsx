import { useEffect, useRef, useState } from 'react'
import { Bot, ChevronDown, LoaderCircle, Send, Sparkles, UserRound } from 'lucide-react'
const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

export default function AIChatDrawer({ sessionId, token, requestPrompt, onPromptConsumed }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'I can explain variant frequencies, low-QV calls, and cluster patterns from the active session.' }])
  const [sending, setSending] = useState(false)
  const lastPrompt = useRef('')

  const sendQuestion = async (question) => {
    if (!question?.trim() || !sessionId || !token || sending) return
    const current = question.trim(); setMessage(''); setMessages((items) => [...items, { role: 'user', text: current }]); setSending(true)
    try { const response = await fetch(`${API}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Session-Token': token }, body: JSON.stringify({ session_id: sessionId, message: current }) }); const data = await response.json(); if (!response.ok) throw new Error(data.detail || 'AI request failed'); setMessages((items) => [...items, { role: 'assistant', text: data.response }]) } catch (error) { setMessages((items) => [...items, { role: 'assistant', text: error.message }]) } finally { setSending(false) }
  }
  useEffect(() => { if (requestPrompt && requestPrompt !== lastPrompt.current && sessionId) { lastPrompt.current = requestPrompt; setOpen(true); sendQuestion(requestPrompt); onPromptConsumed?.() } }, [requestPrompt, sessionId])
  const send = (event) => { event.preventDefault(); sendQuestion(message) }
  return <div className={`chat-shell ${open ? 'open' : ''}`}><button className="chat-launcher" onClick={() => setOpen(!open)}><span className="ai-orb"><Sparkles size={16} /></span><span>Ask Forensic AI</span>{open ? <ChevronDown size={17} /> : <span className="chat-ping" />}</button>{open && <div className="chat-drawer"><div className="chat-header"><div><strong>Forensic Co-Pilot</strong><span>Context-aware session assistant</span></div><Bot size={20} /></div><div className="chat-messages">{messages.map((item, index) => <div className={`chat-message ${item.role}`} key={index}><span className="chat-avatar">{item.role === 'assistant' ? <Bot size={14} /> : <UserRound size={14} />}</span><p>{item.text}</p></div>)}{sending && <div className="chat-message assistant"><span className="chat-avatar"><Bot size={14} /></span><p><LoaderCircle className="spin" size={15} /> Thinking through the evidence…</p></div>}</div><form className="chat-form" onSubmit={send}><input disabled={!sessionId || sending} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={sessionId ? 'Ask about this cohort…' : 'Load a session first'} /><button disabled={!sessionId || !message.trim() || sending}><Send size={16} /></button></form></div>}</div>
}
