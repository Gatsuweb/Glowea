import { SignIn } from '@clerk/nextjs'

export default function Page() {
  return (
    <div>
      <SignIn fallbackRedirectUrl="/dashboard" signUpFallbackRedirectUrl="/dashboard" />
    </div>
  )
}