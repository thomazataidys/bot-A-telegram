import * as React from 'react';
import type { Metadata } from 'next';
import { PreviewClient } from './preview-client';

export const metadata: Metadata = {
  title: 'Preview de Componentes',
};

export default function DevPreviewPage(): React.JSX.Element {
  return <PreviewClient />;
}
