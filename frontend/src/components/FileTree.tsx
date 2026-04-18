import { useState, useEffect, useRef } from "react";
import { Box, Flex, Button, IconButton, TextField, ContextMenu, Text, ScrollArea, DropdownMenu } from "@radix-ui/themes";
import { Separator } from "@radix-ui/themes/dist/esm";
import { ChevronRightIcon, PlusIcon, Cross2Icon, UpdateIcon, EnvelopeClosedIcon, HamburgerMenuIcon, MixerVerticalIcon, ExternalLinkIcon, TriangleRightIcon } from "@radix-ui/react-icons";
import { GetDirectoryTree, CreateDirectory, CreateFile, DeleteFile, DeleteDirectory, OpenFolderDialog, RenameEntry, OpenInFileManager } from "../../wailsjs/go/main/App";
import { main } from "../../wailsjs/go/models";
import { Collection } from "../types/common";
import { useCollectionStore } from "../stores/store";
import { Alert, ConfirmAlert, InfoAlert } from "./Alert";
import { AutoSaveModal } from "./AutoSaveModal";
import { EnvEditor } from "./EnvEditor";
import { CollectionExecutionModal } from "./CollectionExecutionModal";
import { useCollectionRun } from "../hooks/useCollectionRun";

type DirectoryTree = main.DirectoryTree;
type FileSystemEntry = main.FileSystemEntry;

/** Props accepted by the FileTree component */
interface FileTreeProps {
  /** Callback to toggle sidebar visibility (bound to Ctrl+N) */
  onToggleSidebar: () => void;
}

/**
 * Sidebar file-tree component that displays loaded collections and their
 * directory structure, providing file-management actions via context menus
 * and inline toolbar buttons.
 */
export function FileTree({ onToggleSidebar }: FileTreeProps) {
  const {
    collections,
    expandedNodes,
    selectedCollection,
    currentFilePath: currentFile,
    autoSave,
    showAutoSaveModal,
    setCollections,
    addCollection,
    removeCollection,
    setSelectedCollection,
    resetSelectedCollection,
    setCurrentFilePath: setCurrentFile,
    resetCurrentFilePath: resetCurrentFile,
    setExpandedNodes,
    setAutoSave,
    setShowAutoSaveModal,
  } = useCollectionStore();

  const {
    executionModal, cycleError, selfRefError, isAnalyzing, isRunning,
    analyzeAndOpen, execute, closeModal, closeCycleError, closeSelfRefError,
  } = useCollectionRun();
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ path: string; name: string; isDir: boolean; hasChildren: boolean } | null>(null);
  const [closeConfirmation, setCloseConfirmation] = useState<{ collectionId: string; collectionName: string } | null>(null);
  const [duplicateCollectionPath, setDuplicateCollectionPath] = useState<string | null>(null);
  const [errorDialog, setErrorDialog] = useState<{ title: string; message: string } | null>(null);
  const [createDialog, setCreateDialog] = useState<{ parentPath: string; isDir: boolean } | null>(null);
  const [createName, setCreateName] = useState('');
  const [renameDialog, setRenameDialog] = useState<{ path: string; isDir: boolean; displayName: string } | null>(null);
  const [renameName, setRenameName] = useState('');
  const [isLoadingCollections, setIsLoadingCollections] = useState(true);
  const [selectCollectionDialog, setSelectCollectionDialog] = useState(false);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null);
  const [envEditorCollection, setEnvEditorCollection] = useState<{ id: string; name: string; path: string } | null>(null);

  const expandedNodesSet = new Set(expandedNodes);
  const selectedCollectionId = selectedCollection;
  const currentFilePath = currentFile;

  /** Keep a ref to refreshCollections so event listeners always call the latest version */
  const refreshCollectionsRef = useRef<() => Promise<void>>(async () => {});

  // Load collections from store on component mount
  useEffect(() => {
    const loadStoredCollections = async () => {
      try {
        if (collections.length === 0) {
          setIsLoadingCollections(false);
          return;
        }

        const loadedCollections: Collection[] = [];
        const invalidCollections: string[] = [];

        for (const stored of collections) {
          try {
            const tree = await GetDirectoryTree(stored.path);
            loadedCollections.push({
              id: stored.id,
              name: stored.name,
              path: stored.path,
              tree
            });
          } catch (error) {
            console.error(`Failed to load collection "${stored.name}" from ${stored.path}:`, error);
            invalidCollections.push(stored.name);
          }
        }

        setCollections(loadedCollections);

        // Auto-expand root directories of loaded collections
        if (loadedCollections.length > 0) {
          const newNodes = [...expandedNodes];
          loadedCollections.forEach(collection => {
            if (!newNodes.includes(collection.path)) {
              newNodes.push(collection.path);
            }
          });
          setExpandedNodes(newNodes);
        }

        if (invalidCollections.length > 0) {
          setErrorDialog({
            title: 'Some collections could not be loaded',
            message: `The following collections are no longer accessible and have been removed from your workspace:\n\n${invalidCollections.join('\n')}`
          });
        }
      } catch (error) {
        console.error('Failed to load collections on startup:', error);
      } finally {
        setIsLoadingCollections(false);
      }
    };

    loadStoredCollections();
  }, []);

  // Handle default collection selection
  useEffect(() => {
    if (!isLoadingCollections && collections.length > 0) {
      if (!selectedCollectionId || !collections.find(c => c.id === selectedCollectionId)) {
        if (collections.length === 1) {
          setSelectedCollection(collections[0].id);
        } else {
          setSelectCollectionDialog(true);
        }
      }
    }
  }, [collections, selectedCollectionId, isLoadingCollections]);

  /** Refresh a single collection by re-fetching its directory tree from disk */
  const refreshCollection = async (collectionId: string) => {
    const collection = collections.find(c => c.id === collectionId);
    if (!collection) return;

    try {
      const updatedTree = await GetDirectoryTree(collection.path);
      setCollections(collections.map(c =>
        c.id === collectionId ? { ...c, tree: updatedTree } : c
      ));
    } catch (error) {
      console.error('Failed to refresh collection:', error);
    }
  };

  /** Refresh all loaded collections in parallel, applying changes in a single update */
  const refreshCollections = async () => {
    const updated = await Promise.all(
      collections.map(async c => {
        try {
          const tree = await GetDirectoryTree(c.path);
          return { ...c, tree };
        } catch (error) {
          console.error(`Failed to refresh collection "${c.name}":`, error);
          return c;
        }
      })
    );
    setCollections(updated);
  };

  // Keep ref up to date so event listener uses latest version
  useEffect(() => {
    refreshCollectionsRef.current = refreshCollections;
  });

  // Listen for collection refresh events dispatched by HttpClient (e.g. after auto-save creates a file)
  useEffect(() => {
    const handleCollectionRefresh = () => {
      refreshCollectionsRef.current();
    };
    window.addEventListener('postier-collection-refresh', handleCollectionRefresh);
    return () => window.removeEventListener('postier-collection-refresh', handleCollectionRefresh);
  }, []);

  /** Open a folder-picker dialog and add the selected folder as a new collection */
  const loadCollection = async () => {
    try {
      const path = await OpenFolderDialog();
      if (!path) return;

      const existingCollection = collections.find(c => c.path === path);
      if (existingCollection) {
        setDuplicateCollectionPath(path);
        return;
      }

      const tree = await GetDirectoryTree(path);
      console.log(tree);
      const collection: Collection = {
        id: `collection_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        name: tree.entry.name,
        path: tree.entry.path,
        tree
      };

      addCollection(collection);

      if (!autoSave) {
        setShowAutoSaveModal(true);
      }

      if (!expandedNodes.includes(collection.path)) {
        setExpandedNodes([...expandedNodes, collection.path]);
      }

      if (!selectedCollectionId) {
        setSelectedCollection(collection.id);
      }
    } catch (error) {
      console.error('Failed to load collection:', error);
      setErrorDialog({ title: 'Failed to load collection', message: String(error) });
    }
  };

  /** Ask the user to confirm closing a collection */
  const requestCloseCollection = (collectionId: string) => {
    const collection = collections.find(c => c.id === collectionId);
    if (collection) {
      setCloseConfirmation({ collectionId, collectionName: collection.name });
    }
  };

  /** Perform the actual close after the user confirms */
  const confirmCloseCollection = () => {
    if (!closeConfirmation) return;

    const collectionToClose = collections.find(c => c.id === closeConfirmation.collectionId);

    if (currentFilePath && collectionToClose && currentFilePath.startsWith(collectionToClose.path)) {
      resetCurrentFile();
      window.dispatchEvent(new CustomEvent('postier-clear-request'));
    }

    if (selectedCollectionId === closeConfirmation.collectionId) {
      resetSelectedCollection();
    }

    if (collectionToClose) {
      removeCollection(collectionToClose);
      setExpandedNodes(expandedNodes.filter(nodePath => !nodePath.startsWith(collectionToClose.path)));
    }
    setCloseConfirmation(null);
  };

  /** Set the active collection from the selection dialog */
  const selectCollection = (collectionId: string) => {
    setSelectedCollection(collectionId);
    setSelectCollectionDialog(false);
  };

  /** Handle a click on a file node — loads it in the editor */
  const handleFileClick = (filePath: string) => {
    const ownerCollection = collections.find(c => filePath.startsWith(c.path));
    if (ownerCollection) {
      setSelectedCollection(ownerCollection.id);
    }

    if (filePath.endsWith('.postier')) {
      setCurrentFile(filePath);
      setSelectedFolderPath(filePath.substring(0, filePath.lastIndexOf('/')));
      window.dispatchEvent(new CustomEvent('postier-load-file', { detail: { filePath } }));
    }
  };

  /** Expand or collapse a directory node */
  const toggleNode = (path: string) => {
    const ownerCollection = collections.find(c => path.startsWith(c.path));
    if (ownerCollection) {
      setSelectedCollection(ownerCollection.id);
    }

    setSelectedFolderPath(path);

    const idx = expandedNodes.indexOf(path);
    if (idx > -1) {
      const next = [...expandedNodes];
      next.splice(idx, 1);
      setExpandedNodes(next);
    } else {
      setExpandedNodes([...expandedNodes, path]);
    }
  };

  /** Open the rename dialog for a file-system entry */
  const requestRename = (node: FileSystemEntry) => {
    const ownerCollection = collections.find(c => node.path.startsWith(c.path));
    if (ownerCollection) {
      setSelectedCollection(ownerCollection.id);
    }
    const baseName = node.isDir ? node.name : node.name.replace(/\.[^/.]+$/, '');
    setRenameDialog({ path: node.path, isDir: node.isDir, displayName: node.name });
    setRenameName(baseName);
  };

  /** Confirm and execute the rename operation */
  const confirmRename = async () => {
    if (!renameDialog || !renameName.trim()) {
      setRenameDialog(null);
      return;
    }

    const { path: oldPath, isDir } = renameDialog;
    const oldName = oldPath.split('/').pop() || '';
    const directory = oldPath.substring(0, oldPath.lastIndexOf('/'));
    const extension = isDir ? '' : oldName.substring(oldName.lastIndexOf('.'));
    const newName = isDir ? renameName.trim() : renameName.trim() + extension;
    const newPath = `${directory}/${newName}`;

    if (oldPath === newPath) {
      setRenameDialog(null);
      return;
    }

    // Check for name conflicts
    const parentDirNode =
      collections.find(c => c.tree.entry.path === directory)?.tree ??
      collections.flatMap(c => getAllNodes(c.tree)).find(n => n.entry.path === directory);

    if (parentDirNode?.children?.some(child => child.entry.name === newName)) {
      setErrorDialog({ title: 'Name conflict', message: 'A file or folder with this name already exists' });
      return;
    }

    try {
      await RenameEntry(oldPath, newPath);

      // Update currentFilePath if the open file was renamed or is inside a renamed directory
      if (currentFilePath === oldPath) {
        setCurrentFile(newPath);
      } else if (currentFilePath.startsWith(oldPath + '/')) {
        setCurrentFile(newPath + currentFilePath.substring(oldPath.length));
      }

      // Update expanded nodes if a directory was renamed
      if (isDir) {
        setExpandedNodes(expandedNodes.map(nodePath => {
          if (nodePath === oldPath) return newPath;
          if (nodePath.startsWith(oldPath + '/')) return newPath + nodePath.substring(oldPath.length);
          return nodePath;
        }));
      }

      await refreshCollections();

      setRenameDialog(null);
    } catch (error) {
      console.error('Failed to rename:', error);
      setErrorDialog({ title: 'Failed to rename', message: String(error) });
    }
  };

  /** Open the create dialog for a new file or directory under the given parent path */
  const requestCreateNew = (parentPath: string, isDir: boolean) => {
    const ownerCollection = collections.find(c => parentPath.startsWith(c.path));
    if (ownerCollection) {
      setSelectedCollection(ownerCollection.id);
    }

    setCreateDialog({ parentPath, isDir });
    setCreateName('');
  };

  /** Confirm and execute the file/folder creation */
  const confirmCreateNew = async () => {
    if (!createDialog || !createName.trim()) {
      setCreateDialog(null);
      return;
    }

    const { parentPath, isDir } = createDialog;
    const baseName = isDir ? createName.trim() : createName.trim().replace(/\.[^/.]+$/, '');
    const fullName = isDir ? baseName : baseName + '.postier';
    const newPath = `${parentPath}/${fullName}`;

    // Check for conflicts
    const parentNode = collections.flatMap(c => getAllNodes(c.tree))
      .find(n => n.entry.path === parentPath);

    if (parentNode?.children?.some(child => child.entry.name === fullName)) {
      setErrorDialog({ title: 'Name conflict', message: 'A file or folder with this name already exists' });
      setCreateDialog(null);
      return;
    }

    try {
      if (isDir) {
        await CreateDirectory(newPath);
      } else {
        const defaultRequest = {
          name: baseName,
          description: '',
          method: 'GET',
          url: '',
          headers: {},
          body: '',
          bodyType: 'none',
          query: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await CreateFile(newPath, JSON.stringify(defaultRequest, null, 2));
      }

      // Expand parent directory
      if (!expandedNodes.includes(parentPath)) {
        setExpandedNodes([...expandedNodes, parentPath]);
      }

      setCreateDialog(null);

      // Refresh all collections and wait so the new item appears
      await refreshCollections();

      // Auto-focus newly created file
      if (!isDir) {
        handleFileClick(newPath);
      }
    } catch (error) {
      console.error('Failed to create:', error);
      setErrorDialog({ title: 'Failed to Create', message: String(error) });
      setCreateDialog(null);
    }
  };

  /** Delete a file or folder node — always asks for confirmation first */
  const deleteNode = (path: string) => {
    const ownerCollection = collections.find(c => path.startsWith(c.path));
    if (ownerCollection) setSelectedCollection(ownerCollection.id);

    const node = collections.flatMap(c => getAllNodes(c.tree)).find(n => n.entry.path === path);
    if (!node) return;

    setDeleteConfirmation({
      path,
      name: node.entry.name,
      isDir: node.entry.isDir,
      hasChildren: (node.children?.length ?? 0) > 0,
    });
  };

  /** Confirm and execute deletion after the user approves */
  const confirmDelete = async () => {
    if (!deleteConfirmation) return;

    try {
      if (deleteConfirmation.isDir) {
        await DeleteDirectory(deleteConfirmation.path);
      } else {
        await DeleteFile(deleteConfirmation.path);
      }
      await refreshCollections();
      setDeleteConfirmation(null);
    } catch (error) {
      console.error('Failed to delete:', error);
      setErrorDialog({ title: 'Failed to Delete', message: String(error) });
      setDeleteConfirmation(null);
    }
  };

  /** Recursively collect all DirectoryTree nodes from a subtree */
  const getAllNodes = (tree: DirectoryTree): DirectoryTree[] => {
    const nodes = [tree];
    tree.children?.forEach(child => {
      nodes.push(...getAllNodes(child));
    });
    return nodes;
  };

  /** Renders the HTTP method as a small coloured monospace label.
   *  Falls back to EnvelopeClosedIcon for empty/unknown methods. */
  const MethodBadge = ({ method }: { method: string | undefined }) => {
    const methodColors: Record<string, string> = {
      GET:     'var(--green-11)',
      POST:    'var(--yellow-11)',
      PUT:     'var(--orange-11)',
      DELETE:  'var(--red-11)',
      PATCH:   'var(--blue-11)',
      HEAD:    'var(--gray-11)',
      OPTIONS: 'var(--purple-11)',
    };

    const resolvedColor = method ? (methodColors[method] ?? undefined) : undefined;

    if (!method || resolvedColor === undefined) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', minWidth: '45px' }}>
          <EnvelopeClosedIcon color="var(--gray-11)" />
        </span>
      );
    }

    return (
      <Text
        size="1"
        weight="bold"
        style={{
          fontFamily: '"Noto Sans Mono", monospace',
          color: resolvedColor,
          minWidth: '45px',
          display: 'inline-block',
        }}
      >
        {method}
      </Text>
    );
  };

  /** Recursively render a single directory-tree node and its children */
  const renderNode = (node: DirectoryTree, depth: number = 0) => {
    const isExpanded = expandedNodesSet.has(node.entry.path);
    const isActiveFile = !node.entry.isDir && currentFilePath === node.entry.path;
    const isSelectedFolder = node.entry.isDir && selectedFolderPath === node.entry.path;

    let bgColor: string | undefined;
    if (isActiveFile) bgColor = 'var(--accent-4)';
    else if (isSelectedFolder) bgColor = 'var(--accent-2)';

    return (
      <Box key={node.entry.path}>
        <ContextMenu.Root>
          <ContextMenu.Trigger>
            <Flex
              align="center"
              gap="2"
              p="1"
              style={{
                paddingLeft: `${depth * 20 + 8}px`,
                cursor: 'pointer',
                backgroundColor: bgColor,
                borderTop: `1px solid ${isActiveFile ? 'var(--accent-6)' : 'transparent'}`,
                borderBottom: `1px solid ${isActiveFile ? 'var(--accent-6)' : 'transparent'}`,
              }}
              className={bgColor ? undefined : "hover:bg-gray-100"}
              onClick={() => {
                if (node.entry.isDir) {
                  toggleNode(node.entry.path);
                } else {
                  handleFileClick(node.entry.path);
                }
              }}
            >
              {node.entry.isDir ? (
                <ChevronRightIcon
                  style={{
                    transform: isExpanded ? 'rotate(90deg)' : 'none',
                    color: isSelectedFolder ? 'var(--accent-9)' : undefined,
                  }}
                />
              ) : (
                <MethodBadge method={node.entry.method} />
              )}

              <Text
                size="2"
                weight={isActiveFile || isSelectedFolder ? 'medium' : 'regular'}
                style={{
                  color: isActiveFile
                    ? 'var(--accent-11)'
                    : isSelectedFolder
                    ? 'var(--accent-9)'
                    : undefined,
                }}
              >
                {node.entry.name.replace(".postier", "")}
              </Text>
            </Flex>
          </ContextMenu.Trigger>

          <ContextMenu.Content>
            {node.entry.isDir && (
              <>
                <ContextMenu.Item onClick={() => requestCreateNew(node.entry.path, true)}>
                  <PlusIcon /> New Folder
                </ContextMenu.Item>
                <ContextMenu.Item onClick={() => requestCreateNew(node.entry.path, false)}>
                  <PlusIcon /> New Request
                </ContextMenu.Item>
                <ContextMenu.Separator />
              </>
            )}
            <ContextMenu.Item onClick={() => requestRename(node.entry)}>
              Rename
            </ContextMenu.Item>
            <ContextMenu.Item onClick={() => OpenInFileManager(node.entry.path)}>
              <ExternalLinkIcon /> Open in file manager
            </ContextMenu.Item>
            <ContextMenu.Separator />
            <ContextMenu.Item onClick={() => deleteNode(node.entry.path)} color="red">
              Delete
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Root>

        {node.entry.isDir && isExpanded && (
          <Box>
            {(node.children ?? []).map(child => renderNode(child, depth + 1))}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Flex direction="row" height="100%">
      <Box height="100%" width="100%">
        <Flex direction="column" height="100%">
          {/* Toolbar: sidebar toggle, load collection, refresh */}
          <Flex justify="start" align="center" p="2" gap="2">
            <IconButton size="1" variant="ghost" onClick={onToggleSidebar} title="Toggle sidebar (Ctrl+N)">
              <HamburgerMenuIcon />
            </IconButton>
            <Button size="1" onClick={loadCollection}>
              <PlusIcon /> Load
            </Button>
            <Button size="1" variant="soft" onClick={refreshCollections}>
              <UpdateIcon /> Refresh
            </Button>
          </Flex>

          <ScrollArea style={{ flex: 1 }}>
            {collections.map(collection => (
              <Box key={collection.id} mb="2">
                {/* collection header */}
                <Flex
                  justify="between"
                  align="center"
                  p="2"
                  style={{
                    backgroundColor: selectedCollectionId === collection.id ? 'var(--accent-2)' : 'var(--accent-2)',
                    border: selectedCollectionId === collection.id ? '1px solid var(--accent-3)' : '1px solid transparent',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  {/* Left: chevron + name — toggles expand and selects collection */}
                  <Flex
                    align="center"
                    gap="1"
                    style={{ flex: 1, minWidth: 0 }}
                    onClick={() => toggleNode(collection.path)}
                  >
                    <ChevronRightIcon
                      style={{
                        transform: expandedNodesSet.has(collection.path) ? 'rotate(90deg)' : 'none',
                        flexShrink: 0,
                        color: selectedCollectionId === collection.id ? 'var(--accent-9)' : undefined,
                      }}
                    />
                    <Text
                      weight="medium"
                      style={{
                        color: selectedCollectionId === collection.id ? 'var(--accent-11)' : 'inherit',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {collection.name}
                    </Text>
                  </Flex>

                  {/* Right: action buttons — stop propagation so they don't toggle expand */}
                  <Flex
                    gap="2"
                    align="center"
                    onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  >
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger>
                        <IconButton size="1" variant="ghost" title="New folder or request">
                          <PlusIcon />
                        </IconButton>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content>
                        <DropdownMenu.Item onClick={() => requestCreateNew(collection.path, true)}>
                          <PlusIcon /> New Folder
                        </DropdownMenu.Item>
                        <DropdownMenu.Item onClick={() => requestCreateNew(collection.path, false)}>
                          <PlusIcon /> New Request
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Root>

                    <IconButton
                      size="1"
                      variant="ghost"
                      title="Run all requests in order"
                      disabled={isAnalyzing || isRunning}
                      onClick={() => analyzeAndOpen(collection)}
                    >
                      <TriangleRightIcon />
                    </IconButton>

                    <IconButton size="1" variant="ghost" title="Edit environment variables" onClick={() => setEnvEditorCollection({ id: collection.id, name: collection.name, path: collection.path })}>
                      <MixerVerticalIcon />
                    </IconButton>

                    <IconButton size="1" variant="ghost" onClick={() => requestCloseCollection(collection.id)}>
                      <Cross2Icon />
                    </IconButton>
                  </Flex>
                </Flex>

                {/* Children — only shown when collection root is expanded */}
                {expandedNodesSet.has(collection.path) && (
                  <Box>
                    {(collection.tree.children ?? []).map(child => renderNode(child, 0))}
                  </Box>
                )}
              </Box>
            ))}

            {collections.length === 0 && !isLoadingCollections && (
              <Box p="4" style={{ textAlign: 'center' }}>
                <Text size="2" color="gray">
                  No collections loaded. Click "Load" to open a folder.
                </Text>
              </Box>
            )}

            {isLoadingCollections && (
              <Box p="4" style={{ textAlign: 'center' }}>
                <Text size="2" color="gray">
                  Loading collections...
                </Text>
              </Box>
            )}
          </ScrollArea>
        </Flex>
      </Box>

      <Box height="100%" width="1px">
        <Separator orientation="vertical" style={{ width: "100%", height: "100%" }}/>
      </Box>

      <ConfirmAlert
        isOpen={!!deleteConfirmation}
        onClose={() => setDeleteConfirmation(null)}
        title={`Delete ${deleteConfirmation?.isDir ? 'Folder' : 'Request'}`}
        description={
          deleteConfirmation?.hasChildren
            ? `"${deleteConfirmation.name}" contains files or subfolders. Deleting it will permanently remove all contents. This cannot be undone.`
            : `Are you sure you want to permanently delete "${deleteConfirmation?.name.replace('.postier', '')}"? This cannot be undone.`
        }
        onConfirm={confirmDelete}
        confirmLabel="Delete"
        confirmColor="red"
      />

      <ConfirmAlert
        isOpen={!!closeConfirmation}
        onClose={() => setCloseConfirmation(null)}
        title="Close Collection"
        description={`Are you sure you want to close the collection "${closeConfirmation?.collectionName}"? Any unsaved changes may be lost.`}
        onConfirm={confirmCloseCollection}
        confirmLabel="Close Collection"
        confirmColor="red"
      />

      <InfoAlert
        isOpen={!!duplicateCollectionPath}
        onClose={() => setDuplicateCollectionPath(null)}
        title="Collection Already Open"
        description="This collection is already open in the workspace. Please close it first if you want to reload it."
      />

      <InfoAlert
        isOpen={!!errorDialog}
        onClose={() => setErrorDialog(null)}
        title={errorDialog?.title || ""}
        description={errorDialog?.message || ""}
      />

      {/* Create new file/folder dialog */}
      <Alert
        isOpen={!!createDialog}
        onClose={() => setCreateDialog(null)}
        title={`Create New ${createDialog?.isDir ? 'Folder' : 'Request'}`}
        description={`Enter the name for the new ${createDialog?.isDir ? 'folder' : 'request'}:`}
        actions={[
          {
            label: 'Create',
            onClick: confirmCreateNew,
            color: undefined
          }
        ]}
      >
        <TextField.Root
          value={createName}
          onChange={(e: any) => setCreateName(e.target.value)}
          placeholder={`${createDialog?.isDir ? 'Folder' : 'Request'} name`}
          onKeyDown={(e: any) => {
            if (e.key === 'Enter') confirmCreateNew();
            if (e.key === 'Escape') setCreateDialog(null);
          }}
          autoFocus
        />
      </Alert>

      {/* Rename dialog */}
      <Alert
        isOpen={!!renameDialog}
        onClose={() => setRenameDialog(null)}
        title={`Rename ${renameDialog?.isDir ? 'Folder' : 'Request'}`}
        description={`Enter a new name for "${renameDialog?.displayName.replace('.postier', '')}":`}
        actions={[
          {
            label: 'Rename',
            onClick: confirmRename,
            color: undefined
          }
        ]}
      >
        <TextField.Root
          value={renameName}
          onChange={(e: any) => setRenameName(e.target.value)}
          placeholder={`${renameDialog?.isDir ? 'Folder' : 'Request'} name`}
          onKeyDown={(e: any) => {
            if (e.key === 'Enter') confirmRename();
            if (e.key === 'Escape') setRenameDialog(null);
          }}
          autoFocus
        />
      </Alert>

      {/* Select default collection dialog */}
      <Alert
        isOpen={selectCollectionDialog}
        onClose={() => setSelectCollectionDialog(false)}
        title="Select Default Collection"
        description="Please select a collection to use as your default workspace:"
      >
        <Box>
          {collections.map(collection => (
            <Flex
              key={collection.id}
              align="center"
              gap="2"
              p="2"
              mb="2"
              style={{
                cursor: 'pointer',
                borderRadius: '4px',
                border: '1px solid var(--gray-6)'
              }}
              className="hover:bg-gray-100"
              onClick={() => selectCollection(collection.id)}
            >
              <Text size="2">{collection.name}</Text>
              <Text size="1" color="gray">{collection.path}</Text>
            </Flex>
          ))}
        </Box>
      </Alert>

      <AutoSaveModal
        isOpen={showAutoSaveModal}
        onClose={() => setShowAutoSaveModal(false)}
        onEnableAutoSave={() => {
          setAutoSave(true);
          setShowAutoSaveModal(false);
        }}
      />

      {envEditorCollection && (
        <EnvEditor
          isOpen={!!envEditorCollection}
          onClose={() => setEnvEditorCollection(null)}
          collectionName={envEditorCollection.name}
          collectionPath={envEditorCollection.path}
        />
      )}

      {/* Collection execution modal — plan view, live run, and results in one place */}
      {executionModal && (
        <CollectionExecutionModal
          collectionName={executionModal.collectionName}
          analysis={executionModal.analysis}
          results={executionModal.results}
          isRunning={isRunning}
          onExecute={execute}
          onClose={closeModal}
          onSelectRequest={filePath => { setCurrentFile(filePath); closeModal(); }}
        />
      )}

      {/* Self-reference error */}
      <InfoAlert
        isOpen={!!selfRefError}
        onClose={closeSelfRefError}
        title="Self-reference detected"
        description={`The following requests reference their own response and cannot run:\n\n${selfRefError?.selfRefNames.join(', ')}\n\nA request cannot use its own response as input — remove the self-reference before running the collection.`}
        okLabel="Close"
      />

      {/* Circular dependency error */}
      <InfoAlert
        isOpen={!!cycleError}
        onClose={closeCycleError}
        title="Circular dependency detected"
        description={`The following requests reference each other in a cycle and cannot be resolved:\n\n${cycleError?.cycleNames.join(' → ')}\n\nRemove the circular reference before running the collection.`}
        okLabel="Close"
      />
    </Flex>
  );
}
