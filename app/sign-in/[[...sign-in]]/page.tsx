import type { Metadata } from 'next'
import { SignIn } from '@clerk/nextjs'

export const metadata: Metadata = {
  title: 'Connexion',
  robots: {
    index: false,
    follow: false,
  },
}

export default function Page() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <SignIn forceRedirectUrl="/dashboard" />
    </div>
  )
}
