import { useRef, useState } from "react";
import { AnalyzeCollectionDependencies, RunCollection } from "../../wailsjs/go/main/App";
import { main } from "../../wailsjs/go/models";
import { useCollectionStore } from "../stores/store";

type DirectoryTree = main.DirectoryTree;

interface ExecutionModalState {
    collectionName: string;
    collectionPath: string;
    analysis: main.DependencyAnalysis;
    /** null while not yet run; populated after RunCollection completes. */
    results: main.CollectionRunResult[] | null;
}

/** Depth-first walk of a collection tree, returning all .postier file paths in display order. */
function collectFilePaths(tree: DirectoryTree): string[] {
    const paths: string[] = [];
    const walk = (node: DirectoryTree) => {
        if (!node.entry.isDir && node.entry.path.endsWith('.postier')) {
            paths.push(node.entry.path);
        }
        node.children?.forEach(walk);
    };
    tree.children?.forEach(walk);
    return paths;
}

/**
 * Manages the entire collection-run lifecycle:
 * dependency analysis → execution plan modal → run → inline results.
 *
 * Extracted from FileTree so that component only handles file-browsing UI.
 */
export function useCollectionRun() {
    const { autoSave } = useCollectionStore();

    const [executionModal, setExecutionModal] = useState<ExecutionModalState | null>(null);
    const [cycleError, setCycleError] = useState<{ collectionName: string; cycleNames: string[] } | null>(null);
    const [selfRefError, setSelfRefError] = useState<{ collectionName: string; selfRefNames: string[] } | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isRunning, setIsRunning] = useState(false);

    /**
     * In-memory cache of the last successful run results per collection path.
     * Persists across modal open/close cycles within the same app session.
     * Keyed by collection path so multiple collections don't share state.
     */
    const lastRunCache = useRef<Map<string, main.CollectionRunResult[]>>(new Map());

    /**
     * Entry point: triggered by the "Run All" button.
     * Analyses dependencies and opens the execution modal, or surfaces an error.
     * Pre-populates results from the in-memory cache so the last run is visible immediately.
     */
    const analyzeAndOpen = async (collection: { name: string; path: string; tree: DirectoryTree }) => {
        const filePaths = collectFilePaths(collection.tree);
        if (!filePaths.length) return;

        setIsAnalyzing(true);
        try {
            const analysis = await AnalyzeCollectionDependencies(filePaths, collection.path);
            if (analysis.selfRefNames?.length) {
                setSelfRefError({ collectionName: collection.name, selfRefNames: analysis.selfRefNames });
            } else if (analysis.hasCycle) {
                setCycleError({ collectionName: collection.name, cycleNames: analysis.cycleNames ?? [] });
            } else {
                const cached = lastRunCache.current.get(collection.path) ?? null;
                setExecutionModal({
                    collectionName: collection.name,
                    collectionPath: collection.path,
                    analysis,
                    results: cached,
                });
            }
        } catch (err) {
            console.error('Dependency analysis failed:', err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    /**
     * Triggered by "Execute all →" or a re-run action inside the execution modal.
     * Merges new results into existing ones by filePath so that re-running a single
     * request doesn't wipe results for the other cards.
     */
    const execute = async (orderedFilePaths: string[]) => {
        if (!executionModal) return;
        setIsRunning(true);
        try {
            const newResults = await RunCollection(orderedFilePaths, executionModal.collectionPath, autoSave);
            setExecutionModal(previous => {
                if (!previous) return null;
                // Merge: keep existing results, replace/append updated ones
                const merged = [...(previous.results ?? [])];
                for (const r of newResults) {
                    const idx = merged.findIndex(x => x.filePath === r.filePath);
                    if (idx >= 0) merged[idx] = r; else merged.push(r);
                }
                // Update the cache so the next modal open pre-populates with these results
                lastRunCache.current.set(previous.collectionPath, merged);
                return { ...previous, results: merged };
            });
            if (autoSave) {
                // HttpClient listens to this and reloads only its currently open file — no navigation
                window.dispatchEvent(new CustomEvent('postier-collection-refresh'));
            }
        } catch (err) {
            console.error('Collection run failed:', err);
        } finally {
            setIsRunning(false);
        }
    };

    return {
        executionModal,
        cycleError,
        selfRefError,
        isAnalyzing,
        isRunning,
        analyzeAndOpen,
        execute,
        closeModal: () => setExecutionModal(null),
        closeCycleError: () => setCycleError(null),
        closeSelfRefError: () => setSelfRefError(null),
    };
}
