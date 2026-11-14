import { useEffect, useState } from 'react'
import { Activity, FlaskConical, GitBranch, Moon, Plus, Sun, TerminalSquare } from 'lucide-react'
import IngestionPanel from './IngestionPanel'
import DashboardOverview from './DashboardOverview'
import ExportToolbar from './ExportToolbar'
import AIChatDrawer from './AIChatDrawer'
import DnaHelixHero from './DnaHelixHero'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
const SESSION_KEY = 'mtdna.session.result'

export default function App() {
  const [result, setResult] = useState(() => { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') } catch { return null } })
  const [token, setToken] = useState(() => sessionStorage.getItem('mtdna.session.token') || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dark, setDark] = useState(true)
  const [backend, setBackend] = useState('checking')
  const [requestPrompt, setRequestPrompt] = useState('')
  useEffect(() => { fetch(`${API}/health`).then((response) => { if (!response.ok) throw new Error(); setBackend('online') }).catch(() => setBackend('offline')) }, [])
  const clearWorkspace = () => { sessionStorage.removeItem(SESSION_KEY); sessionStorage.removeItem('mtdna.session.token'); setResult(null); setToken(''); setError(''); setRequestPrompt('') }
  const analyze = async (request) => { setLoading(true); setError(''); try { let response; if (request.type === 'ncbi') response = await fetch(`${API}/analyze/ncbi`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: request.query, max_samples: request.max_samples, region_label: request.region_label }) }); else { const form = new FormData(); request.files.forEach((file) => form.append('files', file)); form.append('region_label', request.region_label); response = await fetch(`${API}/analyze/upload`, { method: 'POST', body: form }) } const data = await response.json(); if (!response.ok) throw new Error(data.detail || 'Analysis request failed'); sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); sessionStorage.setItem('mtdna.session.token', data.access_token); setResult(data); setToken(data.access_token); setBackend('online') } catch (requestError) { setError(requestError.message); setBackend('offline') } finally { setLoading(false) } }
  return <div className={dark ? 'app dark' : 'app'}><header className="topbar"><div className="brand"><div className="brand-mark"><FlaskConical size={19} /></div><div><strong>mtDNA<span> intelligence</span></strong><small>Forensic analysis workspace</small></div></div><div className="topbar-actions"><div className={`connection ${backend}`}><span className="status-dot" /> {backend === 'online' ? 'API connected' : backend === 'offline' ? 'API offline' : 'Connecting'}</div><button className="new-session-button" onClick={clearWorkspace}><Plus size={14} /> New isolated session</button><button className="icon-button" onClick={() => setDark(!dark)} aria-label="Toggle theme">{dark ? <Sun size={17} /> : <Moon size={17} />}</button><button className="icon-button"><GitBranch size={17} /></button></div></header><main><section className="hero"><div className="hero-copy"><div className="hero-kicker"><span className="pulse-dot" /> REFERENCE ROI · NC_012920</div><h1>Read the signal.<br /><em>Defend the evidence.</em></h1><p>A focused workspace for reference-aligned mitochondrial DNA analysis, cohort frequencies, and anomaly review.</p></div><DnaHelixHero /><div className="hero-aside"><div className="hero-aside-line"><Activity size={16} /><span>Analysis engine</span><strong>PairwiseAligner</strong></div><div className="hero-aside-line"><TerminalSquare size={16} /><span>Session mode</span><strong>{result ? 'Isolated / tokenized' : 'Ephemeral / secure'}</strong></div></div></section><IngestionPanel onAnalyze={analyze} loading={loading} error={error} /><ExportToolbar result={result} token={token} /><DashboardOverview result={result} onAskAI={setRequestPrompt} /></main><footer><span><span className="pulse-dot" /> Built for careful forensic review</span><span>Phase 2.5 dashboard · per-tab isolated</span></footer><AIChatDrawer sessionId={result?.session_id} token={token} requestPrompt={requestPrompt} onPromptConsumed={() => setRequestPrompt('')} /></div>
}
