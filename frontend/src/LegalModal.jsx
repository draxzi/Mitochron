import { X } from 'lucide-react'

const copy = {
  terms: { title: 'Terms & Conditions', body: <>MITOCHRON is an analytical aid for qualified review. You are responsible for validating inputs, interpreting outputs, and complying with applicable laboratory, institutional, and legal requirements. Do not use this service as the sole basis for an identity, health, employment, immigration, or legal decision.</> },
  privacy: { title: 'Privacy Policy', body: <>Uploaded sequences and generated reports are processed to provide the requested analysis session. Do not upload personally identifying information or evidence you are not authorized to process. Session data is isolated by a short-lived token; retain only exports needed for your authorized work and follow your organization’s retention policy.</> },
  disclaimer: { title: 'Forensic & Research Disclaimer', body: <>Results are research and review outputs, not a validated forensic conclusion. Reference alignment, variant calls, frequencies, clusters, and AI explanations can contain uncertainty and must be checked against laboratory quality controls, validated methods, chain-of-custody requirements, and expert interpretation. AI responses may be incomplete and should never replace a qualified forensic scientist.</> },
}

export default function LegalModal({ page, onClose }) {
  if (!page || !copy[page]) return null
  const item = copy[page]
  return <div className="legal-backdrop" role="presentation" onClick={onClose}><section className="legal-modal" role="dialog" aria-modal="true" aria-labelledby="legal-title" onClick={(event) => event.stopPropagation()}><button className="legal-close" onClick={onClose} aria-label="Close"><X size={18} /></button><div className="eyebrow">MITOCHRON governance</div><h2 id="legal-title">{item.title}</h2><p>{item.body}</p><p className="legal-note">Last reviewed: November 2026 · Contact your data controller for organization-specific policies.</p></section></div>
}
