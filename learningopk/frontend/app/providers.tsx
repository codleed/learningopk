"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

/**
 * Canonical client-side server-state provider.
 *
 * All new client-side data fetching MUST use TanStack Query (`useQuery`,
 * `useSuspenseQuery`, `useInfiniteQuery`, `useMutation`). Raw `fetch` +
 * `useEffect` + `useState` is banned for server state.
 *
 * Reference implementation: `src/components/forum/forum-thread-feed.tsx`.
 */
export function Providers({ children }: { children: ReactNode }) {
  // One QueryClient per browser session; useState keeps it stable across renders
  // and avoids recreating the cache on every mount (unlike useRef during SSR).
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
