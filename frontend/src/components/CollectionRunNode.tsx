import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Badge, Flex, Skeleton, Text } from "@radix-ui/themes";
import { UpdateIcon } from "@radix-ui/react-icons";
import { main } from "../../wailsjs/go/models";

// ── Styling helpers ───────────────────────────────────────────────────────────

const METHOD_COLORS: Record<string, string> = {
    GET:     "var(--green-11)",
    POST:    "var(--yellow-11)",
    PUT:     "var(--orange-11)",
    DELETE:  "var(--red-11)",
    PATCH:   "var(--purple-11)",
    HEAD:    "var(--blue-11)",
    OPTIONS: "var(--gray-11)",
};

type RadixColor = "green" | "blue" | "red" | "gray";

function statusBadgeColor(code: number): RadixColor {
    const first = String(code).charAt(0);
    if (first === "2") return "green";
    if (first === "3") return "blue";
    if (first === "4" || first === "5") return "red";
    return "gray";
}

/** Format byte count as a human-readable size string. */
function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Node data type ────────────────────────────────────────────────────────────

export type CollectionRunNodeData = {
    label: string;
    depNode: main.DependencyNode;
    result: main.CollectionRunResult | undefined;
    isRunning: boolean;
    /** CSS color value for the chain this node belongs to; undefined for no-dep nodes. */
    chainColor: string | undefined;
};

export type CollectionRunNodeType = Node<CollectionRunNodeData, "requestCard">;

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * React Flow custom node that renders a request card inside the execution graph.
 *
 * Interaction model:
 *   - Left-click → open request (handled by ReactFlow's onNodeClick in the parent)
 *   - Left-drag  → reposition the card (React Flow native drag)
 */
export function CollectionRunNode({ data }: NodeProps<CollectionRunNodeType>) {
    const { depNode, result, isRunning, chainColor } = data;
    const response = result?.response;
    const hasResult = !!response;
    const durationMs = response?.duration != null ? Math.round(response.duration / 1000) : null;
    const headerCount = response?.headers ? Object.keys(response.headers).length : 0;
    const methodColor = METHOD_COLORS[depNode.method?.toUpperCase()] ?? "var(--gray-11)";

    return (
        <div
            style={{
                width: 220,
                borderRadius: "var(--radius-3)",
                border: "1px solid var(--gray-a6)",
                boxShadow: chainColor ? `inset 3px 0 0 ${chainColor}` : undefined,
                padding: "var(--space-2) var(--space-3)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-1)",
                cursor: "pointer",
                background: "var(--color-panel-solid)",
                transition: "background 120ms, border-color 120ms",
                userSelect: "none",
            }}
            onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "var(--gray-a3)";
                el.style.borderColor = "var(--gray-a8)";
            }}
            onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "var(--color-panel-solid)";
                el.style.borderColor = "var(--gray-a6)";
            }}
        >
            {/* React Flow connection handles — invisible, used only for edge routing */}
            <Handle type="target" position={Position.Left}  style={{ opacity: 0, pointerEvents: "none" }} />
            <Handle type="source" position={Position.Right} style={{ opacity: 0, pointerEvents: "none" }} />

            {/* Row 1: method · name · status */}
            <Flex align="center" gap="2" style={{ minWidth: 0 }}>
                <Text
                    size="1"
                    weight="bold"
                    style={{ fontFamily: "var(--font-mono)", color: methodColor, letterSpacing: 0, flexShrink: 0 }}
                >
                    {depNode.method || "—"}
                </Text>

                <Text
                    size="2"
                    style={{
                        fontFamily: "var(--font-mono)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                        minWidth: 0,
                    }}
                    title={depNode.name}
                >
                    {depNode.name}
                </Text>

                {isRunning && !hasResult ? (
                    <UpdateIcon style={{ animation: "spin 1s linear infinite", color: "var(--gray-10)", flexShrink: 0 }} />
                ) : hasResult && response ? (
                    <Badge size="1" color={statusBadgeColor(response.statusCode)} variant="soft" style={{ flexShrink: 0 }}>
                        {response.statusCode}
                    </Badge>
                ) : (
                    <Skeleton width="32px" height="18px" style={{ borderRadius: "var(--radius-2)", flexShrink: 0 }} />
                )}
            </Flex>

            {/* Row 2: size · headers · duration */}
            <Flex gap="2" align="center">
                {hasResult && response ? (
                    <>
                        <Text size="1" color="gray">{formatSize(response.size)}</Text>
                        <Text size="1" color="gray" style={{ opacity: 0.4 }}>·</Text>
                        <Text size="1" color="gray">
                            {headerCount} header{headerCount !== 1 ? "s" : ""}
                        </Text>
                        {durationMs !== null && (
                            <>
                                <Text size="1" color="gray" style={{ opacity: 0.4 }}>·</Text>
                                <Text size="1" color="gray">{durationMs} ms</Text>
                            </>
                        )}
                    </>
                ) : (
                    <>
                        <Skeleton width="28px" height="14px" style={{ borderRadius: "var(--radius-1)" }} />
                        <Skeleton width="52px" height="14px" style={{ borderRadius: "var(--radius-1)" }} />
                        <Skeleton width="36px" height="14px" style={{ borderRadius: "var(--radius-1)" }} />
                    </>
                )}
            </Flex>

            {/* Row 3: parent directory (when present) */}
            {depNode.parentDir && (
                <Text size="1" color="gray" style={{ fontFamily: "var(--font-mono)", letterSpacing: 0 }}>
                    ({depNode.parentDir})
                </Text>
            )}
        </div>
    );
}
