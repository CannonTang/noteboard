<template>
  <article class="note-card" :class="`note-${note.color}`">
    <span class="tape" aria-hidden="true"></span><span class="pin" aria-hidden="true"></span>
    <h3>{{ note.title }}</h3>
    <p class="note-content">{{ note.content }}</p>
    <div v-if="note.images.length" class="card-images" :class="{ single: note.images.length === 1 }">
      <button v-for="image in note.images" :key="image.id" type="button" @click="emit('preview', image.src, image.name)"><img :src="image.src" :alt="image.name" @load="emit('layout')" /></button>
    </div>
    <footer><time :datetime="note.updatedAt">{{ displayDate }}</time><div class="card-actions"><button class="icon-button small" type="button" title="Edit note" @click="emit('edit', note)"><Pencil :size="16" /></button><button class="icon-button small danger" type="button" title="Delete note" @click="emit('delete', note)"><Trash2 :size="16" /></button></div></footer>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Pencil, Trash2 } from 'lucide-vue-next'
import type { Note } from '@/types'

const props = defineProps<{ note: Note }>()
const emit = defineEmits<{ edit: [note: Note]; delete: [note: Note]; preview: [src: string, name: string]; layout: [] }>()
const displayDate = computed(() => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(props.note.updatedAt)))
</script>
