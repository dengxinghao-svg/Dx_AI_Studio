import Dexie, { type Table } from 'dexie'
import type { CanvasSnapshot } from '../types/canvas'

export interface ProjectDraftRecord {
  projectId: string
  snapshot: CanvasSnapshot
  updatedAt: string
}

class DxAiStudioDb extends Dexie {
  projectDrafts!: Table<ProjectDraftRecord, string>

  constructor() {
    super('dx-ai-studio-v2')
    this.version(1).stores({
      projectDrafts: '&projectId, updatedAt',
    })
  }
}

export const db = new DxAiStudioDb()
