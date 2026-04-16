import React from "react";
import { Dialog, Button, Flex, Text } from "@radix-ui/themes";

/**
 * Props for the AutoSaveModal component.
 */
interface AutoSaveModalProps {
  /** Whether the modal is currently open */
  isOpen: boolean;
  /** Called when the modal is dismissed without enabling auto-save */
  onClose: () => void;
  /** Called when the user confirms they want to enable auto-save */
  onEnableAutoSave: () => void;
}

/**
 * A Radix UI Dialog modal that prompts the user to enable auto-save
 * when they open a collection and auto-save is currently disabled.
 */
export function AutoSaveModal({ isOpen, onClose, onEnableAutoSave }: AutoSaveModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Content style={{ maxWidth: 420 }}>
        <Dialog.Title>Enable Auto-save?</Dialog.Title>
        <Dialog.Description>
          <Text size="2">
            You just opened a collection but auto-save is currently disabled. Would you like to enable it? When active, requests are automatically saved after each send.
          </Text>
        </Dialog.Description>
        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray" onClick={onClose}>
              Keep Disabled
            </Button>
          </Dialog.Close>
          <Dialog.Close>
            {/* onClose is handled exclusively by Dialog.Root's onOpenChange to avoid double-firing */}
            <Button variant="solid" color="green" onClick={onEnableAutoSave}>
              Enable Auto-save
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
