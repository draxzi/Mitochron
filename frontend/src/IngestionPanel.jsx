import { useRef, useState } from 'react'
import { Database, FileUp, LoaderCircle, Search, UploadCloud } from 'lucide-react'

const regions = ['Global', 'NW', 'NE', 'SE', 'SW']

export default function IngestionPanel({ onAnalyze, loading, error }) {
  const [tab, setTab] = useState('ncbi')
  const [query, setQuery] = useState('Homo sapiens mitochondrion complete genome India')
  const [maxSamples, setMaxSamples] = useState(20)
  const [region, setRegion] = useState('Global')
  const [files, setFiles] = useState([])
  const inputRef = useRef(null)

  const submitNcbi = (event) => {
    event.preventDefault()
    onAnalyze({ type: 'ncbi', query, max_samples: Math.max(15, maxSamples), region_label: region === 'Global' ? 'Unknown' : region })
  }
  const submitUpload = (event) => {
    event.preventDefault()
    if (files.length) onAnalyze({ type: 'upload', files, region_label: region === 'Global' ? 'Unknown' : region })
  }
  const acceptFiles = (selected) => setFiles(Array.from(selected).filter((file) => /\.(fasta|fa|seq|txt)$/i.test(file.name)))

  return <section className="panel ingest-panel">
    <div className="panel-heading">
      <div><div className="eyebrow">Specimen ingestion</div><h2>Start an analysis batch</h2></div>
      <span className="live-chip"><span className="pulse-dot" /> API ready</span>
    </div>
    <div className="tabs" role="tablist">
      <button className={tab === 'ncbi' ? 'tab active' : 'tab'} onClick={() => setTab('ncbi')}><Database size={16} /> NCBI fetch</button>
      <button className={tab === 'upload' ? 'tab active' : 'tab'} onClick={() => setTab('upload')}><FileUp size={16} /> Manual upload</button>
    </div>
    {tab === 'ncbi' ? <form onSubmit={submitNcbi} className="form-grid">
      <label className="field wide"><span>Search query</span><div className="input-wrap"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Homo sapiens mitochondrion..." /></div></label>
      <label className="field"><span>Max samples <strong>{maxSamples}</strong></span><input className="range" type="range" min="10" max="50" value={maxSamples} onChange={(e) => setMaxSamples(Number(e.target.value))} /></label>
      <label className="field"><span>Region tag</span><select value={region} onChange={(e) => setRegion(e.target.value)}>{regions.map((item) => <option key={item}>{item}</option>)}</select></label>
      <button className="primary-button submit-button" disabled={loading || !query.trim()}>{loading ? <LoaderCircle className="spin" size={17} /> : <Search size={17} />} {loading ? 'Analyzing cohort...' : 'Fetch from NCBI'}</button>
    </form> : <form onSubmit={submitUpload} className="upload-form">
      <div className="dropzone" onClick={() => inputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); acceptFiles(e.dataTransfer.files) }}>
        <UploadCloud size={28} /><strong>Drop FASTA files here</strong><span>.fasta, .fa, .seq, or .txt · single or multi-record</span><input ref={inputRef} hidden type="file" multiple accept=".fasta,.fa,.seq,.txt" onChange={(e) => acceptFiles(e.target.files)} />
      </div>
      <div className="upload-actions"><div><span className="muted">{files.length ? `${files.length} file${files.length > 1 ? 's' : ''} selected` : 'No files selected'}</span>{files.map((file) => <div className="file-pill" key={file.name}>{file.name}</div>)}</div><div className="upload-controls"><label className="field"><span>Region tag</span><select value={region} onChange={(e) => setRegion(e.target.value)}>{regions.map((item) => <option key={item}>{item}</option>)}</select></label><button className="primary-button" disabled={loading || !files.length}>{loading ? <LoaderCircle className="spin" size={17} /> : <FileUp size={17} />} Upload & analyze</button></div></div>
    </form>}
    {error && <div className="error-banner">{error}</div>}
  </section>
}
