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
      <section v-for="group in groups" :key="group.category" class="note-group" :class="{ collapsed: collapsed.has(group.category) }">
        <header class="group-header"><button class="group-toggle" type="button" :aria-expanded="!collapsed.has(group.category)" @click="toggleGroup(group.category)"><ChevronDown :size="18" /><span>{{ group.category }}</span><b>{{ group.notes.length }}</b></button></header>
        <div v-show="!collapsed.has(group.category)" class="note-grid"><NoteCard v-for="note in group.notes" :key="note.id" :note="note" @edit="openEdit" @delete="requestDelete" @preview="preview" /></div>
      </section>
    </div>
    <div v-else class="empty-board"><StickyNote :size="28" /><h2>Start the board</h2><p>Write the first note to create a useful reference for the team.</p><button class="primary-button" type="button" @click="openCreate"><Plus :size="18" />New note</button></div>

    <NoteComposer :open="composerOpen" :note="editing" :categories="categories" @close="composerOpen = false" @save="save" />
    <CategoryOrderDialog :open="orderOpen" :categories="categories" @close="orderOpen = false" @save="saveOrder" />
    <Teleport to="body"><div v-if="confirming" class="modal-backdrop" @click.self="confirming = null"><section class="confirm-dialog" role="dialog" aria-modal="true"><h2>Delete this note?</h2><p>This cannot be undone.</p><div class="dialog-actions"><button class="secondary-button" type="button" @click="confirming = null">Cancel</button><button class="danger-button" type="button" @click="emit('delete', confirming!.id); confirming = null">Delete</button></div></section></div><div v-if="lightbox" class="lightbox" @click.self="lightbox = null"><button class="icon-button lightbox-close" type="button" title="Close image" @click="lightbox = null"><X :size="20" /></button><img :src="lightbox.src" :alt="lightbox.name" /></div></Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronDown, ListOrdered, Plus, StickyNote, X } from 'lucide-vue-next'
import { categoriesFor, groupNotes, normalizeCategoryOrder } from '@/lib/board'
import type { Note, NoteDraft, SortMode } from '@/types'
import CategoryOrderDialog from './CategoryOrderDialog.vue'
import NoteCard from './NoteCard.vue'
import NoteComposer from './NoteComposer.vue'

const props = defineProps<{ notes: Note[]; categoryOrder: string[] }>()
const emit = defineEmits<{ create: [draft: NoteDraft]; update: [id: string, draft: NoteDraft]; delete: [id: string]; order: [categories: string[]] }>()
const sortMode = ref<SortMode>('updated')
const collapsed = ref(new Set<string>())
const composerOpen = ref(false)
const orderOpen = ref(false)
const editing = ref<Note | null>(null)
const confirming = ref<Note | null>(null)
const lightbox = ref<{ src: string; name: string } | null>(null)
const categories = computed(() => normalizeCategoryOrder(props.categoryOrder, props.notes))
const groups = computed(() => groupNotes(props.notes, categories.value, sortMode.value))
function toggleGroup(category: string) { const next = new Set(collapsed.value); next.has(category) ? next.delete(category) : next.add(category); collapsed.value = next }
function openCreate() { editing.value = null; composerOpen.value = true }
function openEdit(note: Note) { editing.value = note; composerOpen.value = true }
function requestDelete(note: Note) { confirming.value = note }
function save(draft: NoteDraft) { if (editing.value) emit('update', editing.value.id, draft); else emit('create', draft); composerOpen.value = false }
function saveOrder(order: string[]) { emit('order', normalizeCategoryOrder(order, props.notes)); orderOpen.value = false }
function preview(src: string, name: string) { lightbox.value = { src, name } }
</script>
