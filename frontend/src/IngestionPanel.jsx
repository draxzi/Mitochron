import { useRef, useState } from 'react'
import { ClipboardPaste, Database, FileUp, LoaderCircle, Search, Trash2, UploadCloud, WandSparkles } from 'lucide-react'

const regions = ['Global', 'NW', 'NE', 'SE', 'SW']
const demoFasta = `>Sample_01_Ref_H
GATCACAGGTCTATCACCCTATTAACCACTCACGGGAGCTCTCCATGCATTTGGTATTTTCGTCTGGGGGGTATGCACGCGATAGCATTGCGAGACGCTGGAGCCGGAGCACCCTATGTCGCAGTATCTGTCTTTGATTCCTGCCTCATCCTATTATTTATCG
>Sample_02_Ref_H
GATCACAGGTCTATCACCCTATTAACCACTCACGGGAGCTCTCCATGCATTTGGTATTTTCGTCTGGGGGGTATGCACGCGATAGCATTGCGAGACGCTGGAGCCGGAGCACCCTATGTCGCAGTATCTGTCTTTGATTCCTGCCTCATCCTATTATTTATCG
>Sample_03_K1
GATCACAGGTCTATCACCCTATTAACCACTCACGGGAGCTCTCCATGCATTTGGTATTTTCGTCTGGGGGGTATGCACGCGATAGCATTGCGAGACGCTGGAGCCGGAGCACCCTATGTCGCAGTATCTGTCTTTGATTCCTGCCTCATCCTATTATTTATCA
>Sample_04_K1
GATCACAGGTCTATCACCCTATTAACCACTCACGGGAGCTCTCCATGCATTTGGTATTTTCGTCTGGGGGGTATGCACGCGATAGCATTGCGAGACGCTGGAGCCGGAGCACCCTATGTCGCAGTATCTGTCTTTGATTCCTGCCTCATCCTATTATTTATCA
>Sample_05_J1
GATCACAGGTCTATCACCCTATTAACCACTCACGGGAGCTCTCCATGCATTTGGTATTTTCGTCTGGGGGGTATGCACGCGATAGCATTGCGAGACGCTGGAGCCGGAGCACCCTATGTCGCAGTATCTGTCTTTGATTCCTGCCTCATCCTATTATTTATCC`

export default function IngestionPanel({ onAnalyze, loading, error }) {
  const [tab, setTab] = useState('ncbi')
  const [query, setQuery] = useState('Homo sapiens mitochondrion complete genome India')
  const [maxSamples, setMaxSamples] = useState(20)
  const [region, setRegion] = useState('Global')
  const [files, setFiles] = useState([])
  const [pastedText, setPastedText] = useState('')
  const [pasteError, setPasteError] = useState('')
  const inputRef = useRef(null)

  const regionLabel = region === 'Global' ? 'Unknown' : region
  const submitNcbi = (event) => {
    event.preventDefault()
    onAnalyze({ type: 'ncbi', query, max_samples: Math.max(15, maxSamples), region_label: regionLabel })
  }
  const submitUpload = (event) => {
    event.preventDefault()
    if (files.length) onAnalyze({ type: 'upload', files, region_label: regionLabel })
  }
  const submitPasted = (event) => {
    event.preventDefault()
    const trimmed = pastedText.trim()
    if (!trimmed) return setPasteError('Paste at least one FASTA record before analyzing.')
    if (!trimmed.startsWith('>')) return setPasteError('FASTA text must begin with a header starting with ">".')
    setPasteError('')
    const file = new File([trimmed], 'pasted_batch.fasta', { type: 'text/plain' })
    onAnalyze({ type: 'upload', files: [file], region_label: regionLabel, awakening: true })
  }
  const acceptFiles = (selected) => setFiles(Array.from(selected).filter((file) => /\.(fasta|fa|seq|txt)$/i.test(file.name)))
  const loadDemo = () => { setPastedText(demoFasta); setPasteError('') }
  const clearPasted = () => { setPastedText(''); setPasteError('') }

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
    </form> : <div className="upload-form">
      <form onSubmit={submitUpload}>
        <div className="dropzone" onClick={() => inputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); acceptFiles(e.dataTransfer.files) }}>
          <UploadCloud size={28} /><strong>Drop FASTA files here</strong><span>.fasta, .fa, .seq, or .txt · single or multi-record</span><input ref={inputRef} hidden type="file" multiple accept=".fasta,.fa,.seq,.txt" onChange={(e) => acceptFiles(e.target.files)} />
        </div>
        <div className="upload-actions"><div><span className="muted">{files.length ? `${files.length} file${files.length > 1 ? 's' : ''} selected` : 'No files selected'}</span>{files.map((file) => <div className="file-pill" key={file.name}>{file.name}</div>)}</div><div className="upload-controls"><label className="field"><span>Region tag</span><select value={region} onChange={(e) => setRegion(e.target.value)}>{regions.map((item) => <option key={item}>{item}</option>)}</select></label><button className="primary-button" disabled={loading || !files.length}>{loading ? <LoaderCircle className="spin" size={17} /> : <FileUp size={17} />} Upload & analyze</button></div></div>
      </form>
      <div className="paste-divider"><span>or use text directly</span></div>
      <form className="paste-form" onSubmit={submitPasted}>
        <div className="paste-heading"><label className="field paste-label" htmlFor="pasted-fasta"><span>Or paste raw FASTA sequences directly</span></label><div className="paste-actions"><button type="button" className="secondary-button" onClick={loadDemo}><WandSparkles size={15} /> Load 5-Sample Demo Batch</button>{pastedText && <button type="button" className="clear-button" onClick={clearPasted}><Trash2 size={14} /> Clear</button>}</div></div>
        <textarea id="pasted-fasta" className="fasta-textarea font-mono text-xs" value={pastedText} onChange={(event) => { setPastedText(event.target.value); if (pasteError) setPasteError('') }} placeholder={`>Sample_01\nGATCACAGGTCTATCACCCTATTAACCACTCAC...`} spellCheck="false" aria-describedby={pasteError ? 'paste-error' : undefined} />
        <div className="paste-footer"><span className="paste-help"><ClipboardPaste size={14} /> FASTA headers start with <code>&gt;</code>; multiple records are supported.</span><button className="primary-button" type="submit" disabled={loading || !pastedText.trim()}>{loading ? <LoaderCircle className="spin" size={17} /> : <ClipboardPaste size={17} />} Analyze Pasted FASTA</button></div>
        {pasteError && <div className="inline-validation" id="paste-error" role="alert">{pasteError}</div>}
      </form>
    </div>}
    {error && <div className="error-banner">{error}</div>}
  </section>
}
