export type EntryField = {
  id: string
  label: string
  type: 'text' | 'password'
  value: string
}

export type PasswordEntry = {
  id: string
  company?: string
  name: string
  username?: string
  password?: string
  url?: string
  notes?: string
  fields?: EntryField[]
  updatedAt?: number
}

interface ElectronAPI {
  checkFirstRun: () => Promise<boolean>
  setMasterPassword: (password: string) => Promise<{ success: boolean; error?: string }>
  verifyMasterPassword: (password: string) => Promise<{ success: boolean; error?: string }>
  loadData: (masterPassword: string) => Promise<{ success: boolean; data?: PasswordEntry[]; error?: string }>
  saveData: (data: { entries: PasswordEntry[]; masterPassword: string }) => Promise<{ success: boolean; error?: string }>
  setWindowSize: (width: number, height: number, center?: boolean) => Promise<void>
}

const api = typeof window !== 'undefined' ? (window as Window & { electronAPI: ElectronAPI }).electronAPI : {} as ElectronAPI

export const ipc = {
  async checkFirstRun() {
    return api.checkFirstRun()
  },
  async setMasterPassword(password: string) {
    return api.setMasterPassword(password)
  },
  async verifyMasterPassword(password: string) {
    return api.verifyMasterPassword(password)
  },
  async loadData(masterPassword: string) {
    return api.loadData(masterPassword)
  },
  async saveData(entries: PasswordEntry[], masterPassword: string) {
    return api.saveData({ entries, masterPassword })
  },
  async setWindowSize(width: number, height: number, center = true) {
    return api.setWindowSize(width, height, center)
  },
}
