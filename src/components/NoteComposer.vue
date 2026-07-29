<template>
  <Teleport to="body">
    <Transition name="note-editor">
      <div v-if="open" ref="modal" class="modal-backdrop" @click.self="close">
        <form
          class="composer"
          :class="`note-${draft.color}`"
          role="dialog"
          aria-modal="true"
          aria-label="Note editor"
          @submit.prevent="submit"
        >
          <header class="composer-header">
            <p>{{ editing ? "Edit note" : "New note" }}</p>
            <button
              class="icon-button"
              type="button"
              title="Close editor"
              aria-label="Close editor"
              @click="close"
            >
              <X :size="18" />
            </button>
          </header>

          <input
            v-model.trim="draft.title"
            class="title-input"
            maxlength="120"
            required
            placeholder="Give this note a title"
            aria-label="Title"
          />
          <label class="field-label" for="note-category">Category</label>
          <input
            id="note-category"
            v-model.trim="draft.category"
            class="category-input"
            maxlength="40"
            list="known-categories"
            placeholder="Leave blank for Uncategorized"
          />
          <datalist id="known-categories">
            <option
              v-for="category in categories"
              :key="category"
              :value="category"
            />
          </datalist>
          <textarea
            v-model.trim="draft.content"
            class="content-input"
            maxlength="6000"
            required
            placeholder="Capture the useful detail..."
            aria-label="Content"
            @paste="pasteImages"
          />

          <section
            v-if="draft.images.length"
            class="attachment-grid"
            aria-label="Attachments"
          >
            <figure
              v-for="(image, index) in draft.images"
              :key="image.id"
              class="attachment"
            >
              <img :src="image.src" :alt="image.name" />
              <button
                class="attachment-remove"
                type="button"
                title="Remove image"
                :aria-label="`Remove ${image.name}`"
                @click="draft.images.splice(index, 1)"
              >
                <X :size="14" />
              </button>
            </figure>
          </section>

          <footer class="composer-footer">
            <fieldset class="swatches">
              <legend>Note color</legend>
              <label v-for="color in colors" :key="color"
                ><input
                  v-model="draft.color"
                  type="radio"
                  name="color"
                  :value="color" /><span
                  :class="`swatch note-${color}`"
                  :title="`${color} note`"
                ></span
              ></label>
            </fieldset>
            <div class="composer-actions">
              <label class="icon-button upload-button" title="Add images"
                ><ImagePlus :size="18" /><input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  multiple
                  @change="pickImages"
              /></label>
              <button class="primary-button" type="submit" :disabled="saving">
                <Check :size="17" />{{
                  saving ? "Saving..." : editing ? "Save note" : "Add note"
                }}
              </button>
            </div>
          </footer>
          <p v-if="error || errorMessage" class="form-error" role="alert">
            {{ error || errorMessage }}
          </p>
        </form>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import { Check, ImagePlus, X } from "@lucide/vue";
import type { Note, NoteColor, NoteDraft } from "../types";
import { useModalFocus } from "../composables/useModalFocus";

const props = defineProps<{
  open: boolean;
  note: Note | null;
  categories: string[];
  saving?: boolean;
  errorMessage?: string;
}>();
const emit = defineEmits<{ close: []; save: [draft: NoteDraft] }>();
const colors: NoteColor[] = [
  "yellow",
  "blue",
  "pink",
  "mint",
  "peach",
  "lavender",
];
const draft = reactive<NoteDraft>({
  title: "",
  content: "",
  category: "",
  color: "yellow",
  images: [],
});
const error = ref("");
const editing = ref(false);
const modal = ref<HTMLElement | null>(null);
const supportedImageTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const maxImageBytes = 1024 * 1024;
const maxNoteImageBytes = 2.5 * 1024 * 1024;

function reset(note: Note | null) {
  editing.value = !!note;
  error.value = "";
  Object.assign(
    draft,
    note
      ? {
          title: note.title,
          content: note.content,
          category: note.category === "Uncategorized" ? "" : note.category,
          color: note.color,
          images: note.images.map((image) => ({ ...image })),
        }
      : { title: "", content: "", category: "", color: "yellow", images: [] },
  );
}

watch(
  () => [props.open, props.note] as const,
  ([open]) => {
    if (open) reset(props.note);
  },
  { immediate: true },
);

async function filesToImages(files: File[]) {
  const remaining = 4 - draft.images.length;
  let remainingBytes =
    maxNoteImageBytes -
    draft.images.reduce((total, image) => total + image.byteSize, 0);
  const allowed: File[] = [];
  for (const file of files) {
    if (
      allowed.length >= remaining ||
      !supportedImageTypes.has(file.type) ||
      file.size > maxImageBytes ||
      file.size > remainingBytes
    )
      continue;
    allowed.push(file);
    remainingBytes -= file.size;
  }
  if (allowed.length < files.length)
    error.value =
      "Use up to four PNG, JPEG, WebP, or GIF images. Each is limited to 1 MB and all images to 2.5 MB.";
  try {
    const images = await Promise.all(
      allowed.map(async (file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        src: await readFile(file),
        byteSize: file.size,
      })),
    );
    draft.images.push(...images);
  } catch {
    error.value = "One or more images could not be read.";
  }
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function pickImages(event: Event) {
  const input = event.target as HTMLInputElement;
  void filesToImages([...(input.files ?? [])]);
  input.value = "";
}
function pasteImages(event: ClipboardEvent) {
  const files = [...(event.clipboardData?.files ?? [])];
  if (files.some((file) => supportedImageTypes.has(file.type))) {
    event.preventDefault();
    void filesToImages(files);
  }
}
function close() {
  if (!props.saving) emit("close");
}
function submit() {
  if (props.saving) return;
  if (draft.title.trim().length < 2 || draft.content.trim().length < 2) {
    error.value = "Title and content need at least two characters.";
    return;
  }
  emit("save", {
    title: draft.title,
    content: draft.content,
    category: draft.category,
    color: draft.color,
    images: draft.images.map((image) => ({ ...image })),
  });
}
useModalFocus(() => props.open, modal, close);
</script>
