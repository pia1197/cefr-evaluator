export const metadata = {
  title: 'CEFR English Evaluator · AI Assessment',
  description: 'Evaluación inteligente de Speaking y Writing según el Marco Común Europeo',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
