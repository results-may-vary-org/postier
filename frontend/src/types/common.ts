import {main} from "../../wailsjs/go/models";
import DirectoryTree = main.DirectoryTree;

export type Theme = "system" | "dark" | "light";

export type BodyType = "json" | "text" | "none" | "xml" | "sparql";

export interface KeyValue {
  key: string;
  value: string;
}

export interface Collection {
  id: string;
  name: string;
  path: string;
  tree: DirectoryTree;
}

