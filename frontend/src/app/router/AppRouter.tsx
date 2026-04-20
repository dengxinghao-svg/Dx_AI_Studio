import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProjectPage } from '../../pages/project/ProjectPage'
import { SettingsPage } from '../../pages/settings/SettingsPage'
import { WorkspacePage } from '../../pages/workspace/WorkspacePage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/workspace" replace />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="/project/:projectId" element={<ProjectPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </BrowserRouter>
  )
}
