import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Badge, ContextMenu, Flex, Skeleton, Text, Tooltip } from "@radix-ui/themes";
import { OpenInNewWindowIcon, ReloadIcon, UpdateIcon } from "@radix-ui/react-icons";
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
    onCardClick: (filePath: string) => void;
    onRerunAll: () => void;
    onRerunOne: (filePath: string) => void;
};

export type CollectionRunNodeType = Node<CollectionRunNodeData, "requestCard">;

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * React Flow custom node that renders a request card inside the execution graph.
 *
 * Interaction model:
 *   - Left-click  → open request (handled by ReactFlow's onNodeClick in the parent)
 *   - Left-drag   → reposition the card (React Flow native drag)
 *   - Right-click → context menu (open / re-run actions)
 *
 * The ContextMenu.Root wraps the card so the native `contextmenu` event bubbles up to it.
 * React Flow does not intercept `contextmenu`, so this is reliable without any stopPropagation tricks.
 * The Tooltip (response preview) sits inside the Trigger so hover still works.
 */
export function CollectionRunNode({ id, data }: NodeProps<CollectionRunNodeType>) {
    const { depNode, result, isRunning, chainColor, onCardClick, onRerunAll, onRerunOne } = data;
    const response = result?.response;
    const hasResult = !!response;
    const durationMs = response?.duration != null ? Math.round(response.duration / 1000) : null;
    const headerCount = response?.headers ? Object.keys(response.headers).length : 0;
    const methodColor = METHOD_COLORS[depNode.method?.toUpperCase()] ?? "var(--gray-11)";

    // The raw card — shared between the plain and tooltip-wrapped variants.
    const cardDiv = (
        <div
            style={{
                width: 200,
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

            {/* Header: HTTP method + status badge / spinner */}
            <Flex justify="between" align="center" gap="2">
                <Text
                    size="1"
                    weight="bold"
                    style={{ fontFamily: "var(--font-mono)", color: methodColor, letterSpacing: 0 }}
                >
                    {depNode.method || "—"}
                </Text>

                {isRunning && !hasResult ? (
                    <UpdateIcon style={{ animation: "spin 1s linear infinite", color: "var(--gray-10)", flexShrink: 0 }} />
                ) : hasResult && response ? (
                    <Badge size="1" color={statusBadgeColor(response.statusCode)} variant="soft">
                        {response.statusCode}
                    </Badge>
                ) : (
                    <Skeleton width="32px" height="18px" style={{ borderRadius: "var(--radius-2)" }} />
                )}
            </Flex>

            {/* Request name */}
            <Text
                size="2"
                style={{
                    fontFamily: "var(--font-mono)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                }}
                title={depNode.name}
            >
                {depNode.name}
            </Text>

            {/* Data sources — which requests feed into this one */}
            {depNode.dependsOn && depNode.dependsOn.length > 0 && (
                <Text
                    size="1"
                    color="gray"
                    style={{
                        fontFamily: "var(--font-mono)",
                        letterSpacing: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                    title={`← ${depNode.dependsOn.join(", ")}`}
                >
                    ← {depNode.dependsOn.join(", ")}
                </Text>
            )}

            {/* Response stats — size + header count; skeleton until run */}
            <Flex gap="2" align="center">
                {hasResult && response ? (
                    <>
                        <Text size="1" color="gray">{formatSize(response.size)}</Text>
                        <Text size="1" color="gray" style={{ opacity: 0.5 }}>·</Text>
                        <Text size="1" color="gray">
                            {headerCount} header{headerCount !== 1 ? "s" : ""}
                        </Text>
                    </>
                ) : (
                    <>
                        <Skeleton width="28px" height="14px" style={{ borderRadius: "var(--radius-1)" }} />
                        <Skeleton width="52px" height="14px" style={{ borderRadius: "var(--radius-1)" }} />
                    </>
                )}
            </Flex>

            {/* Footer: parentDir + duration; skeleton for duration until run */}
            <Flex justify="between" align="center" mt="1">
                {depNode.parentDir ? (
                    <Text size="1" color="gray" style={{ fontFamily: "var(--font-mono)", letterSpacing: 0 }}>
                        ({depNode.parentDir})
                    </Text>
                ) : <span />}
                {hasResult && durationMs !== null ? (
                    <Text size="1" color="gray">{durationMs} ms</Text>
                ) : (
                    <Skeleton width="36px" height="14px" style={{ borderRadius: "var(--radius-1)" }} />
                )}
            </Flex>
        </div>
    );

    // Wrap with a response-preview tooltip once a result exists.
    const cardWithTooltip = hasResult && response ? (
        <Tooltip
            content={
                <Flex direction="column" gap="1" style={{ maxWidth: 340 }}>
                    <Text size="1" weight="bold">
                        {response.status}
                        {durationMs !== null && (
                            <Text as="span" color="gray"> · {durationMs} ms · {formatSize(response.size)}</Text>
                        )}
                    </Text>
                    {response.body && (
                        <Text
                            size="1"
                            style={{
                                fontFamily: "var(--font-mono)",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-all",
                                opacity: 0.85,
                                borderTop: "1px solid var(--gray-a6)",
                                paddingTop: "var(--space-1)",
                                marginTop: "var(--space-1)",
                            }}
                        >
                            {response.body.slice(0, 500)}{response.body.length > 500 ? "…" : ""}
                        </Text>
                    )}
                </Flex>
            }
        >
            {cardDiv}
        </Tooltip>
    ) : cardDiv;

    // ContextMenu wraps the card (including the tooltip trigger) so right-click always
    // opens the menu regardless of which part of the card the pointer is on.
    return (
        <ContextMenu.Root>
            <ContextMenu.Trigger>
                {cardWithTooltip}
            </ContextMenu.Trigger>
            <ContextMenu.Content size="1">
                <ContextMenu.Item onSelect={() => onCardClick(id)}>
                    <Flex align="center" gap="2">
                        <OpenInNewWindowIcon />
                        Open request
                    </Flex>
                </ContextMenu.Item>
                <ContextMenu.Separator />
                <ContextMenu.Item disabled={isRunning} onSelect={onRerunAll}>
                    <Flex align="center" gap="2">
                        <ReloadIcon />
                        Re-run all
                    </Flex>
                </ContextMenu.Item>
                <ContextMenu.Item disabled={isRunning} onSelect={() => onRerunOne(id)}>
                    <Flex align="center" gap="2">
                        <ReloadIcon />
                        Re-run "{depNode.name}"
                    </Flex>
                </ContextMenu.Item>
            </ContextMenu.Content>
        </ContextMenu.Root>
    );
}
