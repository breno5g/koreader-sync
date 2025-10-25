export interface KORStats {
  highlights?: number;
  authors?: string;
  title?: string;
  pages?: number;
  series?: string;
  language?: string;
  notes?: number;
  performance_in_pages?: object;
}

export interface Annotation {
  datetime: string;
  pageno: number;
  chapter?: string;
  text: string;
  note?: string;
}

export interface KORMetadata {
  stats?: KORStats;
  annotations: Annotation[];
}

export interface KOReaderSyncSettings {
  port: number;
  validDeviceIDs: string[];
  isServerEnabled: boolean;
}
