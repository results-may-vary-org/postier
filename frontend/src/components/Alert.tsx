import { ReactNode } from 'react';
import { AlertDialog, Button, Flex } from "@radix-ui/themes";

interface AlertProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmLabel?: string;
  confirmColor?: 'gray' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'indigo' | 'purple' | 'pink';
  cancelLabel?: string;
}

export function ConfirmAlert({isOpen, onClose, title, description, onConfirm, confirmLabel = "Confirm", confirmColor = "red", cancelLabel = "Cancel"}: AlertProps) {
  return (
    <AlertDialog.Root open={isOpen} onOpenChange={onClose}>
      <AlertDialog.Content style={{ maxWidth: 450 }}>
        <AlertDialog.Title>{title}</AlertDialog.Title>
        <AlertDialog.Description size="2">
          {description}
        </AlertDialog.Description>

        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray">
              {cancelLabel}
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <Button variant="solid" color={confirmColor} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}

export function InfoAlert({
  isOpen,
  onClose,
  title,
  description,
  okLabel = "OK"
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  okLabel?: string;
}) {
  return (
    <AlertDialog.Root open={isOpen} onOpenChange={onClose}>
      <AlertDialog.Content style={{ maxWidth: 450 }}>
        <AlertDialog.Title>{title}</AlertDialog.Title>
        <AlertDialog.Description size="2">
          {description}
        </AlertDialog.Description>

        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray">
              {okLabel}
            </Button>
          </AlertDialog.Cancel>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}

export function Alert({
  isOpen,
  onClose,
  title,
  description,
  children,
  actions = [],
  cancelLabel = "Cancel"
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: ReactNode;
  actions?: {
    label: string;
    onClick: () => void;
    color?: 'gray' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'indigo' | 'purple' | 'pink';
  }[];
  cancelLabel?: string;
}) {
  return (
    <AlertDialog.Root open={isOpen} onOpenChange={onClose}>
      <AlertDialog.Content style={{ maxWidth: 450 }}>
        <AlertDialog.Title>{title}</AlertDialog.Title>
        <AlertDialog.Description size="2">
          {description}
        </AlertDialog.Description>

        <div style={{ marginTop: '12px' }}>
          {children}
        </div>

        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray">
              {cancelLabel}
            </Button>
          </AlertDialog.Cancel>

          {actions.map((action, index) => (
            <AlertDialog.Action key={index}>
              <Button
                variant="solid"
                color={action.color || 'blue'}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            </AlertDialog.Action>
          ))}
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
