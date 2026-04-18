import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Badge, DropdownMenu, Flex, IconButton, Skeleton, Text, Tooltip } from "@radix-ui/themes";
import { DotsHorizontalIcon, OpenInNewWindowIcon, ReloadIcon, UpdateIcon } from "@radix-ui/react-icons";
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
 * Handles (the connection points) are invisible — edges are purely decorative.
 */
/** Format byte count as a human-readable size string. */
function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CollectionRunNode({ id, data }: NodeProps<CollectionRunNodeType>) {
    const { depNode, result, isRunning, chainColor, onCardClick, onRerunAll, onRerunOne } = data;
    const response = result?.response;
    const hasResult = !!response;
    const durationMs = response?.duration != null ? Math.round(response.duration / 1000) : null;
    const headerCount = response?.headers ? Object.keys(response.headers).length : 0;
    const methodColor = METHOD_COLORS[depNode.method?.toUpperCase()] ?? "var(--gray-11)";

    const cardInner = (
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

            {/* Header: HTTP method + status badge / spinner + options menu */}
            <Flex justify="between" align="center" gap="2">
                <Text
                    size="1"
                    weight="bold"
                    style={{ fontFamily: "var(--font-mono)", color: methodColor, letterSpacing: 0 }}
                >
                    {depNode.method || "—"}
                </Text>

                {/* Status indicator + actions menu — `nodrag nopan` keeps React Flow from treating
                    these buttons as drag/pan targets; `stopPropagation` on the trigger prevents
                    the node-level onNodeClick from firing when the menu is opened. */}
                <Flex align="center" gap="1" className="nodrag nopan">
                    {isRunning && !hasResult ? (
                        <UpdateIcon style={{ animation: "spin 1s linear infinite", color: "var(--gray-10)", flexShrink: 0 }} />
                    ) : hasResult && response ? (
                        <Badge size="1" color={statusBadgeColor(response.statusCode)} variant="soft">
                            {response.statusCode}
                        </Badge>
                    ) : (
                        <Skeleton width="32px" height="18px" style={{ borderRadius: "var(--radius-2)" }} />
                    )}

                    <DropdownMenu.Root modal={false}>
                        <DropdownMenu.Trigger onClick={e => e.stopPropagation()}>
                            <IconButton size="1" variant="ghost" color="gray" style={{ cursor: "pointer" }}>
                                <DotsHorizontalIcon />
                            </IconButton>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content size="1">
                            <DropdownMenu.Item onSelect={() => onCardClick(id)}>
                                <Flex align="center" gap="2">
                                    <OpenInNewWindowIcon />
                                    Open request
                                </Flex>
                            </DropdownMenu.Item>
                            <DropdownMenu.Separator />
                            <DropdownMenu.Item disabled={isRunning} onSelect={onRerunAll}>
                                <Flex align="center" gap="2">
                                    <ReloadIcon />
                                    Re-run all
                                </Flex>
                            </DropdownMenu.Item>
                            <DropdownMenu.Item disabled={isRunning} onSelect={() => onRerunOne(id)}>
                                <Flex align="center" gap="2">
                                    <ReloadIcon />
                                    Re-run "{depNode.name}"
                                </Flex>
                            </DropdownMenu.Item>
                        </DropdownMenu.Content>
                    </DropdownMenu.Root>
                </Flex>
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

    // Tooltip with response preview — only shown after a run
    const card = hasResult && response ? (
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
            {cardInner}
        </Tooltip>
    ) : cardInner;

    return card;
}
