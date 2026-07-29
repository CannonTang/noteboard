import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  type ComponentPublicInstance,
} from "vue";

const collectionMotionDuration = 520;
const collectionMotionStagger = 68;

export function useCollectionMotion() {
  const collapsed = ref(new Set<string>());
  const collapsing = ref(new Set<string>());
  const expanding = ref(new Set<string>());
  const reducedMotion = ref(false);
  const groupElements = new Map<string, HTMLElement>();
  const deferredLayouts = new Set<HTMLElement>();
  let layoutFrame = 0;
  let motionQuery: MediaQueryList | null = null;

  function isCollapsed(category: string) {
    return collapsed.value.has(category);
  }
  function isTransitioning(category: string, direction: "collapse" | "expand") {
    return (direction === "collapse" ? collapsing.value : expanding.value).has(
      category,
    );
  }
  function replaceSet(
    target: typeof collapsing,
    category: string,
    active: boolean,
  ) {
    const next = new Set(target.value);
    active ? next.add(category) : next.delete(category);
    target.value = next;
  }
  function setCollapsed(category: string, value: boolean) {
    const next = new Set(collapsed.value);
    value ? next.add(category) : next.delete(category);
    collapsed.value = next;
  }
  function setGroupElement(
    category: string,
    element: Element | ComponentPublicInstance | null,
  ) {
    const root =
      element instanceof HTMLElement
        ? element
        : element && "$el" in element
          ? element.$el
          : null;
    if (root instanceof HTMLElement) groupElements.set(category, root);
    else groupElements.delete(category);
  }
  function noteMotionStyle(id: string, index: number) {
    let hash = 2166136261;
    for (const character of id)
      hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
    const pick = (shift: number, range: number) => (hash >>> shift) % range;
    return {
      "--stack-x": `${(index % 4) * 9}px`,
      "--stack-y": `${index * 16}px`,
      "--stack-tilt": `${[-1.7, 1.2, -0.8, 1.5][index % 4]}deg`,
      "--stack-z": String(index + 1),
      "--tilt": `${(pick(0, 29) - 14) / 10}deg`,
      "--note-x": `${pick(5, 7) - 3}px`,
      "--note-y": `${pick(9, 5) - 2}px`,
      "--tape-tilt": `${(pick(12, 13) - 6) / 2}deg`,
    };
  }
  function nextFrame() {
    return new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
  }
  function cardsIn(root: HTMLElement) {
    return [...root.querySelectorAll<HTMLElement>(".note-motion-card")];
  }
  function cardRects(cards: HTMLElement[]) {
    return cards.map((card) => card.getBoundingClientRect());
  }
  function collectionDuration(cards: HTMLElement[]) {
    return (
      collectionMotionDuration +
      Math.max(0, cards.length - 1) * collectionMotionStagger
    );
  }
  function isTransitioningRoot(root: HTMLElement) {
    return (
      root.classList.contains("is-collapsing") ||
      root.classList.contains("is-expanding")
    );
  }
  function layoutWalls(root: Document | HTMLElement = document, force = false) {
    const compact = window.matchMedia("(max-width: 760px)").matches;
    root.querySelectorAll<HTMLElement>(".note-wall").forEach((wall) => {
      const group = wall.closest(".note-group");
      if (
        group instanceof HTMLElement &&
        !force &&
        isTransitioningRoot(group)
      ) {
        deferredLayouts.add(group);
        return;
      }
      if (
        compact ||
        group?.classList.contains("is-collapsed") ||
        group?.classList.contains("is-collapsing")
      ) {
        cardsIn(wall).forEach((card) =>
          card.style.removeProperty("grid-row-end"),
        );
        return;
      }
      const cards = cardsIn(wall);
      cards.forEach((card) => card.style.removeProperty("grid-row-end"));
      const style = getComputedStyle(wall);
      const row = parseFloat(style.gridAutoRows) || 4;
      const gap = parseFloat(style.rowGap) || 16;
      cards.forEach((card) => {
        card.style.gridRowEnd = `span ${Math.max(1, Math.ceil((card.getBoundingClientRect().height + gap) / (row + gap)))}`;
      });
    });
  }
  function syncStackMetrics(root: HTMLElement) {
    const cards = cardsIn(root);
    if (!cards.length) return;
    root.style.setProperty(
      "--stack-card-width",
      `${Math.ceil(Math.max(...cards.map((card) => card.offsetWidth)))}px`,
    );
    root.style.setProperty(
      "--stack-height",
      `${Math.ceil(Math.max(...cards.map((card) => card.offsetHeight)) + Math.max(0, cards.length - 1) * 16 + 24)}px`,
    );
  }
  function contentIn(root: HTMLElement) {
    return root.querySelector<HTMLElement>(".note-group-content");
  }
  function stackHeight(root: HTMLElement) {
    return (
      Number.parseFloat(root.style.getPropertyValue("--stack-height")) || 0
    );
  }
  function waitForHeightTransition(content: HTMLElement, duration: number) {
    return new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (!settled) {
          settled = true;
          window.clearTimeout(fallback);
          content.removeEventListener("transitionend", onTransitionEnd);
          resolve();
        }
      };
      const onTransitionEnd = (event: TransitionEvent) => {
        if (event.target === content && event.propertyName === "height")
          finish();
      };
      const fallback = window.setTimeout(finish, duration + 120);
      content.addEventListener("transitionend", onTransitionEnd);
    });
  }
  function scheduleLayout(root: Document | HTMLElement = document) {
    cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(() => {
      layoutFrame = requestAnimationFrame(() => {
        if (root instanceof HTMLElement && root.matches(".note-group")) {
          if (isTransitioningRoot(root)) {
            deferredLayouts.add(root);
            return;
          }
          layoutWalls(root);
          syncStackMetrics(root);
          return;
        }
        layoutWalls(root);
        root.querySelectorAll<HTMLElement>(".note-group").forEach((group) => {
          if (isTransitioningRoot(group)) deferredLayouts.add(group);
          else syncStackMetrics(group);
        });
      });
    });
  }
  async function animateCards(
    cards: HTMLElement[],
    from: DOMRect[],
    to: DOMRect[],
    towardStack: boolean,
  ) {
    await Promise.all(
      cards.map((card, index) => {
        if (!card.animate) return Promise.resolve();
        const base = getComputedStyle(card).transform;
        const target = base === "none" ? "none" : base;
        const start = `translate(${from[index].left - to[index].left}px, ${from[index].top - to[index].top}px)${target === "none" ? "" : ` ${target}`}`;
        card.style.zIndex = String(100 + index);
        return card
          .animate(
            [
              { transform: start, opacity: 1 },
              { transform: target, opacity: 1 },
            ],
            {
              duration: collectionMotionDuration,
              delay:
                (towardStack ? index : cards.length - 1 - index) *
                collectionMotionStagger,
              easing: "cubic-bezier(.18,.82,.2,1)",
              fill: "both",
            },
          )
          .finished.catch(() => undefined);
      }),
    );
  }
  function resetCardMotion(cards: HTMLElement[]) {
    cards.forEach((card) => {
      card.getAnimations().forEach((animation) => animation.cancel());
      card.style.removeProperty("z-index");
    });
  }
  async function toggleGroup(category: string) {
    if (
      isTransitioning(category, "collapse") ||
      isTransitioning(category, "expand")
    )
      return;
    const root = groupElements.get(category);
    if (!root) {
      setCollapsed(category, !isCollapsed(category));
      return;
    }
    const shouldCollapse = !isCollapsed(category);
    const cards = cardsIn(root);
    if (reducedMotion.value) {
      if (shouldCollapse) {
        layoutWalls(root, true);
        syncStackMetrics(root);
        setCollapsed(category, true);
      } else {
        setCollapsed(category, false);
        await nextTick();
        layoutWalls(root, true);
      }
      return;
    }
    root.style.setProperty(
      "--collection-duration",
      `${collectionDuration(cards)}ms`,
    );
    try {
      if (shouldCollapse) {
        layoutWalls(root);
        syncStackMetrics(root);
        const from = cardRects(cards);
        const content = contentIn(root);
        let heightDone = Promise.resolve();
        if (content)
          content.style.height = `${content.getBoundingClientRect().height}px`;
        replaceSet(collapsing, category, true);
        await nextTick();
        await nextFrame();
        if (content) {
          heightDone = waitForHeightTransition(
            content,
            collectionDuration(cards),
          );
          content.style.height = `${stackHeight(root)}px`;
        }
        await Promise.all([
          animateCards(cards, from, cardRects(cards), true),
          heightDone,
        ]);
        setCollapsed(category, true);
        replaceSet(collapsing, category, false);
        if (content) content.style.removeProperty("height");
      } else {
        const from = cardRects(cards);
        const content = contentIn(root);
        let heightDone = Promise.resolve();
        const collapsedHeight = content?.getBoundingClientRect().height ?? 0;
        if (content) content.style.height = `${collapsedHeight}px`;
        replaceSet(expanding, category, true);
        setCollapsed(category, false);
        await nextTick();
        layoutWalls(root);
        if (content) {
          content.style.height = "auto";
          const expandedHeight = content.getBoundingClientRect().height;
          content.style.height = `${collapsedHeight}px`;
          void content.offsetHeight;
          heightDone = waitForHeightTransition(
            content,
            collectionDuration(cards),
          );
          content.style.height = `${expandedHeight}px`;
        }
        await Promise.all([
          animateCards(cards, from, cardRects(cards), false),
          heightDone,
        ]);
        replaceSet(expanding, category, false);
        if (content) {
          // The expanded box was measured from this exact grid state. Keep the
          // final pixel height until the next frame, then restore auto sizing
          // only after the browser has committed the final masonry geometry.
          await nextFrame();
          content.style.removeProperty("height");
        }
      }
    } finally {
      resetCardMotion(cards);
      replaceSet(collapsing, category, false);
      replaceSet(expanding, category, false);
      root.style.removeProperty("--collection-duration");
      if (deferredLayouts.delete(root)) scheduleLayout(root);
    }
  }
  function updateMotionPreference() {
    reducedMotion.value = motionQuery?.matches ?? false;
  }
  function handleResize() {
    scheduleLayout();
  }

  onMounted(() => {
    scheduleLayout();
    window.addEventListener("resize", handleResize);
    motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    updateMotionPreference();
    const legacyQuery = motionQuery as MediaQueryList & {
      addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
      removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
    };
    if (motionQuery.addEventListener)
      motionQuery.addEventListener("change", updateMotionPreference);
    else legacyQuery.addListener?.(updateMotionPreference);
  });
  onBeforeUnmount(() => {
    cancelAnimationFrame(layoutFrame);
    window.removeEventListener("resize", handleResize);
    if (motionQuery) {
      const legacyQuery = motionQuery as MediaQueryList & {
        addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
        removeListener?: (
          listener: (event: MediaQueryListEvent) => void,
        ) => void;
      };
      if (motionQuery.removeEventListener)
        motionQuery.removeEventListener("change", updateMotionPreference);
      else legacyQuery.removeListener?.(updateMotionPreference);
    }
  });

  return {
    isCollapsed,
    isTransitioning,
    noteMotionStyle,
    scheduleLayout,
    setGroupElement,
    toggleGroup,
  };
}
