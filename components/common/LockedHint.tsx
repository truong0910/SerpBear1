import React from 'react';

type LockedHintProps = {
   reason: string,
   actionLabel?: string,
   onAction?: () => void,
   className?: string,
}

const LockedHint = ({ reason, actionLabel, onAction, className = '' }: LockedHintProps) => (
   <p className={`text-xs text-gray-500 mt-2 ${className}`}>
      <span aria-hidden='true'>🔒</span> {reason}
      {onAction && actionLabel && (
         <button type='button' className='ml-1 text-blue-600 underline' onClick={onAction}>→ {actionLabel}</button>
      )}
   </p>
);

export default LockedHint;
