import { useState, useEffect } from 'react';
import { Box, Flex, Button, AlertDialog, TextField, ContextMenu, Text, ScrollArea } from "@radix-ui/themes";
import { Separator } from "@radix-ui/themes/dist/esm";
import { ChevronRightIcon, FileIcon, PlusIcon, Cross2Icon } from '@radix-ui/react-icons';
import { GetDirectoryTree, CreateDirectory, CreateFile, DeleteFile, DeleteDirectory, OpenFolderDialog } from '../../wailsjs/go/main/App';
import { main } from '../../wailsjs/go/models';

type DirectoryTree = main.DirectoryTree;
type FileSystemEntry = main.FileSystemEntry;

interface Collection {
  id: string;
  name: string;
  path: string;
  tree: DirectoryTree;
}

// LocalStorage utilities
const STORAGE_KEY = 'postier-collections';
const EXPANDED_NODES_KEY = 'postier-expanded-nodes';

const saveCollectionsToStorage = (collections: Collection[]) => {
  try {
    // Only save the essential data, not the full tree
    const collectionsToSave = collections.map(c => ({
      id: c.id,
      name: c.name,
      path: c.path
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collectionsToSave));
  } catch (error) {
    console.error('Failed to save collections to localStorage:', error);
  }
};

const loadCollectionsFromStorage = (): { id: string; name: string; path: string }[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load collections from localStorage:', error);
    return [];
  }
};

const clearCollectionsStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear collections from localStorage:', error);
  }
};

const saveExpandedNodesToStorage = (expandedNodes: Set<string>) => {
  try {
    localStorage.setItem(EXPANDED_NODES_KEY, JSON.stringify(Array.from(expandedNodes)));
  } catch (error) {
    console.error('Failed to save expanded nodes to localStorage:', error);
  }
};

const loadExpandedNodesFromStorage = (): Set<string> => {
  try {
    const stored = localStorage.getItem(EXPANDED_NODES_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch (error) {
    console.error('Failed to load expanded nodes from localStorage:', error);
    return new Set();
  }
};

export function History() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => loadExpandedNodesFromStorage());
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ path: string; hasChildren: boolean } | null>(null);
  const [closeConfirmation, setCloseConfirmation] = useState<{ collectionId: string; collectionName: string } | null>(null);
  const [duplicateCollectionPath, setDuplicateCollectionPath] = useState<string | null>(null);
  const [errorDialog, setErrorDialog] = useState<{ title: string; message: string } | null>(null);
  const [createDialog, setCreateDialog] = useState<{ parentPath: string; isDir: boolean } | null>(null);
  const [createName, setCreateName] = useState('');
  const [isLoadingCollections, setIsLoadingCollections] = useState(true);

  // Load collections from localStorage on component mount
  useEffect(() => {
    const loadStoredCollections = async () => {
      try {
        const storedCollections = loadCollectionsFromStorage();

        if (storedCollections.length === 0) {
          setIsLoadingCollections(false);
          return;
        }

        const loadedCollections: Collection[] = [];
        const invalidCollections: string[] = [];

        for (const stored of storedCollections) {
          try {
            const tree = await GetDirectoryTree(stored.path);
            console.log(`Loaded collection "${stored.name}":`, tree);
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
          setExpandedNodes(prev => {
            const newExpandedNodes = new Set(prev);
            loadedCollections.forEach(collection => {
              console.log(`Auto-expanding collection: ${collection.path}`);
              newExpandedNodes.add(collection.path);
            });
            console.log('Final expanded nodes:', Array.from(newExpandedNodes));
            return newExpandedNodes;
          });
        }

        // Update storage to remove any invalid collections
        if (loadedCollections.length !== storedCollections.length) {
          saveCollectionsToStorage(loadedCollections);
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

  // Save collections to localStorage whenever collections change
  useEffect(() => {
    if (collections.length >= 0) { // Save even when empty to clear storage
      saveCollectionsToStorage(collections);
    }
  }, [collections]);

  // Save expanded nodes to localStorage whenever they change
  useEffect(() => {
    saveExpandedNodesToStorage(expandedNodes);
  }, [expandedNodes]);

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

      setCollections(prev => [...prev, collection]);

      // Auto-expand the root directory of the new collection
      setExpandedNodes(prev => new Set([...prev, collection.path]));
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

    setCollections(prev => prev.filter(c => c.id !== closeConfirmation.collectionId));
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      // Remove all nodes from this collection
      if (collectionToClose) {
        removeNodesFromSet(newSet, collectionToClose.tree);
      }
      return newSet;
    });
    setCloseConfirmation(null);
  };

  const removeNodesFromSet = (set: Set<string>, node: DirectoryTree) => {
    set.delete(node.entry.path);
    node.children?.forEach(child => removeNodesFromSet(set, child));
  };

  const refreshCollection = async (collectionId: string) => {
    const collection = collections.find(c => c.id === collectionId);
    if (!collection) return;

    try {
      const updatedTree = await GetDirectoryTree(collection.path);
      setCollections(prev => prev.map(c =>
        c.id === collectionId
          ? { ...c, tree: updatedTree }
          : c
      ));
    } catch (error) {
      console.error('Failed to refresh collection:', error);
    }
  };

  const toggleNode = (path: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const startEdit = (node: FileSystemEntry) => {
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
      setExpandedNodes(prev => new Set([...prev, parentPath]));
      setCreateDialog(null);
    } catch (error) {
      console.error('Failed to create:', error);
      setErrorDialog({ title: 'Failed to Create', message: String(error) });
      setCreateDialog(null);
    }
  };

  const deleteNode = async (path: string) => {
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
    const isExpanded = expandedNodes.has(node.entry.path);
    const isEditing = editingNode === node.entry.path;

    if (depth === 0) {
      console.log(`Rendering collection "${node.entry.name}": expanded=${isExpanded}, children=${node.children?.length || 0}`);
    }

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
              onClick={() => node.entry.isDir && toggleNode(node.entry.path)}
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
                <Text size="2">{node.entry.name}</Text>
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
      <Box height="100%" width="95%">
        <Flex direction="column" height="100%">
          <Flex justify="between" align="center" p="2">
            <Button size="1" onClick={loadCollection}>
              <PlusIcon /> Load
            </Button>
          </Flex>

          <ScrollArea style={{ flex: 1 }}>
            {collections.map(collection => (
              <Box key={collection.id} mb="4">
                <Flex justify="between" align="center" p="2" style={{ backgroundColor: 'var(--gray-2)' }}>
                  <Text weight="medium">{collection.name}</Text>
                  <Button
                    size="1"
                    variant="ghost"
                    onClick={() => requestCloseCollection(collection.id)}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog.Root open={!!deleteConfirmation} onOpenChange={() => setDeleteConfirmation(null)}>
        <AlertDialog.Content style={{ maxWidth: 450 }}>
          <AlertDialog.Title>Delete Folder</AlertDialog.Title>
          <AlertDialog.Description size="2">
            This folder contains files or subfolders. Are you sure you want to delete it and all its contents? This action cannot be undone.
          </AlertDialog.Description>

          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">Cancel</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button variant="solid" color="red" onClick={confirmDelete}>
                Delete
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>

      {/* Close Collection Confirmation Dialog */}
      <AlertDialog.Root open={!!closeConfirmation} onOpenChange={() => setCloseConfirmation(null)}>
        <AlertDialog.Content style={{ maxWidth: 450 }}>
          <AlertDialog.Title>Close Collection</AlertDialog.Title>
          <AlertDialog.Description size="2">
            Are you sure you want to close the collection "{closeConfirmation?.collectionName}"? Any unsaved changes may be lost.
          </AlertDialog.Description>

          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">Cancel</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button variant="solid" color="red" onClick={confirmCloseCollection}>
                Close Collection
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>

      {/* Duplicate Collection Dialog */}
      <AlertDialog.Root open={!!duplicateCollectionPath} onOpenChange={() => setDuplicateCollectionPath(null)}>
        <AlertDialog.Content style={{ maxWidth: 450 }}>
          <AlertDialog.Title>Collection Already Open</AlertDialog.Title>
          <AlertDialog.Description size="2">
            This collection is already open in the workspace. Please close it first if you want to reload it.
          </AlertDialog.Description>

          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">OK</Button>
            </AlertDialog.Cancel>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>

      {/* Error Dialog */}
      <AlertDialog.Root open={!!errorDialog} onOpenChange={() => setErrorDialog(null)}>
        <AlertDialog.Content style={{ maxWidth: 450 }}>
          <AlertDialog.Title>{errorDialog?.title}</AlertDialog.Title>
          <AlertDialog.Description size="2">
            {errorDialog?.message}
          </AlertDialog.Description>

          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">OK</Button>
            </AlertDialog.Cancel>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>

      {/* Create New Dialog */}
      <AlertDialog.Root open={!!createDialog} onOpenChange={() => setCreateDialog(null)}>
        <AlertDialog.Content style={{ maxWidth: 450 }}>
          <AlertDialog.Title>Create New {createDialog?.isDir ? 'Folder' : 'Request'}</AlertDialog.Title>
          <AlertDialog.Description size="2">
            Enter the name for the new {createDialog?.isDir ? 'folder' : 'request'}:
          </AlertDialog.Description>

          <Box mt="3">
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
          </Box>

          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">Cancel</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button variant="solid" onClick={confirmCreateNew}>
                Create
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Flex>
  );
}
