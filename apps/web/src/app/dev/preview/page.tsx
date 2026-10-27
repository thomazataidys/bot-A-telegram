import * as React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PreviewClient } from './preview-client';

export const metadata: Metadata = {
  title: 'Preview de Componentes',
};

export default function DevPreviewPage(): React.JSX.Element {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  return <PreviewClient />;
}
