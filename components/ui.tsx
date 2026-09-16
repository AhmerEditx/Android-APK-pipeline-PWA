import Link from 'next/link'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-lime-400 text-zinc-950 hover:bg-lime-300 focus-visible:ring-lime-400/60',
  secondary:
    'bg-zinc-900 text-zinc-100 border border-zinc-800 hover:bg-zinc-800 focus-visible:ring-zinc-500/60',
  ghost: 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900',
  danger:
    'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 focus-visible:ring-red-500/60',
}

const baseButton =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:pointer-events-none disabled:opacity-50'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: 'sm' | 'md'
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`${baseButton} ${buttonStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    />
  )
}

export function LinkButton({
  href,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
}: {
  href: string
  variant?: ButtonVariant
  size?: 'sm' | 'md'
  className?: string
  children: React.ReactNode
}) {
  return (
    <Link href={href} className={`${baseButton} ${buttonStyles[variant]} ${sizeStyles[size]} ${className}`}>
      {children}
    </Link>
  )
}

const inputBase =
  'w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-lime-400/50'

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props
  return <input className={`${inputBase} ${className}`} suppressHydrationWarning {...rest} />
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props
  return <textarea className={`${inputBase} resize-none ${className}`} {...rest} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = '', ...rest } = props
  return <select className={`${inputBase} ${className}`} {...rest} />
}

export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900/60 ${className}`}>{children}</div>
  )
}

export function Badge({
  children,
  tone = 'default',
}: {
  children: React.ReactNode
  tone?: 'default' | 'accent' | 'muted' | 'danger'
}) {
  const tones = {
    default: 'bg-zinc-800 text-zinc-300',
    accent: 'bg-lime-400/10 text-lime-300 border border-lime-400/30',
    muted: 'bg-zinc-800/60 text-zinc-500',
    danger: 'bg-red-500/10 text-red-400 border border-red-500/30',
  }
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-zinc-300">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-zinc-500">{hint}</span> : null}
    </label>
  )
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-zinc-400">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <Card className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <p className="text-lg font-semibold text-zinc-200">{title}</p>
      <p className="max-w-sm text-sm text-zinc-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </Card>
  )
}

