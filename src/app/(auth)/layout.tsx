/**
 * Auth layout - minimal layout for authentication pages
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
      <div className="w-full max-w-md p-8">
        {children}
      </div>
    </div>
  )
}
