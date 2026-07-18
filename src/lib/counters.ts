// Site-wide counters via Abacus (https://abacus.jasoncameron.dev) — a free
// hosted key/value counter API. No backend or database of our own; values are
// public to anyone who knows the namespace/key.

const BASE = 'https://abacus.jasoncameron.dev'
const NS = 'tsiyes-ib-me'

export interface CounterSnapshot {
  visits: number | null
  botsBounced: number | null
}

const cache: CounterSnapshot = {
  visits: null,
  botsBounced: null,
}

async function readJson(path: string): Promise<number | null> {
  try {
    const res = await fetch(`${BASE}${path}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as { value?: unknown }
    return typeof data.value === 'number' ? data.value : null
  } catch {
    return null
  }
}

async function hit(key: string): Promise<number | null> {
  return readJson(`/hit/${NS}/${key}`)
}

async function get(key: string): Promise<number | null> {
  return readJson(`/get/${NS}/${key}`)
}

export function getCachedCounters(): CounterSnapshot {
  return { ...cache }
}

/** Increment visits and refresh the bots-bounced total for display. */
export async function recordVisit(): Promise<CounterSnapshot> {
  const [visits, botsBounced] = await Promise.all([hit('visits'), get('bots-bounced')])
  cache.visits = visits
  if (botsBounced !== null) cache.botsBounced = botsBounced
  return getCachedCounters()
}

/** Increment the tongue-in-cheek "bots bounced" counter (wrong tool pick). */
export async function recordBotBounce(): Promise<CounterSnapshot> {
  const botsBounced = await hit('bots-bounced')
  if (botsBounced !== null) cache.botsBounced = botsBounced
  return getCachedCounters()
}

export async function loadCounters(): Promise<CounterSnapshot> {
  const [visits, botsBounced] = await Promise.all([get('visits'), get('bots-bounced')])
  if (visits !== null) cache.visits = visits
  if (botsBounced !== null) cache.botsBounced = botsBounced
  return getCachedCounters()
}

export function formatCount(n: number | null): string {
  if (n === null) return '—'
  return n.toLocaleString('en-GB')
}
