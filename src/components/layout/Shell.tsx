'use client'

import type { ReactNode } from 'react'

type ShellProps = {
  children: ReactNode
}

export function Shell({ children }: ShellProps) {
  return <>{children}</>
}

export default Shell