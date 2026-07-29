import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import NoteBoard from "./NoteBoard.vue";
import type { Note, NoteBoardMutations } from "@/types";

const notes: Note[] = [
  {
    id: "one",
    title: "First",
    content: "A note with enough content.",
    category: "Planning",
    color: "yellow",
    images: [],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "two",
    title: "Second",
    content: "A second note in the same collection.",
    category: "Planning",
    color: "blue",
    images: [],
    createdAt: "2026-01-02T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
  },
];
const mutations: NoteBoardMutations = {
  create: async () => undefined,
  update: async () => undefined,
  remove: async () => undefined,
  saveCategoryOrder: async () => undefined,
};

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  Object.defineProperty(HTMLElement.prototype, "animate", {
    configurable: true,
    value: () => ({ finished: Promise.resolve() }),
  });
  Object.defineProperty(HTMLElement.prototype, "getAnimations", {
    configurable: true,
    value: () => [],
  });
});

afterEach(() => vi.unstubAllGlobals());

function mountBoard(mutationsOverride = mutations) {
  return mount(NoteBoard, {
    props: {
      notes,
      categoryOrder: ["Planning"],
      mutations: mutationsOverride,
    },
    global: { stubs: { Teleport: true } },
  });
}

function finishHeightTransition(element: Element) {
  const event = new Event("transitionend");
  Object.defineProperty(event, "propertyName", { value: "height" });
  element.dispatchEvent(event);
}

describe("NoteBoard collection state", () => {
  it("keeps cards mounted while changing from a wall to a stacked collection and back", async () => {
    const wrapper = mountBoard();
    const group = wrapper.find(".note-group");

    await group.find(".group-toggle").trigger("click");
    await new Promise((resolve) => setTimeout(resolve, 0));
    finishHeightTransition(group.find(".note-group-content").element);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(group.classes()).toContain("is-collapsed");
    expect(group.findAll(".note-motion-card")).toHaveLength(2);

    await group.find(".note-group-content").trigger("click");
    await new Promise((resolve) => setTimeout(resolve, 0));
    finishHeightTransition(group.find(".note-group-content").element);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(group.classes()).not.toContain("is-collapsed");
    expect(group.findAll(".note-motion-card")).toHaveLength(2);
  });

  it("keeps the editor and draft open when a host mutation fails", async () => {
    const failingMutations: NoteBoardMutations = {
      ...mutations,
      create: async () => {
        throw new Error("Storage is full");
      },
    };
    const wrapper = mountBoard(failingMutations);
    await wrapper.get(".toolbar-actions .primary-button").trigger("click");
    const editor = wrapper.get(".composer");
    await editor.get(".title-input").setValue("Keep this draft");
    await editor
      .get(".content-input")
      .setValue("A failed save must not discard this work.");
    await editor.trigger("submit");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(wrapper.find(".composer").exists()).toBe(true);
    expect(
      (wrapper.get(".title-input").element as HTMLInputElement).value,
    ).toBe("Keep this draft");
    expect(wrapper.get(".form-error").text()).toContain("Storage is full");
  });
});
