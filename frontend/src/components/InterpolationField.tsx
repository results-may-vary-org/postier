import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { TextField, Box, Text, Theme } from "@radix-ui/themes";
import { LoadPostierRequest } from "../../wailsjs/go/main/App";
import { FileEntry, generateJsonPaths } from "../utils/jsonPaths";

interface InterpolationFieldProps {
    value: string;
    onChange: (newValue: string) => void;
    placeholder?: string;
    collectionFiles: FileEntry[];
}

/**
 * A drop-in TextField.Root replacement that provides autocomplete for
 * {{@filename|path}} chain reference syntax.
 *
 * Focus model
 * ───────────
 * • While the dropdown is closed the native <input> owns focus.
 * • When the dropdown opens it receives focus (tabIndex -1) so that
 *   ArrowUp / ArrowDown / Enter / Escape all fire on it without any
 *   browser-default scrolling or form submission.
 * • On close (selection, Escape, outside click) focus returns to the input.
 * • Any printable character typed while the dropdown is focused is forwarded
 *   into the input so the user can keep narrowing the list without leaving
 *   the keyboard flow.
 *
 * CSS variable scope
 * ──────────────────
 * • The portal is wrapped with <Theme asChild> (same technique used by Radix's
 *   own Popover source) so all --accent-* / --gray-* / --color-* variables
 *   resolve correctly even though the div lives outside .radix-themes in the DOM.
 */
export function InterpolationField({ value, onChange, placeholder, collectionFiles }: InterpolationFieldProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [triggerStart, setTriggerStart] = useState(-1);
    const [phase, setPhase] = useState<1 | 2>(1);
    const [chosenFile, setChosenFile] = useState('');
    const pathCacheRef = useRef<Map<string, string[]>>(new Map());

    // ── Focus management ──────────────────────────────────────────────────────

    useEffect(() => {
        if (isOpen && dropdownRef.current) {
            dropdownRef.current.focus();
        }
    }, [isOpen]);

    const closeDropdown = () => {
        setIsOpen(false);
        requestAnimationFrame(() => inputRef.current?.focus());
    };

    // ── Trigger detection ─────────────────────────────────────────────────────

    const findTrigger = (text: string, cursorPos: number): { start: number; typed: string } | null => {
        const before = text.slice(0, cursorPos);
        const lastOpen = before.lastIndexOf('{{@');
        if (lastOpen < 0) return null;
        const afterTrigger = before.slice(lastOpen + 3);
        if (afterTrigger.includes('}}')) return null;
        return { start: lastOpen, typed: afterTrigger };
    };

    const buildPathSuggestions = async (filePath: string): Promise<string[]> => {
        const cached = pathCacheRef.current.get(filePath);
        if (cached) return cached;

        const req = await LoadPostierRequest(filePath);
        const paths: string[] = [];
        if (req.response?.body) {
            try {
                paths.push(...generateJsonPaths(JSON.parse(req.response.body)));
            } catch { /* not JSON, skip */ }
        }
        paths.push('status');
        Object.keys(req.response?.headers ?? {}).forEach(h => {
            paths.push(`headers.${h}[0]`);
        });
        pathCacheRef.current.set(filePath, paths);
        return paths;
    };

    const openDropdown = (matchList: string[]) => {
        if (!inputRef.current) return;
        const r = inputRef.current.getBoundingClientRect();
        setDropdownRect({ top: r.bottom + window.scrollY, left: r.left + window.scrollX, width: r.width });
        setSuggestions(matchList);
        setSelectedIndex(0);
        setIsOpen(true);
    };

    const computeSuggestions = async (text: string, cursorPos: number) => {
        const trigger = findTrigger(text, cursorPos);
        if (!trigger) { setIsOpen(false); return; }

        setTriggerStart(trigger.start);
        const typed = trigger.typed;
        const pipeIdx = typed.indexOf('|');

        if (pipeIdx < 0) {
            setPhase(1);
            const matches = collectionFiles
                .filter(f => f.name.toLowerCase().startsWith(typed.toLowerCase()))
                .map(f => f.name);
            if (matches.length > 0) openDropdown(matches);
            else setIsOpen(false);
        } else {
            setPhase(2);
            const filename = typed.slice(0, pipeIdx);
            const partialPath = typed.slice(pipeIdx + 1);
            const file = collectionFiles.find(f => f.name === filename);
            if (!file) { setIsOpen(false); return; }
            setChosenFile(filename);

            const allPaths = await buildPathSuggestions(file.path);
            const matches = allPaths.filter(p => p.startsWith(partialPath));
            if (matches.length > 0) openDropdown(matches);
            else setIsOpen(false);
        }
    };

    // ── Accept ────────────────────────────────────────────────────────────────

    const acceptSuggestion = async (suggestion: string) => {
        if (!inputRef.current) return;
        const cursor = inputRef.current.selectionStart ?? value.length;

        if (phase === 1) {
            const newValue = value.slice(0, triggerStart) + '{{@' + suggestion + '|' + value.slice(cursor);
            onChange(newValue);
            closeDropdown();

            const file = collectionFiles.find(f => f.name === suggestion);
            if (file) {
                const newCursor = triggerStart + 3 + suggestion.length + 1;
                setChosenFile(suggestion);
                setPhase(2);
                setTriggerStart(triggerStart);
                const allPaths = await buildPathSuggestions(file.path);
                if (allPaths.length > 0) openDropdown(allPaths);
                requestAnimationFrame(() => {
                    inputRef.current?.setSelectionRange(newCursor, newCursor);
                });
            }
        } else {
            const after = value.slice(cursor, cursor + 2);
            const suffix = after === '}}' ? '' : '}}';
            const newValue = value.slice(0, triggerStart) + '{{@' + chosenFile + '|' + suggestion + suffix + value.slice(cursor);
            onChange(newValue);
            closeDropdown();
        }
    };

    // ── Scroll selected item into view ────────────────────────────────────────

    useEffect(() => {
        itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex]);

    // ── Keyboard handlers ─────────────────────────────────────────────────────

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
        computeSuggestions(e.target.value, e.target.selectionStart ?? e.target.value.length);
    };

    const handleDropdownKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            if (suggestions[selectedIndex]) acceptSuggestion(suggestions[selectedIndex]);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeDropdown();
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            // Printable character — forward to input so the user can keep typing
            e.preventDefault();
            const input = inputRef.current;
            if (!input) return;
            const start = input.selectionStart ?? value.length;
            const end = input.selectionEnd ?? value.length;
            const newValue = value.slice(0, start) + e.key + value.slice(end);
            onChange(newValue);
            const newCursor = start + 1;
            input.focus();
            requestAnimationFrame(() => {
                input.setSelectionRange(newCursor, newCursor);
                computeSuggestions(newValue, newCursor);
            });
        } else if (e.key === 'Backspace') {
            e.preventDefault();
            const input = inputRef.current;
            if (!input) return;
            const start = input.selectionStart ?? value.length;
            const end = input.selectionEnd ?? value.length;
            let newValue: string;
            let newCursor: number;
            if (start !== end) {
                newValue = value.slice(0, start) + value.slice(end);
                newCursor = start;
            } else if (start > 0) {
                newValue = value.slice(0, start - 1) + value.slice(start);
                newCursor = start - 1;
            } else {
                return;
            }
            onChange(newValue);
            input.focus();
            requestAnimationFrame(() => {
                input.setSelectionRange(newCursor, newCursor);
                computeSuggestions(newValue, newCursor);
            });
        }
    };

    // ── Click-outside ─────────────────────────────────────────────────────────

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                inputRef.current && !inputRef.current.contains(e.target as Node) &&
                dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Render ────────────────────────────────────────────────────────────────

    const dropdown = isOpen && suggestions.length > 0 && dropdownRect
        ? ReactDOM.createPortal(
            // <Theme asChild> is the same technique Radix's own Popover uses to
            // inject the theme CSS-variable scope into a portal that lives outside
            // the .radix-themes element in the DOM tree.
            <Theme asChild>
                <div
                    ref={dropdownRef}
                    tabIndex={-1}
                    onKeyDown={handleDropdownKeyDown}
                    style={{
                        position: 'fixed',
                        top: dropdownRect.top + 4,
                        left: dropdownRect.left,
                        width: dropdownRect.width,
                        zIndex: 9999,
                        // Radix panel appearance
                        background: 'var(--color-panel-solid)',
                        border: '1px solid var(--gray-a6)',
                        borderRadius: 'var(--radius-3)',
                        boxShadow: '0 4px 16px var(--black-a3), 0 1px 3px var(--black-a2)',
                        padding: 'var(--space-1)',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        outline: 'none',
                    }}
                >
                    {suggestions.map((s, i) => (
                        <div
                            key={s}
                            ref={el => { itemRefs.current[i] = el; }}
                            onMouseDown={e => { e.preventDefault(); acceptSuggestion(s); }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0 var(--space-2)',
                                height: 'var(--space-6)',
                                borderRadius: 'var(--radius-2)',
                                cursor: 'default',
                                userSelect: 'none',
                                background: i === selectedIndex ? 'var(--accent-9)' : 'transparent',
                                color: i === selectedIndex ? 'var(--accent-contrast)' : 'var(--gray-12)',
                            }}
                        >
                            <Text size="1" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0' }}>{s}</Text>
                        </div>
                    ))}
                </div>
            </Theme>,
            document.body
        )
        : null;

    return (
        <Box style={{ width: '100%' }}>
            <TextField.Root
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={handleChange}
            />
            {dropdown}
        </Box>
    );
}
