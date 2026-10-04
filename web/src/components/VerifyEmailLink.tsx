import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'

// Leva à confirmação de e-mail e, depois, de volta para onde a pessoa estava
export function VerifyEmailLink({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  const location = useLocation()
  return (
    <Link to="/confirmar-email" state={{ from: location.pathname }} className={className}>
      {children}
    </Link>
  )
}
