import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import {
  createProject,
  duplicateProject,
  listProjects,
  updateProject,
} from '../../entities/project/api'
import { workflowTemplates } from '../../features/templates/workflow-templates'
import { useI18n } from '../../shared/i18n/useI18n'
import type { CanvasSnapshot } from '../../shared/types/canvas'
import type { Project } from '../../shared/types/project'

export function WorkspacePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t, locale, language } = useI18n()

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
  })

  const createProjectMutation = useMutation({
    mutationFn: (payload: { name?: string; initialSnapshot?: CanvasSnapshot }) =>
      createProject({ name: payload.name }),
    onSuccess: (project, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      navigate(`/project/${project.id}`, {
        state: variables.initialSnapshot ? { initialSnapshot: variables.initialSnapshot } : undefined,
      })
    },
  })

  const updateProjectMutation = useMutation({
    mutationFn: ({ projectId, payload }: { projectId: string; payload: Parameters<typeof updateProject>[1] }) =>
      updateProject(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  const duplicateProjectMutation = useMutation({
    mutationFn: duplicateProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  function handleCreateBlankProject() {
    const name = window.prompt(t('workspace.createPromptTitle'), t('common.untitledProject'))?.trim()
    createProjectMutation.mutate({
      name: name || t('common.untitledProject'),
      initialSnapshot: undefined,
    })
  }

  function handleCreateFromTemplate(templateKey: string) {
    const template = workflowTemplates.find((item) => item.key === templateKey)
    if (!template) return

    const defaultName = template.createProjectName(language)
    const name = window.prompt(t('workspace.createPromptTitle'), defaultName)?.trim() || defaultName

    createProjectMutation.mutate({
      name,
      initialSnapshot: template.buildSnapshot(language, name),
    })
  }

  function handleRenameProject(project: Project) {
    const nextName = window.prompt(t('workspace.renamePromptTitle'), project.name)?.trim()
    if (!nextName || nextName === project.name) return

    updateProjectMutation.mutate({
      projectId: project.id,
      payload: { name: nextName },
    })
  }

  function handleArchiveProject(project: Project) {
    const confirmed = window.confirm(
      project.archived
        ? t('workspace.restoreConfirm', { name: project.name })
        : t('workspace.archiveConfirm', { name: project.name }),
    )

    if (!confirmed) return

    updateProjectMutation.mutate({
      projectId: project.id,
      payload: { archived: !project.archived },
    })
  }

  return (
    <main className="page-shell">
      <section className="page-card">
        <span className="eyebrow">Dx AI Studio V2</span>
        <h1 className="page-title">{t('workspace.title')}</h1>
        <p className="page-copy">{t('workspace.summary')}</p>
        <div className="meta-grid">
          <div className="meta-card">
            <span className="meta-label">{t('workspace.projects')}</span>
            <strong>{projectsQuery.data?.length ?? 0}</strong>
          </div>
          <div className="meta-card">
            <span className="meta-label">{t('workspace.archived')}</span>
            <strong>{projectsQuery.data?.filter((project) => project.archived).length ?? 0}</strong>
          </div>
          <div className="meta-card">
            <span className="meta-label">{t('workspace.backendState')}</span>
            <strong>{projectsQuery.isSuccess ? t('common.connected') : t('common.disconnected')}</strong>
          </div>
        </div>
        <div className="action-row">
          <button className="primary-button" onClick={handleCreateBlankProject} type="button">
            {t('workspace.newProject')}
          </button>
          <Link className="secondary-button" to="/settings">
            {t('workspace.runtimeSettings')}
          </Link>
        </div>
      </section>

      <section className="page-card">
        <span className="eyebrow">{t('workspace.templatesTitle')}</span>
        <h2 className="section-title">{t('workspace.templatesSummary')}</h2>
        <div className="template-grid">
          {workflowTemplates.map((template) => (
            <article className="template-card" key={template.key}>
              <h3 className="template-card__title">{template.title[language]}</h3>
              <p className="template-card__summary">{template.summary[language]}</p>
              <button
                className="secondary-button template-card__action"
                type="button"
                onClick={() => handleCreateFromTemplate(template.key)}
              >
                {t('workspace.createFromTemplate')}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="page-card">
        <span className="eyebrow">{t('workspace.projectSection')}</span>
        {projectsQuery.isLoading ? <p className="page-copy">{t('workspace.loadingProjects')}</p> : null}
        {projectsQuery.isError ? <p className="page-copy">{t('workspace.failedProjects')}</p> : null}

        {projectsQuery.data?.length ? (
          <div className="project-list">
            {projectsQuery.data.map((project) => (
              <article className="project-item" key={project.id}>
                <div className="project-item__main">
                  <span className="meta-label">
                    {project.archived ? t('workspace.archivedState') : t('workspace.active')}
                  </span>
                  <h2 className="project-item__title">{project.name}</h2>
                  <p className="project-item__meta">
                    {t('workspace.updatedAt')} {new Date(project.updated_at).toLocaleString(locale)}
                    {project.draft_updated_at
                      ? ` · ${t('workspace.draftUpdatedAt')} ${new Date(project.draft_updated_at).toLocaleString(locale)}`
                      : ''}
                  </p>
                </div>
                <div className="project-item__actions">
                  <Link className="secondary-button" to={`/project/${project.id}`}>
                    {t('workspace.open')}
                  </Link>
                  <button className="secondary-button" onClick={() => handleRenameProject(project)} type="button">
                    {t('workspace.rename')}
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => duplicateProjectMutation.mutate(project.id)}
                    type="button"
                  >
                    {t('workspace.duplicate')}
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => handleArchiveProject(project)}
                    type="button"
                  >
                    {project.archived ? t('workspace.restore') : t('workspace.archive')}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="page-copy">{t('workspace.noProjects')}</p>
        )}
      </section>
    </main>
  )
}
