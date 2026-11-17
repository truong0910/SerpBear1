import { fireEvent, render, screen } from '@testing-library/react';
import ActionCard from '../../components/chat/ActionCard';

const addAction = { type: 'add_keywords', payload: { keywords: [] }, creditEstimate: '~2 credit', summary: 'Thêm 2 từ khóa' } as any;

describe('ActionCard', () => {
   it('bấm Xác nhận hai lần chỉ gọi một lần', async () => {
      const onConfirm = jest.fn(() => new Promise<void>((r) => { setTimeout(r, 50); }));
      render(<ActionCard action={addAction} onConfirm={onConfirm} onDismiss={jest.fn()} />);
      const btn = screen.getByRole('button', { name: /Xác nhận — tốn ~2 credit/ });
      fireEvent.click(btn);
      fireEvent.click(btn);
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(btn).toBeDisabled();
      expect(await screen.findByText('Đã xong')).toBeInTheDocument();
   });
   it('Bỏ qua gọi onDismiss và không gọi onConfirm', () => {
      const onConfirm = jest.fn();
      const onDismiss = jest.fn();
      render(<ActionCard action={addAction} onConfirm={onConfirm} onDismiss={onDismiss} />);
      fireEvent.click(screen.getByRole('button', { name: 'Bỏ qua' }));
      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
   });
   it('lỗi thì cho bấm lại', async () => {
      const onConfirm = jest.fn().mockRejectedValueOnce(new Error('Hết credit')).mockResolvedValue(undefined);
      render(<ActionCard action={addAction} onConfirm={onConfirm} onDismiss={jest.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: /Xác nhận/ }));
      expect(await screen.findByText('Hết credit')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Xác nhận/ }));
      expect(await screen.findByText('Đã xong')).toBeInTheDocument();
      expect(onConfirm).toHaveBeenCalledTimes(2);
   });
});
