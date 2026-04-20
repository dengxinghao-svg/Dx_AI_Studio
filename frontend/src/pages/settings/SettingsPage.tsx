import { appConfig } from '../../shared/config/app-config'
import { useI18n } from '../../shared/i18n/useI18n'

export function SettingsPage() {
  const { t } = useI18n()

  return (
    <main className="page-shell">
      <section className="page-card">
        <span className="eyebrow">{t('settings.eyebrow')}</span>
        <h1 className="page-title">{t('settings.title')}</h1>
        <p className="page-copy">{t('settings.summary')}</p>
        <div className="meta-grid">
          <div className="meta-card">
            <span className="meta-label">{t('settings.backendUrl')}</span>
            <strong>{appConfig.backendBaseUrl}</strong>
          </div>
          <div className="meta-card">
            <span className="meta-label">{t('settings.mode')}</span>
            <strong>{appConfig.appMode}</strong>
          </div>
        </div>
      </section>
    </main>
  )
}
