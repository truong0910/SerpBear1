import { fireEvent, render, screen } from '@testing-library/react';
import LockedHint from '../../components/common/LockedHint';

describe('LockedHint', () => {
   it('hiện lý do và gọi onAction', () => {
      const fn = jest.fn();
      render(<LockedHint reason="Cần kết nối Google Ads." actionLabel="Mở Cài đặt" onAction={fn} />);
      expect(screen.getByText(/Cần kết nối Google Ads/)).toBeVisible();
      fireEvent.click(screen.getByRole('button', { name: /Mở Cài đặt/ }));
      expect(fn).toHaveBeenCalledTimes(1);
   });
   it('không có onAction thì không có nút', () => {
      render(<LockedHint reason="x" />);
      expect(screen.queryByRole('button')).toBeNull();
   });
});
