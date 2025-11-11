import {ChangeEvent, useState} from 'react';
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

interface KeyValue {
  key: string;
  value: string;
}

export function HttpClient() {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState<KeyValue[]>([]);
  const [queryParams, setQueryParams] = useState<KeyValue[]>([]);
  const [body, setBody] = useState('');
  const [bodyType, setBodyType] = useState<'json' | 'text' | 'none'>('none');
  const [response, setResponse] = useState<main.HTTPResponse | null>(null);
  const [loading, setLoading] = useState(false);

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

  const getStatusColor = (statusCode: number): string => {
    if (statusCode >= 200 && statusCode < 300) return 'status-success';
    if (statusCode >= 300 && statusCode < 400) return 'status-redirect';
    if (statusCode >= 400 && statusCode < 500) return 'status-client-error';
    if (statusCode >= 500) return 'status-server-error';
    return '';
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
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
    } catch (error) {
      console.error('Request failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateResponseTag = () => {
    if (!response) return null;
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

  return (
    <Box>

      <Section id="request" pt="2" pb="2">
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
            <Tabs.Trigger value="headers">Header</Tabs.Trigger>
            <Tabs.Trigger value="query">Query</Tabs.Trigger>
            <Tabs.Trigger value="body">Body</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="headers">
            <Box pt="2" pb="2">
              <Button onClick={addHeader}>
                <PlusIcon /> Add Header
              </Button>
            </Box>
            <Box>
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
                <PlusIcon />
                Add Parameter
              </Button>
            </Box>
            <Box>
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
              <Select.Root value={bodyType} onValueChange={(value: 'json' | 'text' | 'none') => setBodyType(value)}>
                <Select.Trigger/>
                <Select.Content>
                  <Select.Item value="none">No Body</Select.Item>
                  <Select.Item value="json">JSON</Select.Item>
                  <Select.Item value="text">Text</Select.Item>
                </Select.Content>
              </Select.Root>
            </Box>
            {bodyType !== 'none' && (
              <TextArea
                value={body}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
                placeholder={bodyType === 'json' ? '{\n  "key": "value"\n}' : 'Raw text content'}
                rows={8}
              />
            )}
          </Tabs.Content>
        </Tabs.Root>
      </Section>

      {response && (
        <Section id="response" pt="2" pb="2">
          <Flex gap="2">
            {generateResponseTag()}
            <Badge color="blue">{response.duration}ms</Badge>
            <Badge color="blue">{formatSize(response.size)}</Badge>
          </Flex>

          <Tabs.Root defaultValue="body">
            <Tabs.List>
              <Tabs.Trigger value="body">Body</Tabs.Trigger>
              <Tabs.Trigger value="headers">Headers</Tabs.Trigger>
              <Tabs.Trigger value="cookies">Cookies</Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="body">
              <Box pt="2">
                <TextArea
                  value={JSON.stringify(JSON.parse(response.body), null, 2)}
                  onChange={() => null}
                  rows={8}
                />
              </Box>
            </Tabs.Content>

            <Tabs.Content value="headers">
              <Box pt="2">
                <DataList.Root>
                  {Object.entries(response.headers).map(([key, values]) => (
                    <DataList.Item key={key}>
                      <DataList.Label>{key}</DataList.Label>
                      <DataList.Value>{values}</DataList.Value>
                    </DataList.Item>
                  ))}
                </DataList.Root>
              </Box>
            </Tabs.Content>

            <Tabs.Content value="cookies">
              <Box pt="2">
                <DataList.Root>
                  {response && response.cookies && response.cookies.length > 0 &&
                    response.cookies.map((cookie, index) => (
                      <DataList.Item key={index}>
                        <DataList.Label>{cookie.name} ({cookie.domain})</DataList.Label>
                        <DataList.Value>{cookie.value}</DataList.Value>
                      </DataList.Item>
                    ))
                  }
                </DataList.Root>
              </Box>
            </Tabs.Content>
          </Tabs.Root>
        </Section>
      )}
    </Box>
  );
}
