import '../styles/globals.css';
import React from 'react';
import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { useRouter } from 'next/router';
import ChatWidget from '../components/chat/ChatWidget';

function MyApp({ Component, pageProps }: AppProps) {
   const router = useRouter();
   const [queryClient] = React.useState(() => new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
        },
      },
    }));
   return <QueryClientProvider client={queryClient}>
            <Component {...pageProps} />
            {router.pathname !== '/login' && <ChatWidget />}
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryClientProvider>;
}

export default MyApp;
