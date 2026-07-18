// -----------------------------------------------------------------------------
// CV content for Isaac Bristow, organised around four specialist areas. Each
// area maps to one deployable tool on the 3D multi-tool (see src/three/multitool.ts).
//
// `tool` selects the extruded silhouette; `openAngle` (radians) is how far the
// tool swings from its stowed position when fully deployed; `spin` (radians) is
// the extra roll about the tool's own long axis applied during deployment.
// -----------------------------------------------------------------------------

export type ToolKind = 'screwdriver' | 'blade' | 'wrench' | 'scalpel'

export interface Highlight {
  title: string
  meta?: string
  detail?: string
}

export interface Area {
  id: string
  /** Zero-padded index shown in the CAD HUD, e.g. "02". */
  code: string
  label: string
  /** Human name of the implement, e.g. "Flat driver". */
  toolName: string
  tool: ToolKind
  tagline: string
  blurb: string
  skills: string[]
  highlights: Highlight[]
  /** Deployment geometry, consumed by the 3D scene. */
  openAngle: number
  spin: number
  zOffset: number
}

export interface Role {
  title: string
  period: string
  detail?: string
}

export interface Credential {
  place: string
  award: string
}

export const profile = {
  name: 'Isaac Bristow',
  creds: 'BSc (Hons)',
  title: 'Implementation · PM · Product · Development · QA',
  statement:
    'Resilient, self-directed, pressure-motivated. Preference for high-intensity, high-reward environments. Individually, I find satisfaction delivering creative solutions via a diverse and expanding toolset; collaboratively, multi-disciplinary co-ordination and radical candour drive success in the projects I lead and contribute to.',
}

export const contact = {
  email: 'Isaaclbristow@gmail.com',
  phone: '+44 7809 120716',
  linkedin: 'linkedin.com/in/isaac-bristow',
  linkedinUrl: 'https://www.linkedin.com/in/isaac-bristow/',
}

export const areas: Area[] = [
  {
    id: 'development',
    code: '01',
    label: 'Development',
    toolName: 'Flat driver',
    tool: 'screwdriver',
    tagline: 'Building & integrating the systems',
    blurb:
      'Full-stack and integration engineering across healthcare platforms — from UI to interface engine to cloud infrastructure, increasingly augmented with LLM/agentic workflows.',
    skills: [
      'VueJS',
      'Mirth Connect',
      'Kubernetes',
      'Azure',
      'SQL Server',
      'Cosmos DB',
      'LLM / Agentic workflows',
      'Cypress / Mochawesome',
      'Network Configuration',
      'Cloud / On-Prem WinServ',
      'HW / SW Installation',
    ],
    highlights: [
      {
        title: 'Next-generation LIMS',
        meta: 'Founding contributor',
        detail:
          'Founding member and key contributor to a next-generation Laboratory Information Management System.',
      },
      {
        title: 'Automated QA',
        detail: 'End-to-end and integration test suites with Cypress + Mochawesome reporting.',
      },
    ],
    openAngle: 1.15,
    spin: 0.9,
    zOffset: 0.24,
  },
  {
    id: 'product',
    code: '02',
    label: 'Product',
    toolName: 'Blade',
    tool: 'blade',
    tagline: 'Shaping compliant, usable products',
    blurb:
      'Owning product direction for regulated medical software — balancing clinical needs, usability and the certification bar that healthcare devices must clear.',
    skills: [
      'Product Research',
      'CE Marking',
      'Medical Device Certification',
      'DCB0129',
      'ISO 13485',
      'Digital Pathology',
      'LIMS / EPRs',
      'Order Comms',
      'Product Design',
    ],
    highlights: [
      {
        title: 'Clinical partnerships',
        detail: 'Stabilised relationships with key clinical partners through deliberate product design.',
      },
      {
        title: 'Regulatory readiness',
        detail: 'Product decisions framed against DCB0129 and ISO 13485 from the outset.',
      },
    ],
    openAngle: 0.42,
    spin: -0.7,
    zOffset: 0.08,
  },
  {
    id: 'management',
    code: '03',
    label: 'Management',
    toolName: 'Spanner',
    tool: 'wrench',
    tagline: 'Co-ordinating delivery at scale',
    blurb:
      'Leading multi-disciplinary delivery — product, project, operational and stakeholder management — with radical candour and a bias toward measurable outcomes.',
    skills: [
      'Project Management',
      'Operational Management',
      'Stakeholder Management',
      'Multi-disciplinary Co-ordination',
      'Delivery & Implementation',
      'BI / Finance / Tableau',
      'Notion',
    ],
    highlights: [
      {
        title: 'LIMS transformation, London',
        detail: 'Delivery & implementation of LIMS transformation projects across London sites.',
      },
      {
        title: 'Radical candour',
        detail: 'Direct, high-trust communication that keeps multi-disciplinary teams aligned.',
      },
    ],
    openAngle: -0.42,
    spin: 0.7,
    zOffset: -0.08,
  },
  {
    id: 'healthcare',
    code: '04',
    label: 'Healthcare Sciences',
    toolName: 'Scalpel',
    tool: 'scalpel',
    tagline: 'The scientific foundation',
    blurb:
      'A molecular and cellular pathology background underpins everything — from assay validation to the healthcare integration standards that move results between systems.',
    skills: [
      'Molecular Biology',
      'Cellular Pathology',
      'Assay Validation / Verification',
      'HL7 / Healthcare Interfacing',
      'Roche',
      'Leica',
      '3DHISTECH',
    ],
    highlights: [
      {
        title: 'SARS-CoV-2 Omicron panel',
        detail: 'Delivered the first nationally verified SARS-CoV-2 Omicron variant detection panel.',
      },
      {
        title: 'DirectPCR 10× scale-up',
        detail: 'Designed and verified a 10× scale-up for DirectPCR COVID testing.',
      },
      {
        title: 'GIRFT nomination',
        detail: 'GIRFT reward nomination for a novel thermocycler contamination monitor.',
      },
    ],
    openAngle: -1.15,
    spin: -0.9,
    zOffset: -0.24,
  },
]

export const employment: Role[] = [
  { title: 'QA & Implementation Engineer', period: 'May 2022 — Present' },
  { title: 'Senior Laboratory Supervisor', period: 'Dec 2020 — Apr 2022' },
  { title: 'Medical Laboratory Assistant', period: 'Jul 2020 — Dec 2020' },
  { title: 'Various BoH & Retail', period: 'Oct 2012 — Jul 2020' },
]

export const education: Credential[] = [
  { place: 'University of Portsmouth', award: 'BSc Biology — First Class w/ Honours' },
  { place: 'South Downs College', award: 'A Level — Biology / Chemistry / English Lang' },
  { place: "St Edmund's Catholic", award: '10 GCSEs A*–C inc. Maths & English' },
]

export const accolades: string[] = [
  'Founding member and key contributor of a next-generation LIMS system.',
  'Stabilised relationships with key clinical partners through product design.',
  'Delivered the first nationally verified SARS-CoV-2 Omicron variant detection panel.',
  'Designed and verified a 10× scale-up for DirectPCR COVID testing.',
  'GIRFT reward nomination for a novel thermocycler contamination monitor.',
  'Delivery & implementation of LIMS transformation projects across London.',
]
