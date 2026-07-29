export const UNCATEGORIZED = "Uncategorized";

export type NoteColor =
  "yellow" | "blue" | "pink" | "mint" | "peach" | "lavender";
export type SortMode = "updated" | "created" | "title";

export interface NoteImage {
  id: string;
  name: string;
  src: string;
  byteSize: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  color: NoteColor;
  images: NoteImage[];
  createdAt: string;
  updatedAt: string;
}

export interface NoteDraft {
  title: string;
  content: string;
  category: string;
  color: NoteColor;
  images: NoteImage[];
}

export interface BoardData {
  notes: Note[];
  categoryOrder: string[];
}

export interface NoteBoardMutations {
  create(draft: NoteDraft): Promise<void>;
  update(id: string, draft: NoteDraft): Promise<void>;
  remove(id: string): Promise<void>;
  saveCategoryOrder(categories: string[]): Promise<void>;
}
