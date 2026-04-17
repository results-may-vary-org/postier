import React, { useState, useRef, useEffect } from "react";
import { TextField, Box, Text } from "@radix-ui/themes";
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
 */
export function InterpolationField({ value, onChange, placeholder, collectionFiles }: InterpolationFieldProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [triggerStart, setTriggerStart] = useState(-1);
    const [phase, setPhase] = useState<1 | 2>(1);
    const [chosenFile, setChosenFile] = useState('');
    const pathCacheRef = useRef<Map<string, string[]>>(new Map());

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
        const paths: string[] = ['status'];
        Object.keys(req.response?.headers ?? {}).forEach(h => {
            paths.push(`headers.${h}[0]`);
        });
        if (req.response?.body) {
            try {
                paths.push(...generateJsonPaths(JSON.parse(req.response.body)));
            } catch { /* not JSON, skip */ }
        }
        pathCacheRef.current.set(filePath, paths);
        return paths;
    };

    const computeSuggestions = async (text: string, cursorPos: number) => {
        const trigger = findTrigger(text, cursorPos);
        if (!trigger) { setIsOpen(false); return; }

        setTriggerStart(trigger.start);
        const typed = trigger.typed;
        const pipeIdx = typed.indexOf('|');

        if (pipeIdx < 0) {
            // Phase 1: filename completion
            setPhase(1);
            const prefix = typed;
            const matches = collectionFiles
                .filter(f => f.name.toLowerCase().startsWith(prefix.toLowerCase()))
                .map(f => f.name);
            setSuggestions(matches);
            setSelectedIndex(0);
            setIsOpen(matches.length > 0);
        } else {
            // Phase 2: path completion
            setPhase(2);
            const filename = typed.slice(0, pipeIdx);
            const partialPath = typed.slice(pipeIdx + 1);
            const file = collectionFiles.find(f => f.name === filename);
            if (!file) { setIsOpen(false); return; }
            setChosenFile(filename);

            const allPaths = await buildPathSuggestions(file.path);
            const matches = allPaths.filter(p => p.startsWith(partialPath));
            setSuggestions(matches);
            setSelectedIndex(0);
            setIsOpen(matches.length > 0);
        }
    };

    const acceptSuggestion = async (suggestion: string) => {
        if (!inputRef.current) return;
        const cursor = inputRef.current.selectionStart ?? value.length;

        if (phase === 1) {
            // Replace from {{@ to cursor with {{@filename|
            const newValue = value.slice(0, triggerStart) + '{{@' + suggestion + '|' + value.slice(cursor);
            onChange(newValue);
            setIsOpen(false);

            // Immediately enter phase 2 if the file has a saved response
            const file = collectionFiles.find(f => f.name === suggestion);
            if (file) {
                const newCursor = triggerStart + 3 + suggestion.length + 1;
                setChosenFile(suggestion);
                setPhase(2);
                setTriggerStart(triggerStart);
                const allPaths = await buildPathSuggestions(file.path);
                setSuggestions(allPaths);
                setSelectedIndex(0);
                setIsOpen(allPaths.length > 0);
                // Move cursor after the pipe
                requestAnimationFrame(() => {
                    inputRef.current?.setSelectionRange(newCursor, newCursor);
                });
            }
        } else {
            // Replace from {{@ to cursor with {{@filename|path}}
            const newValue = value.slice(0, triggerStart) + '{{@' + chosenFile + '|' + suggestion + '}}' + value.slice(cursor);
            onChange(newValue);
            setIsOpen(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
        computeSuggestions(e.target.value, e.target.selectionStart ?? e.target.value.length);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Tab' || e.key === 'Enter') {
            if (suggestions[selectedIndex]) {
                e.preventDefault();
                acceptSuggestion(suggestions[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <Box style={{ position: 'relative', width: '100%' }}>
            <TextField.Root
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
            />
            {isOpen && suggestions.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    background: 'var(--color-panel-solid)',
                    border: '1px solid var(--gray-6)',
                    borderRadius: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    marginTop: '2px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}>
                    {suggestions.map((s, i) => (
                        <div
                            key={s}
                            onMouseDown={(e) => { e.preventDefault(); acceptSuggestion(s); }}
                            style={{
                                padding: '4px 8px',
                                cursor: 'pointer',
                                background: i === selectedIndex ? 'var(--accent-3)' : 'transparent',
                                fontSize: '12px',
                                fontFamily: 'monospace',
                            }}
                        >
                            <Text size="1">{s}</Text>
                        </div>
                    ))}
                </div>
            )}
        </Box>
    );
}
