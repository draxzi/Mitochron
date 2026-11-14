import { Download, FileSpreadsheet, FileText, FileType2 } from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const API = (import.meta.env.VITE_API_URL || 'https://mitochron.onrender.com').replace(/\/+$/, '')

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

async function secureDownload(sessionId, token, format) {
  const response = await fetch(`${API}/export/${sessionId}/${format}`, { headers: { 'X-Session-Token': token } })
  if (!response.ok) throw new Error('Export authorization failed')
  downloadBlob(await response.blob(), `mtDNA_${sessionId}.${format === 'excel' ? 'xlsx' : 'csv'}`)
}

function buildDossier(result) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const summary = result.summary || {}
  const variants = result.variants || []
  const frequencies = summary.frequencies || []
  const crimson = [164, 54, 73]
  doc.setFillColor(...crimson); doc.rect(0, 0, 595, 92, 'F')
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(19); doc.text('Forensic mtDNA Variant & Population Analysis Dossier', 36, 43)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text('Controlled analytical workspace · reference-aligned review', 36, 64)
  doc.setTextColor(38, 45, 57); doc.setFontSize(10); doc.text(`Session ID: ${result.session_id}`, 36, 120); doc.text('Reference Genome: NC_012920', 36, 137); doc.text(`Generated: ${new Date().toLocaleString()}`, 36, 154)
  doc.setFillColor(244, 246, 248); doc.roundedRect(36, 174, 523, 68, 7, 7, 'F'); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(85, 96, 111); doc.text('SUMMARY METRICS', 50, 194)
  const metrics = [`${summary.total_specimens || 0} specimens`, `${variants.length} variant calls`, `${frequencies.length} unique mutations`, `${variants.filter((item) => item.is_anomaly).length} anomalies`]
  doc.setFontSize(12); doc.setTextColor(38, 45, 57); metrics.forEach((metric, index) => doc.text(metric, 50 + index * 123, 220))
  doc.setTextColor(38, 45, 57); doc.setFontSize(12); doc.text('Top Cohort SNP Frequencies', 36, 275)
  autoTable(doc, { startY: 288, head: [['Mutation', 'Count', 'Total', 'Frequency', 'Category']], body: frequencies.slice(0, 12).map((item) => [item.base_change, item.count, item.total, `${item.frequency_pct}%`, item.category]), theme: 'grid', headStyles: { fillColor: crimson, fontSize: 8 }, bodyStyles: { fontSize: 8, textColor: [54, 63, 76] }, alternateRowStyles: { fillColor: [249, 250, 251] }, margin: { left: 36, right: 36 } })
  const nextY = (doc.lastAutoTable?.finalY || 300) + 28; doc.setFontSize(12); doc.text('Color-Coded Variant Calls', 36, nextY)
  autoTable(doc, { startY: nextY + 12, head: [['Specimen', 'Change', 'Position', 'Type', 'QV', 'Effect', 'Review']], body: variants.slice(0, 32).map((item) => [item.specimen_id, item.base_change, `${item.position} / ${item.roi}`, item.type, String(item.qv_score), item.effect, item.is_anomaly ? 'LOW QV / AMBIGUOUS' : 'Clear']), theme: 'grid', headStyles: { fillColor: [53, 63, 78], fontSize: 7 }, bodyStyles: { fontSize: 7, textColor: [54, 63, 76] }, didParseCell: (data) => { if (data.section === 'body' && data.column.index === 4) data.cell.styles.textColor = Number(data.cell.raw) < 15 ? [176, 55, 52] : [38, 125, 78]; if (data.section === 'body' && data.column.index === 6 && data.cell.raw !== 'Clear') data.cell.styles.textColor = [176, 55, 52] }, margin: { left: 36, right: 36 } })
  doc.setFontSize(7); doc.setTextColor(110, 120, 134); doc.text('Analytical aid only. Interpret results with laboratory quality controls and validated forensic procedures.', 36, 815)
  return doc
}

export default function ExportToolbar({ result, token }) {
  if (!result?.session_id) return null
  const { session_id: sessionId } = result
  const runDownload = (format) => secureDownload(sessionId, token, format).catch((error) => window.alert(error.message))
  return <div className="export-toolbar"><div><div className="eyebrow">Evidence package</div><strong>Export this analysis session</strong></div><div className="export-actions"><button onClick={() => runDownload('excel')}><FileSpreadsheet size={16} /> Excel report</button><button onClick={() => runDownload('csv')}><FileText size={16} /> CSV table</button><button onClick={() => buildDossier(result).save(`Forensic_mtDNA_Dossier_${sessionId}.pdf`)}><FileType2 size={16} /> PDF dossier</button><span className="session-code"><Download size={13} /> {sessionId.slice(0, 10)}…</span></div></div>
}
