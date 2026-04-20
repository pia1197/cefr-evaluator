export const metadata = {
  title: 'Writing and Speaking Exam · Oxford Centre English',
  description: 'Writing and Speaking exam evaluated by AI according to CEFR descriptors',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
