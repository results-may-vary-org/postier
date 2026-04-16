import { useState, useEffect } from "react";
import { Dialog, Button, IconButton, Flex, Text, TextField, Box, Callout } from "@radix-ui/themes";
import { PlusIcon, TrashIcon, EyeOpenIcon, EyeClosedIcon } from "@radix-ui/react-icons";
import { ReadEnvFile, WriteEnvFile } from "../../wailsjs/go/main/App";

/** A key-value pair as represented in the editor */
interface EnvEntry {
  key: string;
  value: string;
}

/** Props for the EnvEditor component */
interface EnvEditorProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Called when the dialog is dismissed */
  onClose: () => void;
  /** Collection name shown in the dialog title */
  collectionName: string;
  /** Absolute path to the collection root folder */
  collectionPath: string;
}

/** Keys whose values are masked by default for security */
const SENSITIVE_KEY_PATTERN = /key|token|secret|password|pass|auth|credential|private/i;

/**
 * Per-collection environment variable editor.
 * Variables defined here are interpolated as {{KEY}} in URL, headers, query, and body
 * at request time by the Go backend. Values are persisted in <collectionPath>/.postier.env.
 */
export function EnvEditor({ isOpen, onClose, collectionName, collectionPath }: EnvEditorProps) {
  const [entries, setEntries] = useState<EnvEntry[]>([]);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  // Load env vars from disk whenever the dialog opens
  useEffect(() => {
    if (!isOpen) return;
    setRevealed(new Set());
    ReadEnvFile(collectionPath)
      .then(vars => {
        setEntries(Object.entries(vars).map(([key, value]) => ({ key, value })));
      })
      .catch(() => setEntries([]));
  }, [isOpen, collectionPath]);

  const addEntry = () => {
    setEntries(prev => [...prev, { key: '', value: '' }]);
  };

  const removeEntry = (index: number) => {
    setEntries(prev => prev.filter((_, i) => i !== index));
    setRevealed(prev => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const updateEntry = (index: number, field: 'key' | 'value', val: string) => {
    setEntries(prev => prev.map((e, i) => i === index ? { ...e, [field]: val } : e));
  };

  const toggleReveal = (index: number) => {
    setRevealed(prev => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const vars: Record<string, string> = {};
      for (const { key, value } of entries) {
        if (key.trim()) vars[key.trim()] = value;
      }
      await WriteEnvFile(collectionPath, vars);
      onClose();
    } catch (error) {
      console.error('Failed to save env file:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <Dialog.Content style={{ maxWidth: 560 }}>
        <Dialog.Title>Environment — {collectionName}</Dialog.Title>
        <Dialog.Description size="2">
          Use <Text weight="bold" style={{ fontFamily: '"Noto Sans Mono", monospace' }}>{"{{KEY}}"}</Text> in
          any URL, header, query param, or body to inject the variable at send time.
        </Dialog.Description>

        <Callout.Root color="orange" mt="3" mb="3" size="1">
          <Callout.Text>
            Variables are stored in <Text weight="bold" style={{ fontFamily: '"Noto Sans Mono", monospace' }}>.postier.env</Text> inside
            your collection folder. Add it to <Text weight="bold" style={{ fontFamily: '"Noto Sans Mono", monospace' }}>.gitignore</Text> to
            keep secrets out of version control.
          </Callout.Text>
        </Callout.Root>

        <Box mb="2">
          <Flex gap="2" mb="1">
            <Text size="1" weight="medium" style={{ flex: 1 }}>Key</Text>
            <Text size="1" weight="medium" style={{ flex: 1 }}>Value</Text>
            <Box style={{ width: '56px' }} />
          </Flex>

          <Flex direction="column" gap="2">
            {entries.map((entry, index) => {
              const isSensitive = SENSITIVE_KEY_PATTERN.test(entry.key);
              const isHidden = isSensitive && !revealed.has(index);
              return (
                <Flex key={index} gap="2" align="center">
                  <Box style={{ flex: 1 }}>
                    <TextField.Root
                      value={entry.key}
                      placeholder="VARIABLE_NAME"
                      onChange={e => updateEntry(index, 'key', e.target.value)}
                      style={{ fontFamily: '"Noto Sans Mono", monospace' }}
                    />
                  </Box>
                  <Box style={{ flex: 1 }}>
                    <TextField.Root
                      value={entry.value}
                      type={isHidden ? 'password' : 'text'}
                      placeholder="value"
                      onChange={e => updateEntry(index, 'value', e.target.value)}
                      style={{ fontFamily: '"Noto Sans Mono", monospace' }}
                    />
                  </Box>
                  <Flex gap="1">
                    {isSensitive && (
                      <IconButton size="1" variant="ghost" onClick={() => toggleReveal(index)} title={isHidden ? 'Show value' : 'Hide value'}>
                        {isHidden ? <EyeOpenIcon /> : <EyeClosedIcon />}
                      </IconButton>
                    )}
                    <IconButton size="1" variant="ghost" color="red" onClick={() => removeEntry(index)}>
                      <TrashIcon />
                    </IconButton>
                  </Flex>
                </Flex>
              );
            })}
          </Flex>
        </Box>

        <Button size="1" variant="soft" onClick={addEntry}>
          <PlusIcon /> Add variable
        </Button>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">Cancel</Button>
          </Dialog.Close>
          <Button variant="solid" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
