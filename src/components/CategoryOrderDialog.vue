<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
      <section class="order-dialog" role="dialog" aria-modal="true" aria-labelledby="order-title">
        <header class="dialog-header"><div><p class="eyebrow">Board layout</p><h2 id="order-title">Category order</h2></div><button class="icon-button" type="button" title="Close category order" aria-label="Close category order" @click="emit('close')"><X :size="18" /></button></header>
        <p class="dialog-copy">Drag a category or use the arrow controls. Uncategorized notes always stay at the end.</p>
        <ol class="order-list" @dragover.prevent @drop="drop">
          <li v-for="(category, index) in ordered" :key="category" class="order-row" draggable="true" @dragstart="dragIndex = index">
            <GripVertical :size="18" aria-hidden="true" />
            <span>{{ category }}</span>
            <div class="order-controls">
              <button class="icon-button small" type="button" title="Move category up" :disabled="index === 0" @click="move(index, index - 1)"><ArrowUp :size="16" /></button>
              <button class="icon-button small" type="button" title="Move category down" :disabled="index === ordered.length - 1" @click="move(index, index + 1)"><ArrowDown :size="16" /></button>
            </div>
          </li>
        </ol>
        <footer class="dialog-actions"><button class="secondary-button" type="button" @click="emit('close')">Cancel</button><button class="primary-button" type="button" @click="emit('save', ordered)"><Check :size="17" />Save order</button></footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ArrowDown, ArrowUp, Check, GripVertical, X } from 'lucide-vue-next'

const props = defineProps<{ open: boolean; categories: string[] }>()
const emit = defineEmits<{ close: []; save: [categories: string[]] }>()
const ordered = ref<string[]>([])
const dragIndex = ref<number | null>(null)

watch(() => [props.open, props.categories] as const, ([open, categories]) => { if (open) ordered.value = [...categories] }, { immediate: true })
function move(from: number, to: number) { const next = [...ordered.value]; const [entry] = next.splice(from, 1); next.splice(to, 0, entry); ordered.value = next }
function drop(event: DragEvent) { const item = (event.target as HTMLElement).closest<HTMLElement>('.order-row'); const target = item ? [...item.parentElement!.children].indexOf(item) : ordered.value.length - 1; if (dragIndex.value !== null && target >= 0 && dragIndex.value !== target) move(dragIndex.value, target); dragIndex.value = null }
</script>
