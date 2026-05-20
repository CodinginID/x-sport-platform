import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import App from './App';
import './index.css';
import { seedDatabase } from '@/database/seed';
import { useBackupStore, createNewCredentials } from '@/stores/backup';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // 5 min — local IndexedDB data doesn't go stale fast
      gcTime: 1000 * 60 * 10,    // keep cache 10 min after last subscriber unmounts
      retry: false,
    },
  },
});

async function init() {
  // Request persistent storage so the browser won't evict IndexedDB under
  // storage pressure or after periods of inactivity. Critical for offline data
  // safety — without this, Safari iOS clears IndexedDB after ~7 days idle.
  if (navigator.storage?.persist) {
    const granted = await navigator.storage.persist();
    if (!granted) {
      console.warn('[storage] Persistent storage NOT granted — data may be evicted by the browser. Install the app to the home screen to improve persistence.');
    }
  }

  await seedDatabase();

  // Generate Studio ID + PIN on first open
  const { studioId, setCredentials } = useBackupStore.getState();
  if (!studioId) {
    const creds = createNewCredentials();
    setCredentials(creds.studioId, creds.pin);
  }
}

init().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
});
