/* eslint-disable max-len */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useQueryClient } from 'react-query';
import LockedHint from '../common/LockedHint';
import Icon from '../common/Icon';
import ActionCard from './ActionCard';
import MarkdownLite from './MarkdownLite';
import { runChatAction, sendChat, useChatStatus } from '../../services/chat';
import { useFetchDomains } from '../../services/domains';
import type { ChatAction } from '../../utils/chat/tools';

type UIMessage = { role: 'user' | 'model', text: string, action?: ChatAction, system?: boolean };

const SUGGESTIONS = [
   'Website của tôi đang đứng thứ mấy trên Google?',
   'Lượt tìm kiếm là gì?',
   'Gợi ý giúp tôi vài từ khóa mới nên theo dõi',
];

const ChatWidget = () => {
   const router = useRouter();
   const queryClient = useQueryClient();
   const { data: status, isError: statusError } = useChatStatus();
   const { data: domainsData } = useFetchDomains(router);
   const [open, setOpen] = useState(false);
   const [messages, setMessages] = useState<UIMessage[]>([]);
   const [input, setInput] = useState('');
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState('');
   const endRef = useRef<HTMLDivElement>(null);
   const messagesRef = useRef<UIMessage[]>([]);
   messagesRef.current = messages;

   const currentDomain = useMemo(() => {
      const slug = router.query?.slug;
      return domainsData?.domains?.find((d: DomainType) => d.slug === slug)?.domain;
   }, [router.query?.slug, domainsData]);

   useEffect(() => { if (endRef.current?.scrollIntoView) endRef.current.scrollIntoView({ block: 'end' }); }, [messages, loading]);

   const ask = async (history: UIMessage[]) => {
      setLoading(true);
      setError('');
      try {
        const payload = history.map(({ role, text }) => ({ role, text }));
        const { reply, action } = await sendChat(payload, { domain: currentDomain });
        setMessages([...history, { role: 'model', text: reply, action }]);
      } catch (e) {
         setError((e as Error).message || 'Trợ lý gặp lỗi, thử lại sau.');
         setMessages(history);
      } finally {
         setLoading(false);
      }
   };

   const send = (text: string) => {
      const clean = text.trim();
      if (!clean || loading) return;
      setInput('');
      ask([...messages, { role: 'user', text: clean }]);
   };

   const dropAction = (index: number) => setMessages((current) => current.map((m, i) => (i === index ? { ...m, action: undefined } : m)));

   const confirm = (index: number, action: ChatAction) => async () => {
      if (loading) throw new Error('Trợ lý đang trả lời, đợi một chút rồi bấm lại.');
      setLoading(true); // blocks sending / other cards while the action runs
      let note: string;
      try {
         note = await runChatAction(action);
      } catch (e) {
         setLoading(false);
         throw e;
      }
      queryClient.invalidateQueries('keywords');
      queryClient.invalidateQueries('domains');
      const { current } = messagesRef;
      const history: UIMessage[] = [...current.map((m, i) => (i === index ? { ...m, action: undefined } : m)), { role: 'user', text: `[Hệ thống] ${note}`, system: true }];
      setMessages(history);
      ask(history);
   };

   return (
      <>
         {!open && (
            <button
            aria-label='Mở trợ lý SEO'
            title='Hỏi trợ lý SEO'
            className='fixed bottom-5 right-5 z-[60] w-14 h-14 rounded-full bg-blue-700 text-white shadow-lg text-2xl'
            onClick={() => setOpen(true)}>
               💬
            </button>
         )}
         {open && (
            <div
            role='dialog'
            aria-label='Trợ lý SEO'
            className='fixed z-[60] bg-white shadow-xl border border-gray-200 flex flex-col inset-0 md:inset-auto md:top-0 md:right-0 md:h-screen md:w-[380px]'>
               <div className='flex justify-between items-center px-4 py-3 border-b'>
                  <h3 className='font-bold text-blue-700'>Trợ lý SEO</h3>
                  <button
                  className='ml-auto mr-2 text-xs px-2 py-1 border rounded text-gray-600 hover:bg-gray-100 disabled:opacity-40'
                  disabled={loading || messages.length === 0}
                  title={loading ? 'Đợi trợ lý trả lời xong rồi bấm lại.' : 'Xóa cuộc trò chuyện hiện tại và bắt đầu lại'}
                  onClick={() => { setMessages([]); setInput(''); setError(''); }}>
                     + Chat mới
                  </button>
                  <button aria-label='Đóng trợ lý' className='p-1 text-gray-400 hover:text-gray-700' onClick={() => setOpen(false)}>
                     <Icon type='close' size={20} />
                  </button>
               </div>
               <div className='flex-1 overflow-y-auto p-4 text-sm'>
                  {statusError && <p className='text-red-600 text-xs'>Không kiểm tra được trạng thái trợ lý. Thử tải lại trang.</p>}
                  {status && !status.enabled && (
                     <LockedHint reason='Chưa cấu hình Gemini API key (GEMINI_API_KEY trong .env.local).' />
                  )}
                  {status?.enabled && messages.length === 0 && (
                     <div>
                        <p className='mb-3 text-gray-600'>Mình có thể giải thích các chỉ số, xem thứ hạng và đề xuất từ khóa. Thử hỏi:</p>
                        {SUGGESTIONS.map((s) => (
                           <button key={s} className='block w-full text-left mb-2 p-2 border rounded hover:bg-indigo-50' onClick={() => send(s)}>{s}</button>
                        ))}
                     </div>
                  )}
                  {messages.map((m, i) => (
                     // eslint-disable-next-line react/no-array-index-key
                     <div key={i} className={`mb-3 ${m.role === 'user' ? 'text-right' : ''}`}>
                        <div className={`inline-block max-w-[90%] text-left px-3 py-2 rounded ${m.role === 'user' ? 'bg-blue-700 text-white' : 'bg-gray-100'} ${m.system ? 'italic opacity-80' : ''}`}>
                           {m.role === 'model' ? <MarkdownLite text={m.text} /> : m.text}
                        </div>
                        {m.action && <ActionCard action={m.action} onConfirm={confirm(i, m.action)} onDismiss={() => dropAction(i)} />}
                     </div>
                  ))}
                  {loading && <p className='text-gray-400'>Đang suy nghĩ…</p>}
                  {error && <p className='text-red-600 text-xs'>{error}</p>}
                  <div ref={endRef} />
               </div>
               {status?.enabled && (
                  <form className='flex gap-2 p-3 border-t' onSubmit={(e) => { e.preventDefault(); send(input); }}>
                     <input
                     className='flex-1 border rounded px-3 py-2 outline-none focus:border-indigo-300'
                     placeholder='Hỏi về từ khóa, thứ hạng...'
                     value={input}
                     onChange={(e) => setInput(e.target.value)}
                     />
                     <button type='submit' disabled={loading || !input.trim()} className='px-4 py-2 rounded bg-blue-700 text-white font-semibold disabled:opacity-50'>Gửi</button>
                  </form>
               )}
            </div>
         )}
      </>
   );
};

export default ChatWidget;
