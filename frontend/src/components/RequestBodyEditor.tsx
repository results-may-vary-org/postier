import React, { useLayoutEffect, useRef, useEffect } from "react";
import { Box, Text } from "@radix-ui/themes";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, keymap, highlightActiveLine, drawSelection, dropCursor, highlightSpecialChars } from "@codemirror/view";
import { defaultHighlightStyle, syntaxHighlighting, indentOnInput, bracketMatching } from "@codemirror/language";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { closeBrackets, closeBracketsKeymap, autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { json } from "@codemirror/lang-json";
import { xml } from "@codemirror/lang-xml";
import { useTheme } from "next-themes";
import { postierLight } from "../codeThemes/light";
import { postierDark } from "../codeThemes/dark";
import { BodyType } from "../types/common";

/**
 * Props for the RequestBodyEditor component.
 */
interface RequestBodyEditorProps {
  /** Current text content of the request body */
  content: string;
  /** Called whenever the user edits the body content */
  onChange: (content: string) => void;
  /** The selected body type — drives which language mode is active */
  bodyType: BodyType;
  /** Height of the editor container (default: "200px") */
  height?: string;
}

/**
 * Returns the appropriate CodeMirror language extension array for the given body type.
 * @param bodyType - The currently selected request body type.
 * @returns An array of CodeMirror extensions for language support.
 */
function getLanguageExtension(bodyType: BodyType) {
  switch (bodyType) {
    case 'json':
      return [json()];
    case 'xml':
      return [xml()];
    case 'text':
    case 'sparql':
    case 'none':
    default:
      return [];
  }
}

/**
 * A CodeMirror 6 editor for composing HTTP request bodies.
 * Supports JSON and XML syntax highlighting, auto-completion, bracket matching,
 * and adapts to the current app theme (light/dark).
 */
export function RequestBodyEditor({
  content,
  onChange,
  bodyType,
  height = '200px',
}: RequestBodyEditorProps) {
  const { resolvedTheme } = useTheme();
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);

  // Compartments allow dynamic reconfiguration without recreating the editor
  const themeConfigRef = useRef(new Compartment());
  const langConfigRef = useRef(new Compartment());
  const editableConfigRef = useRef(new Compartment());

  // Create the editor once on mount; destroy on unmount
  useLayoutEffect(() => {
    if (!editorRef.current) return;

    const initialTheme = resolvedTheme === 'dark' ? postierDark : postierLight;

    const startState = EditorState.create({
      doc: content,
      extensions: [
        history(),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...completionKeymap,
          indentWithTab,
        ]),
        highlightSpecialChars(),
        drawSelection(),
        dropCursor(),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        highlightActiveLine(),
        EditorView.lineWrapping,
        themeConfigRef.current.of([initialTheme]),
        langConfigRef.current.of(getLanguageExtension(bodyType)),
        editableConfigRef.current.of(EditorView.editable.of(bodyType !== 'none')),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
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

  // Reconfigure language and editability when bodyType changes
  useEffect(() => {
    const view = editorViewRef.current;
    if (!view) return;

    view.dispatch({
      effects: [
        langConfigRef.current.reconfigure(getLanguageExtension(bodyType)),
        editableConfigRef.current.reconfigure(EditorView.editable.of(bodyType !== 'none')),
      ],
    });

    // Clear editor content when body type is 'none'
    if (bodyType === 'none') {
      const currentLength = view.state.doc.length;
      if (currentLength > 0) {
        view.dispatch({
          changes: { from: 0, to: currentLength, insert: '' },
        });
      }
    }
  }, [bodyType]);

  // Sync external content changes into the editor without overwriting concurrent edits
  useEffect(() => {
    const view = editorViewRef.current;
    if (!view) return;

    const currentDoc = view.state.doc.toString();
    if (currentDoc !== content) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content },
      });
    }
  }, [content]);

  // Reconfigure theme when resolved theme changes
  useEffect(() => {
    const view = editorViewRef.current;
    if (!view) return;

    const theme = resolvedTheme === 'dark' ? postierDark : postierLight;
    view.dispatch({
      effects: themeConfigRef.current.reconfigure([theme]),
    });
  }, [resolvedTheme]);

  // The editor container is always mounted so the CodeMirror instance stays
  // alive for compartment-based reconfiguration. When bodyType is 'none' we
  // layer a "No body" overlay on top and disable editing via the compartment.
  return (
    <Box
      style={{
        height,
        position: 'relative',
        border: '1px solid var(--gray-6)',
        borderRadius: '4px',
        overflowY: 'auto',
      }}
    >
      <div ref={editorRef} />

      {bodyType === 'none' && (
        <Box
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-panel)',
            borderRadius: '4px',
          }}
        >
          <Text size="1" color="gray">No body</Text>
        </Box>
      )}
    </Box>
  );
}
