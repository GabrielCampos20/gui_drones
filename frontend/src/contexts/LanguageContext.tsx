import { createContext, useContext, useState, type ReactNode } from 'react'
import { translations, type TranslationKey } from '../lib/translations'

type Language = 'en' | 'pt'

type LanguageContextType = {
    language: Language
    setLanguage: (lang: Language) => void
    t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextType | null>(null)

export function useLanguage() {
    const ctx = useContext(LanguageContext)
    if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>')
    return ctx
}

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>(() => {
        const stored = localStorage.getItem('gui_drones_lang')
        return (stored === 'pt' || stored === 'en') ? stored : 'en'
    })

    function setLanguage(lang: Language) {
        setLanguageState(lang)
        localStorage.setItem('gui_drones_lang', lang)
    }

    function t(key: TranslationKey): string {
        const dict = translations[language] || translations.en
        return dict[key] || translations.en[key] || String(key)
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    )
}
