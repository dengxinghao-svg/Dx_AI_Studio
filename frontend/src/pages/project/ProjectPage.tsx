import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { executeNode, executeTextNodeStream } from '../../entities/execution/api'
import { getProject, updateProject } from '../../entities/project/api'
import {
  createDefaultCanvasSnapshot,
  getSnapshotComparableSignature,
  mockCanvas,
  normalizeCanvasSnapshot,
} from '../../features/canvas/mock-canvas'
import { CanvasWorkspace } from '../../features/canvas/CanvasWorkspace'
import {
  getProjectDraftWithTimeout,
  saveProjectDraft,
} from '../../features/canvas/draft-storage'
import { useI18n } from '../../shared/i18n/useI18n'
import type { CanvasSnapshot } from '../../shared/types/canvas'
import { useLocation, useParams } from 'react-router-dom'

export function ProjectPage() {
  const { projectId } = useParams()
  const { t, language } = useI18n()
  const queryClient = useQueryClient()
  const location = useLocation()
  const [draft, setDraft] = useState<CanvasSnapshot | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const skipNextAutosaveRef = useRef(false)
  const openedProjectRef = useRef<string | null>(null)
  const initialSnapshotRef = useRef<CanvasSnapshot | null>(
    (location.state as { initialSnapshot?: CanvasSnapshot } | null)?.initialSnapshot ?? null,
  )

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId!),
    enabled: Boolean(projectId),
  })
  const project = projectQuery.data
  const projectName = project?.name
  const projectEntityId = project?.id

  const { mutateAsync: syncProjectMetadata } = useMutation({
    mutationFn: (payload: Parameters<typeof updateProject>[1]) => updateProject(projectId!, payload),
    onSuccess: (project) => {
      queryClient.setQueryData(['project', project.id], (current: typeof project | undefined) => {
        if (!current) return project
        return JSON.stringify(current) === JSON.stringify(project) ? current : project
      })
    },
  })

  const runNodeMutation = useMutation({
    mutationFn: executeNode,
  })

  useEffect(() => {
    if (!projectId || !projectEntityId) return

    let active = true

    void (async () => {
      try {
        const storedDraft = await getProjectDraftWithTimeout(projectId)
        if (!active) return

        const defaultSnapshot = createDefaultCanvasSnapshot(
          projectName || mockCanvas.nodes[0].title,
          language,
        )
        const seededSnapshot = initialSnapshotRef.current
        const initialSnapshot = seededSnapshot ? normalizeCanvasSnapshot(seededSnapshot) : defaultSnapshot

        const normalizedDraft = normalizeCanvasSnapshot(storedDraft?.snapshot ?? initialSnapshot)
        const nextDraft = normalizedDraft.nodes.length > 0 ? normalizedDraft : defaultSnapshot
        skipNextAutosaveRef.current = Boolean(storedDraft)
        setDraft(nextDraft)
        setSaveState(storedDraft ? 'saved' : seededSnapshot ? 'saving' : 'idle')
        if (openedProjectRef.current !== projectId) {
          openedProjectRef.current = projectId
          void syncProjectMetadata({
            last_opened_at: new Date().toISOString(),
          })
        }
        initialSnapshotRef.current = null
      } catch {
        if (!active) return

        const fallbackDraft = createDefaultCanvasSnapshot(
          projectName || mockCanvas.nodes[0].title,
          language,
        )

        skipNextAutosaveRef.current = true
        setDraft(fallbackDraft)
        setSaveState('idle')
        initialSnapshotRef.current = null
      }
    })()

    return () => {
      active = false
    }
  }, [language, projectEntityId, projectId, projectName, syncProjectMetadata])

  useEffect(() => {
    if (!projectId || !draft) return
    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false
      return
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        const draftUpdatedAt = await saveProjectDraft(projectId, draft)
        await syncProjectMetadata({
          draft_updated_at: draftUpdatedAt,
        })
        setSaveState('saved')
      })()
    }, 450)

    return () => window.clearTimeout(timer)
  }, [draft, projectId, syncProjectMetadata])

  if (!draft || !project) {
    return (
      <main className="page-shell">
        <section className="page-card">
          <span className="eyebrow">{t('common.loading')}</span>
          <h1 className="page-title">{t('project.loadingTitle')}</h1>
          <p className="page-copy">{t('project.loadingSummary')}</p>
        </section>
      </main>
    )
  }

  return (
    <CanvasWorkspace
      projectId={projectId ?? ''}
      projectName={project.name}
      saveState={saveState}
      snapshot={draft}
      lastOpenedAt={project.last_opened_at}
      draftUpdatedAt={project.draft_updated_at}
      onSnapshotChange={(nextSnapshot: CanvasSnapshot) => {
        const currentSignature = draft ? getSnapshotComparableSignature(draft) : null
        const nextSignature = getSnapshotComparableSignature(nextSnapshot)

        if (currentSignature === nextSignature) {
          return
        }

        setSaveState('saving')
        setDraft(nextSnapshot)
      }}
      onRunSelectedNode={async ({ projectId: nextProjectId, node, upstreamContext, onChunk }) =>
        node.type === 'text'
          ? executeTextNodeStream(
              {
                projectId: nextProjectId,
                node,
                upstreamContext,
              },
              {
                onChunk: (event) =>
                  onChunk?.({
                    accumulatedText: event.accumulatedText,
                    chunk: event.chunk,
                    modelUsed: event.modelUsed,
                  }),
              },
            )
          : runNodeMutation.mutateAsync({
              projectId: nextProjectId,
              node,
              upstreamContext,
            })
      }
    />
  )
}
