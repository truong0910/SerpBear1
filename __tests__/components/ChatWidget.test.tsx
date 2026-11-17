import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import ChatWidget from '../../components/chat/ChatWidget';
import * as chat from '../../services/chat';

jest.mock('next/router', () => jest.requireActual('next-router-mock'));
jest.mock('../../services/domains', () => ({ useFetchDomains: () => ({ data: { domains: [] } }) }));
jest.mock('../../services/chat');

const mocked = chat as jest.Mocked<typeof chat>;
const renderWidget = () => render(<QueryClientProvider client={new QueryClient()}><ChatWidget /></QueryClientProvider>);

describe('ChatWidget', () => {
   beforeEach(() => jest.clearAllMocks());

   it('chưa có key thì hiện lý do khóa', () => {
      mocked.useChatStatus.mockReturnValue({ data: { enabled: false } } as any);
      renderWidget();
      fireEvent.click(screen.getByRole('button', { name: /Mở trợ lý/ }));
      expect(screen.getByText(/Chưa cấu hình Gemini API key/)).toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/Hỏi về từ khóa/)).toBeNull();
   });

   it('gửi câu gợi ý và hiện trả lời', async () => {
      mocked.useChatStatus.mockReturnValue({ data: { enabled: true } } as any);
      mocked.sendChat.mockResolvedValue({ reply: '**Thứ hạng** 1' });
      renderWidget();
      fireEvent.click(screen.getByRole('button', { name: /Mở trợ lý/ }));
      fireEvent.click(screen.getByText('Lượt tìm kiếm là gì?'));
      const strong = await screen.findByText('Thứ hạng');
      expect(strong.tagName).toBe('STRONG');
      expect(mocked.sendChat).toHaveBeenCalledWith([{ role: 'user', text: 'Lượt tìm kiếm là gì?' }], { domain: undefined });
   });

   it('Chat mới xóa cuộc trò chuyện và quay về gợi ý', async () => {
      mocked.useChatStatus.mockReturnValue({ data: { enabled: true } } as any);
      mocked.sendChat.mockResolvedValue({ reply: 'Trả lời cũ' });
      renderWidget();
      fireEvent.click(screen.getByRole('button', { name: /Mở trợ lý/ }));
      expect(screen.getByRole('button', { name: /Chat mới/ })).toBeDisabled();
      fireEvent.click(screen.getByText('Lượt tìm kiếm là gì?'));
      await screen.findByText('Trả lời cũ');
      fireEvent.click(screen.getByRole('button', { name: /Chat mới/ }));
      expect(screen.queryByText('Trả lời cũ')).toBeNull();
      expect(screen.getByText('Lượt tìm kiếm là gì?')).toBeInTheDocument();
   });

   it('Bỏ qua không gọi API hành động; Xác nhận gọi đúng một lần', async () => {
      mocked.useChatStatus.mockReturnValue({ data: { enabled: true } } as any);
      const action = { type: 'add_keywords', payload: { keywords: [{ keyword: 'a' }] }, creditEstimate: '~1 credit', summary: 'Thêm 1 từ khóa' } as any;
      mocked.sendChat.mockResolvedValueOnce({ reply: 'Bấm xác nhận nhé', action }).mockResolvedValue({ reply: 'Xong rồi' });
      mocked.runChatAction.mockResolvedValue('Đã thêm 1 từ khóa, đang cập nhật thứ hạng.');
      renderWidget();
      fireEvent.click(screen.getByRole('button', { name: /Mở trợ lý/ }));
      fireEvent.click(screen.getByText('Lượt tìm kiếm là gì?'));
      fireEvent.click(await screen.findByRole('button', { name: 'Bỏ qua' }));
      expect(mocked.runChatAction).not.toHaveBeenCalled();
      // ask again, this time confirm
      mocked.sendChat.mockResolvedValueOnce({ reply: 'Bấm xác nhận nhé', action });
      fireEvent.change(screen.getByPlaceholderText(/Hỏi về từ khóa/), { target: { value: 'thêm từ khóa a' } });
      fireEvent.submit(screen.getByPlaceholderText(/Hỏi về từ khóa/).closest('form') as HTMLFormElement);
      const btn = await screen.findByRole('button', { name: /Xác nhận — tốn ~1 credit/ });
      fireEvent.click(btn);
      fireEvent.click(btn);
      await waitFor(() => expect(mocked.runChatAction).toHaveBeenCalledTimes(1));
      expect(await screen.findByText('Xong rồi')).toBeInTheDocument();
   });

   it('không cho xác nhận khi trợ lý đang trả lời', async () => {
      mocked.useChatStatus.mockReturnValue({ data: { enabled: true } } as any);
      const action = { type: 'add_keywords', payload: { keywords: [{ keyword: 'a' }] }, creditEstimate: '~1 credit', summary: 'Thêm 1 từ khóa' } as any;
      mocked.sendChat.mockResolvedValueOnce({ reply: 'ok', action });
      renderWidget();
      fireEvent.click(screen.getByRole('button', { name: /Mở trợ lý/ }));
      fireEvent.click(screen.getByText('Lượt tìm kiếm là gì?'));
      const btn = await screen.findByRole('button', { name: /Xác nhận/ });
      mocked.sendChat.mockReturnValue(new Promise(() => {})); // next question never answers
      fireEvent.change(screen.getByPlaceholderText(/Hỏi về từ khóa/), { target: { value: 'câu hỏi mới' } });
      fireEvent.submit(screen.getByPlaceholderText(/Hỏi về từ khóa/).closest('form') as HTMLFormElement);
      fireEvent.click(btn);
      expect(await screen.findByText(/đang trả lời/)).toBeInTheDocument();
      expect(mocked.runChatAction).not.toHaveBeenCalled();
   });
});
