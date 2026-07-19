// -----------------------------------------------------------------------------
// CV content for Isaac Bristow.
//
// The multi-tool is segmented into four specialist `areas`; each maps to one
// tool that extrudes when its segment is hovered (see src/three/multitool.ts).
// `accent` colours the segment's synthetic material and its UI highlights.
// -----------------------------------------------------------------------------

export type ToolKind = 'driver' | 'wrench' | 'ruler' | 'scalpel'

export interface Highlight {
  title: string
  meta?: string
  detail?: string
}

export interface Area {
  id: string
  code: string
  label: string
  toolName: string
  tool: ToolKind
  tagline: string
  blurb: string
  skills: string[]
  highlights: Highlight[]
  accent: string
}

export interface ExperienceRole {
  title: string
  period: string
  location?: string
  summary?: string
  bullets?: string[]
  skills?: string[]
}

export interface Company {
  name: string
  meta?: string
  roles: ExperienceRole[]
}

export interface Credential {
  place: string
  award: string
}

export const profile = {
  name: 'ISAAC BRISTOW',
  creds: 'BSc (Hons)',
  title: 'Implementation · Product · QA · Healthcare',
  statement:
    'Resilient, self-directed, pressure-motivated. Preference for high-intensity, high-reward environments. Individually, I find satisfaction delivering creative solutions via a diverse and expanding toolset; collaboratively, multi-disciplinary co-ordination and radical candour drive success in the projects I lead and contribute to.',
}

export const contact = {
  email: 'isaaclbristow@gmail.com',
  phone: '',
  linkedin: 'linkedin.com/in/isaac-bristow',
  linkedinUrl: 'https://www.linkedin.com/in/isaac-bristow/',
}

export const areas: Area[] = [
  {
    id: 'implementation',
    code: '01',
    label: 'Implementation',
    toolName: 'Driver',
    tool: 'driver',
    tagline: 'Building & integrating systems',
    blurb:
      'Interfacing & integration engineering across healthcare platforms — from console applications to cloud infrastructure, increasingly augmented with LLM/agentic workflows.',
    skills: [
      'VueJS',
      'C#',
      'Mirth Connect',
      'Kubernetes',
      'Azure',
      'SQL Server',
      'Cosmos DB',
      'LLM / Agentic workflows',
      'Cypress / Mochawesome',
      'Network Configuration',
      'Cloud / On-Prem WinServ',
    ],
    highlights: [
      {
        title: 'Next-generation LIMS',
        detail:
          'Founding member and key contributor to a next-generation Laboratory Information Management System.',
      },
      {
        title: 'Automated QA',
        detail: 'End-to-end and integration test suites with Cypress + Mochawesome reporting.',
      },
    ],
    accent: '#ff5f59',
  },
  {
    id: 'product',
    code: '02',
    label: 'Product',
    toolName: 'Wrench',
    tool: 'wrench',
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
        detail:
          'Stabilised relationships with key clinical partners through deliberate product design and effective communication.',
      },
      {
        title: 'Regulatory readiness',
        detail: 'Product decisions framed against DCB0129 and ISO 13485 from the outset.',
      },
    ],
    accent: '#10b981',
  },
  {
    id: 'management',
    code: '03',
    label: 'Management',
    toolName: 'Ruler',
    tool: 'ruler',
    tagline: 'Co-ordinating delivery at scale',
    blurb:
      'Leading multi-disciplinary delivery — product, project, operational and stakeholder management — with radical candour through hard-won trust.',
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
    accent: '#f59e0b',
  },
  {
    id: 'healthcare',
    code: '04',
    label: 'Healthcare',
    toolName: 'Scalpel',
    tool: 'scalpel',
    tagline: 'The scientific foundation',
    blurb:
      'A molecular and cellular pathology background contextualises the work I do in healthcare software, and informs the decisions I make in product and implementation.',
    skills: [
      'Molecular Biology',
      'Cellular Pathology',
      'Assay Validation / Verification',
      'HL7 / Healthcare Interfacing',
      'Roche',
      'Leica',
      '3DHISTECH',
      'Illumina',
      'Thermo Fisher',
      'Qiagen',
    ],
    highlights: [
      {
        title: 'SARS-CoV-2 variant panels',
        detail:
          'Delivered the first nationally verified SARS-CoV-2 Omicron variant detection panel.',
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
    accent: '#ec4899',
  },
]

export const experience: Company[] = [
  {
    name: 'Health Services Laboratories',
    meta: 'Full-time · 6 yrs 1 mo',
    roles: [
      {
        title: 'QA & Implementation Engineer',
        period: 'May 2022 — Present · 4 yrs 3 mos',
        summary:
          "Within this highly dynamic role I've made significant contributions to the design, development, testing and rollout of a web-based laboratory management application across several laboratories and hospitals in the London area — the Royal Free, UCLH, Barnet, North Mid, Northwick Park, Ealing, Chase Farm and Whittington, as well as ~30 smaller sites across Greater London.",
        bullets: [
          'Requirement discovery & technical specification creation',
          'Networking and hardware installation',
          'Manual and automated (Cypress) QA',
          'Business intelligence through SQL report generation & Tableau integration',
          'Infrastructure management through Kubernetes calibration and Azure SQL maintenance',
          'Creating and delivering training material across all levels of the business',
          'Presenting the application and demonstrating features to global partners',
          'Researching and resolving critical issues in C# and Vue.js',
          'Integration of medical devices and systems',
          'Stakeholder management',
        ],
        skills: ['Cypress', 'SQL', 'Vue.js', 'C#', 'Kubernetes', 'Azure', 'Tableau', 'Notion'],
      },
      {
        title: 'Laboratory Supervisor',
        period: 'Dec 2020 — Apr 2022 · 1 yr 5 mos',
        location: 'London Area, United Kingdom',
        summary:
          'Focused on delivering training for PCR pathways on QS5, COBAS and PANTHER platforms while maintaining laboratory KPIs, with a focus on tackling invalid results via pathway improvement through statistical analysis.',
        bullets: [
          'In partnership with the DHSC, delivered the first verified P681R SARS-CoV-2 mutation panel assay for delta variant detection.',
          'Amongst the first to deliver a verified panel for detection of N501Y, E484K, K417N & K417T mutations, and the Omicron-indicative mutation Q493R — specificity determined using Illumina NGS.',
          'Contributed to and delivered a one-week intensive laboratory training course in partnership with UCL — just under 100 staff in under 7 days — to kick-start high-throughput qPCR COVID testing.',
          'Experienced with in-house developed and CE-marked assay verification and validation, plus SOP drafting and re-iteration in line with QM principles.',
        ],
      },
      {
        title: 'Medical Laboratory Assistant — Molecular Pathology',
        period: 'Jul 2020 — Dec 2020 · 6 mos',
        location: 'London Area, United Kingdom',
        summary:
          'Performed routine PCR. Reinforced the foundations of my practical techniques. Established myself as a discerning and reliable individual capable of meeting targets and identifying areas for improvement.',
      },
    ],
  },
  {
    name: 'Various — Back of House & Retail',
    meta: 'Oct 2012 — Jul 2020',
    roles: [
      {
        title: 'Various BoH & Retail',
        period: 'Oct 2012 — Jul 2020',
        summary:
          'Mstly kitchen and retail positions, held alongside education, building the resilience and work ethic that carried me through into laboratory and engineering work.',
      },
    ],
  },
]

export const education: Credential[] = [
  { place: 'University of Portsmouth', award: 'BSc Biology — First Class w/ Honours' },
  { place: 'South Downs College', award: 'A Level — Biology / Chemistry / English Lang' },
  { place: "St Edmund's Catholic", award: '10 GCSEs A*–C inc. Maths & English' },
]

export const accolades: string[] = [
  'Founding member and key contributor of a next-generation web-based LIMS system.',
  'Stabilised relationships with key clinical partners through product design.',
  'Delivered the first nationally verified SARS-CoV-2 Omicron variant detection panel.',
  'Designed and verified a 10× scale-up for DirectPCR COVID testing.',
  'GIRFT reward nomination for a novel thermocycler contamination monitor.',
  'Delivery & implementation of LIMS transformation projects across London.',
]
