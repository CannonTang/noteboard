import { describe, expect, it } from 'vitest'
import { categoriesFor, groupNotes, normalizeCategoryOrder } from './board'
import type { Note } from '@/types'

const notes: Note[] = [
  { id: 'one', title: 'A', content: '', category: 'Planning', color: 'yellow', images: [], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'two', title: 'B', content: '', category: 'Design', color: 'blue', images: [], createdAt: '2026-01-02T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z' },
  { id: 'three', title: 'C', content: '', category: '', color: 'pink', images: [], createdAt: '2026-01-03T00:00:00Z', updatedAt: '2026-01-03T00:00:00Z' },
]

describe('category order', () => {
  it('keeps a saved order and adds new categories deterministically', () => {
    expect(normalizeCategoryOrder(['Planning'], [...notes, { ...notes[0], id: 'four', category: 'Research' }])).toEqual(['Planning', 'Design', 'Research'])
  })

  it('keeps uncategorized notes last', () => {
    expect(groupNotes(notes, ['Planning', 'Design'], 'updated').map(group => group.category)).toEqual(['Planning', 'Design', 'Uncategorized'])
  })

  it('does not expose the reserved uncategorized category for reordering', () => {
    expect(categoriesFor(notes)).toEqual(['Planning', 'Design'])
  })
})
