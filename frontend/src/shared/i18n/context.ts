import { createContext } from 'react'
import type { AppLanguage } from './messages'

export type TranslationVariables = Record<string, string | number>

export interface I18nContextValue {
  language: AppLanguage
  locale: string
  setLanguage: (language: AppLanguage) => void
  t: (key: string, variables?: TranslationVariables) => string
}

export const I18nContext = createContext<I18nContextValue | null>(null)
