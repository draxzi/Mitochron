import { useEffect, useState } from 'react'
import { Activity, Clock3 } from 'lucide-react'

const messages = ['Waking the Render analysis service…', 'Negotiating a secure analysis session…', 'Aligning evidence to NC_012920…', 'Reviewing variants and cohort patterns…']

export default function DnaLoadingWindow({ status = 'Preparing analysis…' }) {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % messages.length), 2600)
    return () => window.clearInterval(timer)
  }, [])
  return <div className="loading-window" role="status" aria-live="polite">
    <div className="loading-card">
      <div className="loading-helix" aria-hidden="true">{Array.from({ length: 9 }, (_, item) => <span key={item} style={{ '--i': item }}><i /><b /></span>)}</div>
      <div className="eyebrow"><Activity size={13} /> MITOCHRON processing</div>
      <h2>{status}</h2>
      <p>{messages[index]}</p>
      <small><Clock3 size={12} /> Render cold starts can take up to 60 seconds.</small>
    </div>
  </div>
}
