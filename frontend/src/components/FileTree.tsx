import { useState, useEffect } from "react";
import { Box, Flex, Button, TextField, ContextMenu, Text, ScrollArea } from "@radix-ui/themes";
import { Separator } from "@radix-ui/themes/dist/esm";
import { ChevronRightIcon, FileIcon, PlusIcon, Cross2Icon, UpdateIcon } from "@radix-ui/react-icons";
import { GetDirectoryTree, CreateDirectory, CreateFile, DeleteFile, DeleteDirectory, OpenFolderDialog } from "../../wailsjs/go/main/App";
import { main } from "../../wailsjs/go/models";
import {Collection} from "../types/common";
import { useCollectionStore } from "../stores/store";
import { Alert, ConfirmAlert, InfoAlert } from "./Alert";
type DirectoryTree = main.DirectoryTree;
type FileSystemEntry = main.FileSystemEntry;

export function FileTree() {
  const {
    collections,
    expandedNodes,
    selectedCollection,
    currentFile,
    setCollections,
    addCollection,
    removeCollection,
    setSelectedCollection,
    resetSelectedCollection,
    setCurrentFile,
    resetCurrentFile,
    setExpandedNodes
  } = useCollectionStore();

  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ path: string; hasChildren: boolean } | null>(null);
  const [closeConfirmation, setCloseConfirmation] = useState<{ collectionId: string; collectionName: string } | null>(null);
  const [duplicateCollectionPath, setDuplicateCollectionPath] = useState<string | null>(null);
  const [errorDialog, setErrorDialog] = useState<{ title: string; message: string } | null>(null);
  const [createDialog, setCreateDialog] = useState<{ parentPath: string; isDir: boolean } | null>(null);
  const [createName, setCreateName] = useState('');
  const [isLoadingCollections, setIsLoadingCollections] = useState(true);
  const [selectCollectionDialog, setSelectCollectionDialog] = useState(false);

  const expandedNodesSet = new Set(expandedNodes);
  const selectedCollectionId = selectedCollection;
  const currentFilePath = currentFile;

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
          const newExpandedNodes = [...expandedNodes];
          loadedCollections.forEach(collection => {
            if (!newExpandedNodes.includes(collection.path)) {
              newExpandedNodes.push(collection.path);
            }
          });
          setExpandedNodes(newExpandedNodes);
        }

        // Show a notification if some collections couldn't be loaded
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
          // Auto-select if only one collection
          setSelectedCollection(collections[0].id);
        } else {
          // Ask user to select a collection
          setSelectCollectionDialog(true);
        }
      }
    }
  }, [collections, selectedCollectionId, isLoadingCollections]);

  const loadCollection = async () => {
    try {
      const path = await OpenFolderDialog();
      if (!path) return;

      // Check if collection is already open
      const existingCollection = collections.find(c => c.path === path);
      if (existingCollection) {
        setDuplicateCollectionPath(path);
        return;
      }

      const tree = await GetDirectoryTree(path);
      const collection: Collection = {
        id: `collection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: tree.entry.name,
        path: tree.entry.path,
        tree
      };

      addCollection(collection);

      // Auto-expand the root directory of the new collection
      const newExpandedNodes = [...expandedNodes, collection.path];
      setExpandedNodes(newExpandedNodes);

      // Auto-select this collection if none is selected
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

    // Check if current file belongs to this collection
    if (currentFilePath && collectionToClose && currentFilePath.startsWith(collectionToClose.path)) {
      // Clear the current file and trigger clear request event
      resetCurrentFile();
      window.dispatchEvent(new CustomEvent('postier-clear-request'));
    }

    // Check if this was the selected collection and clear it
    if (selectedCollectionId === closeConfirmation.collectionId) {
      resetSelectedCollection();
    }

    if (collectionToClose) {
      removeCollection(collectionToClose);

      // Remove all nodes from this collection from expanded nodes
      const newExpandedNodes = expandedNodes.filter(nodePath =>
        !nodePath.startsWith(collectionToClose.path)
      );
      setExpandedNodes(newExpandedNodes);
    }
    setCloseConfirmation(null);
  };

  const selectCollection = (collectionId: string) => {
    setSelectedCollection(collectionId);
    setSelectCollectionDialog(false);
  };

  const handleFileClick = async (filePath: string) => {
    try {
      // Find the collection this file belongs to and make it the default
      const ownerCollection = collections.find(c => filePath.startsWith(c.path));
      if (ownerCollection) {
        setSelectedCollection(ownerCollection.id);
      }

      // For .postier files, load the request
      if (filePath.endsWith('.postier')) {
        // Mark file as current
        setCurrentFile(filePath);

        // Trigger file load event - parent component should listen for this
        window.dispatchEvent(new CustomEvent('postier-load-file', { detail: { filePath } }));
      }
    } catch (error) {
      console.error('Failed to handle file click:', error);
      setErrorDialog({ title: 'Failed to load file', message: String(error) });
    }
  };

  const refreshCollections = async () => {
    for (const collection of collections) {
      await refreshCollection(collection.id);
    }
  };

  const refreshCollection = async (collectionId: string) => {
    const collection = collections.find(c => c.id === collectionId);
    if (!collection) return;

    try {
      const updatedTree = await GetDirectoryTree(collection.path);
      const updatedCollections = collections.map(c =>
        c.id === collectionId
          ? { ...c, tree: updatedTree }
          : c
      );
      setCollections(updatedCollections);
    } catch (error) {
      console.error('Failed to refresh collection:', error);
    }
  };

  const toggleNode = (path: string) => {
    // Find the collection this path belongs to and make it the default
    const ownerCollection = collections.find(c => path.startsWith(c.path));
    if (ownerCollection) {
      setSelectedCollection(ownerCollection.id);
    }

    // Clear request when clicking on a directory
    window.dispatchEvent(new CustomEvent('postier-clear-request'));

    const newExpandedNodes = [...expandedNodes];
    const pathIndex = newExpandedNodes.indexOf(path);
    if (pathIndex > -1) {
      newExpandedNodes.splice(pathIndex, 1);
    } else {
      newExpandedNodes.push(path);
    }
    setExpandedNodes(newExpandedNodes);
  };

  const startEdit = (node: FileSystemEntry) => {
    // Find the collection this node belongs to and make it the default
    const ownerCollection = collections.find(c => node.path.startsWith(c.path));
    if (ownerCollection) {
      setSelectedCollection(ownerCollection.id);
    }

    const baseName = node.isDir ? node.name : node.name.replace(/\.[^/.]+$/, '');
    setEditingNode(node.path);
    setEditingValue(baseName);
  };

  const cancelEdit = () => {
    setEditingNode(null);
    setEditingValue('');
  };

  const saveEdit = async (oldPath: string, isDir: boolean) => {
    if (!editingValue.trim()) {
      cancelEdit();
      return;
    }

    const oldName = oldPath.split('/').pop() || '';
    const directory = oldPath.substring(0, oldPath.lastIndexOf('/'));
    const extension = isDir ? '' : oldName.substring(oldName.lastIndexOf('.'));
    const newName = isDir ? editingValue.trim() : editingValue.trim() + extension;
    const newPath = `${directory}/${newName}`;

    if (oldPath === newPath) {
      cancelEdit();
      return;
    }

    // Check for name conflicts
    // Ensure we always get a DirectoryTree node (not a Collection) before accessing children
    const parentDirNode =
      collections.find(c => c.tree.entry.path === directory)?.tree ??
      collections.flatMap(c => getAllNodes(c.tree)).find(n => n.entry.path === directory);

    if (parentDirNode?.children?.some(child => child.entry.name === newName)) {
      setErrorDialog({ title: 'Name conflict', message: 'A file or folder with this name already exists' });
      return;
    }

    try {
      if (isDir) {
        await CreateDirectory(newPath);
        await DeleteDirectory(oldPath);
      } else {
        const content = ''; // You'd read the actual content here
        await CreateFile(newPath, content);
        await DeleteFile(oldPath);
      }

      // Refresh all collections that might be affected
      collections.forEach(c => refreshCollection(c.id));
      cancelEdit();
    } catch (error) {
      console.error('Failed to rename:', error);
      setErrorDialog({ title: 'Failed to rename', message: String(error) });
    }
  };

  const requestCreateNew = (parentPath: string, isDir: boolean) => {
    // Find the collection this path belongs to and make it the default
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
          query: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await CreateFile(newPath, JSON.stringify(defaultRequest, null, 2));
      }

      // Refresh collections and expand parent
      collections.forEach(c => refreshCollection(c.id));
      const newExpandedNodes = [...expandedNodes];
      if (!newExpandedNodes.includes(parentPath)) {
        newExpandedNodes.push(parentPath);
      }
      setExpandedNodes(newExpandedNodes);
      setCreateDialog(null);
    } catch (error) {
      console.error('Failed to create:', error);
      setErrorDialog({ title: 'Failed to Create', message: String(error) });
      setCreateDialog(null);
    }
  };

  const deleteNode = async (path: string) => {
    // Find the collection this path belongs to and make it the default
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

  const renderNode = (node: DirectoryTree, depth: number = 0) => {
    const isExpanded = expandedNodesSet.has(node.entry.path);
    const isEditing = editingNode === node.entry.path;

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
                borderRadius: '4px'
              }}
              className="hover:bg-gray-100"
              onClick={() => {
                if (node.entry.isDir) {
                  toggleNode(node.entry.path);
                } else {
                  handleFileClick(node.entry.path);
                }
              }}
            >
              {node.entry.isDir ? (
                <ChevronRightIcon style={{ transform: isExpanded ? 'rotate(90deg)' : 'none' }} />
              ) : (
                <FileIcon />
              )}

              {isEditing ? (
                <TextField.Root
                  value={editingValue}
                  onChange={(e: any) => setEditingValue(e.target.value)}
                  onBlur={() => saveEdit(node.entry.path, node.entry.isDir)}
                  onKeyDown={(e: any) => {
                    if (e.key === 'Enter') saveEdit(node.entry.path, node.entry.isDir);
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  size="1"
                  autoFocus
                />
              ) : (
                <Text size="2">{node.entry.name.replace(".postier", "")}</Text>
              )}
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
            <ContextMenu.Item onClick={() => startEdit(node.entry)}>
              Rename
            </ContextMenu.Item>
            <ContextMenu.Item onClick={() => deleteNode(node.entry.path)} color="red">
              Delete
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Root>

        {node.entry.isDir && isExpanded && node.children && (
          <Box>
            {node.children.map(child => renderNode(child, depth + 1))}
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
                    // Clear request when clicking on collection
                    window.dispatchEvent(new CustomEvent('postier-clear-request'));
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
        />
      </Alert>

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
              style={{
                cursor: 'pointer',
                borderRadius: '4px',
                border: '1px solid var(--gray-6)'
              }}
              className="hover:bg-gray-100"
              onClick={() => selectCollection(collection.id)}
              mb="2"
            >
              <Text size="2">{collection.name}</Text>
              <Text size="1" color="gray">{collection.path}</Text>
            </Flex>
          ))}
        </Box>
      </Alert>
    </Flex>
  );
}
