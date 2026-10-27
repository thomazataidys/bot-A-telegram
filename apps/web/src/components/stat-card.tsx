import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badgeText?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  badgeText,
  badgeVariant = 'secondary',
  icon: Icon,
  className,
}: StatCardProps): React.JSX.Element {
  return (
    <Card className={cn('transition-shadow hover:shadow-md', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          {badgeText && (
            <Badge variant={badgeVariant} className="text-[11px]">
              {badgeText}
            </Badge>
          )}
        </div>
        {subtitle && (
          <CardDescription className="text-xs leading-relaxed">
            {subtitle}
          </CardDescription>
        )}
      </CardContent>
    </Card>
  );
}
