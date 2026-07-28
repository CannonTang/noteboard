import { type Note, type SortMode, UNCATEGORIZED } from '@/types'

export interface NoteGroup { category: string; notes: Note[] }

export function normalizeCategory(value: string): string {
  return value.trim() || UNCATEGORIZED
}

export function categoriesFor(notes: Note[]): string[] {
  return [...new Set(notes.map(note => normalizeCategory(note.category)))].filter(category => category !== UNCATEGORIZED)
}

export function normalizeCategoryOrder(order: string[], notes: Note[]): string[] {
  const present = new Set(categoriesFor(notes))
  const seen = new Set<string>()
  const cleaned = order.filter(category => present.has(category) && !seen.has(category) && (seen.add(category), true))
  return [...cleaned, ...[...present].filter(category => !seen.has(category)).sort((a, b) => a.localeCompare(b))]
}

export function sortNotes(notes: Note[], mode: SortMode): Note[] {
  return [...notes].sort((left, right) => {
    if (mode === 'title') return left.title.localeCompare(right.title)
    const leftValue = new Date(mode === 'updated' ? left.updatedAt : left.createdAt).getTime()
    const rightValue = new Date(mode === 'updated' ? right.updatedAt : right.createdAt).getTime()
    return rightValue - leftValue
  })
}

export function groupNotes(notes: Note[], categoryOrder: string[], mode: SortMode): NoteGroup[] {
  const byCategory = new Map<string, Note[]>()
  for (const note of notes) {
    const category = normalizeCategory(note.category)
    byCategory.set(category, [...(byCategory.get(category) ?? []), note])
  }
  const ordered = normalizeCategoryOrder(categoryOrder, notes)
  const groups = ordered.flatMap(category => {
    const entries = byCategory.get(category)
    return entries ? [{ category, notes: sortNotes(entries, mode) }] : []
  })
  const uncategorized = byCategory.get(UNCATEGORIZED)
  return uncategorized ? [...groups, { category: UNCATEGORIZED, notes: sortNotes(uncategorized, mode) }] : groups
}
