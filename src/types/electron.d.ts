export interface ElectronAPI {
  platform: string;
  versions: NodeJS.ProcessVersions;
  executePython: (code: string) => Promise<{
    success: boolean;
    output?: string;
    error?: string;
  }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
