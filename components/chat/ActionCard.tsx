/* eslint-disable max-len */
import React, { useRef, useState } from 'react';
import type { ChatAction } from '../../utils/chat/tools';

type ActionCardProps = {
   action: ChatAction,
   onConfirm: () => Promise<void>,
   onDismiss: () => void,
}

const ActionCard = ({ action, onConfirm, onDismiss }: ActionCardProps) => {
   const [state, setState] = useState<'idle' | 'running' | 'done'>('idle');
   const [error, setError] = useState('');
   const started = useRef(false); // blocks a second click before React re-renders

   const confirm = async () => {
      if (started.current) return;
      started.current = true;
      setState('running');
      try {
         await onConfirm();
         setState('done');
      } catch (e) {
         started.current = false;
         setError((e as Error).message || 'Có lỗi xảy ra.');
         setState('idle');
      }
   };

   const busy = state !== 'idle';
   return (
      <div className='mt-2 p-3 border border-indigo-200 bg-indigo-50 rounded text-sm'>
         <p className='mb-2 font-semibold'>{action.summary}</p>
         {error && <p className='mb-2 text-red-600 text-xs'>{error}</p>}
         {state === 'done' ? <p className='text-green-700 font-semibold'>Đã xong</p> : (
            <div className='flex gap-2'>
               <button
               className='px-3 py-1 rounded bg-blue-700 text-white font-semibold disabled:opacity-50'
               disabled={busy}
               onClick={confirm}>
                  {state === 'running' ? 'Đang thực hiện…' : `Xác nhận — tốn ${action.creditEstimate}`}
               </button>
               <button className='px-3 py-1 rounded bg-white border text-gray-600 disabled:opacity-50' disabled={busy} onClick={onDismiss}>Bỏ qua</button>
            </div>
         )}
      </div>
   );
};

export default ActionCard;
