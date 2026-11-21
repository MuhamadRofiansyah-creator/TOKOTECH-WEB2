// Minimal chrome for printable documents (invoice): no header, footer or menus.
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-muted/40 py-8 print:bg-white print:py-0">{children}</div>
}
