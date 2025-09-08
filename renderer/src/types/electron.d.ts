export {};

interface PasswordEntry {
  id: string;
  company?: string;
  name: string;
  username?: string;
  password?: string;
  url?: string;
  notes?: string;
  fields?: Array<{
    id: string;
    label: string;
    type: 'text' | 'password';
    value: string;
  }>;
  updatedAt?: number;
}

interface TokenData {
  hash: string;
  salt: string;
  created: number;
  lastUsed: number;
}

declare global {
  interface ElectronAPI {
    saveData: (data: { entries: PasswordEntry[]; masterPassword: string }) => Promise<{ success: boolean; error?: string }>;
    loadData: (masterPassword: string) => Promise<{ success: boolean; data?: PasswordEntry[]; needsSetup?: boolean; error?: string }>;
    setMasterPassword: (password: string) => Promise<{ success: boolean; error?: string }>;
    verifyMasterPassword: (password: string) => Promise<{ success: boolean; valid?: boolean; error?: string }>;
    debugHashFile: () => Promise<{ success: boolean; exists?: boolean; hashPath?: string; hashContent?: string; error?: string }>;
    checkFirstRun: () => Promise<{ success: boolean; exists?: boolean; error?: string }>;
    cacheGetMaster: () => Promise<{ success: boolean; tokenData?: TokenData; error?: string }>;
    cacheVerifyMaster: (password: string) => Promise<{ success: boolean; valid?: boolean; error?: string }>;
    cacheSaveMaster: (password: string) => Promise<{ success: boolean; error?: string }>;
    cacheTouchMaster: () => Promise<{ success: boolean; error?: string }>;
    cacheClearMaster: () => Promise<{ success: boolean; error?: string }>;
    setWindowSize: (width: number, height: number, center?: boolean) => Promise<{ success: boolean; error?: string }>;
  }

  interface Window {
    electronAPI: ElectronAPI;
  }
}
