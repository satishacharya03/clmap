'use client'
import { useState, useEffect } from 'react'

export type Theme = 'light' | 'dark'

export function useTheme() {
    const [theme, setTheme] = useState<Theme>('light')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const saved = (localStorage.getItem('campusnav-theme') as Theme) || 'light'
        setTheme(saved)
        document.documentElement.setAttribute('data-theme', saved)
    }, [])

    const toggleTheme = () => {
        const next: Theme = theme === 'light' ? 'dark' : 'light'
        setTheme(next)
        localStorage.setItem('campusnav-theme', next)
        document.documentElement.setAttribute('data-theme', next)
    }

    return { theme, toggleTheme, isDark: theme === 'dark', mounted }
}
