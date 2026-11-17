import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from 'react-query';

export async function fetchSettings() {
   const res = await fetch(`${window.location.origin}/api/settings`, { method: 'GET' });
   return res.json();
}

export function useFetchSettings() {
   return useQuery('settings', () => fetchSettings());
}

export const useUpdateSettings = (onSuccess:Function|undefined) => {
   const queryClient = useQueryClient();

   return useMutation(async (settings: SettingsType) => {
      // console.log('settings: ', JSON.stringify(settings));

      const headers = new Headers({ 'Content-Type': 'application/json', Accept: 'application/json' });
      const fetchOpts = { method: 'PUT', headers, body: JSON.stringify({ settings }) };
      const res = await fetch(`${window.location.origin}/api/settings`, fetchOpts);
      if (res.status >= 400 && res.status < 600) {
         throw new Error('Bad response from server');
      }
      return res.json();
   }, {
      onSuccess: async () => {
         if (onSuccess) {
            onSuccess();
         }
         toast('Đã lưu cài đặt!', { icon: '✔️' });
         queryClient.invalidateQueries(['settings']);
      },
      onError: () => {
         console.log('Error Updating App Settings!!!');
         toast('Không lưu được cài đặt.', { icon: '⚠️' });
      },
   });
};

export function useClearFailedQueue(onSuccess:Function) {
   const queryClient = useQueryClient();
   return useMutation(async () => {
      const headers = new Headers({ 'Content-Type': 'application/json', Accept: 'application/json' });
      const fetchOpts = { method: 'PUT', headers };
      const res = await fetch(`${window.location.origin}/api/clearfailed`, fetchOpts);
      if (res.status >= 400 && res.status < 600) {
         throw new Error('Bad response from server');
      }
      return res.json();
   }, {
      onSuccess: async () => {
         onSuccess();
         toast('Đã xóa hàng đợi lỗi', { icon: '✔️' });
         queryClient.invalidateQueries(['settings']);
      },
      onError: () => {
         console.log('Error Clearing Failed Queue!!!');
         toast('Không xóa được hàng đợi lỗi.', { icon: '⚠️' });
      },
   });
}

export async function fetchMigrationStatus() {
   const res = await fetch(`${window.location.origin}/api/dbmigrate`, { method: 'GET' });
   return res.json();
}

export function useCheckMigrationStatus() {
   return useQuery('dbmigrate', () => fetchMigrationStatus());
}

export const useMigrateDatabase = (onSuccess:Function|undefined) => {
   const queryClient = useQueryClient();

   return useMutation(async () => {
      // console.log('settings: ', JSON.stringify(settings));
      const res = await fetch(`${window.location.origin}/api/dbmigrate`, { method: 'POST' });
      if (res.status >= 400 && res.status < 600) {
         throw new Error('Bad response from server');
      }
      return res.json();
   }, {
      onSuccess: async (res) => {
         if (onSuccess) {
            onSuccess(res);
         }
         toast('Đã cập nhật cơ sở dữ liệu!', { icon: '✔️' });
         queryClient.invalidateQueries(['settings']);
      },
      onError: () => {
         console.log('Error Updating Database!!!');
         toast('Không cập nhật được cơ sở dữ liệu.', { icon: '⚠️' });
      },
   });
};
