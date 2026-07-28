import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import NoteBoard from './NoteBoard.vue'
import type { Note } from '@/types'

const notes: Note[] = [
  { id: 'one', title: 'First', content: 'A note with enough content.', category: 'Planning', color: 'yellow', images: [], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'two', title: 'Second', content: 'A second note in the same collection.', category: 'Planning', color: 'blue', images: [], createdAt: '2026-01-02T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z' },
]

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1 })
  vi.stubGlobal('cancelAnimationFrame', () => undefined)
  window.matchMedia = vi.fn().mockReturnValue({ matches: false })
  Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: () => ({ finished: Promise.resolve() }) })
  Object.defineProperty(HTMLElement.prototype, 'getAnimations', { configurable: true, value: () => [] })
})

afterEach(() => vi.unstubAllGlobals())

describe('NoteBoard collection state', () => {
  it('keeps cards mounted while changing from a wall to a stacked collection and back', async () => {
    const wrapper = mount(NoteBoard, { props: { notes, categoryOrder: ['Planning'] } })
    const group = wrapper.find('.note-group')

    await group.find('.group-toggle').trigger('click')
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(group.classes()).toContain('is-collapsed')
    expect(group.findAll('.note-motion-card')).toHaveLength(2)

    await group.find('.note-group-content').trigger('click')
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(group.classes()).not.toContain('is-collapsed')
    expect(group.findAll('.note-motion-card')).toHaveLength(2)
  })
})
