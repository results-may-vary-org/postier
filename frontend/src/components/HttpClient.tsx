import {ChangeEvent, useCallback, useLayoutEffect, useRef, useState} from 'react';
import { MakeRequest } from '../../wailsjs/go/main/App';
import { main } from '../../wailsjs/go/models';
import { PlusIcon, TrashIcon, PaperPlaneIcon } from '@radix-ui/react-icons';
import {
  Badge,
  Box,
  Button,
  DataList,
  Flex,
  Section,
  Select,
  Tabs,
  TextArea,
  TextField
} from "@radix-ui/themes";
import HTTPResponse = main.HTTPResponse;

type BodyType = 'json' | 'text' | 'none' | 'xml' | 'sparql';

interface KeyValue {
  key: string;
  value: string;
}

export function HttpClient() {
  const requestSectionRef = useRef<HTMLDivElement>(null);
  const responseTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const responseHeaderListRef = useRef<HTMLDivElement>(null);
  const responseCookieListRef = useRef<HTMLDivElement>(null);
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState<KeyValue[]>([]);
  const [queryParams, setQueryParams] = useState<KeyValue[]>([]);
  const [body, setBody] = useState('');
  const [bodyType, setBodyType] = useState<BodyType>('none');
  const [response, setResponse] = useState<HTTPResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [responseBody, setResponseBody] = useState('');

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

      const request = new main.HTTPRequest({
        method,
        url,
        headers: headersMap,
        body: bodyType === 'none' ? '' : body,
        query: queryMap,
      });

      const result = await MakeRequest(request);
      setResponse(result);
      setResponseBody(generateResponseContent(result));
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
    // response.duration is in Microseconds
    if (!response) return <Badge color="gray">0 ms</Badge>;
    const responseTimeInMicro = response.duration ?? 0;
    const responseTimeInMilli = responseTimeInMicro / 1000;
    if (responseTimeInMilli < 500) return <Badge color="green">{responseTimeInMilli} ms</Badge>;
    if (responseTimeInMilli > 501 && responseTimeInMilli < 1000) return <Badge color="orange">{responseTimeInMilli} ms</Badge>;
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
    const height = window.innerHeight - requestSectionHeight - 96; // 96 is the other element, padding and so on
    if (responseTextAreaRef.current) responseTextAreaRef.current.style.height = `${height}px`;
    if (responseCookieListRef.current) responseCookieListRef.current.style.height = `${height}px`;
    if (responseHeaderListRef.current) responseHeaderListRef.current.style.height = `${height}px`;
  }, []);

  const generateResponseContent = (response: HTTPResponse | null): string => {
    if (!response || !response.body) return "";

    if (response.headers) {
      const contentType = Object.entries(response.headers).filter((value: [string, string[]]) => {
        return value[0].toLowerCase().includes("content-type");
      });

      // we take the first, but anyway there can't be more than one unless the response is not well setup
      if (contentType.length > 0 && contentType[0][1].includes("application/json")) {
        return JSON.stringify(JSON.parse(response.body), null, 2);
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

  useLayoutEffect(() => {
    calculateResponseAreaHeight();
    window.addEventListener("resize", calculateResponseAreaHeight);
    return () => window.removeEventListener("resize", calculateResponseAreaHeight);
  }, [calculateResponseAreaHeight]);

  return (
    <Box>
      <Section id="request" pt="2" pb="2" ref={requestSectionRef}>
        <Flex gap="2" wrap>
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
                <Flex gap="2" wrap pb="2" key={index}>
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
                  <Button onClick={() => removeHeader(index)}>
                    <TrashIcon />
                  </Button>
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
                <Flex gap="2" wrap pb="2" key={index}>
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
                  <Button onClick={() => removeQueryParam(index)}>
                    <TrashIcon />
                  </Button>
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
            <Box height="200px">
              <TextArea
                value={body}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
                placeholder={bodyType === 'json' ? '{\n  "key": "value"\n}' : 'Raw text content'}
                style={{ height: '100%' }}
                disabled={bodyType === 'none'}
              />
            </Box>
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
            <Box pt="2">
              <TextArea
                value={responseBody}
                onChange={() => null}
                style={{ minHeight: "200px"}}
                ref={responseTextAreaRef}
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
    </Box>
  );
}
