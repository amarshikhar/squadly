import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-mono uppercase tracking-wider',
  {
    variants: {
      variant: {
        default: 'border-border-bright bg-neon-cyan/10 text-neon-cyan',
        magenta: 'border-border-magenta bg-neon-magenta/10 text-neon-magenta',
        green: 'border-neon-green/30 bg-neon-green/10 text-neon-green',
        amber: 'border-neon-amber/30 bg-neon-amber/10 text-neon-amber',
        muted: 'border-border bg-surface text-text-2',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
