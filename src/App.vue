<template>
  <main class="app-frame">
    <nav class="topbar" aria-label="Primary">
      <a class="brand" href="/" aria-label="Noteboard home"><StickyNote :size="22" /><span>Noteboard</span></a>
      <div class="topbar-actions"><span class="storage-status">Local demo</span><button class="icon-button" type="button" title="Reset demo data" aria-label="Reset demo data" @click="reset"><RotateCcw :size="18" /></button></div>
    </nav>
    <p v-if="status" class="toast" role="status">{{ status }}</p>
    <NoteBoard :notes="board.notes" :category-order="board.categoryOrder" @create="createNote" @update="updateNote" @delete="deleteNote" @order="saveOrder" />
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RotateCcw, StickyNote } from 'lucide-vue-next'
import NoteBoard from '@/components/NoteBoard.vue'
import { normalizeCategory, normalizeCategoryOrder } from '@/lib/board'
import { loadBoard, resetBoard, saveBoard } from '@/lib/storage'
import type { BoardData, NoteDraft } from '@/types'

const board = ref<BoardData>(loadBoard())
const status = ref('')
let statusTimer = 0

function persist(next: BoardData, message: string) {
  try {
    saveBoard(next)
    board.value = next
    status.value = message
    window.clearTimeout(statusTimer)
    statusTimer = window.setTimeout(() => { status.value = '' }, 2800)
  } catch {
    status.value = 'The browser could not save this board. Try smaller images.'
  }
}

function createNote(draft: NoteDraft) {
  const timestamp = new Date().toISOString()
  const category = normalizeCategory(draft.category)
  const notes = [...board.value.notes, { ...draft, id: crypto.randomUUID(), category, createdAt: timestamp, updatedAt: timestamp }]
  persist({ notes, categoryOrder: normalizeCategoryOrder(board.value.categoryOrder, notes) }, 'Note added')
}

function updateNote(id: string, draft: NoteDraft) {
  const category = normalizeCategory(draft.category)
  const notes = board.value.notes.map(note => note.id === id ? { ...note, ...draft, category, updatedAt: new Date().toISOString() } : note)
  persist({ notes, categoryOrder: normalizeCategoryOrder(board.value.categoryOrder, notes) }, 'Note saved')
}

function deleteNote(id: string) {
  const notes = board.value.notes.filter(note => note.id !== id)
  persist({ notes, categoryOrder: normalizeCategoryOrder(board.value.categoryOrder, notes) }, 'Note deleted')
}

function saveOrder(categoryOrder: string[]) { persist({ ...board.value, categoryOrder }, 'Category order saved') }
function reset() { persist(resetBoard(), 'Demo board reset') }
</script>
