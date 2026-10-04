type AvatarUser = { name: string; avatarUrl?: string | null }

const sizes = {
  xs: 'size-5 text-[10px]',
  sm: 'size-8 text-sm',
  md: 'size-10 text-lg',
  lg: 'size-24 text-4xl',
}

// Foto enviada ou avatar escolhido; sem nenhum, a inicial do nome
export function UserAvatar({
  user,
  size = 'md',
  className = '',
}: {
  user: AvatarUser
  size?: keyof typeof sizes
  className?: string
}) {
  const base = `grid shrink-0 place-items-center overflow-hidden rounded-full ${sizes[size]} ${className}`

  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt="" className={`${base} bg-brand-100 object-cover`} />
  }
  return (
    <span aria-hidden="true" className={`${base} bg-brand-700 font-bold text-white`}>
      {user.name.trim().charAt(0).toUpperCase()}
    </span>
  )
}
