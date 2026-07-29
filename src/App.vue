<template>
  <main class="app-frame">
    <nav class="topbar" aria-label="Primary">
      <a class="brand" href="/" aria-label="Noteboard home"
        ><StickyNote :size="22" /><span>Noteboard</span></a
      >
      <div class="topbar-actions">
        <span class="storage-status">Local demo</span
        ><button
          class="icon-button"
          type="button"
          title="Reset demo data"
          aria-label="Reset demo data"
          @click="reset"
        >
          <RotateCcw :size="18" />
        </button>
      </div>
    </nav>
    <p v-if="status" class="toast" role="status">{{ status }}</p>
    <div v-if="loading" class="loading-board" aria-live="polite">
      Loading board...
    </div>
    <NoteBoard
      v-else-if="board"
      :notes="board.notes"
      :category-order="board.categoryOrder"
      :mutations="mutations"
    />
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { RotateCcw, StickyNote } from "@lucide/vue";
import NoteBoard from "@/components/NoteBoard.vue";
import { normalizeCategory, normalizeCategoryOrder } from "@/lib/board";
import { createSeedBoard, loadBoard, saveBoard } from "@/lib/storage";
import type { BoardData, NoteBoardMutations, NoteDraft } from "@/types";

const board = ref<BoardData | null>(null);
const loading = ref(true);
const status = ref("");
let statusTimer = 0;

function currentBoard() {
  if (!board.value) throw new Error("The board is still loading");
  return board.value;
}

function notify(message: string) {
  status.value = message;
  window.clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => {
    status.value = "";
  }, 2800);
}

async function persist(next: BoardData, message: string) {
  await saveBoard(next);
  board.value = next;
  notify(message);
}

async function createNote(draft: NoteDraft) {
  const current = currentBoard();
  const timestamp = new Date().toISOString();
  const category = normalizeCategory(draft.category);
  const notes = [
    ...current.notes,
    {
      ...draft,
      id: crypto.randomUUID(),
      category,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
  await persist(
    {
      notes,
      categoryOrder: normalizeCategoryOrder(current.categoryOrder, notes),
    },
    "Note added",
  );
}

async function updateNote(id: string, draft: NoteDraft) {
  const current = currentBoard();
  const category = normalizeCategory(draft.category);
  const notes = current.notes.map((note) =>
    note.id === id
      ? { ...note, ...draft, category, updatedAt: new Date().toISOString() }
      : note,
  );
  await persist(
    {
      notes,
      categoryOrder: normalizeCategoryOrder(current.categoryOrder, notes),
    },
    "Note saved",
  );
}

async function deleteNote(id: string) {
  const current = currentBoard();
  const notes = current.notes.filter((note) => note.id !== id);
  await persist(
    {
      notes,
      categoryOrder: normalizeCategoryOrder(current.categoryOrder, notes),
    },
    "Note deleted",
  );
}

async function saveOrder(categoryOrder: string[]) {
  await persist({ ...currentBoard(), categoryOrder }, "Category order saved");
}
async function reset() {
  if (window.confirm("Reset all demo notes? This cannot be undone."))
    await persist(createSeedBoard(), "Demo board reset");
}

const mutations: NoteBoardMutations = {
  create: createNote,
  update: updateNote,
  remove: deleteNote,
  saveCategoryOrder: saveOrder,
};
onMounted(async () => {
  board.value = await loadBoard();
  loading.value = false;
});
onBeforeUnmount(() => window.clearTimeout(statusTimer));
</script>
