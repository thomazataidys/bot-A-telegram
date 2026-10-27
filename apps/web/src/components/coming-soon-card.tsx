import * as React from 'react';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export interface ComingSoonCardProps {
  title: string;
  subtitle: string;
  description: string;
  features: readonly string[];
  icon: React.ComponentType<{ className?: string }>;
}

export function ComingSoonCard({
  title,
  subtitle,
  description,
  features,
  icon: Icon,
}: ComingSoonCardProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <Badge variant="secondary" className="w-fit gap-1.5 px-3 py-1">
          <Clock className="h-3.5 w-3.5 text-primary" />
          Em breve
        </Badge>
      </div>

      <Card className="border-dashed">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg">
                Módulo em integração com o Core
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted/50 p-4 border">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Funcionalidades previstas nesta tela
            </p>
            <ul className="grid gap-2 sm:grid-cols-2 text-sm text-foreground/90">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
