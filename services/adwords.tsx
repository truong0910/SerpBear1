import { NextRouter } from 'next/router';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from 'react-query';

export function useTestAdwordsIntegration(onSuccess?: Function) {
   return useMutation(async (payload:{developer_token:string, account_id:string}) => {
      const headers = new Headers({ 'Content-Type': 'application/json', Accept: 'application/json' });
      const fetchOpts = { method: 'POST', headers, body: JSON.stringify({ ...payload }) };
      const res = await fetch(`${window.location.origin}/api/adwords`, fetchOpts);
      if (res.status >= 400 && res.status < 600) {
         throw new Error('Bad response from server');
      }
      return res.json();
   }, {
      onSuccess: async (data) => {
         console.log('Ideas Added:', data);
         toast('Đã kết nối Google Ads!', { icon: '✔️' });
         if (onSuccess) {
            onSuccess(false);
         }
      },
      onError: (error) => {
         console.log('Error Loading Keyword Ideas!!!', error);
         toast('Không kết nối được Google Ads. Hãy kiểm tra lại thông tin đã nhập.', { icon: '⚠️' });
      },
   });
}

export async function fetchAdwordsKeywordIdeas(router: NextRouter, domainSlug: string) {
   // if (!router.query.slug) { throw new Error('Invalid Domain Name'); }
   const res = await fetch(`${window.location.origin}/api/ideas?domain=${domainSlug}`, { method: 'GET' });
   if (res.status >= 400 && res.status < 600) {
      if (res.status === 401) {
         console.log('Unauthorized!!');
         router.push('/login');
      }
      throw new Error('Bad response from server');
   }
   return res.json();
}

export function useFetchKeywordIdeas(router: NextRouter, adwordsConnected = false) {
   const isResearch = router.pathname === '/research';
   const domainSlug = isResearch ? 'research' : (router.query.slug as string);
   const enabled = !!(adwordsConnected && domainSlug);
   return useQuery(`keywordIdeas-${domainSlug}`, () => domainSlug && fetchAdwordsKeywordIdeas(router, domainSlug), { enabled, retry: false });
}

export function useMutateKeywordIdeas(router:NextRouter, onSuccess?: Function) {
   const queryClient = useQueryClient();
   const domainSlug = router.pathname === '/research' ? 'research' : router.query.slug as string;
   return useMutation(async (data:Record<string, any>) => {
      const headers = new Headers({ 'Content-Type': 'application/json', Accept: 'application/json' });
      const fetchOpts = { method: 'POST', headers, body: JSON.stringify({ ...data }) };
      const res = await fetch(`${window.location.origin}/api/ideas`, fetchOpts);
      if (res.status >= 400 && res.status < 600) {
         throw new Error('Bad response from server');
      }
      return res.json();
   }, {
      onSuccess: async (data) => {
         console.log('Ideas Added:', data);
         toast('Đã tải gợi ý từ khóa!', { icon: '✔️' });
         if (onSuccess) {
            onSuccess(false);
         }
         queryClient.invalidateQueries([`keywordIdeas-${domainSlug}`]);
      },
      onError: (error) => {
         console.log('Error Loading Keyword Ideas!!!', error);
         toast('Không tải được gợi ý từ khóa', { icon: '⚠️' });
      },
   });
}

export function useMutateFavKeywordIdeas(router:NextRouter, onSuccess?: Function) {
   const queryClient = useQueryClient();
   const domainSlug = router.pathname === '/research' ? 'research' : router.query.slug as string;
   return useMutation(async (payload:Record<string, any>) => {
      const headers = new Headers({ 'Content-Type': 'application/json', Accept: 'application/json' });
      const fetchOpts = { method: 'PUT', headers, body: JSON.stringify({ ...payload }) };
      const res = await fetch(`${window.location.origin}/api/ideas`, fetchOpts);
      if (res.status >= 400 && res.status < 600) {
         throw new Error('Bad response from server');
      }
      return res.json();
   }, {
      onSuccess: async (data) => {
         console.log('Ideas Added:', data);
         // toast('Keyword Updated!', { icon: '✔️' });
         if (onSuccess) {
            onSuccess(false);
         }
         queryClient.invalidateQueries([`keywordIdeas-${domainSlug}`]);
      },
      onError: (error) => {
         console.log('Không đánh dấu yêu thích được', error);
         toast('Không đánh dấu yêu thích được', { icon: '⚠️' });
      },
   });
}

export function useMutateKeywordsVolume(onSuccess?: Function) {
   return useMutation(async (data:Record<string, any>) => {
      const headers = new Headers({ 'Content-Type': 'application/json', Accept: 'application/json' });
      const fetchOpts = { method: 'POST', headers, body: JSON.stringify({ ...data }) };
      const res = await fetch(`${window.location.origin}/api/volume`, fetchOpts);
      if (res.status >= 400 && res.status < 600) {
         const errorData = await res.json();
         throw new Error(errorData?.error ? errorData.error : 'Bad response from server');
      }
      return res.json();
   }, {
      onSuccess: async (data) => {
         toast('Đã cập nhật lượt tìm kiếm! Đang tải lại trang...', { icon: '✔️' });
         if (onSuccess) {
            onSuccess(false);
         }
        setTimeout(() => {
         window.location.reload();
        }, 3000);
      },
      onError: (error) => {
         console.log('Error Loading Keyword Volume Data!!!', error);
         toast('Không tải được lượt tìm kiếm', { icon: '⚠️' });
      },
   });
}
