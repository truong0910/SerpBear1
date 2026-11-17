import { useQuery } from 'react-query';
import type { ChatAction } from '../utils/chat/tools';

export type ChatMessage = { role: 'user' | 'model', text: string };
export type ChatReply = { reply: string, action?: ChatAction };

export function useChatStatus() {
   return useQuery('chatStatus', async (): Promise<{ enabled: boolean }> => {
      const res = await fetch(`${window.location.origin}/api/chat`, { method: 'GET' });
      if (!res.ok) { throw new Error('Bad response from server'); }
      return res.json();
   }, { refetchOnWindowFocus: false });
}

const post = async (url: string, body?: unknown) => {
   const res = await fetch(`${window.location.origin}${url}`, {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: body === undefined ? undefined : JSON.stringify(body),
   });
   const data = await res.json().catch(() => ({}));
   if (!res.ok) { throw new Error(data?.error || 'Có lỗi xảy ra, thử lại sau.'); }
   return data;
};

export const sendChat = (messages: ChatMessage[], context: { domain?: string }): Promise<ChatReply> => post('/api/chat', { messages, context });

/** Runs a confirmed assistant action using the app's existing endpoints. */
export const runChatAction = async (action: ChatAction): Promise<string> => {
   if (action.type === 'add_keywords') {
      await post('/api/keywords', { keywords: action.payload.keywords });
      return `Đã thêm ${action.payload.keywords.length} từ khóa, đang cập nhật thứ hạng.`;
   }
   const { payload } = action;
   await post('ids' in payload ? `/api/refresh?id=${payload.ids.join(',')}` : `/api/refresh?id=all&domain=${encodeURIComponent(payload.domain)}`);
   return 'Đã yêu cầu cập nhật thứ hạng.';
};
