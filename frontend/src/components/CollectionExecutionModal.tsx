import { useCallback, useEffect, useMemo } from "react";
import { Button, Dialog, Flex, Separator, Text } from "@radix-ui/themes";
import {
    ReactFlow,
    Background,
    BackgroundVariant,
    Controls,
    useNodesState,
    useEdgesState,
    type Node,
    type Edge,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";
import { main } from "../../wailsjs/go/models";
import { CollectionRunNode, type CollectionRunNodeData, type CollectionRunNodeType } from "./CollectionRunNode";

// nodeTypes must live outside the component — React Flow re-registers on every render otherwise
const NODE_TYPES = { requestCard: CollectionRunNode };

const NODE_WIDTH  = 240;
const NODE_HEIGHT = 90;

/** Distinct colors assigned to independent dependency chains. */
const CHAIN_COLORS = [
    "var(--blue-8)",
    "var(--green-8)",
    "var(--orange-8)",
    "var(--purple-8)",
    "var(--pink-8)",
    "var(--cyan-8)",
];

// ── Dagre layout ──────────────────────────────────────────────────────────────

/**
 * Compute node positions with dagre (left-to-right ranking by dependency depth).
 * Assigns a distinct color to each independent connected component so chains
 * are immediately distinguishable at a glance.
 */
function buildLayoutedGraph(
    order: main.DependencyNode[],
): { nodes: Node<CollectionRunNodeData>[]; edges: Edge[] } {
    // Build displayID → filePath so we can resolve DependsOn labels to node IDs
    const displayToPath = new Map<string, string>();
    for (const depNode of order) {
        const label = depNode.parentDir
            ? `${depNode.parentDir}/${depNode.name}`
            : depNode.name;
        displayToPath.set(label, depNode.filePath);
        displayToPath.set(depNode.name, depNode.filePath); // bare-name fallback
    }

    const graph = new dagre.graphlib.Graph();
    graph.setDefaultEdgeLabel(() => ({}));
    graph.setGraph({ rankdir: "LR", ranksep: 80, nodesep: 24 });

    // Register nodes and collect raw edge pairs
    const rawEdges: { source: string; target: string }[] = [];
    for (const depNode of order) {
        graph.setNode(depNode.filePath, { width: NODE_WIDTH, height: NODE_HEIGHT });

        for (const depLabel of (depNode.dependsOn ?? [])) {
            const depPath = displayToPath.get(depLabel);
            if (!depPath) continue;
            graph.setEdge(depPath, depNode.filePath);
            rawEdges.push({ source: depPath, target: depNode.filePath });
        }
    }

    dagre.layout(graph);

    // ── Connected-component coloring ──────────────────────────────────────────
    const adj = new Map<string, Set<string>>();
    for (const { source, target } of rawEdges) {
        if (!adj.has(source)) adj.set(source, new Set());
        if (!adj.has(target)) adj.set(target, new Set());
        adj.get(source)!.add(target);
        adj.get(target)!.add(source);
    }

    const componentByPath = new Map<string, number>();
    let componentCount = 0;
    for (const depNode of order) {
        if (componentByPath.has(depNode.filePath)) continue;
        const queue = [depNode.filePath];
        while (queue.length) {
            const current = queue.shift()!;
            if (componentByPath.has(current)) continue;
            componentByPath.set(current, componentCount);
            for (const neighbor of (adj.get(current) ?? [])) {
                if (!componentByPath.has(neighbor)) queue.push(neighbor);
            }
        }
        componentCount++;
    }

    const hasEdges = rawEdges.length > 0;
    const chainColorByPath = new Map<string, string>();
    if (hasEdges) {
        for (const [path, idx] of componentByPath) {
            if (adj.has(path)) {
                chainColorByPath.set(path, CHAIN_COLORS[idx % CHAIN_COLORS.length]);
            }
        }
    }

    const edges: Edge[] = rawEdges.map(({ source, target }) => {
        const color = chainColorByPath.get(source) ?? "var(--gray-8)";
        return {
            id: `${source}->${target}`,
            source,
            target,
            type: "smoothstep",
            animated: false,
            style: { stroke: color, strokeWidth: 1.5 },
            data: { chainColor: color },
        };
    });

    const nodes: Node<CollectionRunNodeData>[] = order.map(depNode => {
        const { x, y } = graph.node(depNode.filePath);
        return {
            id: depNode.filePath,
            type: "requestCard" as const,
            position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
            data: {
                label: depNode.name,
                depNode,
                result: undefined,
                isRunning: false,
                chainColor: chainColorByPath.get(depNode.filePath),
            },
        };
    });

    return { nodes, edges };
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface CollectionExecutionModalProps {
    collectionName: string;
    analysis: main.DependencyAnalysis;
    /** null while not yet run; populated after RunCollection completes. */
    results: main.CollectionRunResult[] | null;
    isRunning: boolean;
    onExecute: (orderedFilePaths: string[]) => void;
    onClose: () => void;
    /** Navigate to this request in the main editor and close the modal. */
    onSelectRequest: (filePath: string) => void;
}

/**
 * Single modal covering the full collection-run lifecycle:
 * plan view → execute → live status → results.
 * Uses React Flow for the graph canvas and dagre for automatic layout.
 */
export function CollectionExecutionModal({
    collectionName,
    analysis,
    results,
    isRunning,
    onExecute,
    onClose,
    onSelectRequest,
}: CollectionExecutionModalProps) {
    const hasRun = results !== null;

    const handleCardClick = useCallback((filePath: string) => {
        onSelectRequest(filePath);
        onClose();
    }, [onSelectRequest, onClose]);

    const resultByPath = useMemo(() => {
        const map = new Map<string, main.CollectionRunResult>();
        results?.forEach(r => map.set(r.filePath, r));
        return map;
    }, [results]);

    const { nodes: initialNodes, edges: initialEdges } = useMemo(
        () => buildLayoutedGraph(analysis.order),
        [analysis.order],
    );

    const [rfNodes, setRfNodes, onNodesChange] = useNodesState<CollectionRunNodeType>(initialNodes as CollectionRunNodeType[]);
    const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Sync result data and running state into nodes without triggering a re-layout
    useEffect(() => {
        setRfNodes(nodes =>
            nodes.map(node => ({
                ...node,
                data: {
                    ...node.data,
                    result: resultByPath.get(node.id),
                    isRunning,
                },
            })),
        );
    }, [results, isRunning, resultByPath, setRfNodes]);

    // Animate edges while running — preserve the per-chain stroke color
    useEffect(() => {
        setRfEdges(edges =>
            edges.map(edge => ({
                ...edge,
                animated: isRunning,
                style: {
                    ...edge.style,
                    stroke: (edge.data as { chainColor?: string } | undefined)?.chainColor ?? "var(--gray-8)",
                    strokeWidth: 1.5,
                },
            })),
        );
    }, [isRunning, setRfEdges]);

    const handleExecute = () => onExecute(analysis.order.map(node => node.filePath));

    return (
        <Dialog.Root open onOpenChange={open => { if (!open && !isRunning) onClose(); }}>
            <Dialog.Content
                style={{
                    width: "min(90vw, 1100px)",
                    maxWidth: "unset",
                    height: "80vh",
                    display: "flex",
                    flexDirection: "column",
                    padding: "var(--space-4)",
                    gap: 0,
                }}
            >
                {/* Header */}
                <Flex justify="between" align="center" mb="2">
                    <Flex direction="column" gap="1">
                        <Dialog.Title mb="0">
                            Run collection — {collectionName}
                        </Dialog.Title>
                        <Text size="2" color="gray">
                            {analysis.order.length} request{analysis.order.length !== 1 ? "s" : ""}
                        </Text>
                    </Flex>

                    <Button onClick={handleExecute} loading={isRunning} disabled={isRunning}>
                        Execute all →
                    </Button>
                </Flex>

                <Separator size="4" mb="3" />

                {/* React Flow graph — fills the remaining height */}
                <div style={{ flex: 1, minHeight: 0, borderRadius: "var(--radius-3)", overflow: "hidden" }}>
                    <ReactFlow
                        nodes={rfNodes}
                        edges={rfEdges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        nodeTypes={NODE_TYPES}
                        fitView
                        fitViewOptions={{ padding: 0.15 }}
                        onNodeClick={(_, node) => handleCardClick(node.id)}
                        nodesConnectable={false}
                        elementsSelectable={false}
                        panOnDrag={[1]}
                        panActivationKeyCode="Space"
                        proOptions={{ hideAttribution: true }}
                        style={{ background: "var(--gray-a1)" }}
                    >
                        <Background
                            variant={BackgroundVariant.Dots}
                            gap={16}
                            size={1}
                            color="var(--gray-a6)"
                        />
                        <Controls showInteractive={false} />
                    </ReactFlow>
                </div>

                <Separator size="4" mt="3" />

                {/* Footer */}
                <Flex justify="end" mt="3">
                    <Button variant="soft" color="gray" disabled={isRunning} onClick={onClose}>
                        {hasRun ? "Close" : "Cancel"}
                    </Button>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
}
