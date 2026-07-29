<template>
  <Teleport to="body">
    <Transition name="note-editor">
    <div v-if="open" class="modal-backdrop" @click.self="close">
      <form class="composer" :class="`note-${draft.color}`" @submit.prevent="submit">
        <header class="composer-header">
          <p>{{ editing ? 'Edit note' : 'New note' }}</p>
          <button class="icon-button" type="button" title="Close editor" aria-label="Close editor" @click="close"><X :size="18" /></button>
        </header>

        <input v-model.trim="draft.title" class="title-input" maxlength="120" required placeholder="Give this note a title" aria-label="Title" />
        <label class="field-label" for="note-category">Category</label>
        <input id="note-category" v-model.trim="draft.category" class="category-input" maxlength="40" list="known-categories" placeholder="Leave blank for Uncategorized" />
        <datalist id="known-categories"><option v-for="category in categories" :key="category" :value="category" /></datalist>
        <textarea v-model.trim="draft.content" class="content-input" maxlength="6000" required placeholder="Capture the useful detail..." aria-label="Content" @paste="pasteImages" />

        <section v-if="draft.images.length" class="attachment-grid" aria-label="Attachments">
          <figure v-for="(image, index) in draft.images" :key="image.id" class="attachment">
            <img :src="image.src" :alt="image.name" />
            <button class="attachment-remove" type="button" title="Remove image" :aria-label="`Remove ${image.name}`" @click="draft.images.splice(index, 1)"><X :size="14" /></button>
          </figure>
        </section>

        <footer class="composer-footer">
          <fieldset class="swatches"><legend>Note color</legend><label v-for="color in colors" :key="color"><input v-model="draft.color" type="radio" name="color" :value="color" /><span :class="`swatch note-${color}`" :title="`${color} note`"></span></label></fieldset>
          <div class="composer-actions">
            <label class="icon-button upload-button" title="Add images"><ImagePlus :size="18" /><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple @change="pickImages" /></label>
            <button class="primary-button" type="submit"><Check :size="17" />{{ editing ? 'Save note' : 'Add note' }}</button>
          </div>
        </footer>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      </form>
    </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { Check, ImagePlus, X } from 'lucide-vue-next'
import type { Note, NoteColor, NoteDraft, NoteImage } from '@/types'

const props = defineProps<{ open: boolean; note: Note | null; categories: string[] }>()
const emit = defineEmits<{ close: []; save: [draft: NoteDraft] }>()
const colors: NoteColor[] = ['yellow', 'blue', 'pink', 'mint', 'peach', 'lavender']
const draft = reactive<NoteDraft>({ title: '', content: '', category: '', color: 'yellow', images: [] })
const error = ref('')
const editing = ref(false)

function reset(note: Note | null) {
  editing.value = !!note
  error.value = ''
  Object.assign(draft, note
    ? { title: note.title, content: note.content, category: note.category === 'Uncategorized' ? '' : note.category, color: note.color, images: structuredClone(note.images) }
    : { title: '', content: '', category: '', color: 'yellow', images: [] })
}

watch(() => [props.open, props.note] as const, ([open]) => { if (open) reset(props.note) }, { immediate: true })

async function filesToImages(files: File[]) {
  const remaining = 4 - draft.images.length
  const allowed = files.filter(file => file.type.startsWith('image/') && file.size <= 1024 * 1024).slice(0, remaining)
  if (allowed.length < files.length) error.value = 'Use up to four images, each no larger than 1 MB.'
  const images = await Promise.all(allowed.map(async file => ({ id: crypto.randomUUID(), name: file.name, src: await readFile(file) })))
  draft.images.push(...images)
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file) })
}

function pickImages(event: Event) { const input = event.target as HTMLInputElement; void filesToImages([...input.files ?? []]); input.value = '' }
function pasteImages(event: ClipboardEvent) { const files = [...event.clipboardData?.files ?? []]; if (files.some(file => file.type.startsWith('image/'))) { event.preventDefault(); void filesToImages(files) } }
function close() { emit('close') }
function submit() {
  if (draft.title.trim().length < 2 || draft.content.trim().length < 2) { error.value = 'Title and content need at least two characters.'; return }
  emit('save', structuredClone(draft))
}
</script>
