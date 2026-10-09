import { createContext, createSignal, useContext, type Accessor, type JSX } from "solid-js"
import { en } from "./en"
import { tr } from "./tr"

export type Locale = "en" | "tr"
export type Key = keyof typeof en

const tables: Record<Locale, Record<Key, string>> = { en, tr }

export function detectLocale(): Locale {
  return Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().startsWith("tr") ? "tr" : "en"
}

export type I18n = {
  locale: Accessor<Locale>
  setLocale(next: Locale): void
  t(key: Key, params?: Record<string, string | number>): string
}

export function createI18n(input: {
  configured?: Locale
  stored: () => unknown
  persist: (next: Locale) => void
}): I18n {
  const detected = detectLocale()
  const [chosen, setChosen] = createSignal<Locale>()
  const stored = () => {
    const value = input.stored()
    return value === "tr" || value === "en" ? value : undefined
  }
  const locale = () => input.configured ?? chosen() ?? stored() ?? detected
  return {
    locale,
    setLocale(next) {
      setChosen(() => next)
      input.persist(next)
    },
    t(key, params) {
      let text = tables[locale()][key] ?? en[key] ?? key
      if (!params) return text
      for (const [name, value] of Object.entries(params)) {
        text = text.replaceAll(`{${name}}`, String(value))
      }
      return text
    },
  }
}

const Ctx = createContext<I18n>()

export function I18nProvider(props: { value: I18n; children: JSX.Element }) {
  return <Ctx.Provider value={props.value}>{props.children}</Ctx.Provider>
}

export function useI18n() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("I18nProvider is missing")
  return ctx
}
