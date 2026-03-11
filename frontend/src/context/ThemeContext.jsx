import { createContext, useContext, useEffect } from 'react'

const ThemeContext = createContext(null)

const THEME = 'crimson'

export function ThemeProvider({ children }) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', THEME)
    document.documentElement.setAttribute('data-mode', 'dark')
  }, [])

  return (
    <ThemeContext.Provider value={{ theme: THEME, darkMode: true }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
