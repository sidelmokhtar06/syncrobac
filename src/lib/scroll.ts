import { createContext, useContext, type RefObject } from 'react'

// The app scrolls inside <main>, not the window; pages use this for scroll-linked effects.
export const ScrollContainer = createContext<RefObject<HTMLElement | null>>({ current: null })
export const useScrollContainer = () => useContext(ScrollContainer)
