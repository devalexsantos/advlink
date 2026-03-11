"use client"

import { createContext, useContext, useState } from "react"

type MobilePreviewContextType = {
  mobilePreview: boolean
  setMobilePreview: (v: boolean) => void
}

const MobilePreviewContext = createContext<MobilePreviewContextType>({
  mobilePreview: false,
  setMobilePreview: () => {},
})

export function MobilePreviewProvider({ children }: { children: React.ReactNode }) {
  const [mobilePreview, setMobilePreview] = useState(false)
  return (
    <MobilePreviewContext.Provider value={{ mobilePreview, setMobilePreview }}>
      {children}
    </MobilePreviewContext.Provider>
  )
}

export function useMobilePreview() {
  return useContext(MobilePreviewContext)
}
