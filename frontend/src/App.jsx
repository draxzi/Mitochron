import { useEffect, useRef, useState } from 'react'
import { Activity, FlaskConical, GitBranch, MoonStar, Plus, Sun, TerminalSquare } from 'lucide-react'
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
const AWAKENING_ATTEMPT_TIMEOUT = 12000
const AWAKENING_WINDOW = 60000
const AWAKENING_RETRY_DELAY = 6000

async function requestWithTimeout(url, options = {}, timeout = REQUEST_TIMEOUT) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeout)
  try { return await fetch(url, { ...options, signal: controller.signal }) } finally { window.clearTimeout(timer) }
}

function readableError(error, action = 'The request') {
  if (error?.name === 'AbortError') return `${action} timed out while the Render service was waking. Please retry.`
  if (error?.message === 'Failed to fetch') return `${action} could not reach the analysis service after its wake-up attempt.`
  return error?.message || `${action} failed. Please retry.`
}

function isTransientAwakeningFailure(errorOrResponse) {
  if (errorOrResponse instanceof Response) return [502, 503, 504].includes(errorOrResponse.status)
  return errorOrResponse?.name === 'AbortError' || errorOrResponse?.name === 'TypeError' || errorOrResponse?.message === 'Failed to fetch'
}

const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds))

export default function App() {
  const [result, setResult] = useState(() => { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') } catch { return null } })
  const [token, setToken] = useState(() => sessionStorage.getItem('mtdna.session.token') || '')
  const [loading, setLoading] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('Preparing analysis…')
  const [awakening, setAwakening] = useState(false)
  const [awakeningRetrying, setAwakeningRetrying] = useState(false)
  const [awakeningFailure, setAwakeningFailure] = useState('')
  const [error, setError] = useState('')
  const [dark, setDark] = useState(() => sessionStorage.getItem('mtdna.theme') === 'dark')
  const [backend, setBackend] = useState('checking')
  const [requestPrompt, setRequestPrompt] = useState('')
  const [legalPage, setLegalPage] = useState(null)
  const lastAwakeningRequest = useRef(null)

  useEffect(() => {
    let active = true
    setLoading(true); setLoadingStatus('Waking the Render analysis service…')
    requestWithTimeout(`${API}/`).then((response) => { if (!response.ok) throw new Error('The API health check returned an unexpected status.'); if (active) setBackend('online') }).catch(() => { if (active) setBackend('offline') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => { sessionStorage.setItem('mtdna.theme', dark ? 'dark' : 'light') }, [dark])

  const clearWorkspace = () => { sessionStorage.removeItem(SESSION_KEY); sessionStorage.removeItem('mtdna.session.token'); setResult(null); setToken(''); setError(''); setRequestPrompt(''); setAwakeningFailure('') }
  const analyze = async (request) => {
    const isAwakening = Boolean(request.awakening)
    if (isAwakening) lastAwakeningRequest.current = request
    setLoading(true); setError(''); setAwakeningFailure(''); setAwakening(isAwakening); setAwakeningRetrying(false); setBackend('checking'); setLoadingStatus(request.type === 'ncbi' ? 'Fetching records from NCBI…' : isAwakening ? 'Initiating secure link…' : 'Uploading FASTA evidence…')
    const upload = (timeout) => { const form = new FormData(); request.files.forEach((file) => form.append('files', file)); form.append('region_label', request.region_label); return requestWithTimeout(`${API}/api/analyze/upload`, { method: 'POST', body: form }, timeout) }
    const uploadThroughAwakening = async () => {
      const startedAt = Date.now()
      let attempt = 0
      while (Date.now() - startedAt < AWAKENING_WINDOW) {
        attempt += 1
        const elapsed = Math.round((Date.now() - startedAt) / 1000)
        setAwakeningRetrying(attempt > 1)
        setLoadingStatus(attempt === 1 ? 'Initiating secure link…' : `Reconnecting to Render… attempt ${attempt}`)
        try {
          const response = await upload(AWAKENING_ATTEMPT_TIMEOUT)
          if (!isTransientAwakeningFailure(response)) return response
          const remaining = Math.max(0, AWAKENING_WINDOW - (Date.now() - startedAt))
          if (remaining <= 0) return response
          setAwakeningRetrying(true)
          setLoadingStatus(`Render is waking up… retrying in ${AWAKENING_RETRY_DELAY / 1000}s (${elapsed}s / ${AWAKENING_WINDOW / 1000}s)`)
          await wait(Math.min(AWAKENING_RETRY_DELAY, remaining))
        } catch (attemptError) {
          const remaining = Math.max(0, AWAKENING_WINDOW - (Date.now() - startedAt))
          if (!isTransientAwakeningFailure(attemptError) || remaining <= 0) throw attemptError
          setAwakeningRetrying(true)
          setLoadingStatus(`Connection paused by cold start… retrying in ${AWAKENING_RETRY_DELAY / 1000}s (${elapsed}s / ${AWAKENING_WINDOW / 1000}s)`)
          await wait(Math.min(AWAKENING_RETRY_DELAY, remaining))
        }
      }
      throw new Error('The Render analysis service did not wake within 60 seconds. Your FASTA batch is preserved; please retry.')
    }
    try {
      let response
      if (request.type === 'ncbi') response = await requestWithTimeout(`${API}/api/analyze/ncbi`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: request.query, max_samples: request.max_samples, region_label: request.region_label }) })
      else response = isAwakening ? await uploadThroughAwakening() : await upload(REQUEST_TIMEOUT)
      setLoadingStatus('Aligning sequences and building the forensic report…')
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.detail || 'The analysis service returned an error.')
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); sessionStorage.setItem('mtdna.session.token', data.access_token); setResult(data); setToken(data.access_token); setBackend('online'); setAwakeningFailure('')
    } catch (requestError) {
      const message = readableError(requestError, request.type === 'ncbi' ? 'The NCBI analysis request' : 'The FASTA analysis request')
      setError(message); setBackend('offline')
      if (isAwakening) setAwakeningFailure(message)
    } finally { setLoading(false); setAwakening(false); setAwakeningRetrying(false) }
  }
  const retryAwakening = () => { if (lastAwakeningRequest.current) analyze(lastAwakeningRequest.current) }

  return <div className={dark ? 'app dark' : 'app'}><header className="topbar"><div className="brand"><div className="brand-mark"><FlaskConical size={19} /></div><div><strong>mtDNA<span> intelligence</span></strong><small>Forensic analysis workspace</small></div></div><div className="topbar-actions"><div className={`connection ${backend}`}><span className="status-dot" /> {backend === 'online' ? 'API connected' : backend === 'offline' ? 'API offline' : 'Connecting'}</div><button className="new-session-button" onClick={clearWorkspace}><Plus size={14} /> New isolated session</button><button className="icon-button theme-toggle" onClick={() => setDark(!dark)} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} title={dark ? 'Switch to light theme' : 'Switch to dark theme'}>{dark ? <Sun size={17} /> : <MoonStar size={17} />}</button><button className="icon-button" aria-label="Repository"><GitBranch size={17} /></button></div></header><main><section className="hero"><div className="hero-copy"><div className="hero-kicker"><span className="pulse-dot" /> REFERENCE ROI · NC_012920</div><h1>Read the signal.<br /><em>Defend the evidence.</em></h1><p>A focused workspace for reference-aligned mitochondrial DNA analysis, cohort frequencies, and anomaly review.</p></div><DnaHelixHero /><div className="hero-aside"><div className="hero-aside-line"><Activity size={16} /><span>Analysis engine</span><strong>PairwiseAligner</strong></div><div className="hero-aside-line"><TerminalSquare size={16} /><span>Session mode</span><strong>{result ? 'Isolated / tokenized' : 'Ephemeral / secure'}</strong></div></div></section><IngestionPanel onAnalyze={analyze} loading={loading} error={error} /><ExportToolbar result={result} token={token} /><DashboardOverview result={result} onAskAI={setRequestPrompt} /></main><footer><span><span className="pulse-dot" /> MITOCHRON Bio-Forensic Intelligence • Powered by AI</span><nav><button onClick={() => setLegalPage('terms')}>Terms & Conditions</button><button onClick={() => setLegalPage('privacy')}>Privacy Policy</button><button onClick={() => setLegalPage('disclaimer')}>Forensic Disclaimer</button></nav></footer><AIChatDrawer sessionId={result?.session_id} token={token} requestPrompt={requestPrompt} onPromptConsumed={() => setRequestPrompt('')} /><LegalModal page={legalPage} onClose={() => setLegalPage(null)} />{(loading || awakeningFailure) && <DnaLoadingWindow status={loadingStatus} awakening={awakening || Boolean(awakeningFailure)} retrying={awakeningRetrying} error={awakeningFailure} onRetry={retryAwakening} />}</div>
}
