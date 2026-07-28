import type { BoardData, Note } from '@/types'

const STORAGE_KEY = 'noteboard:demo:v1'

const seedNotes: Note[] = [
  { id: 'route-map', title: 'Publish the route map', content: 'Keep launch notes next to the release checklist so the whole team can scan the final changes.', category: 'Launch', color: 'yellow', images: [], createdAt: '2026-07-20T08:30:00.000Z', updatedAt: '2026-07-24T09:00:00.000Z' },
  { id: 'review-loop', title: 'Short review loop', content: 'Capture decisions while they are still fresh. A small, named category is easier to revisit than a long document.', category: 'Team practice', color: 'blue', images: [], createdAt: '2026-07-18T08:30:00.000Z', updatedAt: '2026-07-22T12:15:00.000Z' },
  { id: 'first-contact', title: 'First contact', content: 'Use the board for the detail that makes the next handoff easier.', category: 'Launch', color: 'peach', images: [], createdAt: '2026-07-16T08:30:00.000Z', updatedAt: '2026-07-16T08:30:00.000Z' },
]

const fallback: BoardData = { notes: seedNotes, categoryOrder: ['Launch', 'Team practice'] }

export function loadBoard(): BoardData {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    if (!value) return structuredClone(fallback)
    const parsed = JSON.parse(value) as BoardData
    if (!Array.isArray(parsed.notes) || !Array.isArray(parsed.categoryOrder)) return structuredClone(fallback)
    return parsed
  } catch {
    return structuredClone(fallback)
  }
}

export function saveBoard(data: BoardData): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function resetBoard(): BoardData {
  window.localStorage.removeItem(STORAGE_KEY)
  return structuredClone(fallback)
}
