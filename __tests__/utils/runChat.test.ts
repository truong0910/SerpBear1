/**
 * @jest-environment node
 */
import { runChat, ChatError, GeminiLike } from '../../utils/chat/runChat';
import { ChatDeps } from '../../utils/chat/tools';

const settings = { scraper_type: 'scrapingrobot', scrape_strategy: 'basic' } as unknown as SettingsType;
const deps: ChatDeps = {
   getDomains: jest.fn(async () => [{ domain: 'wifim.vn', slug: 'wifim-vn', keywordCount: 3, avgPosition: 2 }] as unknown as DomainType[]),
   getKeywords: jest.fn(async () => []),
   getKeyword: jest.fn(async () => null),
   getSettings: jest.fn(async () => settings),
   searchTrends: jest.fn(async () => ({ summary: '', sources: [] })),
};
const clientOf = (...responses: Awaited<ReturnType<GeminiLike['generateContent']>>[]) => {
   const generateContent = jest.fn();
   responses.forEach((r) => generateContent.mockResolvedValueOnce(r));
   return { generateContent } as unknown as GeminiLike & { generateContent: jest.Mock };
};
const msg = (text: string) => [{ role: 'user' as const, text }];

describe('runChat', () => {
   beforeEach(() => jest.clearAllMocks());

   it('gọi công cụ đọc rồi trả lời', async () => {
      const client = clientOf({ functionCalls: [{ name: 'list_domains', args: {} }] }, { text: 'Bạn có 1 website.' });
      const r = await runChat({ messages: msg('có website nào?'), context: {} }, deps, client, 'm');
      expect(r.reply).toBe('Bạn có 1 website.');
      expect(deps.getDomains).toHaveBeenCalled();
      expect(client.generateContent).toHaveBeenCalledTimes(2);
   });

   it('trả action khi model gọi propose_add_keywords', async () => {
      const client = clientOf(
         { functionCalls: [{ name: 'propose_add_keywords', args: { domain: 'wifim.vn', keywords: ['a'] } }] },
         { text: 'Bấm Xác nhận nhé.' },
      );
      const r = await runChat({ messages: msg('thêm a'), context: {} }, deps, client, 'm');
      expect(r.action?.type).toBe('add_keywords');
      expect(r.reply).toMatch(/Xác nhận/);
   });

   it('nhiều action trong một lượt chỉ giữ cái đầu', async () => {
      const client = clientOf(
         { functionCalls: [
            { name: 'propose_add_keywords', args: { domain: 'wifim.vn', keywords: ['a'] } },
            { name: 'propose_add_keywords', args: { domain: 'wifim.vn', keywords: ['b'] } },
         ] },
         { text: 'ok' },
      );
      const r = await runChat({ messages: msg('thêm'), context: {} }, deps, client, 'm');
      expect((r.action?.payload as { keywords: { keyword: string }[] }).keywords[0].keyword).toBe('a');
   });

   it('công cụ lạ không làm vỡ vòng lặp', async () => {
      const client = clientOf({ functionCalls: [{ name: 'hack_db', args: {} }] }, { text: 'xong' });
      const r = await runChat({ messages: msg('hi'), context: {} }, deps, client, 'm');
      expect(r.reply).toBe('xong');
      const second = client.generateContent.mock.calls[1][0].contents;
      expect(JSON.stringify(second)).toContain('Không có công cụ này.');
   });

   it('dừng sau 5 vòng', async () => {
      const client = { generateContent: jest.fn(async () => ({ functionCalls: [{ name: 'list_domains', args: {} }] })) } as unknown as GeminiLike;
      const r = await runChat({ messages: msg('hi'), context: {} }, deps, client, 'm');
      expect(r.reply).toMatch(/cần thêm thời gian/);
      expect((client.generateContent as jest.Mock)).toHaveBeenCalledTimes(5);
   });

   it('429 → ChatError tiếng Việt', async () => {
      const client = { generateContent: jest.fn().mockRejectedValue(Object.assign(new Error('RESOURCE_EXHAUSTED'), { status: 429 })) } as unknown as GeminiLike;
      await expect(runChat({ messages: msg('hi'), context: {} }, deps, client, 'm')).rejects.toThrow(/quá tải hoặc hết hạn mức/);
      await expect(runChat({ messages: msg('hi'), context: {} }, deps, client, 'm')).rejects.toBeInstanceOf(ChatError);
   });

   it('key sai → ChatError nhắc GEMINI_API_KEY; lỗi khác → câu chung', async () => {
      const bad = { generateContent: jest.fn().mockRejectedValue(Object.assign(new Error('API key not valid'), { status: 400 })) } as unknown as GeminiLike;
      await expect(runChat({ messages: msg('hi'), context: {} }, deps, bad, 'm')).rejects.toThrow(/GEMINI_API_KEY/);
      const other = { generateContent: jest.fn().mockRejectedValue(new Error('boom')) } as unknown as GeminiLike;
      await expect(runChat({ messages: msg('hi'), context: {} }, deps, other, 'm')).rejects.toThrow(/Trợ lý gặp lỗi/);
   });

   it('chỉ gửi 20 tin gần nhất, bắt đầu bằng tin người dùng', async () => {
      const messages = Array.from({ length: 30 }, (_, i) => ({ role: (i % 2 === 0 ? 'user' : 'model') as 'user' | 'model', text: `t${i}` }));
      const client = clientOf({ text: 'ok' });
      await runChat({ messages, context: {} }, deps, client, 'm');
      const sent = client.generateContent.mock.calls[0][0].contents;
      expect(sent).toHaveLength(20);
      expect(sent[0].role).toBe('user');
   });

   it('đưa website hiện tại vào system prompt', async () => {
      const client = clientOf({ text: 'ok' });
      await runChat({ messages: msg('hi'), context: { domain: 'wifim.vn' } }, deps, client, 'm');
      expect(JSON.stringify(client.generateContent.mock.calls[0][0].config)).toContain('wifim.vn');
   });
});
