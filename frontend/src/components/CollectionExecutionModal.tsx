import { Badge, Button, Dialog, Flex, ScrollArea, Separator, Text } from "@radix-ui/themes";
import { main } from "../../wailsjs/go/models";

interface CollectionExecutionModalProps {
    collectionName: string;
    analysis: main.DependencyAnalysis;
    isRunning: boolean;
    onExecute: (orderedFilePaths: string[]) => void;
    onClose: () => void;
}

/**
 * Shows the dependency-resolved execution plan before running a collection.
 * The user can review the order and click "Execute All" to start the run.
 */
export function CollectionExecutionModal({ collectionName, analysis, isRunning, onExecute, onClose }: CollectionExecutionModalProps) {
    const handleExecute = () => {
        onExecute(analysis.order.map(n => n.filePath));
    };

    return (
        <Dialog.Root open onOpenChange={open => { if (!open && !isRunning) onClose(); }}>
            <Dialog.Content style={{ maxWidth: 680 }}>
                <Dialog.Title>Run collection — {collectionName}</Dialog.Title>
                <Dialog.Description size="2" color="gray">
                    Execution order · {analysis.order.length} request{analysis.order.length !== 1 ? 's' : ''}
                </Dialog.Description>

                <Separator size="4" my="3" />

                <ScrollArea style={{ maxHeight: 400 }}>
                    <Flex direction="column" gap="1" pr="2">
                        {analysis.order.map((node, i) => (
                            <Flex
                                key={node.filePath}
                                align="center"
                                gap="3"
                                px="2"
                                style={{
                                    height: 'var(--space-7)',
                                    borderRadius: 'var(--radius-2)',
                                    background: i % 2 === 0 ? 'var(--gray-a2)' : 'transparent',
                                }}
                            >
                                {/* Step number */}
                                <Text
                                    size="1"
                                    color="gray"
                                    style={{ minWidth: 20, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                                >
                                    {i + 1}
                                </Text>

                                {/* Request name + optional parent dir for disambiguation */}
                                <Text
                                    size="2"
                                    style={{ fontFamily: 'var(--font-mono)', flex: 1 }}
                                >
                                    {node.name}
                                    {node.parentDir && (
                                        <Text as="span" size="1" color="gray" ml="2">
                                            ({node.parentDir})
                                        </Text>
                                    )}
                                </Text>

                                {/* Dependency badges */}
                                {node.dependsOn && node.dependsOn.length > 0 ? (
                                    <Flex gap="1" align="center" wrap="wrap" justify="end" style={{ maxWidth: 280 }}>
                                        <Text size="1" color="gray">←</Text>
                                        {node.dependsOn.map(dep => (
                                            <Badge key={dep} size="1" variant="soft" color="gray" radius="full">
                                                {dep}
                                            </Badge>
                                        ))}
                                    </Flex>
                                ) : (
                                    <Text size="1" color="gray" style={{ fontStyle: 'italic' }}>no dependencies</Text>
                                )}
                            </Flex>
                        ))}
                    </Flex>
                </ScrollArea>

                <Separator size="4" my="3" />

                <Flex gap="3" justify="end">
                    <Dialog.Close>
                        <Button variant="soft" color="gray" disabled={isRunning} onClick={onClose}>
                            Cancel
                        </Button>
                    </Dialog.Close>
                    <Button variant="solid" loading={isRunning} onClick={handleExecute}>
                        Execute all →
                    </Button>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
}
