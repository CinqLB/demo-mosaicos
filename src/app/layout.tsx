import './globals.css'
import ThemeRegistry from '@/components/providers/ThemeRegistry'

export const metadata = {
  title: 'Simulador de mosaicos',
  description: 'Demo profesional de simulador de mosaicos hidráulicos',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  )
}
