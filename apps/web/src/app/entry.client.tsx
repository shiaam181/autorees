import { startTransition } from 'react';
import { createRoot } from 'react-dom/client';
import { HydratedRouter } from 'react-router/dom';

startTransition(() => {
  const root = createRoot(document);
  root.render(<HydratedRouter />);
});
