import { useEffect, useRef, useState } from 'react'
import { Bot, ChevronDown, LoaderCircle, Send, Sparkles, UserRound } from 'lucide-react'
const API = (import.meta.env.VITE_API_URL || 'https://mitochron.onrender.com').replace(/\/+$/, '')

export default function AIChatDrawer({ sessionId, token, requestPrompt, onPromptConsumed }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Ask a general bio-forensic question, or load a batch for session-specific analysis of frequencies, low-QV calls, and cluster patterns.' }])
  const [sending, setSending] = useState(false)
  const lastPrompt = useRef('')

  const sendQuestion = async (question) => {
    if (!question?.trim() || sending) return
    const current = question.trim(); setMessage(''); setMessages((items) => [...items, { role: 'user', text: current }]); setSending(true)
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['X-Session-Token'] = token
      const response = await fetch(`${API}/api/chat`, { method: 'POST', headers, body: JSON.stringify({ session_id: sessionId || null, message: current }) })
      const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.detail || 'The AI service returned an error.')
      setMessages((items) => [...items, { role: 'assistant', text: data.response }])
    } catch (error) { setMessages((items) => [...items, { role: 'assistant', text: error.message === 'Failed to fetch' ? 'The AI service could not be reached. Please retry after the API wakes up.' : error.message }]) } finally { setSending(false) }
  }
  useEffect(() => { if (requestPrompt && requestPrompt !== lastPrompt.current && sessionId) { lastPrompt.current = requestPrompt; setOpen(true); sendQuestion(requestPrompt); onPromptConsumed?.() } }, [requestPrompt, sessionId])
  const send = (event) => { event.preventDefault(); sendQuestion(message) }
  return <div className={`chat-shell ${open ? 'open' : ''}`}><button className="chat-launcher" onClick={() => setOpen(!open)}><span className="ai-orb"><Sparkles size={16} /></span><span>Ask Forensic AI</span>{open ? <ChevronDown size={17} /> : <span className="chat-ping" />}</button>{open && <div className="chat-drawer"><div className="chat-header"><div><strong>Forensic Co-Pilot</strong><span>{sessionId ? 'Context-aware session assistant' : 'General research assistant · load a batch for case context'}</span></div><Bot size={20} /></div><div className="chat-messages">{messages.map((item, index) => <div className={`chat-message ${item.role}`} key={index}><span className="chat-avatar">{item.role === 'assistant' ? <Bot size={14} /> : <UserRound size={14} />}</span><p>{item.text}</p></div>)}{sending && <div className="chat-message assistant"><span className="chat-avatar"><Bot size={14} /></span><p><LoaderCircle className="spin" size={15} /> Thinking through the evidence…</p></div>}</div><form className="chat-form" onSubmit={send}><input disabled={sending} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={sessionId ? 'Ask about this cohort…' : 'Ask a general question…'} /><button disabled={!message.trim() || sending}><Send size={16} /></button></form></div>}</div>
}
