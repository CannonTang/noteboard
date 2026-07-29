<template>
  <section class="board-shell" aria-label="Noteboard administrator">
    <header class="board-toolbar">
      <div><p class="eyebrow">Administrator workspace</p><h1>Notes that stay useful.</h1></div>
      <div class="toolbar-actions">
        <label class="sort-control"><span>Sort notes</span><select v-model="sortMode"><option value="updated">Recently updated</option><option value="created">Recently created</option><option value="title">Title</option></select></label>
        <button class="secondary-button category-order-action" type="button" @click="orderOpen = true"><ListOrdered :size="18" />Order categories</button>
        <button class="primary-button" type="button" @click="openCreate"><Plus :size="18" />New note</button>
      </div>
    </header>

    <div v-if="groups.length" class="note-groups">
      <section
        v-for="group in groups"
        :key="group.category"
        :ref="element => setGroupElement(group.category, element)"
        class="note-group"
        :class="{
          'is-collapsed': isCollapsed(group.category),
          'is-collapsing': isTransitioning(group.category, 'collapse'),
          'is-expanding': isTransitioning(group.category, 'expand'),
        }"
      >
        <header class="group-header"><button class="group-toggle" type="button" :aria-expanded="!isCollapsed(group.category)" @click="toggleGroup(group.category)"><ChevronDown :size="18" /><span>{{ group.category }}</span><b>{{ group.notes.length }}</b></button></header>
        <div class="note-group-content" :role="isCollapsed(group.category) ? 'button' : undefined" :tabindex="isCollapsed(group.category) ? 0 : -1" :aria-label="isCollapsed(group.category) ? `Expand ${group.category}` : undefined" @click="isCollapsed(group.category) && toggleGroup(group.category)" @keydown.enter.prevent="isCollapsed(group.category) && toggleGroup(group.category)" @keydown.space.prevent="isCollapsed(group.category) && toggleGroup(group.category)">
          <span class="collection-pin" aria-hidden="true"></span>
          <div class="note-group-inner"><div class="note-wall"><div v-for="(note, index) in group.notes" :key="note.id" class="note-motion-card" :style="noteMotionStyle(note.id, index)"><NoteCard :note="note" @edit="openEdit" @delete="requestDelete" @preview="preview" @layout="scheduleLayout" /></div></div></div>
        </div>
      </section>
    </div>
    <div v-else class="empty-board"><StickyNote :size="28" /><h2>Start the board</h2><p>Write the first note to create a useful reference for the team.</p><button class="primary-button" type="button" @click="openCreate"><Plus :size="18" />New note</button></div>

    <NoteComposer :open="composerOpen" :note="editing" :categories="categories" @close="composerOpen = false" @save="save" />
    <CategoryOrderDialog :open="orderOpen" :categories="categories" @close="orderOpen = false" @save="saveOrder" />
    <Teleport to="body"><div v-if="confirming" class="modal-backdrop" @click.self="confirming = null"><section class="confirm-dialog" role="dialog" aria-modal="true"><h2>Delete this note?</h2><p>This cannot be undone.</p><div class="dialog-actions"><button class="secondary-button" type="button" @click="confirming = null">Cancel</button><button class="danger-button" type="button" @click="emit('delete', confirming!.id); confirming = null">Delete</button></div></section></div><div v-if="lightbox" class="lightbox" @click.self="lightbox = null"><button class="icon-button lightbox-close" type="button" title="Close image" @click="lightbox = null"><X :size="20" /></button><img :src="lightbox.src" :alt="lightbox.name" /></div></Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type ComponentPublicInstance } from 'vue'
import { ChevronDown, ListOrdered, Plus, StickyNote, X } from 'lucide-vue-next'
import { groupNotes, normalizeCategoryOrder } from '@/lib/board'
import type { Note, NoteDraft, SortMode } from '@/types'
import CategoryOrderDialog from './CategoryOrderDialog.vue'
import NoteCard from './NoteCard.vue'
import NoteComposer from './NoteComposer.vue'

const props = defineProps<{ notes: Note[]; categoryOrder: string[] }>()
const emit = defineEmits<{ create: [draft: NoteDraft]; update: [id: string, draft: NoteDraft]; delete: [id: string]; order: [categories: string[]] }>()
const sortMode = ref<SortMode>('updated')
const collapsed = ref(new Set<string>())
const collapsing = ref(new Set<string>())
const expanding = ref(new Set<string>())
const composerOpen = ref(false)
const orderOpen = ref(false)
const editing = ref<Note | null>(null)
const confirming = ref<Note | null>(null)
const lightbox = ref<{ src: string; name: string } | null>(null)
const groupElements = new Map<string, HTMLElement>()
let layoutFrame = 0
const collectionMotionDuration = 520
const collectionMotionStagger = 68
const categories = computed(() => normalizeCategoryOrder(props.categoryOrder, props.notes))
const groups = computed(() => groupNotes(props.notes, categories.value, sortMode.value))
function isCollapsed(category: string) { return collapsed.value.has(category) }
function isTransitioning(category: string, direction: 'collapse' | 'expand') { return (direction === 'collapse' ? collapsing.value : expanding.value).has(category) }
function replaceSet(target: typeof collapsing, category: string, active: boolean) { const next = new Set(target.value); active ? next.add(category) : next.delete(category); target.value = next }
function setCollapsed(category: string, value: boolean) { const next = new Set(collapsed.value); value ? next.add(category) : next.delete(category); collapsed.value = next }
function setGroupElement(category: string, element: Element | ComponentPublicInstance | null) {
  const root = element instanceof HTMLElement ? element : element && '$el' in element ? element.$el : null
  if (root instanceof HTMLElement) groupElements.set(category, root)
  else groupElements.delete(category)
}
function noteMotionStyle(id: string, index: number) {
  let hash = 2166136261
  for (const character of id) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  const pick = (shift: number, range: number) => ((hash >>> shift) % range)
  return {
    '--stack-x': `${(index % 4) * 9}px`,
    '--stack-y': `${index * 16}px`,
    '--stack-tilt': `${[-1.7, 1.2, -0.8, 1.5][index % 4]}deg`,
    '--stack-z': String(index + 1),
    '--delay': `${Math.min(index, 10) * 55}ms`,
    '--tilt': `${(pick(0, 29) - 14) / 10}deg`,
    '--note-x': `${pick(5, 7) - 3}px`,
    '--note-y': `${pick(9, 5) - 2}px`,
    '--tape-tilt': `${(pick(12, 13) - 6) / 2}deg`,
  }
}
function nextFrame() { return new Promise<void>(resolve => requestAnimationFrame(() => resolve())) }
function cardsIn(root: HTMLElement) { return [...root.querySelectorAll<HTMLElement>('.note-motion-card')] }
function cardRects(cards: HTMLElement[]) { return cards.map(card => card.getBoundingClientRect()) }
function collectionDuration(cards: HTMLElement[]) { return collectionMotionDuration + Math.max(0, cards.length - 1) * collectionMotionStagger }
function layoutWalls(root: Document | HTMLElement = document) {
  const compact = window.matchMedia('(max-width: 760px)').matches
  root.querySelectorAll<HTMLElement>('.note-wall').forEach(wall => {
    const group = wall.closest('.note-group')
    if (compact || group?.classList.contains('is-collapsed') || group?.classList.contains('is-collapsing')) {
      cardsIn(wall).forEach(card => card.style.removeProperty('grid-row-end'))
      return
    }
    const cards = cardsIn(wall)
    cards.forEach(card => card.style.removeProperty('grid-row-end'))
    const style = getComputedStyle(wall)
    const row = parseFloat(style.gridAutoRows) || 4
    const gap = parseFloat(style.rowGap) || 16
    cards.forEach(card => { card.style.gridRowEnd = `span ${Math.max(1, Math.ceil((card.getBoundingClientRect().height + gap) / (row + gap)))}` })
  })
}
function syncStackMetrics(root: HTMLElement) {
  const cards = cardsIn(root)
  if (!cards.length) return
  root.style.setProperty('--stack-card-width', `${Math.ceil(Math.max(...cards.map(card => card.offsetWidth)))}px`)
  root.style.setProperty('--stack-height', `${Math.ceil(Math.max(...cards.map(card => card.offsetHeight)) + Math.max(0, cards.length - 1) * 16 + 24)}px`)
}
function contentIn(root: HTMLElement) { return root.querySelector<HTMLElement>('.note-group-content') }
function stackHeight(root: HTMLElement) { return Number.parseFloat(root.style.getPropertyValue('--stack-height')) || 0 }
function scheduleLayout(root: Document | HTMLElement = document) {
  cancelAnimationFrame(layoutFrame)
  layoutFrame = requestAnimationFrame(() => { layoutFrame = requestAnimationFrame(() => { layoutWalls(root); if (root instanceof HTMLElement && root.matches('.note-group')) syncStackMetrics(root); else root.querySelectorAll<HTMLElement>('.note-group').forEach(syncStackMetrics) }) })
}
async function animateCards(cards: HTMLElement[], from: DOMRect[], to: DOMRect[], towardStack: boolean) {
  await Promise.all(cards.map((card, index) => {
    if (!card.animate) return Promise.resolve()
    const base = getComputedStyle(card).transform
    const target = base === 'none' ? 'none' : base
    const start = `translate(${from[index].left - to[index].left}px, ${from[index].top - to[index].top}px)${target === 'none' ? '' : ` ${target}`}`
    card.style.zIndex = String(100 + index)
    return card.animate([{ transform: start, opacity: 1 }, { transform: target, opacity: 1 }], { duration: collectionMotionDuration, delay: (towardStack ? index : cards.length - 1 - index) * collectionMotionStagger, easing: 'cubic-bezier(.18,.82,.2,1)', fill: 'both' }).finished.catch(() => undefined)
  }))
}
function resetCardMotion(cards: HTMLElement[]) { cards.forEach(card => { card.getAnimations().forEach(animation => animation.cancel()); card.style.removeProperty('z-index') }) }
async function toggleGroup(category: string) {
  if (isTransitioning(category, 'collapse') || isTransitioning(category, 'expand')) return
  const root = groupElements.get(category)
  if (!root) { setCollapsed(category, !isCollapsed(category)); return }
  const shouldCollapse = !isCollapsed(category)
  const cards = cardsIn(root)
  root.style.setProperty('--collection-duration', `${collectionDuration(cards)}ms`)
  try {
    if (shouldCollapse) {
      layoutWalls(root)
      syncStackMetrics(root)
      const from = cardRects(cards)
      const content = contentIn(root)
      if (content) content.style.height = `${content.getBoundingClientRect().height}px`
      replaceSet(collapsing, category, true)
      await nextTick(); await nextFrame()
      if (content) content.style.height = `${stackHeight(root)}px`
      await animateCards(cards, from, cardRects(cards), true)
      setCollapsed(category, true)
      replaceSet(collapsing, category, false)
      if (content) content.style.removeProperty('height')
    } else {
      const from = cardRects(cards)
      const content = contentIn(root)
      if (content) content.style.height = `${content.getBoundingClientRect().height}px`
      replaceSet(expanding, category, true)
      setCollapsed(category, false)
      await nextTick()
      layoutWalls(root)
      if (content) content.style.height = `${content.scrollHeight}px`
      // Measuring target rects now forces the new grid layout without giving
      // the browser a paint where cards are already expanded. The inverse
      // animation is attached in this same frame, so the stack unfolds
      // continuously instead of flashing to its final positions.
      await animateCards(cards, from, cardRects(cards), false)
      replaceSet(expanding, category, false)
      if (content) content.style.removeProperty('height')
    }
  } finally {
    resetCardMotion(cards)
    replaceSet(collapsing, category, false)
    replaceSet(expanding, category, false)
    // The target grid was measured before the animation began. Re-running
    // masonry here would briefly clear/reassign row spans and produce a
    // second visible jump after an otherwise complete expansion.
    root.style.removeProperty('--collection-duration')
  }
}
function openCreate() { editing.value = null; composerOpen.value = true }
function openEdit(note: Note) { editing.value = note; composerOpen.value = true }
function requestDelete(note: Note) { confirming.value = note }
function save(draft: NoteDraft) { if (editing.value) emit('update', editing.value.id, draft); else emit('create', draft); composerOpen.value = false }
function saveOrder(order: string[]) { emit('order', normalizeCategoryOrder(order, props.notes)); orderOpen.value = false }
function preview(src: string, name: string) { lightbox.value = { src, name } }
function handleResize() { scheduleLayout() }

watch(groups, () => nextTick(() => scheduleLayout()), { flush: 'post' })
onMounted(() => { scheduleLayout(); window.addEventListener('resize', handleResize) })
onBeforeUnmount(() => { cancelAnimationFrame(layoutFrame); window.removeEventListener('resize', handleResize) })
</script>
