import { type BoardData, type Note, type NoteColor } from "@/types";

const STORAGE_KEY = "noteboard:demo:v1";
const DATABASE_NAME = "noteboard";
const STORE_NAME = "boards";
const BOARD_KEY = "demo";
const noteColors = new Set<NoteColor>([
  "yellow",
  "blue",
  "pink",
  "mint",
  "peach",
  "lavender",
]);

const seedNotes: Note[] = [
  {
    id: "route-map",
    title: "Publish the route map",
    content:
      "Keep launch notes next to the release checklist so the whole team can scan the final changes.",
    category: "Launch",
    color: "yellow",
    images: [],
    createdAt: "2026-07-20T08:30:00.000Z",
    updatedAt: "2026-07-24T09:00:00.000Z",
  },
  {
    id: "review-loop",
    title: "Short review loop",
    content:
      "Capture decisions while they are still fresh. A small, named category is easier to revisit than a long document.",
    category: "Team practice",
    color: "blue",
    images: [],
    createdAt: "2026-07-18T08:30:00.000Z",
    updatedAt: "2026-07-22T12:15:00.000Z",
  },
  {
    id: "first-contact",
    title: "First contact",
    content: "Use the board for the detail that makes the next handoff easier.",
    category: "Launch",
    color: "peach",
    images: [],
    createdAt: "2026-07-16T08:30:00.000Z",
    updatedAt: "2026-07-16T08:30:00.000Z",
  },
];

const fallback: BoardData = {
  notes: seedNotes,
  categoryOrder: ["Launch", "Team practice"],
};

function seedBoard(): BoardData {
  return structuredClone(fallback);
}

function isBoardData(value: unknown): value is BoardData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<BoardData>;
  return (
    Array.isArray(candidate.categoryOrder) &&
    candidate.categoryOrder.every((category) => typeof category === "string") &&
    Array.isArray(candidate.notes) &&
    candidate.notes.every((note) => {
      const imageList = note.images;
      return (
        typeof note.id === "string" &&
        typeof note.title === "string" &&
        typeof note.content === "string" &&
        typeof note.category === "string" &&
        typeof note.createdAt === "string" &&
        typeof note.updatedAt === "string" &&
        noteColors.has(note.color as NoteColor) &&
        Array.isArray(imageList) &&
        imageList.every(
          (image) =>
            typeof image.id === "string" &&
            typeof image.name === "string" &&
            typeof image.src === "string" &&
            typeof image.byteSize === "number",
        )
      );
    })
  );
}

function request<T>(value: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    value.onsuccess = () => resolve(value.result);
    value.onerror = () =>
      reject(value.error ?? new Error("IndexedDB request failed"));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const operation = indexedDB.open(DATABASE_NAME, 1);
    operation.onupgradeneeded = () =>
      operation.result.createObjectStore(STORE_NAME);
    operation.onsuccess = () => resolve(operation.result);
    operation.onerror = () =>
      reject(operation.error ?? new Error("IndexedDB is unavailable"));
  });
}

async function readIndexedBoard(): Promise<BoardData | undefined> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    return (await request(
      transaction.objectStore(STORE_NAME).get(BOARD_KEY),
    )) as BoardData | undefined;
  } finally {
    database.close();
  }
}

async function writeIndexedBoard(data: BoardData): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(data, BOARD_KEY);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("IndexedDB write failed"));
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("IndexedDB write failed"));
    });
  } finally {
    database.close();
  }
}

function readLegacyBoard(): BoardData | undefined {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    const parsed = value ? JSON.parse(value) : undefined;
    return isBoardData(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export async function loadBoard(): Promise<BoardData> {
  try {
    const stored = await readIndexedBoard();
    if (isBoardData(stored)) return stored;
    const legacy = readLegacyBoard();
    if (legacy) {
      await writeIndexedBoard(legacy);
      return legacy;
    }
    return seedBoard();
  } catch {
    return readLegacyBoard() ?? seedBoard();
  }
}

export async function saveBoard(data: BoardData): Promise<void> {
  if (!isBoardData(data)) throw new Error("Invalid board data");
  try {
    await writeIndexedBoard(data);
  } catch (error) {
    throw new Error(
      "This browser could not save the board. Try fewer or smaller images.",
      { cause: error },
    );
  }
}

export function createSeedBoard(): BoardData {
  return seedBoard();
}
