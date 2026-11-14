import { useEffect, useState } from 'react'
import { Activity, FlaskConical, GitBranch, Moon, Plus, Sun, TerminalSquare } from 'lucide-react'
import IngestionPanel from './IngestionPanel'
import DashboardOverview from './DashboardOverview'
import ExportToolbar from './ExportToolbar'
import AIChatDrawer from './AIChatDrawer'
import DnaHelixHero from './DnaHelixHero'
import DnaLoadingWindow from './DnaLoadingWindow'
import LegalModal from './LegalModal'

export const API = (import.meta.env.VITE_API_URL || 'https://mitochron.onrender.com').replace(/\/+$/, '')
const SESSION_KEY = 'mtdna.session.result'
const REQUEST_TIMEOUT = 60000

async function requestWithTimeout(url, options = {}) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
  try { return await fetch(url, { ...options, signal: controller.signal }) } finally { window.clearTimeout(timer) }
}

function readableError(error, action = 'The request') {
  if (error?.name === 'AbortError') return `${action} timed out after 60 seconds. The Render service may be cold-starting; please retry.`
  if (error?.message === 'Failed to fetch') return `${action} could not reach the analysis service. Check your connection or retry while Render wakes up.`
  return error?.message || `${action} failed. Please retry.`
}

export default function App() {
  const [result, setResult] = useState(() => { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') } catch { return null } })
  const [token, setToken] = useState(() => sessionStorage.getItem('mtdna.session.token') || '')
  const [loading, setLoading] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('Preparing analysis…')
  const [error, setError] = useState('')
  const [dark, setDark] = useState(true)
  const [backend, setBackend] = useState('checking')
  const [requestPrompt, setRequestPrompt] = useState('')
  const [legalPage, setLegalPage] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true); setLoadingStatus('Waking the Render analysis service…')
    requestWithTimeout(`${API}/`).then((response) => { if (!response.ok) throw new Error('The API health check returned an unexpected status.'); if (active) setBackend('online') }).catch(() => { if (active) setBackend('offline') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const clearWorkspace = () => { sessionStorage.removeItem(SESSION_KEY); sessionStorage.removeItem('mtdna.session.token'); setResult(null); setToken(''); setError(''); setRequestPrompt('') }
  const analyze = async (request) => {
    setLoading(true); setError(''); setBackend('checking'); setLoadingStatus(request.type === 'ncbi' ? 'Fetching records from NCBI…' : 'Uploading FASTA evidence…')
    try {
      let response
      if (request.type === 'ncbi') response = await requestWithTimeout(`${API}/api/analyze/ncbi`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: request.query, max_samples: request.max_samples, region_label: request.region_label }) })
      else { const form = new FormData(); request.files.forEach((file) => form.append('files', file)); form.append('region_label', request.region_label); response = await requestWithTimeout(`${API}/api/analyze/upload`, { method: 'POST', body: form }) }
      setLoadingStatus('Aligning sequences and building the forensic report…')
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.detail || 'The analysis service returned an error.')
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); sessionStorage.setItem('mtdna.session.token', data.access_token); setResult(data); setToken(data.access_token); setBackend('online')
    } catch (requestError) { setError(readableError(requestError, request.type === 'ncbi' ? 'The NCBI analysis request' : 'The FASTA analysis request')); setBackend('offline') } finally { setLoading(false) }
  }

  return <div className={dark ? 'app dark' : 'app'}><header className="topbar"><div className="brand"><div className="brand-mark"><FlaskConical size={19} /></div><div><strong>mtDNA<span> intelligence</span></strong><small>Forensic analysis workspace</small></div></div><div className="topbar-actions"><div className={`connection ${backend}`}><span className="status-dot" /> {backend === 'online' ? 'API connected' : backend === 'offline' ? 'API offline' : 'Connecting'}</div><button className="new-session-button" onClick={clearWorkspace}><Plus size={14} /> New isolated session</button><button className="icon-button" onClick={() => setDark(!dark)} aria-label="Toggle theme">{dark ? <Sun size={17} /> : <Moon size={17} />}</button><button className="icon-button" aria-label="Repository"><GitBranch size={17} /></button></div></header><main><section className="hero"><div className="hero-copy"><div className="hero-kicker"><span className="pulse-dot" /> REFERENCE ROI · NC_012920</div><h1>Read the signal.<br /><em>Defend the evidence.</em></h1><p>A focused workspace for reference-aligned mitochondrial DNA analysis, cohort frequencies, and anomaly review.</p></div><DnaHelixHero /><div className="hero-aside"><div className="hero-aside-line"><Activity size={16} /><span>Analysis engine</span><strong>PairwiseAligner</strong></div><div className="hero-aside-line"><TerminalSquare size={16} /><span>Session mode</span><strong>{result ? 'Isolated / tokenized' : 'Ephemeral / secure'}</strong></div></div></section><IngestionPanel onAnalyze={analyze} loading={loading} error={error} /><ExportToolbar result={result} token={token} /><DashboardOverview result={result} onAskAI={setRequestPrompt} /></main><footer><span><span className="pulse-dot" /> MITOCHRON Bio-Forensic Intelligence • Powered by AI</span><nav><button onClick={() => setLegalPage('terms')}>Terms & Conditions</button><button onClick={() => setLegalPage('privacy')}>Privacy Policy</button><button onClick={() => setLegalPage('disclaimer')}>Forensic Disclaimer</button></nav></footer><AIChatDrawer sessionId={result?.session_id} token={token} requestPrompt={requestPrompt} onPromptConsumed={() => setRequestPrompt('')} /><LegalModal page={legalPage} onClose={() => setLegalPage(null)} />{loading && <DnaLoadingWindow status={loadingStatus} />}</div>
}
