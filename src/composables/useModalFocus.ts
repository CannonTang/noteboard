import {
  nextTick,
  onBeforeUnmount,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref,
} from "vue";

const focusableSelector =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function useModalFocus(
  open: MaybeRefOrGetter<boolean>,
  container: Ref<HTMLElement | null>,
  close: () => void,
) {
  let previousFocus: HTMLElement | null = null;

  function focusable() {
    return container.value
      ? [
          ...container.value.querySelectorAll<HTMLElement>(focusableSelector),
        ].filter((element) => !element.hidden)
      : [];
  }
  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const items = focusable();
    if (!items.length) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  function stop() {
    document.removeEventListener("keydown", onKeydown);
    previousFocus?.focus();
    previousFocus = null;
  }

  watch(
    () => toValue(open),
    async (active) => {
      if (!active) {
        stop();
        return;
      }
      previousFocus =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      await nextTick();
      const items = focusable();
      (
        container.value?.querySelector<HTMLElement>("[autofocus]") ??
        items[0] ??
        container.value
      )?.focus();
      document.addEventListener("keydown", onKeydown);
    },
  );
  onBeforeUnmount(stop);
}
