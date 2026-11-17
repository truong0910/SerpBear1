import React from 'react';

// Tiny renderer for assistant replies: **bold**, "- " / "1. " lists, line breaks. No HTML is ever injected.
const inline = (text: string) => text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (
   // eslint-disable-next-line react/no-array-index-key
   /^\*\*[^*]+\*\*$/.test(part) ? <strong key={i}>{part.slice(2, -2)}</strong> : <React.Fragment key={i}>{part}</React.Fragment>
));

const MarkdownLite = ({ text }: { text: string }) => {
   const blocks: React.ReactNode[] = [];
   let list: string[] = [];
   const flush = () => {
      if (list.length) {
         const items = list;
         // eslint-disable-next-line react/no-array-index-key
         blocks.push(<ul key={`l${blocks.length}`} className='list-disc pl-5'>{items.map((t, i) => <li key={i}>{inline(t)}</li>)}</ul>);
         list = [];
      }
   };
   text.split('\n').forEach((line) => {
      const m = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/);
      if (m) { list.push(m[1]); return; }
      flush();
      if (line.trim()) blocks.push(<p key={`p${blocks.length}`} className='mb-1'>{inline(line)}</p>);
   });
   flush();
   return <>{blocks}</>;
};

export default MarkdownLite;
