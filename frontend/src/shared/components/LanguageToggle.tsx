import { useI18n } from '../i18n/useI18n'

export function LanguageToggle() {
  const { language, setLanguage, t } = useI18n()

  return (
    <div className="language-toggle" aria-label={t('common.language')}>
      <button
        type="button"
        className={language === 'zh-CN' ? 'is-active' : ''}
        onClick={() => setLanguage('zh-CN')}
      >
        {t('common.chinese')}
      </button>
      <button
        type="button"
        className={language === 'en-US' ? 'is-active' : ''}
        onClick={() => setLanguage('en-US')}
      >
        {t('common.english')}
      </button>
    </div>
  )
}
