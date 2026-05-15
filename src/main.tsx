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
    queries: { staleTime: 1000 * 60, retry: false },
  },
});

async function init() {
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
