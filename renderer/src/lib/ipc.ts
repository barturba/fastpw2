export type PasswordEntry = {
  id: string
  name: string
  username?: string
  password?: string
  url?: string
  notes?: string
  updatedAt?: number
}

const api = typeof window !== 'undefined' ? window.electronAPI : ({} as any)

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
