import './globals.css'
import { PostHogProvider, ThemeProvider } from './providers'
import { Toaster } from '@/components/ui/toaster'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Namtech - AI Assistant',
  description: "Advanced AI assistant with PDF chat, image analysis, and real-time information",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <PostHogProvider>
        <body className={inter.className} suppressHydrationWarning>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
          <Toaster />
        </body>
      </PostHogProvider>
    </html>
  )
}
