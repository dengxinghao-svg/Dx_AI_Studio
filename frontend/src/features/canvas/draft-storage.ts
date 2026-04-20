import { db } from '../../shared/storage/db'
import type { CanvasSnapshot } from '../../shared/types/canvas'

export async function getProjectDraft(projectId: string) {
  return db.projectDrafts.get(projectId)
}

export async function getProjectDraftWithTimeout(projectId: string, timeoutMs = 2000) {
  return Promise.race([
    getProjectDraft(projectId),
    new Promise<null>((resolve) => {
      window.setTimeout(() => resolve(null), timeoutMs)
    }),
  ])
}

export async function saveProjectDraft(projectId: string, snapshot: CanvasSnapshot) {
  const updatedAt = new Date().toISOString()
  await db.projectDrafts.put({
    projectId,
    snapshot,
    updatedAt,
  })
  return updatedAt
}
