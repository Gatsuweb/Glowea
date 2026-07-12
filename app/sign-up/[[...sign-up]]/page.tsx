import type { Metadata } from 'next'
import { SignUp } from '@clerk/nextjs'

export const metadata: Metadata = {
  title: 'Inscription',
  robots: {
    index: false,
    follow: false,
  },
}

function getSafeRedirectUrl(value: string | string[] | undefined) {
  const redirectUrl = Array.isArray(value) ? value[0] : value;
  if (!redirectUrl?.startsWith("/") || redirectUrl.startsWith("//")) return "/dashboard";
  return redirectUrl;
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ redirect_url?: string | string[] }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const redirectUrl = getSafeRedirectUrl(resolvedSearchParams.redirect_url);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <SignUp forceRedirectUrl={redirectUrl} />
    </div>
  )
}
