import { fireEvent, render, screen } from '@testing-library/react';
import InfoTip from '../../components/common/InfoTip';

describe('InfoTip', () => {
   it('bấm ⓘ thì hiện giải thích, bấm lần nữa thì ẩn', () => {
      render(<InfoTip term="volume" />);
      fireEvent.click(screen.getByRole('button', { name: /giải thích/i }));
      expect(screen.getByRole('tooltip')).toHaveTextContent('Lượt tìm kiếm');
      fireEvent.click(screen.getByRole('button', { name: /giải thích/i }));
      expect(screen.queryByRole('tooltip')).toBeNull();
   });
   it('Escape đóng popover', () => {
      render(<InfoTip term="serp" />);
      fireEvent.click(screen.getByRole('button', { name: /giải thích/i }));
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('tooltip')).toBeNull();
   });
});
