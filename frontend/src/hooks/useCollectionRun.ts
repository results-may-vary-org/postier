import { useState } from "react";
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
 * Extract this concern out of FileTree so that component only handles file-browsing UI.
 */
export function useCollectionRun() {
    const { autoSave } = useCollectionStore();

    const [executionModal, setExecutionModal] = useState<ExecutionModalState | null>(null);
    const [cycleError, setCycleError] = useState<{ collectionName: string; cycleNames: string[] } | null>(null);
    const [selfRefError, setSelfRefError] = useState<{ collectionName: string; selfRefNames: string[] } | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isRunning, setIsRunning] = useState(false);

    /**
     * Entry point: triggered by the "Run All" button.
     * Analyses dependencies and opens the execution modal, or surfaces an error.
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
                setExecutionModal({ collectionName: collection.name, collectionPath: collection.path, analysis, results: null });
            }
        } catch (err) {
            console.error('Dependency analysis failed:', err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    /**
     * Triggered by "Execute all →" inside the execution modal.
     * Runs the collection in the resolved order and stores results back into the modal state.
     */
    const execute = async (orderedFilePaths: string[]) => {
        if (!executionModal) return;
        setIsRunning(true);
        try {
            const results = await RunCollection(orderedFilePaths, executionModal.collectionPath, autoSave);
            setExecutionModal(previous => previous ? { ...previous, results } : null);
            if (autoSave) {
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
