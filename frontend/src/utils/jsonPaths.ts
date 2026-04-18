export interface FileEntry {
    name: string;
    path: string;
    /** Relative directory from the collection root. Empty string when the file sits at the root. */
    parentDir: string;
}

/**
 * Recursively generate all leaf paths from a decoded JSON value.
 * e.g. {a:{b:1}, c:[2]} → ["body.a.b", "body.c[0]"]
 */
export function generateJsonPaths(jsonData: unknown, currentPrefix = 'body', currentDepth = 0): string[] {
    if (currentDepth > 4 || jsonData === null || jsonData === undefined) return [currentPrefix];
    if (Array.isArray(jsonData)) {
        if (jsonData.length === 0) return [currentPrefix];
        return [currentPrefix, ...generateJsonPaths(jsonData[0], `${currentPrefix}[0]`, currentDepth + 1)];
    }
    if (typeof jsonData === 'object') {
        return Object.keys(jsonData as object).flatMap(propertyKey =>
            generateJsonPaths((jsonData as any)[propertyKey], `${currentPrefix}.${propertyKey}`, currentDepth + 1)
        );
    }
    return [currentPrefix];
}
