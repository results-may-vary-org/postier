import React, {ChangeEvent, useCallback, useLayoutEffect, useRef, useState, useEffect, useMemo} from "react";
import { MakeRequest, LoadPostierRequest, SavePostierRequest } from "../../wailsjs/go/main/App";
import { main } from "../../wailsjs/go/models";
import { PlusIcon, TrashIcon, PaperPlaneIcon, CheckCircledIcon, CrossCircledIcon, CopyIcon, CheckIcon } from "@radix-ui/react-icons";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  DataList,
  Flex,
  IconButton,
  Popover,
  Section,
  SegmentedControl,
  Select,
  Switch,
  Tabs,
  TextField,
  Text
} from "@radix-ui/themes";
import {BodyType, KeyValue} from "../types/common";
import { useCollectionStore } from "../stores/store";
import { InfoAlert } from "./Alert";
import { RequestBodyEditor } from "./RequestBodyEditor";
import { ResponseBodyViewer } from "./ResponseBodyViewer";
import { toHTTP, toCurl, toWget, toHTTPie } from "../utils/requestFormatters";
import { FileEntry } from "../utils/jsonPaths";
import { InterpolationField } from "./InterpolationField";

const VALID_BODY_TYPES: BodyType[] = ['json', 'text', 'none', 'xml', 'sparql', 'raw'];

/** Props accepted by the HttpClient component */
interface HttpClientProps {
  /** Whether the collection sidebar is currently visible */
  sidebarVisible: boolean;
  /** Callback to toggle the collection sidebar (also bound to Ctrl+N) */
  onToggleSidebar: () => void;
}

export function HttpClient({ sidebarVisible, onToggleSidebar }: HttpClientProps) {
  const { collections, selectedCollection, currentFilePath, autoSave, followRedirects, setCurrentFilePath, resetCurrentFilePath } = useCollectionStore();

  const collectionFiles = useMemo<FileEntry[]>(() => {
    const fileList: FileEntry[] = [];
    const activeCollection = collections.find((c: any) => c.id === selectedCollection);
    const collectionRoot = activeCollection?.path ?? '';
    const walkTree = (treeNode: main.DirectoryTree) => {
      if (!treeNode.entry.isDir && treeNode.entry.path.endsWith('.postier')) {
        const rel = treeNode.entry.path
          .replace(collectionRoot + '/', '')
          .replace('.postier', '');
        const slashIndex = rel.lastIndexOf('/');
        const parentDir = slashIndex >= 0 ? rel.slice(0, slashIndex) : '';
        fileList.push({
          name: treeNode.entry.name.replace('.postier', ''),
          path: treeNode.entry.path,
          parentDir,
        });
      }
      treeNode.children?.forEach(walkTree);
    };
    if (activeCollection?.tree) walkTree(activeCollection.tree);
    return fileList;
  }, [collections, selectedCollection]);

  const requestSectionRef = useRef<HTMLDivElement>(null);
  const responseTextAreaRef = useRef<HTMLDivElement>(null);
  const responseHeaderListRef = useRef<HTMLDivElement>(null);
  const responseCookieListRef = useRef<HTMLDivElement>(null);
  const responseRequestRef = useRef<HTMLDivElement>(null);
  const responseTimelineRef = useRef<HTMLDivElement>(null);

  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState<KeyValue[]>([]);
  const [queryParams, setQueryParams] = useState<KeyValue[]>([]);
  const [body, setBody] = useState('');
  const [bodyType, setBodyType] = useState<BodyType>('none');
  const [response, setResponse] = useState<main.HTTPResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [responseBody, setResponseBody] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [noCollectionAlertOpen, setNoCollectionAlertOpen] = useState(false);
  const [selfRefAlertOpen, setSelfRefAlertOpen] = useState(false);

  const arraysEqual = (a: KeyValue[], b: KeyValue[]) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i].key !== b[i].key || a[i].value !== b[i].value) return false;
      if ((a[i].enabled !== false) !== (b[i].enabled !== false)) return false;
    }
    return true;
  }

  // Load request from file
  const loadRequestFromFile = async (filePath: string) => {
    try {
      const request = await LoadPostierRequest(filePath);

      setCurrentFilePath(filePath);
      setMethod(request.method);
      setUrl(request.url);

      const headersArray: KeyValue[] = request.headerEntries?.length
        ? request.headerEntries.map((e: any) => ({ key: e.key, value: e.value, enabled: e.enabled }))
        : Object.entries(request.headers || {}).map(([key, value]) => ({ key, value, enabled: true }));
      setHeaders(headersArray);

      const queryArray: KeyValue[] = request.queryEntries?.length
        ? request.queryEntries.map((e: any) => ({ key: e.key, value: e.value, enabled: e.enabled }))
        : Object.entries(request.query || {}).map(([key, value]) => ({ key, value, enabled: true }));
      setQueryParams(queryArray);

      setBody(request.body || '');

      // Validate bodyType before applying
      if (VALID_BODY_TYPES.includes(request.bodyType as BodyType)) {
        setBodyType(request.bodyType as BodyType);
      } else {
        setBodyType('none');
      }

      if (request.response) {
        setResponse(request.response);
        setResponseBody(generateResponseContent(request.response));
      } else {
        setResponse(null);
        setResponseBody('');
      }

      setIsSaved(true);
    } catch (error) {
      console.error('Failed to load request from file:', error);
    }
  };

  // Clear request form
  const clearRequest = () => {
    resetCurrentFilePath();
    setMethod('GET');
    setUrl('');
    setHeaders([]);
    setQueryParams([]);
    setBody('');
    setBodyType('none');
    setResponse(null);
    setResponseBody('');
    setIsSaved(false);
  };

  // Build a sanitized filename from method + url
  const buildAutoFilename = (reqMethod: string, reqUrl: string): string => {
    const sanitizedUrl = reqUrl
      .replace(/https?:\/\//, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || `request_${Date.now()}`;
    return `${reqMethod}_${sanitizedUrl}.postier`;
  };

  // Save request to file
  // If no filePath and no currentFilePath, auto-generates a path inside the selected collection
  const saveRequest = useCallback(async (filePath?: string, responseToSave?: main.HTTPResponse | null) => {
    try {
      if (!selectedCollection) {
        setNoCollectionAlertOpen(true);
        return;
      }

      let saveFilePath = filePath || currentFilePath;
      let wasAutoCreated = false;

      if (!saveFilePath.trim()) {
        // Auto-generate a file path in the selected collection root
        const currentCollection = collections.find((c: any) => c.id === selectedCollection);
        if (!currentCollection) {
          setNoCollectionAlertOpen(true);
          return;
        }
        const autoFilename = buildAutoFilename(method, url);
        saveFilePath = `${currentCollection.path}/${autoFilename}`;
        wasAutoCreated = true;
      }

      // Full entries list — preserves disabled items so they survive save/load
      const headerEntries = headers.map(h => ({ key: h.key, value: h.value, enabled: h.enabled !== false }));
      const queryEntries  = queryParams.map(q => ({ key: q.key, value: q.value, enabled: q.enabled !== false }));

      // Legacy map — only enabled entries + auto Content-Type (for external tooling)
      const headersObj: Record<string, string> = {};
      headers.forEach(header => {
        if (header.key && header.value && header.enabled !== false) {
          headersObj[header.key] = header.value;
        }
      });

      if (bodyType === 'json') headersObj['Content-Type'] = 'application/json';
      if (bodyType === 'text') headersObj['Content-Type'] = 'text/plain';
      if (bodyType === 'xml') headersObj['Content-Type'] = 'application/xml';
      if (bodyType === 'sparql') headersObj['Content-Type'] = 'application/sparql-query';

      const queryObj: Record<string, string> = {};
      queryParams.forEach(param => {
        if (param.key && param.value && param.enabled !== false) {
          queryObj[param.key] = param.value;
        }
      });

      const httpRegex = new RegExp("http(s*):\/\/");
      const requestData = {
        name: `${method}@${url.replace(httpRegex, "")}`,
        method,
        url,
        headers: headersObj,
        body: bodyType === 'none' ? '' : body,
        bodyType,
        query: queryObj,
        headerEntries,
        queryEntries,
        response: responseToSave !== undefined ? responseToSave : response,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const request = new main.PostierRequest(requestData);
      await SavePostierRequest(saveFilePath, request);

      setCurrentFilePath(saveFilePath);
      setIsSaved(true);

      // If a new file was auto-created, refresh the file tree and highlight it
      if (wasAutoCreated) {
        window.dispatchEvent(new CustomEvent('postier-collection-refresh'));
        window.dispatchEvent(new CustomEvent('postier-load-file', { detail: { filePath: saveFilePath } }));
      }
    } catch (error) {
      alert('Failed to save request: ' + error);
    }
  }, [method, url, headers, queryParams, body, bodyType, currentFilePath, response, selectedCollection, collections]);

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '', enabled: true }]);
  };

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...headers];
    newHeaders[index][field] = value;
    setHeaders(newHeaders);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const addQueryParam = () => {
    setQueryParams([...queryParams, { key: '', value: '', enabled: true }]);
  };

  const updateQueryParam = (index: number, field: 'key' | 'value', value: string) => {
    const newQueryParams = [...queryParams];
    newQueryParams[index][field] = value;
    setQueryParams(newQueryParams);
  };

  const removeQueryParam = (index: number) => {
    setQueryParams(queryParams.filter((_, i) => i !== index));
  };

  const toggleHeader = (index: number, enabled: boolean) => {
    const updated = [...headers];
    updated[index] = { ...updated[index], enabled };
    setHeaders(updated);
  };

  const toggleQueryParam = (index: number, enabled: boolean) => {
    const updated = [...queryParams];
    updated[index] = { ...updated[index], enabled };
    setQueryParams(updated);
  };

  const sendRequest = async () => {
    // Guard: detect self-references (e.g. {{@my-request|body.id}} inside my-request.postier)
    if (currentFilePath) {
      const currentFileName = currentFilePath.split('/').pop()?.replace('.postier', '') ?? '';
      if (currentFileName) {
        const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const selfRefPattern = new RegExp(`\\{\\{@${escapeRegex(currentFileName)}\\|`);
        const allFieldValues = [url, body, ...headers.map(h => h.value), ...queryParams.map(q => q.value)];
        if (allFieldValues.some(fieldValue => selfRefPattern.test(fieldValue))) {
          setSelfRefAlertOpen(true);
          return;
        }
      }
    }

    setLoading(true);
    setResponse(null);
    try {
      const headersMap: Record<string, string> = {};
      headers.forEach(header => {
        if (header.key && header.value && header.enabled !== false) {
          headersMap[header.key] = header.value;
        }
      });

      if (bodyType === 'json') headersMap['Content-Type'] = 'application/json';
      if (bodyType === 'text') headersMap['Content-Type'] = 'text/plain';
      if (bodyType === 'xml') headersMap['Content-Type'] = 'application/xml';
      if (bodyType === 'sparql') headersMap['Content-Type'] = 'application/sparql-query';

      const queryMap: Record<string, string> = {};
      queryParams.forEach(param => {
        if (param.key && param.value && param.enabled !== false) {
          queryMap[param.key] = param.value;
        }
      });

      const currentCollection = collections.find((c: any) => c.id === selectedCollection);
      const request = new main.HTTPRequest({
        method,
        url,
        headers: headersMap,
        body: bodyType === 'none' ? '' : body,
        query: queryMap,
        envFilePath: currentCollection?.path ?? '',
        followRedirects,
      });

      const result = await MakeRequest(request);
      setResponse(result);
      setResponseBody(generateResponseContent(result));

      if (autoSave) {
        await saveRequest(undefined, result);
        // Refresh the tree after a confirmed auto-save write so saved response data appears.
        window.dispatchEvent(new CustomEvent('postier-collection-refresh'));
      } else {
        setIsSaved(false);
      }
    } catch (error) {
      console.error('Request failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const generateResponseTag = () => {
    if (!response) return <Badge color="gray">000</Badge>;
    const responseStatus = response.statusCode.toString().slice(0, 1) ?? 0;
    switch ( responseStatus ) {
      case '2':
        return <Badge color="green">{response.status}</Badge>;
      case '3':
        return <Badge color="blue">{response.status}</Badge>;
      case '4':
        return <Badge color="orange">{response.status}</Badge>;
      case '5':
        return <Badge color="red">{response.status}</Badge>;
      default:
        return <Badge color="gray">{response.status}</Badge>;
    }
  }

  const generateResponseTime = () => {
    if (!response) return <Badge color="gray">0 ms</Badge>;

    const responseTimeInMicro = response.duration ?? 0;
    const responseTimeInMilli = responseTimeInMicro / 1000;
    const hasTrace = response?.trace?.timings?.length;

    let color: "green" | "orange" | "red" = "green";
    if (responseTimeInMilli < 500) color = "green";
    else if (responseTimeInMilli >= 500 && responseTimeInMilli < 1000) color = "orange";
    else color = "red";

    return (
      <Popover.Root>
        <Popover.Trigger style={{ cursor: 'pointer' }}>
          <Badge color={color}>{responseTimeInMilli} ms</Badge>
        </Popover.Trigger>
        <Popover.Content size="1" maxWidth="280px">
          <TimingBreakdown timings={hasTrace ? response.trace.timings : []} />
        </Popover.Content>
      </Popover.Root>
    )
  }

  const generateHeadersBadge = () => {
    if (headers.length === 0) return <Badge color="gray" ml="1">0</Badge>
    const active = headers.filter(h => h.key && h.value && h.enabled !== false);
    return <Badge color={active.length > 0 ? "green" : "gray"} ml="1">{active.length}</Badge>;
  }

  const generateQueryBadge = () => {
    if (queryParams.length === 0) return <Badge color="gray" ml="1">0</Badge>
    const active = queryParams.filter(q => q.key && q.value && q.enabled !== false);
    return <Badge color={active.length > 0 ? "green" : "gray"} ml="1">{active.length}</Badge>;
  }

  const generateBodyBadge = () => {
    if (bodyType === "none") return <Badge color="gray" ml="1">no</Badge>;
    if (body.length === 0) return <Badge color="orange" ml="1">no</Badge>;
    return <Badge color="green" ml="1">yes</Badge>;
  }

  const calculateResponseAreaHeight = useCallback(() => {
    const requestSectionHeight = requestSectionRef?.current?.offsetHeight ?? 0;
    const height = window.innerHeight - requestSectionHeight - (96 + 40);
    if (responseTextAreaRef.current) responseTextAreaRef.current.style.height = `${height}px`;
    if (responseCookieListRef.current) responseCookieListRef.current.style.height = `${height}px`;
    if (responseHeaderListRef.current) responseHeaderListRef.current.style.height = `${height}px`;
    if (responseRequestRef.current) responseRequestRef.current.style.height = `${height}px`;
    if (responseTimelineRef.current) responseTimelineRef.current.style.height = `${height}px`;
  }, []);

  const generateResponseContent = (response: main.HTTPResponse | null): string => {
    if (!response || !response.body) return "";

    if (response.headers) {
      const contentType = Object.entries(response.headers).filter((value: [string, string[]]) => {
        return value[0].toLowerCase().includes("content-type");
      });

      if (contentType.length > 0 && contentType[0][1].includes("application/json")) {
        try {
          return JSON.stringify(JSON.parse(response.body), null, 2);
        } catch {
          return response.body;
        }
      }
    }

    return response.body;
  }

  const calculateHeaderLength = () => {
    if (response?.headers) {
      return `(${Object.entries(response.headers).length})`;
    }
    return null;
  }

  const calculateCookieLength = () => {
    if (response?.cookies) {
      return `(${Object.entries(response.cookies).length})`;
    }
    return null;
  }

  // Load current file from store on component mount
  useEffect(() => {
    if (currentFilePath) {
      loadRequestFromFile(currentFilePath);
    }
  }, []);

  // Listen for file load / clear events from FileTree
  useEffect(() => {
    const handleFileLoad = (event: any) => {
      const { filePath } = event.detail;
      loadRequestFromFile(filePath);
    };

    // When a collection run saves files, refresh the currently open file only —
    // do NOT navigate away; the user stays wherever they are.
    const handleCollectionRefresh = () => {
      if (currentFilePath) loadRequestFromFile(currentFilePath);
    };

    window.addEventListener('postier-load-file', handleFileLoad);
    window.addEventListener('postier-clear-request', clearRequest);
    window.addEventListener('postier-collection-refresh', handleCollectionRefresh);

    return () => {
      window.removeEventListener('postier-load-file', handleFileLoad);
      window.removeEventListener('postier-clear-request', clearRequest);
      window.removeEventListener('postier-collection-refresh', handleCollectionRefresh);
    };
  }, [currentFilePath]);

  // Watch for changes to mark as unsaved
  useEffect(() => {
    if (currentFilePath) {
      LoadPostierRequest(currentFilePath).then((fileRequest: main.PostierRequest) => {
        const headersArray: KeyValue[] = (fileRequest as any).headerEntries?.length
          ? (fileRequest as any).headerEntries.map((e: any) => ({ key: e.key, value: e.value, enabled: e.enabled }))
          : Object.entries(fileRequest.headers || {}).map(([key, value]) => ({ key, value, enabled: true }));
        const queryArray: KeyValue[] = (fileRequest as any).queryEntries?.length
          ? (fileRequest as any).queryEntries.map((e: any) => ({ key: e.key, value: e.value, enabled: e.enabled }))
          : Object.entries(fileRequest.query || {}).map(([key, value]) => ({ key, value, enabled: true }));

        const sortFn = (x: KeyValue, y: KeyValue) => x.key.localeCompare(y.key) || x.value.localeCompare(y.value);

        headersArray.sort(sortFn);
        queryArray.sort(sortFn);
        const stateHeaders = [...headers].sort(sortFn);
        const stateQuery = [...queryParams].sort(sortFn);

        const headersIsEqual = arraysEqual(headersArray, stateHeaders);
        const queryIsEqual = arraysEqual(queryArray, stateQuery);

        setIsSaved(
          (fileRequest.body || '') === body &&
          fileRequest.bodyType === bodyType &&
          fileRequest.method === method &&
          JSON.stringify(fileRequest.response) === JSON.stringify(response) &&
          fileRequest.url === url &&
          headersIsEqual &&
          queryIsEqual
        )
      })
    }
  }, [method, url, headers, queryParams, body, bodyType, currentFilePath]);

  // Handle Ctrl+S: always call saveRequest (auto-generates filename if needed)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveRequest();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveRequest]);

  // Use refs so Ctrl+Enter / Ctrl+Shift+C handlers never go stale
  const sendRequestRef = useRef(sendRequest);
  useEffect(() => { sendRequestRef.current = sendRequest; });

  const responseRef = useRef(response);
  useEffect(() => { responseRef.current = response; });

  // Handle Ctrl+Enter: send the current request
  // Handle Ctrl+Shift+C: copy raw response body to clipboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        sendRequestRef.current();
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        const rawBody = responseRef.current?.body;
        if (rawBody) navigator.clipboard.writeText(rawBody);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useLayoutEffect(() => {
    calculateResponseAreaHeight();
    window.addEventListener("resize", calculateResponseAreaHeight);
    return () => window.removeEventListener("resize", calculateResponseAreaHeight);
  }, [calculateResponseAreaHeight]);

  return (
    <Box>
      <Section id="request" pt="2" pb="2" ref={requestSectionRef}>
        <Flex justify="between" align="center" mb="2">
          <Flex align="center" gap="2">
            {/* Sidebar toggle — mirrors the Ctrl+N shortcut */}
            <IconButton variant="ghost" size="1" onClick={onToggleSidebar} title="Toggle sidebar (Ctrl+N)">
              {sidebarVisible
                ? <PanelLeftClose size={16} />
                : <PanelLeftOpen  size={16} />}
            </IconButton>
            <Text size="1" color="gray">
              {currentFilePath ? currentFilePath.split('/').pop()?.replace(".postier", "") : "Request isn't attached to a file"}
            </Text>
          </Flex>
          <Flex align="center" gap="2">
            <Box>
              {isSaved ? (
                <CheckCircledIcon color="green"/>
              ) : (
                <CrossCircledIcon color="red"/>
              )}
            </Box>
            <Text size="1" color="gray">
              {isSaved ? "Saved" : "Unsaved"}
            </Text>
          </Flex>
        </Flex>
        <Flex gap="2">
          <Select.Root value={method} onValueChange={setMethod}>
            <Select.Trigger/>
            <Select.Content position="popper">
              <Select.Item value="GET">GET</Select.Item>
              <Select.Item value="POST">POST</Select.Item>
              <Select.Item value="PUT">PUT</Select.Item>
              <Select.Item value="DELETE">DELETE</Select.Item>
              <Select.Item value="PATCH">PATCH</Select.Item>
              <Select.Item value="HEAD">HEAD</Select.Item>
              <Select.Item value="OPTIONS">OPTIONS</Select.Item>
            </Select.Content>
          </Select.Root>

          <InterpolationField
            value={url}
            onChange={setUrl}
            placeholder="https://api.openbrewerydb.org/v1/breweries/random"
            collectionFiles={collectionFiles}
          />

          <Button
            onClick={sendRequest}
            disabled={!url || loading}
            title="Send request (Ctrl+Enter)"
          >
            <PaperPlaneIcon />
            {loading ? 'Sending...' : 'Send'}
          </Button>
        </Flex>

        <Tabs.Root defaultValue="headers">

          <Tabs.List>
            <Tabs.Trigger value="headers">
              Header
              {generateHeadersBadge()}
            </Tabs.Trigger>
            <Tabs.Trigger value="query">
              Query
              {generateQueryBadge()}
            </Tabs.Trigger>
            <Tabs.Trigger value="body">
              Body
              {generateBodyBadge()}
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="headers">
            <Box pt="2" pb="2">
              <Button onClick={addHeader}>
                <PlusIcon /> Add header
              </Button>
            </Box>
            <Box height="200px" overflowY="auto">
              {headers.map((header, index) => (
                <Flex gap="2" pb="2" key={index} align="center" style={{ opacity: header.enabled === false ? 0.45 : 1, transition: 'opacity 120ms' }}>
                  <Checkbox
                    variant="soft"
                    checked={header.enabled !== false}
                    onCheckedChange={(checked) => toggleHeader(index, !!checked)}
                  />
                  <Box width="100%">
                    <TextField.Root
                      type="text"
                      placeholder="Header name"
                      value={header.key}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => updateHeader(index, 'key', e.target.value)}
                    />
                  </Box>
                  <InterpolationField
                    value={header.value}
                    onChange={(v) => updateHeader(index, 'value', v)}
                    placeholder={`${header.key ?? "Header"} value`}
                    collectionFiles={collectionFiles}
                  />
                  <IconButton onClick={() => removeHeader(index)}>
                    <TrashIcon />
                  </IconButton>
                </Flex>
              ))}
            </Box>
          </Tabs.Content>

          <Tabs.Content value="query">
            <Box pt="2" pb="2">
              <Button onClick={addQueryParam}>
                <PlusIcon /> Add parameter
              </Button>
            </Box>
            <Box height="200px" overflowY="auto">
              {queryParams.map((param, index) => (
                <Flex gap="2" pb="2" key={index} align="center" style={{ opacity: param.enabled === false ? 0.45 : 1, transition: 'opacity 120ms' }}>
                  <Checkbox
                    variant="soft"
                    checked={param.enabled !== false}
                    onCheckedChange={(checked) => toggleQueryParam(index, !!checked)}
                  />
                  <Box width="100%">
                    <TextField.Root
                      type="text"
                      placeholder="Parameter name"
                      value={param.key}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => updateQueryParam(index, 'key', e.target.value)}
                    />
                  </Box>
                  <InterpolationField
                    value={param.value}
                    onChange={(v) => updateQueryParam(index, 'value', v)}
                    placeholder={`${param.key ?? "Parameter"} value`}
                    collectionFiles={collectionFiles}
                  />
                  <IconButton onClick={() => removeQueryParam(index)}>
                    <TrashIcon />
                  </IconButton>
                </Flex>
              ))}
            </Box>
          </Tabs.Content>

          <Tabs.Content value="body">
            <Box pt="2" pb="2">
              <Select.Root value={bodyType} onValueChange={(value: BodyType) => setBodyType(value)}>
                <Select.Trigger/>
                <Select.Content position="popper">
                  <Select.Item value="none">No Body</Select.Item>
                  <Select.Item value="json">JSON</Select.Item>
                  <Select.Item value="text">Text</Select.Item>
                  <Select.Item value="xml">XML</Select.Item>
                  <Select.Item value="sparql">SPARQL</Select.Item>
                  <Select.Item value="raw">Raw</Select.Item>
                </Select.Content>
              </Select.Root>
            </Box>
            <RequestBodyEditor
              content={body}
              onChange={setBody}
              bodyType={bodyType}
              height="200px"
              collectionFiles={collectionFiles}
            />
          </Tabs.Content>
        </Tabs.Root>
      </Section>

      <Section id="response" pt="2" pb="0">
        <Flex gap="2">
          {generateResponseTag()}
          {generateResponseTime()}
          <Badge color="blue">{formatSize(response?.size ?? 0)}</Badge>
        </Flex>

        <Tabs.Root defaultValue="body">
          <Tabs.List onClick={calculateResponseAreaHeight}>
            <Tabs.Trigger value="body">Body</Tabs.Trigger>
            <Tabs.Trigger value="headers">Headers {calculateHeaderLength()}</Tabs.Trigger>
            <Tabs.Trigger value="cookies">Cookies {calculateCookieLength()}</Tabs.Trigger>
            <Tabs.Trigger value="request">Request</Tabs.Trigger>
            <Tabs.Trigger value="timeline">Timeline</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="body">
            <Box pt="2" style={{ display: 'flex', flexDirection: 'column' }}>
              <ResponseBodyViewer
                body={responseBody}
                headers={response?.headers ?? null}
                viewerRef={responseTextAreaRef}
                currentFilePath={currentFilePath}
              />
            </Box>
          </Tabs.Content>

          <Tabs.Content value="headers">
            <Box pt="2" ref={responseHeaderListRef} overflowY="scroll">
              <DataList.Root>
                {Object.entries(response?.headers ?? {"No headers": ""}).map(([key, values]) => (
                  <DataList.Item key={key}>
                    <DataList.Label>{key}</DataList.Label>
                    <DataList.Value>{values}</DataList.Value>
                  </DataList.Item>
                ))}
              </DataList.Root>
            </Box>
          </Tabs.Content>

          <Tabs.Content value="cookies" >
            <Box pt="2" ref={responseCookieListRef} overflowY="scroll">
              <DataList.Root>
                {(response?.cookies ?? [{"name": "No cookies", "domain": "", "value": ""}]).map((cookie, index) => (
                  <DataList.Item key={index}>
                    <DataList.Label>{cookie.name ?? "No name"} {cookie.domain ? `(${cookie.domain})` : ""}</DataList.Label>
                    <DataList.Value>{cookie.value ?? "No value"}</DataList.Value>
                  </DataList.Item>
                ))}
              </DataList.Root>
            </Box>
          </Tabs.Content>

          <Tabs.Content value="request">
            <Box pt="2" ref={responseRequestRef} overflowY="scroll">
              {!response?.effective?.url ? (
                <Text color="gray" size="2">Send a request to see it here.</Text>
              ) : (
                <RequestViewer raw={response.raw} effective={response.effective} />
              )}
            </Box>
          </Tabs.Content>

          <Tabs.Content value="timeline">
            <Box pt="2" ref={responseTimelineRef} overflowY="scroll">
              {!response?.trace?.logs?.length ? (
                <Text color="gray" size="2">Send a request to see the timeline.</Text>
              ) : (
                <TimelineViewer logs={response.trace.logs} />
              )}
            </Box>
          </Tabs.Content>
        </Tabs.Root>
      </Section>

      <InfoAlert
        isOpen={noCollectionAlertOpen}
        onClose={() => setNoCollectionAlertOpen(false)}
        title="No collection loaded"
        description="Please load a folder first before saving."
      />

      <InfoAlert
        isOpen={selfRefAlertOpen}
        onClose={() => setSelfRefAlertOpen(false)}
        title="Self-reference detected"
        description="This request references its own response via {{@…}}. A request cannot read its own response while executing — remove the self-reference before sending."
        okLabel="Close"
      />

    </Box>
  );
}

// ── TimingBreakdown ───────────────────────────────────────────────────────────

function TimingBreakdown({ timings }: { timings: main.TimingPhase[] }) {
  const totalPhase = timings.find(t => t.label === 'Total');
  const total = totalPhase?.duration ?? 1;
  const phases = timings.filter(t => t.label !== 'Total');

  const phaseColor: Record<string, string> = {
    'DNS Lookup':      'var(--purple-9)',
    'TCP Connect':     'var(--blue-9)',
    'TLS Handshake':   'var(--cyan-9)',
    'Waiting (TTFB)':  'var(--orange-9)',
    'Transfer':        'var(--green-9)',
  };

  // One hop = DNS + TCP + TLS + TTFB + Transfer = 5 phases.
  // Each phase row ~24px + 8px gap ≈ 160px total — use that as the cap.
  const ONE_HOP_HEIGHT = 170;

  // Waterfall rendering: each bar is offset by the sum of all preceding phases.
  // Redirect separators (↳) don't consume time in the total so they don't shift the offset.
  let cumulative = 0;

  return (
    <Flex direction="column" gap="2">
      <Text size="1" weight="bold" color="gray">Timing Breakdown</Text>
      <Flex
        direction="column"
        gap="2"
        style={{ maxHeight: ONE_HOP_HEIGHT, overflowY: 'auto' }}
      >
        {phases.map((phase, i) => {
          if (phase.label.startsWith('↳ ')) {
            const statusCode = parseInt(phase.label.slice(2));
            const statusColor = statusCode < 400 ? 'yellow' : 'red';
            return (
              <Flex key={`redirect-${i}`} align="center" gap="2" style={{ margin: '2px 0' }}>
                <Box style={{ flex: 1, height: '1px', background: 'var(--gray-a5)' }} />
                <Badge size="1" color={statusColor}>{phase.label.slice(2)}</Badge>
                <Box style={{ flex: 1, height: '1px', background: 'var(--gray-a5)' }} />
              </Flex>
            );
          }

          const offsetPct = Math.min(100, (cumulative / total) * 100);
          const widthPct  = Math.max(2, Math.min(100 - offsetPct, (phase.duration / total) * 100));
          const endPct    = Math.min(100, offsetPct + widthPct);
          const color     = phaseColor[phase.label] ?? 'var(--accent-9)';
          cumulative += phase.duration;

          return (
            <Flex key={phase.label} direction="column" gap="1">
              <Flex justify="between">
                <Text size="1">{phase.label}</Text>
                <Text size="1" color="gray">{phase.duration} ms</Text>
              </Flex>
              <Box style={{
                height: '4px',
                borderRadius: '2px',
                background: `linear-gradient(to right, var(--gray-a4) ${offsetPct}%, ${color} ${offsetPct}%, ${color} ${endPct}%, var(--gray-a4) ${endPct}%)`,
              }} />
            </Flex>
          );
        })}
      </Flex>
      <Box style={{ borderTop: '1px solid var(--gray-a4)', paddingTop: '6px' }}>
        <Flex justify="between">
          <Text size="1" weight="bold">Total</Text>
          <Text size="1" weight="bold">{total} ms</Text>
        </Flex>
      </Box>
    </Flex>
  );
}

// ── RequestViewer ─────────────────────────────────────────────────────────────

type ReqFormat = 'curl' | 'http' | 'wget' | 'httpie';

const formatters: Record<ReqFormat, (r: main.EffectiveRequest) => string> = {
  curl:   toCurl,
  http:   toHTTP,
  wget:   toWget,
  httpie: toHTTPie,
};

function RequestViewer({ raw, effective }: { raw: main.EffectiveRequest; effective: main.EffectiveRequest }) {
  const [format, setFormat]           = useState<ReqFormat>('curl');
  const [interpolated, setInterpolated] = useState(true);
  const [copied, setCopied]           = useState(false);

  const req  = interpolated ? effective : raw;
  const text = formatters[format](req);

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Flex direction="column" gap="2">
      <Flex justify="between" align="center" wrap="wrap" gap="2">
        <SegmentedControl.Root size="1" value={format} onValueChange={v => setFormat(v as ReqFormat)}>
          <SegmentedControl.Item value="http">HTTP</SegmentedControl.Item>
          <SegmentedControl.Item value="curl">cURL</SegmentedControl.Item>
          <SegmentedControl.Item value="wget">wget</SegmentedControl.Item>
          <SegmentedControl.Item value="httpie">HTTPie</SegmentedControl.Item>
        </SegmentedControl.Root>
        <Flex align="center" gap="2">
          <Text size="1" color="gray">Interpolate env</Text>
          <Switch size="1" checked={interpolated} onCheckedChange={setInterpolated} />
          <Button size="1" variant="soft" onClick={copy}>
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </Flex>
      </Flex>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: "'Noto Sans', sans-serif", fontWeight: 400, fontSize: '1rem' }}>
        {text}
      </pre>
    </Flex>
  );
}

// ── TimelineViewer ────────────────────────────────────────────────────────────

/** Maps HTTP method names to the same accent colors used across the UI. */
const TIMELINE_METHOD_COLORS: Record<string, string> = {
  GET:     'var(--green-11)',
  POST:    'var(--yellow-11)',
  PUT:     'var(--orange-11)',
  DELETE:  'var(--red-11)',
  PATCH:   'var(--purple-11)',
  HEAD:    'var(--blue-11)',
  OPTIONS: 'var(--gray-11)',
};

const METHOD_RE = new RegExp(`^(${Object.keys(TIMELINE_METHOD_COLORS).join('|')})(\\s.*)?$`);
const TS_RE     = /^(\[\d{2}:\d{2}:\d{2}\.\d{3}Z\]) ([\s\S]*)$/;
const STATUS_RE = /^(HTTP\/\S+)\s+(\d{3})(.*)?$/;

const STATUS_COLORS: Record<string, string> = {
  '2': 'var(--green-11)',
  '3': 'var(--blue-11)',
  '4': 'var(--orange-11)',
  '5': 'var(--red-11)',
};

/**
 * Renders trace log lines with coloured timestamps, HTTP method tokens,
 * and HTTP status codes using the same palette as the rest of the UI.
 */
function TimelineViewer({ logs }: { logs: string[] }) {
  return (
    <pre style={{
      margin: 0,
      fontSize: '1rem',
      fontFamily: "'Noto Sans', sans-serif",
      fontWeight: 400,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      lineHeight: '1.5',
    }}>
      {logs.map((line, i) => {
        const tsMatch = line.match(TS_RE);
        const nl = i < logs.length - 1 ? '\n' : '';

        if (!tsMatch) {
          return <span key={i}>{line}{nl}</span>;
        }

        const [, ts, rest] = tsMatch;

        let message: React.ReactNode;

        const methodMatch = rest.match(METHOD_RE);
        const statusMatch = rest.match(STATUS_RE);

        if (methodMatch) {
          const method = methodMatch[1];
          const after  = methodMatch[2] ?? '';
          message = (
            <>
              <span style={{ color: TIMELINE_METHOD_COLORS[method], fontWeight: 500 }}>{method}</span>
              {after}
            </>
          );
        } else if (statusMatch) {
          const proto  = statusMatch[1];
          const code   = statusMatch[2];
          const suffix = statusMatch[3] ?? '';
          const color  = STATUS_COLORS[code[0]] ?? 'var(--gray-11)';
          message = (
            <>
              {proto}{' '}
              <span style={{ color, fontWeight: 500 }}>{code}{suffix}</span>
            </>
          );
        } else {
          message = rest;
        }

        return (
          <span key={i}>
            <span style={{ color: 'var(--gray-9)' }}>{ts}</span>
            {' '}{message}{nl}
          </span>
        );
      })}
    </pre>
  );
}
