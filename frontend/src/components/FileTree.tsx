import { useState, useEffect, useRef } from "react";
import { Box, Flex, Button, TextField, ContextMenu, Text, ScrollArea } from "@radix-ui/themes";
import { Separator } from "@radix-ui/themes/dist/esm";
import { ChevronRightIcon, PlusIcon, Cross2Icon, UpdateIcon, EnvelopeClosedIcon } from "@radix-ui/react-icons";
import { GetDirectoryTree, CreateDirectory, CreateFile, DeleteFile, DeleteDirectory, OpenFolderDialog, RenameEntry } from "../../wailsjs/go/main/App";
import { main } from "../../wailsjs/go/models";
import {Collection} from "../types/common";
import { useCollectionStore } from "../stores/store";
import { Alert, ConfirmAlert, InfoAlert } from "./Alert";
import { AutoSaveModal } from "./AutoSaveModal";

type DirectoryTree = main.DirectoryTree;
type FileSystemEntry = main.FileSystemEntry;

export function FileTree() {
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

  const [deleteConfirmation, setDeleteConfirmation] = useState<{ path: string; hasChildren: boolean } | null>(null);
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

  const expandedNodesSet = new Set(expandedNodes);
  const selectedCollectionId = selectedCollection;
  const currentFilePath = currentFile;

  // Keep a ref to refreshCollections so event listeners always call the latest version
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

  const refreshCollections = async () => {
    for (const collection of collections) {
      await refreshCollection(collection.id);
    }
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
      console.log(tree)
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

  const requestCloseCollection = (collectionId: string) => {
    const collection = collections.find(c => c.id === collectionId);
    if (collection) {
      setCloseConfirmation({ collectionId, collectionName: collection.name });
    }
  };

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

  const selectCollection = (collectionId: string) => {
    setSelectedCollection(collectionId);
    setSelectCollectionDialog(false);
  };

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

  // Open rename modal
  const requestRename = (node: FileSystemEntry) => {
    const ownerCollection = collections.find(c => node.path.startsWith(c.path));
    if (ownerCollection) {
      setSelectedCollection(ownerCollection.id);
    }
    const baseName = node.isDir ? node.name : node.name.replace(/\.[^/.]+$/, '');
    setRenameDialog({ path: node.path, isDir: node.isDir, displayName: node.name });
    setRenameName(baseName);
  };

  // Confirm rename via modal
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

      for (const c of collections) {
        await refreshCollection(c.id);
      }

      setRenameDialog(null);
    } catch (error) {
      console.error('Failed to rename:', error);
      setErrorDialog({ title: 'Failed to rename', message: String(error) });
    }
  };

  const requestCreateNew = (parentPath: string, isDir: boolean) => {
    const ownerCollection = collections.find(c => parentPath.startsWith(c.path));
    if (ownerCollection) {
      setSelectedCollection(ownerCollection.id);
    }

    setCreateDialog({ parentPath, isDir });
    setCreateName('');
  };

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
      await Promise.all(collections.map(c => refreshCollection(c.id)));

      // Auto-focus newly created file (item 5)
      if (!isDir) {
        handleFileClick(newPath);
      }
    } catch (error) {
      console.error('Failed to create:', error);
      setErrorDialog({ title: 'Failed to Create', message: String(error) });
      setCreateDialog(null);
    }
  };

  const deleteNode = async (path: string) => {
    const ownerCollection = collections.find(c => path.startsWith(c.path));
    if (ownerCollection) {
      setSelectedCollection(ownerCollection.id);
    }

    const node = collections.flatMap(c => getAllNodes(c.tree))
      .find(n => n.entry.path === path);

    if (!node) return;

    const hasChildren = node.children && node.children.length > 0;

    if (hasChildren) {
      setDeleteConfirmation({ path, hasChildren: true });
      return;
    }

    try {
      if (node.entry.isDir) {
        await DeleteDirectory(path);
      } else {
        await DeleteFile(path);
      }
      collections.forEach(c => refreshCollection(c.id));
    } catch (error) {
      console.error('Failed to delete:', error);
      setErrorDialog({ title: 'Failed to Delete', message: String(error) });
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;

    try {
      await DeleteDirectory(deleteConfirmation.path);
      collections.forEach(c => refreshCollection(c.id));
      setDeleteConfirmation(null);
    } catch (error) {
      console.error('Failed to delete:', error);
      setErrorDialog({ title: 'Failed to Delete', message: String(error) });
      setDeleteConfirmation(null);
    }
  };

  const getAllNodes = (tree: DirectoryTree): DirectoryTree[] => {
    const nodes = [tree];
    tree.children?.forEach(child => {
      nodes.push(...getAllNodes(child));
    });
    return nodes;
  };

  const generateIcon = (entry: FileSystemEntry, isActiveFile: boolean) => {
    let color = undefined;
    if (entry.method) {
      switch (entry.method) {
        case "GET":
          color = "var(--green-11)";
          break;
        case "POST":
          color = "var(--yellow-11)";
          break;
        case "PUT":
          color = "var(--orange-11)";
          break;
        case "DELETE":
          color = "var(--red-11)";
          break;
        case "PATCH":
          color = "var(--blue-11)";
          break;
        case "HEAD":
          color = "var(--gray-11)";
          break;
        case "OPTION":
          color = "var(--brown-11)";
          break;
        default:
          break;
      }
    }
    return <EnvelopeClosedIcon color={isActiveFile ? 'var(--orange-11)' : color} />;
  }

  const renderNode = (node: DirectoryTree, depth: number = 0) => {
    const isExpanded = expandedNodesSet.has(node.entry.path);
    const isActiveFile = !node.entry.isDir && currentFilePath === node.entry.path;
    const isSelectedFolder = node.entry.isDir && selectedFolderPath === node.entry.path;

    let bgColor: string | undefined;
    if (isActiveFile) bgColor = 'var(--orange-4)';
    else if (isSelectedFolder) bgColor = 'var(--orange-2)';

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
                borderRadius: '4px',
                backgroundColor: bgColor,
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
                    color: isSelectedFolder ? 'var(--orange-9)' : undefined,
                  }}
                />
              ) : (
                generateIcon(node.entry, isActiveFile)
              )}

              <Text
                size="2"
                weight={isActiveFile || isSelectedFolder ? 'medium' : 'regular'}
                style={{
                  color: isActiveFile
                    ? 'var(--orange-11)'
                    : isSelectedFolder
                    ? 'var(--orange-9)'
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
          <Flex justify="start" align="center" p="2" gap="2">
            <Button size="1" onClick={loadCollection}>
              <PlusIcon /> Load
            </Button>
            <Button size="1" variant="soft" onClick={refreshCollections}>
              <UpdateIcon /> Refresh
            </Button>
          </Flex>

          <ScrollArea style={{ flex: 1 }}>
            {collections.map(collection => (
              <Box key={collection.id} mb="4">
                <Flex
                  justify="between"
                  align="center"
                  p="2"
                  style={{
                    backgroundColor: selectedCollectionId === collection.id ? 'var(--orange-2)' : 'var(--gray-2)',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setSelectedCollection(collection.id);
                    setSelectedFolderPath(collection.path);
                  }}
                >
                  <Text
                    weight="medium"
                    style={{
                      color: selectedCollectionId === collection.id ? 'var(--orange-11)' : 'inherit'
                    }}
                  >
                    {collection.name}
                  </Text>
                  <Button
                    size="1"
                    variant="ghost"
                    onClick={(e: any) => {
                      e.stopPropagation();
                      requestCloseCollection(collection.id);
                    }}
                  >
                    <Cross2Icon />
                  </Button>
                </Flex>

                <Box>
                  {renderNode(collection.tree)}
                </Box>
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
        title="Delete Folder"
        description="This folder contains files or subfolders. Are you sure you want to delete it and all its contents? This action cannot be undone."
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
            color: 'blue'
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
            color: 'blue'
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
    </Flex>
  );
}
