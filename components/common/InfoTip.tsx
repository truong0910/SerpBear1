/* eslint-disable max-len */
import React, { useEffect, useRef, useState } from 'react';
import { GlossaryKey, glossary } from '../../utils/glossary';

const InfoTip = ({ term }: { term: GlossaryKey }) => {
   const [open, setOpen] = useState(false);
   const ref = useRef<HTMLSpanElement>(null);
   const item = glossary[term];

   useEffect(() => {
      if (!open) return undefined;
      const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
      document.addEventListener('mousedown', onClick);
      document.addEventListener('keydown', onKey);
      return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
   }, [open]);

   return (
      <span ref={ref} className='relative inline-block normal-case font-normal'>
         <button
         type='button'
         aria-label={`Giải thích ${item.term}`}
         className='ml-1 w-4 h-4 text-[10px] leading-none rounded-full border border-gray-400 text-gray-500 hover:bg-gray-100'
         onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
            i
         </button>
         {open && (
            <span role='tooltip' className='absolute z-50 left-0 top-5 w-56 max-w-[80vw] p-2 text-xs text-left text-gray-700 bg-white border border-gray-200 rounded shadow-lg whitespace-normal'>
               <strong>{item.term}</strong>: {item.explain}
            </span>
         )}
      </span>
   );
};

export default InfoTip;
