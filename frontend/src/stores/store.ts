import {create} from "zustand";
import {persist} from "zustand/middleware";
import {Collection} from "../types/common";

interface CollectionState {
  collections: Collection[]
  expandedNodes: string[]
  selectedCollection: string
  currentFilePath: string
  autoSave: boolean
  followRedirects: boolean
  showAutoSaveModal: boolean
  selectedThemeId: string
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
  setFollowRedirects: (follow: boolean) => void
  setShowAutoSaveModal: (show: boolean) => void
  setSelectedThemeId: (id: string) => void
}

export const useCollectionStore = create<CollectionState>()(
  persist(
    (set) => ({
      collections: [],
      expandedNodes: [],
      selectedCollection: '',
      currentFilePath: '',
      autoSave: false,
      followRedirects: true,
      showAutoSaveModal: false,
      selectedThemeId: 'postier-light',

      setCollections: (collections: Collection[]) => set({ collections: collections }),
      addCollection: (collection: Collection) => set((state) => ({ collections: [...state.collections, collection] })),
      removeCollection: (collection: Collection) => set((state) => ({ collections: state.collections.filter(c => c.id !== collection.id) })),

      setSelectedCollection: (collection: string) => set({ selectedCollection: collection }),
      resetSelectedCollection: () => set({ selectedCollection: '' }),

      setCurrentFilePath: (file: string) => set({ currentFilePath: file }),
      resetCurrentFilePath: () => set({ currentFilePath: '' }),

      setExpandedNodes: (nodes: string[]) => set({ expandedNodes: nodes }),
      resetExpandedNodes: () => set({ expandedNodes: [] }),

      setAutoSave: (autoSave: boolean) => set({ autoSave: autoSave }),
      setFollowRedirects: (follow: boolean) => set({ followRedirects: follow }),
      setShowAutoSaveModal: (show: boolean) => set({ showAutoSaveModal: show }),
      setSelectedThemeId: (id: string) => set({ selectedThemeId: id }),
    }),
    {
      name: "postier-store",
      // Exclude transient UI state from persistence so the modal is never
      // restored on reload without a real `loadCollection` action.
      partialize: (state) => {
        const { showAutoSaveModal, ...persistedState } = state;
        return persistedState;
      },
    },
  ),
)
