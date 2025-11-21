import {create} from "zustand";
import {persist} from "zustand/middleware";
import {Collection} from "../types/common";

interface CollectionState {
  collections: Collection[]
  expandedNodes: string[]
  selectedCollection: string
  currentFile: string
  autoSave: boolean
  setCollections: (collections: Collection[]) => void
  addCollection: (collection: Collection) => void
  removeCollection: (collection: Collection) => void
  setSelectedCollection: (collection: string) => void
  resetSelectedCollection: () => void
  setCurrentFilePath: (file: string) => void
  resetCurrentFilePath: () => void
  setExpandedNodes: (nodes: string[]) => void
  resetExpandedNodes: () => void
  setAutoSave: (autoSave: boolean) => void
}

export const useCollectionStore = create<CollectionState>()(
  persist(
    (set) => ({
      collections: [],
      expandedNodes: [],
      selectedCollection: '',
      currentFile: '',
      autoSave: true,

      setCollections: (collections: Collection[]) => set({ collections: collections }),
      addCollection: (collection: Collection) => set((state) => ({ collections: [...state.collections, collection] })),
      removeCollection: (collection: Collection) => set((state) => ({ collections: state.collections.filter(c => c.id !== collection.id) })),

      setSelectedCollection: (collection: string) => set({ selectedCollection: collection }),
      resetSelectedCollection: () => set({ selectedCollection: '' }),

      setCurrentFilePath: (file: string) => set({ currentFile: file }),
      resetCurrentFilePath: () => set({ currentFile: '' }),

      setExpandedNodes: (nodes: string[]) => set({ expandedNodes: nodes }),
      resetExpandedNodes: () => set({ expandedNodes: [] }),

      setAutoSave: (autoSave: boolean) => set({ autoSave: autoSave }),
    }),
    { name: "postier-store" },
  ),
)
