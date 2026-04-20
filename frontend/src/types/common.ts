import {main} from "../../wailsjs/go/models";
import DirectoryTree = main.DirectoryTree;

export type Theme = "system" | "dark" | "light";

export type BodyType = "json" | "text" | "none" | "xml" | "sparql" | "raw";

export interface KeyValue {
  key: string;
  value: string;
  /** Whether this entry is included when the request is sent. Defaults to true. */
  enabled?: boolean;
}

export interface Collection {
  id: string;
  name: string;
  path: string;
  tree: DirectoryTree;
}

