import { useEffect, useState } from 'react'
import { Activity, Clock3, RefreshCw, Server, ShieldCheck } from 'lucide-react'

const regularMessages = ['Waking the Render analysis service…', 'Negotiating a secure analysis session…', 'Aligning evidence to NC_012920…', 'Reviewing variants and cohort patterns…']
const awakeningMessages = [
  'Initiating secure link…',
  'Spun up server container (15%)…',
  'Allocating memory & loading reference genome (45%)…',
  'Calibrating variant alignment pipeline (75%)…',
  'Finalizing forensic report…',
]

export default function DnaLoadingWindow({ status = 'Preparing analysis…', awakening = false, retrying = false, error = '', onRetry }) {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    setIndex(0)
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % (awakening ? awakeningMessages.length : regularMessages.length)), awakening ? 5000 : 2600)
    return () => window.clearInterval(timer)
  }, [awakening])

  const messages = awakening ? awakeningMessages : regularMessages
  if (error) return <div className="loading-window server-awakening-window" role="alert"><div className="loading-card awakening-error-card"><div className="awakening-icon"><Server size={28} /></div><div className="eyebrow"><ShieldCheck size={13} /> Server awakening paused</div><h2>We couldn’t complete this analysis</h2><p>{error}</p><small>Render may still be waking from an idle state. Your pasted FASTA batch is preserved.</small><button className="primary-button awakening-retry-button" onClick={onRetry}><RefreshCw size={16} /> Retry Analysis</button></div></div>

  return <div className={`loading-window ${awakening ? 'server-awakening-window' : ''}`} role="status" aria-live="polite"><div className="loading-card"><div className="loading-helix" aria-hidden="true">{Array.from({ length: 9 }, (_, item) => <span key={item} style={{ '--i': item }}><i /><b /></span>)}</div><div className="eyebrow"><Activity size={13} /> {awakening ? 'MITOCHRON server awakening' : 'MITOCHRON processing'}</div><h2>{retrying ? 'Reconnecting to the analysis service…' : status}</h2><p>{retrying ? 'The container is awake; retrying your analysis securely…' : messages[index]}</p>{awakening ? <div className="awakening-progress" aria-hidden="true"><i style={{ width: `${Math.min(96, (index + 1) * 20)}%` }} /></div> : null}<small><Clock3 size={12} /> {awakening ? 'Free-tier cold starts can take around 30–40 seconds.' : 'Render cold starts can take up to 60 seconds.'}</small></div></div>
}
