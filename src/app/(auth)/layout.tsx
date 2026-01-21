/**
 * Auth layout - minimal layout for authentication pages
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/images/login-background.png')`,
        }}
      />

      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/70 via-teal-900/60 to-green-900/70" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md p-4 sm:p-8">
        {children}
      </div>
    </div>
  )
}
