/** Explicit component fixture; never an athlete plan or live-flow proof. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '@/contexts/AuthContext';
import { CoachPlanActuals } from '@/components/coach/CoachPlanActuals';
import '@/index.css';
const root = document.getElementById('root');
if (root) createRoot(root).render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AuthContext.Provider value={{ user: { id: 'fixture-coach' }, loading: false, isAuthStable: true } as React.ContextType<typeof AuthContext>}><main className="p-4"><CoachPlanActuals athleteId="fixture-player" planDate="2026-10-24" /></main></AuthContext.Provider></QueryClientProvider>);