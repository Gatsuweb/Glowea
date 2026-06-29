import type { Metadata } from 'next'
import { SignUp } from '@clerk/nextjs'

export const metadata: Metadata = {
  title: 'Inscription',
  robots: {
    index: false,
    follow: false,
  },
}

export default function Page() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <SignUp forceRedirectUrl="/dashboard" />
    </div>
  )
}
