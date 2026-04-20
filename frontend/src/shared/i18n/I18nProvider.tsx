import {
  type PropsWithChildren,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { messages, type AppLanguage } from './messages'
import { I18nContext, type I18nContextValue, type TranslationVariables } from './context'

const STORAGE_KEY = 'dx-ai-studio-language'

function resolveMessage(language: AppLanguage, key: string): string {
  const chain = key.split('.')
  let current: unknown = messages[language]

  for (const segment of chain) {
    if (!current || typeof current !== 'object' || !(segment in current)) {
      return key
    }
    current = (current as Record<string, unknown>)[segment]
  }

  return typeof current === 'string' ? current : key
}

function interpolate(template: string, variables?: TranslationVariables) {
  if (!variables) return template
  return template.replace(/\{(\w+)\}/g, (_, token: string) => String(variables[token] ?? `{${token}}`))
}

function getInitialLanguage(): AppLanguage {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'en-US' ? 'en-US' : 'zh-CN'
}

export function I18nProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<AppLanguage>(getInitialLanguage)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language)
    document.documentElement.lang = language
  }, [language])

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      locale: language,
      setLanguage: (nextLanguage) => setLanguageState(nextLanguage),
      t: (key, variables) => interpolate(resolveMessage(language, key), variables),
    }),
    [language],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
