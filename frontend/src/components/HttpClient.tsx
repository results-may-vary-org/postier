import {ChangeEvent, useCallback, useLayoutEffect, useRef, useState, useEffect} from "react";
import { MakeRequest, LoadPostierRequest, SavePostierRequest } from "../../wailsjs/go/main/App";
import { main } from "../../wailsjs/go/models";
import { PlusIcon, TrashIcon, PaperPlaneIcon, CheckCircledIcon, CrossCircledIcon } from "@radix-ui/react-icons";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
  Badge,
  Box,
  Button,
  DataList,
  Flex,
  IconButton,
  Section,
  Select,
  Tabs,
  TextField,
  Text
} from "@radix-ui/themes";
import {BodyType, KeyValue} from "../types/common";
import { useCollectionStore } from "../stores/store";
import { InfoAlert } from "./Alert";
import { RequestBodyEditor } from "./RequestBodyEditor";
import { ResponseBodyViewer } from "./ResponseBodyViewer";

const VALID_BODY_TYPES: BodyType[] = ['json', 'text', 'none', 'xml', 'sparql'];

/** Props accepted by the HttpClient component */
interface HttpClientProps {
  /** Whether the collection sidebar is currently visible */
  sidebarVisible: boolean;
  /** Callback to toggle the collection sidebar (also bound to Ctrl+N) */
  onToggleSidebar: () => void;
}

export function HttpClient({ sidebarVisible, onToggleSidebar }: HttpClientProps) {
  const { collections, selectedCollection, currentFilePath, autoSave, setCurrentFilePath, resetCurrentFilePath } = useCollectionStore();

  const requestSectionRef = useRef<HTMLDivElement>(null);
  const responseTextAreaRef = useRef<HTMLDivElement>(null);
  const responseHeaderListRef = useRef<HTMLDivElement>(null);
  const responseCookieListRef = useRef<HTMLDivElement>(null);

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

  const arraysEqual = (a: KeyValue[], b: KeyValue[]) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i].key !== b[i].key || a[i].value !== b[i].value) return false;
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

      const headersArray = Object.entries(request.headers || {}).map(([key, value]) => ({ key, value: value }));
      setHeaders(headersArray);

      const queryArray = Object.entries(request.query || {}).map(([key, value]) => ({ key, value: value }));
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

      // Build headers object
      const headersObj: Record<string, string> = {};
      headers.forEach(header => {
        if (header.key && header.value) {
          headersObj[header.key] = header.value;
        }
      });

      if (bodyType === 'json') headersObj['Content-Type'] = 'application/json';
      if (bodyType === 'text') headersObj['Content-Type'] = 'text/plain';
      if (bodyType === 'xml') headersObj['Content-Type'] = 'application/xml';
      if (bodyType === 'sparql') headersObj['Content-Type'] = 'application/sparql-query';

      // Build query object
      const queryObj: Record<string, string> = {};
      queryParams.forEach(param => {
        if (param.key && param.value) {
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
    setHeaders([...headers, { key: '', value: '' }]);
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
    setQueryParams([...queryParams, { key: '', value: '' }]);
  };

  const updateQueryParam = (index: number, field: 'key' | 'value', value: string) => {
    const newQueryParams = [...queryParams];
    newQueryParams[index][field] = value;
    setQueryParams(newQueryParams);
  };

  const removeQueryParam = (index: number) => {
    setQueryParams(queryParams.filter((_, i) => i !== index));
  };

  const sendRequest = async () => {
    setLoading(true);
    setResponse(null);
    try {
      const headersMap: Record<string, string> = {};
      headers.forEach(header => {
        if (header.key && header.value) {
          headersMap[header.key] = header.value;
        }
      });

      if (bodyType === 'json') headersMap['Content-Type'] = 'application/json';
      if (bodyType === 'text') headersMap['Content-Type'] = 'text/plain';
      if (bodyType === 'xml') headersMap['Content-Type'] = 'application/xml';
      if (bodyType === 'sparql') headersMap['Content-Type'] = 'application/sparql-query';

      const queryMap: Record<string, string> = {};
      queryParams.forEach(param => {
        if (param.key && param.value) {
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
    if (responseTimeInMilli < 500) return <Badge color="green">{responseTimeInMilli} ms</Badge>;
    if (responseTimeInMilli >= 500 && responseTimeInMilli < 1000) return <Badge color="orange">{responseTimeInMilli} ms</Badge>;
    return <Badge color="red">{responseTimeInMilli} ms</Badge>;
  }

  const generateHeadersBadge = () => {
    if (headers.length === 0) return <Badge color="gray" ml="1">0</Badge>
    const fullHeaders = headers.filter(header => header.key && header.value);
    return <Badge color="green" ml="1">{fullHeaders.length}</Badge>;
  }

  const generateQueryBadge = () => {
    if (queryParams.length === 0) return <Badge color="gray" ml="1">0</Badge>
    const fullQuery = queryParams.filter(header => header.key && header.value);
    return <Badge color="green" ml="1">{fullQuery.length}</Badge>;
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

    window.addEventListener('postier-load-file', handleFileLoad);
    window.addEventListener('postier-clear-request', clearRequest);

    return () => {
      window.removeEventListener('postier-load-file', handleFileLoad);
      window.removeEventListener('postier-clear-request', clearRequest);
    };
  }, []);

  // Watch for changes to mark as unsaved
  useEffect(() => {
    if (currentFilePath) {
      LoadPostierRequest(currentFilePath).then((fileRequest: main.PostierRequest) => {
        const headersArray = Object.entries(fileRequest.headers || {}).map(([key, value]) => ({ key, value }));
        const queryArray = Object.entries(fileRequest.query || {}).map(([key, value]) => ({ key, value }));

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

          <Box width="100%">
            <TextField.Root
              type="text"
              placeholder="https://api.openbrewerydb.org/v1/breweries/random"
              value={url}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
            />
          </Box>

          <Button
            onClick={sendRequest}
            disabled={!url || loading}
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
                <Flex gap="2" pb="2" key={index}>
                  <Box width="100%">
                    <TextField.Root
                      type="text"
                      placeholder="Header name"
                      value={header.key}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => updateHeader(index, 'key', e.target.value)}
                    />
                  </Box>
                  <Box width="100%">
                    <TextField.Root
                      type="text"
                      placeholder={`${header.key ?? "Header"} value`}
                      value={header.value}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => updateHeader(index, 'value', e.target.value)}
                    />
                  </Box>
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
                <Flex gap="2" pb="2" key={index}>
                  <Box width="100%">
                    <TextField.Root
                      type="text"
                      placeholder="Parameter name"
                      value={param.key}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => updateQueryParam(index, 'key', e.target.value)}
                    />
                  </Box>
                  <Box width="100%">
                    <TextField.Root
                      type="text"
                      placeholder={`${param.key ?? "Parameter"} value`}
                      value={param.value}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => updateQueryParam(index, 'value', e.target.value)}
                    />
                  </Box>
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
                </Select.Content>
              </Select.Root>
            </Box>
            <RequestBodyEditor
              content={body}
              onChange={setBody}
              bodyType={bodyType}
              height="200px"
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
          </Tabs.List>

          <Tabs.Content value="body">
            <Box pt="2" style={{ display: 'flex', flexDirection: 'column' }}>
              <ResponseBodyViewer
                body={responseBody}
                headers={response?.headers ?? null}
                viewerRef={responseTextAreaRef}
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
        </Tabs.Root>
      </Section>

      <InfoAlert
        isOpen={noCollectionAlertOpen}
        onClose={() => setNoCollectionAlertOpen(false)}
        title="No collection loaded"
        description="Please load a folder first before saving."
      />

    </Box>
  );
}
