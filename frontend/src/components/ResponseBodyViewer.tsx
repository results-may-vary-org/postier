import React, { useLayoutEffect, useRef, useEffect, useState } from "react";
import { Box, Dialog, Flex, Button, ScrollArea, Text } from "@radix-ui/themes";
import { CheckIcon, CopyIcon } from "@radix-ui/react-icons";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, keymap, drawSelection, highlightSpecialChars } from "@codemirror/view";
import { defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { defaultKeymap } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { json } from "@codemirror/lang-json";
import { useTheme } from "next-themes";
import { postierLight } from "../codeThemes/light";
import { postierDark } from "../codeThemes/dark";
import { generateJsonPaths } from "../utils/jsonPaths";

/**
 * Props for the ResponseBodyViewer component.
 */
interface ResponseBodyViewerProps {
  /** Raw response body string */
  body: string;
  /** Response headers used to auto-detect content type */
  headers: Record<string, string[]> | null;
  /** Optional ref forwarded to the outer container for height management */
  viewerRef?: React.Ref<HTMLDivElement>;
  /** Path of the currently open .postier file — used for copy-as-reference */
  currentFilePath?: string;
}

/**
 * Returns the display content based on the current view mode.
 * In 'json' mode, attempts to pretty-print the body; falls back to raw on failure.
 * @param body - The raw response body string.
 * @param mode - Either 'raw' or 'json'.
 * @returns The formatted string to display in the editor.
 */
function getDisplayContent(body: string, mode: 'raw' | 'json'): string {
  if (mode === 'json') {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }
  return body;
}

/**
 * A read-only CodeMirror 6 viewer for HTTP response bodies.
 * Automatically detects JSON content type from headers and offers a raw/JSON toggle.
 * Supports theme switching (light/dark) and text search.
 */
export function ResponseBodyViewer({ body, headers, viewerRef, currentFilePath }: ResponseBodyViewerProps) {
  const { resolvedTheme } = useTheme();
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);

  const themeConfigRef = useRef(new Compartment());
  const langConfigRef = useRef(new Compartment());

  const [viewMode, setViewMode] = useState<'raw' | 'json'>('raw');

  // Auto-detect content type from response headers
  useEffect(() => {
    if (!headers) {
      setViewMode('raw');
      return;
    }

    const isJson = Object.entries(headers).some(([key, values]) => {
      return key.toLowerCase().includes('content-type') && values.join('').includes('application/json');
    });

    setViewMode(isJson ? 'json' : 'raw');
  }, [headers]);

  // Create editor once on mount; destroy on unmount.
  // Always start with empty raw content — the update useEffect that runs
  // immediately after will set the real content and language, avoiding a
  // stale-closure race with viewMode auto-detection from headers.
  useLayoutEffect(() => {
    if (!editorRef.current) return;

    const initialTheme = resolvedTheme === 'dark' ? postierDark : postierLight;

    const startState = EditorState.create({
      doc: '',
      extensions: [
        highlightSpecialChars(),
        drawSelection(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        keymap.of([...defaultKeymap, ...searchKeymap]),
        highlightSelectionMatches(),
        EditorView.lineWrapping,
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        themeConfigRef.current.of([initialTheme]),
        langConfigRef.current.of([]),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    editorViewRef.current = view;

    return () => {
      view.destroy();
      editorViewRef.current = null;
    };
    // Intentionally empty deps: editor is created once and never re-created
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update editor content and language when body or view mode changes
  useEffect(() => {
    const view = editorViewRef.current;
    if (!view) return;

    const displayContent = getDisplayContent(body, viewMode);

    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: displayContent },
      effects: langConfigRef.current.reconfigure(viewMode === 'json' ? [json()] : []),
    });
  }, [body, viewMode]);

  // Reconfigure theme when resolved theme changes
  useEffect(() => {
    const view = editorViewRef.current;
    if (!view) return;

    const theme = resolvedTheme === 'dark' ? postierDark : postierLight;
    view.dispatch({
      effects: themeConfigRef.current.reconfigure([theme]),
    });
  }, [resolvedTheme]);

  // Compute paths here so the toolbar can conditionally show the button
  const jsonPaths = (() => {
    try { return generateJsonPaths(JSON.parse(body)); } catch { return []; }
  })();

  return (
    <Box ref={viewerRef} style={{ display: 'flex', flexDirection: 'column' }}>
      <Flex gap="1" mb="1" align="center">
        <Button
          size="1"
          variant={viewMode === 'raw' ? 'solid' : 'soft'}
          onClick={() => setViewMode('raw')}
        >
          Raw
        </Button>
        <Button
          size="1"
          variant={viewMode === 'json' ? 'solid' : 'soft'}
          onClick={() => setViewMode('json')}
        >
          JSON
        </Button>
        {jsonPaths.length > 0 && (
          <JsonPathExplorer paths={jsonPaths} currentFilePath={currentFilePath} />
        )}
      </Flex>
      <Box
        style={{
          border: '1px solid var(--gray-6)',
          borderRadius: '4px',
          overflowY: 'auto',
          flex: 1,
        }}
      >
        <div ref={editorRef} style={{ flex: 1, overflowY: 'auto' }} />
      </Box>
    </Box>
  );
}

// ── JsonPathExplorer ──────────────────────────────────────────────────────────

interface JsonPathExplorerProps {
    paths: string[];
    currentFilePath?: string;
}

function JsonPathExplorer({ paths, currentFilePath }: JsonPathExplorerProps) {
    const [open, setOpen] = useState(false);
    const [recentlyCopiedPath, setRecentlyCopiedPath] = useState<string | null>(null);

    const currentFileName = currentFilePath
        ? currentFilePath.split('/').pop()?.replace('.postier', '') ?? ''
        : '';

    const copyPathAsReference = (jsonPath: string) => {
        const variableReference = currentFileName
            ? `{{@${currentFileName}|${jsonPath}}}`
            : jsonPath;
        navigator.clipboard.writeText(variableReference);
        setRecentlyCopiedPath(jsonPath);
        setTimeout(() => setRecentlyCopiedPath(null), 1500);
    };

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger>
                <Button size="1" variant="ghost">Explore paths</Button>
            </Dialog.Trigger>
            <Dialog.Content style={{ maxWidth: 480 }}>
                <Dialog.Title>Explore paths</Dialog.Title>
                <Dialog.Description size="2" color="gray" mb="3">
                    {currentFileName
                        ? <>Click a path to copy it as <Text style={{ fontFamily: 'var(--font-mono)' }}>{`{{@${currentFileName}|…}}`}</Text></>
                        : 'Click a path to copy it to the clipboard.'}
                </Dialog.Description>
                <ScrollArea style={{ maxHeight: '60vh' }}>
                    {paths.map(jsonPath => (
                        <Flex key={jsonPath} justify="between" align="center" px="2" py="1"
                              style={{ borderBottom: '1px solid var(--gray-a3)' }}>
                            <Text size="1" style={{ fontFamily: 'var(--font-mono)', color: 'var(--gray-11)' }}>
                                {jsonPath}
                            </Text>
                            <Button size="1" variant="ghost" onClick={() => copyPathAsReference(jsonPath)}>
                                {recentlyCopiedPath === jsonPath ? <CheckIcon /> : <CopyIcon />}
                            </Button>
                        </Flex>
                    ))}
                </ScrollArea>
            </Dialog.Content>
        </Dialog.Root>
    );
}
