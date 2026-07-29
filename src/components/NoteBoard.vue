<template>
  <section class="board-shell" aria-label="Noteboard administrator">
    <header class="board-toolbar">
      <div>
        <p class="eyebrow">Administrator workspace</p>
        <h1>Notes that stay useful.</h1>
      </div>
      <div class="toolbar-actions">
        <label class="sort-control"
          ><span>Sort notes</span
          ><select v-model="sortMode">
            <option value="updated">Recently updated</option>
            <option value="created">Recently created</option>
            <option value="title">Title</option>
          </select></label
        >
        <button
          class="secondary-button category-order-action"
          type="button"
          @click="orderOpen = true"
        >
          <ListOrdered :size="18" />Order categories
        </button>
        <button class="primary-button" type="button" @click="openCreate">
          <Plus :size="18" />New note
        </button>
      </div>
    </header>

    <div v-if="groups.length" class="note-groups">
      <section
        v-for="group in groups"
        :key="group.category"
        :ref="(element) => setGroupElement(group.category, element)"
        class="note-group"
        :class="{
          'is-collapsed': isCollapsed(group.category),
          'is-collapsing': isTransitioning(group.category, 'collapse'),
          'is-expanding': isTransitioning(group.category, 'expand'),
        }"
      >
        <header class="group-header">
          <button
            class="group-toggle"
            type="button"
            :aria-expanded="!isCollapsed(group.category)"
            @click="toggleGroup(group.category)"
          >
            <ChevronDown :size="18" /><span>{{ group.category }}</span
            ><b>{{ group.notes.length }}</b>
          </button>
        </header>
        <div
          class="note-group-content"
          :role="isCollapsed(group.category) ? 'button' : undefined"
          :tabindex="isCollapsed(group.category) ? 0 : -1"
          :aria-label="
            isCollapsed(group.category) ? `Expand ${group.category}` : undefined
          "
          @click="isCollapsed(group.category) && toggleGroup(group.category)"
          @keydown.enter.prevent="
            isCollapsed(group.category) && toggleGroup(group.category)
          "
          @keydown.space.prevent="
            isCollapsed(group.category) && toggleGroup(group.category)
          "
        >
          <span class="collection-pin" aria-hidden="true"></span>
          <div class="note-group-inner">
            <div class="note-wall">
              <div
                v-for="(note, index) in group.notes"
                :key="note.id"
                class="note-motion-card"
                :style="noteMotionStyle(note.id, index)"
              >
                <NoteCard
                  :note="note"
                  @edit="openEdit"
                  @delete="requestDelete"
                  @preview="preview"
                  @layout="scheduleLayout"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
    <div v-else class="empty-board">
      <StickyNote :size="28" />
      <h2>Start the board</h2>
      <p>Write the first note to create a useful reference for the team.</p>
      <button class="primary-button" type="button" @click="openCreate">
        <Plus :size="18" />New note
      </button>
    </div>

    <NoteComposer
      :open="composerOpen"
      :note="editing"
      :categories="categories"
      :saving="saving"
      :error-message="editorError"
      @close="composerOpen = false"
      @save="save"
    />
    <CategoryOrderDialog
      :open="orderOpen"
      :categories="categories"
      :saving="saving"
      :error-message="orderError"
      @close="orderOpen = false"
      @save="saveOrder"
    />
    <Teleport to="body"
      ><div
        v-if="confirming"
        ref="confirmModal"
        class="modal-backdrop"
        @click.self="!saving && (confirming = null)"
      >
        <section
          class="confirm-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Delete note confirmation"
        >
          <h2>Delete this note?</h2>
          <p>This cannot be undone.</p>
          <p v-if="operationError" class="form-error" role="alert">
            {{ operationError }}
          </p>
          <div class="dialog-actions">
            <button
              class="secondary-button"
              type="button"
              :disabled="saving"
              @click="confirming = null"
            >
              Cancel</button
            ><button
              class="danger-button"
              type="button"
              :disabled="saving"
              @click="confirmDelete"
            >
              {{ saving ? "Deleting..." : "Delete" }}
            </button>
          </div>
        </section>
      </div>
      <div
        v-if="lightbox"
        ref="lightboxModal"
        class="lightbox"
        role="dialog"
        aria-modal="true"
        :aria-label="lightbox.name"
        @click.self="lightbox = null"
      >
        <button
          class="icon-button lightbox-close"
          type="button"
          title="Close image"
          @click="lightbox = null"
        >
          <X :size="20" /></button
        ><img :src="lightbox.src" :alt="lightbox.name" /></div
    ></Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { ChevronDown, ListOrdered, Plus, StickyNote, X } from "@lucide/vue";
import { groupNotes, normalizeCategoryOrder } from "../lib/board";
import type { Note, NoteBoardMutations, NoteDraft, SortMode } from "../types";
import CategoryOrderDialog from "./CategoryOrderDialog.vue";
import NoteCard from "./NoteCard.vue";
import NoteComposer from "./NoteComposer.vue";
import { useModalFocus } from "../composables/useModalFocus";
import { useCollectionMotion } from "../composables/useCollectionMotion";

const props = defineProps<{
  notes: Note[];
  categoryOrder: string[];
  mutations: NoteBoardMutations;
}>();
const sortMode = ref<SortMode>("updated");
const composerOpen = ref(false);
const orderOpen = ref(false);
const editing = ref<Note | null>(null);
const confirming = ref<Note | null>(null);
const lightbox = ref<{ src: string; name: string } | null>(null);
const saving = ref(false);
const editorError = ref("");
const orderError = ref("");
const operationError = ref("");
const confirmModal = ref<HTMLElement | null>(null);
const lightboxModal = ref<HTMLElement | null>(null);
const {
  isCollapsed,
  isTransitioning,
  noteMotionStyle,
  scheduleLayout,
  setGroupElement,
  toggleGroup,
} = useCollectionMotion();
const categories = computed(() =>
  normalizeCategoryOrder(props.categoryOrder, props.notes),
);
const groups = computed(() =>
  groupNotes(props.notes, categories.value, sortMode.value),
);
function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The change could not be saved.";
}
function openCreate() {
  editing.value = null;
  editorError.value = "";
  composerOpen.value = true;
}
function openEdit(note: Note) {
  editing.value = note;
  editorError.value = "";
  composerOpen.value = true;
}
function requestDelete(note: Note) {
  operationError.value = "";
  confirming.value = note;
}
async function save(draft: NoteDraft) {
  saving.value = true;
  editorError.value = "";
  try {
    if (editing.value) await props.mutations.update(editing.value.id, draft);
    else await props.mutations.create(draft);
    composerOpen.value = false;
  } catch (error) {
    editorError.value = errorMessage(error);
  } finally {
    saving.value = false;
  }
}
async function saveOrder(order: string[]) {
  saving.value = true;
  orderError.value = "";
  try {
    await props.mutations.saveCategoryOrder(
      normalizeCategoryOrder(order, props.notes),
    );
    orderOpen.value = false;
  } catch (error) {
    orderError.value = errorMessage(error);
  } finally {
    saving.value = false;
  }
}
async function confirmDelete() {
  if (!confirming.value) return;
  saving.value = true;
  operationError.value = "";
  try {
    await props.mutations.remove(confirming.value.id);
    confirming.value = null;
  } catch (error) {
    operationError.value = errorMessage(error);
  } finally {
    saving.value = false;
  }
}
function preview(src: string, name: string) {
  lightbox.value = { src, name };
}
watch(groups, () => nextTick(() => scheduleLayout()), { flush: "post" });
useModalFocus(
  computed(() => !!confirming.value),
  confirmModal,
  () => {
    if (!saving.value) confirming.value = null;
  },
);
useModalFocus(
  computed(() => !!lightbox.value),
  lightboxModal,
  () => {
    lightbox.value = null;
  },
);
</script>
