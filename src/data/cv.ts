// -----------------------------------------------------------------------------
// CV content + tool configuration.
//
// This is the single place to edit the CV. Each entry in `tools` becomes a
// fold-out implement on the Swiss army knife. `openAngle` controls how far the
// tool swings out from the handle (degrees, clockwise, 180 = straight left),
// and `shape` selects one of the silhouettes drawn in SwissArmyKnife.vue.
// -----------------------------------------------------------------------------

export type ToolShape =
  | 'blade'
  | 'screwdriver'
  | 'corkscrew'
  | 'canopener'
  | 'scissors'
  | 'magnifier'

export interface CvItem {
  title: string
  subtitle?: string
  period?: string
  detail?: string
  bullets?: string[]
}

export interface Tool {
  id: string
  /** Short label shown on the tool tab and in the panel header. */
  label: string
  /** One-line tagline shown under the panel header. */
  tagline: string
  shape: ToolShape
  /** Angle (deg, clockwise) the tool rotates to when opened. */
  openAngle: number
  /** Accent colour for the tool's steel + panel highlights. */
  accent: string
  items: CvItem[]
}

export interface Profile {
  name: string
  title: string
  location: string
  blurb: string
}

export const profile: Profile = {
  name: 'Isaac',
  title: 'Product Engineer · Full-stack & Creative Dev',
  location: 'Remote · UTC',
  blurb:
    'A CV you can actually open up. Click a tool to fold it out of the handle and read that part of the story.',
}

export const tools: Tool[] = [
  {
    id: 'profile',
    label: 'Profile',
    tagline: 'The main blade — who I am',
    shape: 'blade',
    openAngle: 138,
    accent: '#d7dde6',
    items: [
      {
        title: 'Product-minded engineer',
        detail:
          'I build polished, fast web products end to end — from data model to the last pixel of animation. Happiest at the seam between engineering and design, turning fuzzy ideas into things people enjoy using.',
      },
      {
        title: 'How I work',
        bullets: [
          'Ship small, measure, iterate.',
          'Treat performance and accessibility as features.',
          'Prototype in code, not slides.',
        ],
      },
    ],
  },
  {
    id: 'skills',
    label: 'Skills',
    tagline: 'The screwdriver — the toolkit',
    shape: 'screwdriver',
    openAngle: 159,
    accent: '#cfd6e0',
    items: [
      {
        title: 'Frontend',
        detail: 'Vue 3, TypeScript, Vite, SVG/CSS animation, Web Components.',
      },
      {
        title: 'Backend',
        detail: 'Node.js, Python, PostgreSQL, REST & serverless edge functions.',
      },
      {
        title: 'Craft',
        detail: 'Design systems, motion design, performance budgets, testing.',
      },
    ],
  },
  {
    id: 'experience',
    label: 'Experience',
    tagline: 'The corkscrew — twists and turns',
    shape: 'corkscrew',
    openAngle: 180,
    accent: '#c8cfd9',
    items: [
      {
        title: 'Senior Product Engineer',
        subtitle: 'Northwind Labs',
        period: '2023 — present',
        bullets: [
          'Led the rebuild of the onboarding flow, lifting activation 24%.',
          'Owned the component library used by 30+ engineers.',
        ],
      },
      {
        title: 'Full-stack Engineer',
        subtitle: 'Beacon Interactive',
        period: '2020 — 2023',
        bullets: [
          'Shipped a real-time collaboration editor from prototype to GA.',
          'Cut p95 page load from 4.1s to 1.2s.',
        ],
      },
    ],
  },
  {
    id: 'education',
    label: 'Education',
    tagline: 'The can opener — foundations',
    shape: 'canopener',
    openAngle: 201,
    accent: '#c2c9d4',
    items: [
      {
        title: 'BSc Computer Science',
        subtitle: 'University of Somewhere',
        period: '2016 — 2020',
        detail: 'First-class honours. Focus on graphics and human–computer interaction.',
      },
    ],
  },
  {
    id: 'projects',
    label: 'Projects',
    tagline: 'The scissors — things I cut loose',
    shape: 'scissors',
    openAngle: 222,
    accent: '#bcc4cf',
    items: [
      {
        title: 'This CV',
        detail: 'An interactive Swiss army knife résumé built with Vue + SVG. Meta, but fun.',
      },
      {
        title: 'Tiny-Sync',
        detail: 'A 3KB offline-first sync engine for local-first apps.',
      },
    ],
  },
  {
    id: 'contact',
    label: 'Contact',
    tagline: 'The magnifier — find me',
    shape: 'magnifier',
    openAngle: 243,
    accent: '#b6bfca',
    items: [
      {
        title: 'Email',
        detail: 'isaac@example.com',
      },
      {
        title: 'Elsewhere',
        bullets: ['github.com/isaac', 'linkedin.com/in/isaac'],
      },
    ],
  },
]
