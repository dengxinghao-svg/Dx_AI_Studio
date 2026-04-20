import { apiFetch } from '../../shared/api/http'
import type { Project } from '../../shared/types/project'

export function listProjects() {
  return apiFetch<Project[]>('/api/v1/projects')
}

export function getProject(projectId: string) {
  return apiFetch<Project>(`/api/v1/projects/${projectId}`)
}

export function createProject(payload: { name?: string }) {
  return apiFetch<Project>('/api/v1/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateProject(
  projectId: string,
  payload: {
    name?: string
    archived?: boolean
    last_opened_at?: string
    draft_updated_at?: string
  },
) {
  return apiFetch<Project>(`/api/v1/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function duplicateProject(projectId: string) {
  return apiFetch<Project>(`/api/v1/projects/${projectId}/duplicate`, {
    method: 'POST',
  })
}
