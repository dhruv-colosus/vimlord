/// <reference types="vite/client" />
import type { ReactNode } from 'react'
import { createRootRoute, HeadContent, Link, Outlet, Scripts } from '@tanstack/react-router'
import appCss from '../styles.css?url'
import { Shell } from '../components/Chrome'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: 'Vimlord · Learn Vim by playing' },
      { name: 'description', content: 'Bite-sized, gamified lessons that teach Vim one key at a time.' },
      { name: 'theme-color', content: '#f2f2f7' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap',
      },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
    ],
  }),
  component: RootComponent,
  notFoundComponent: () => (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="label-mono">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">E486: Pattern not found</h1>
      <p className="mt-2 text-muted">That page doesn’t exist.</p>
      <Link to="/" className="mt-6 inline-block rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
        Back to lessons
      </Link>
    </main>
  ),
})

function RootComponent() {
  return (
    <RootDocument>
      <Shell>
        <Outlet />
      </Shell>
    </RootDocument>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
