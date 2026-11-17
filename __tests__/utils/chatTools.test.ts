/**
 * @jest-environment node
 */
import { runTool, toolDeclarations, ChatDeps } from '../../utils/chat/tools';

const settings = { scraper_type: 'scrapingrobot', scrape_strategy: 'basic', scrape_pagination_limit: 5, scrape_smart_full_fallback: false, scaping_api: 'SECRET-KEY', smtp_password: 'pw' } as unknown as SettingsType;
const kw = (id: number, keyword: string, extra: Partial<KeywordType> = {}) => ({
   ID: id, keyword, device: 'desktop', country: 'VN', domain: 'wifim.vn', position: 1, url: 'https://wifim.vn/', history: { '2026-11-15': 1 }, lastUpdateError: false, ...extra,
} as unknown as KeywordType);

const makeDeps = (keywords: KeywordType[] = [kw(1, 'wifim')]): ChatDeps => ({
   getDomains: jest.fn(async () => [{ domain: 'wifim.vn', slug: 'wifim-vn', keywordCount: keywords.length, avgPosition: 1 }] as unknown as DomainType[]),
   getKeywords: jest.fn(async () => keywords),
   getKeyword: jest.fn(async (id: number) => keywords.find((k) => k.ID === id) || null),
   getSettings: jest.fn(async () => settings),
   searchTrends: jest.fn(async () => ({ summary: 'xu hướng', sources: [] })),
});

describe('chat tools', () => {
   it('khai báo đủ 8 công cụ', () => {
      expect(toolDeclarations.map((t) => t.name).sort()).toEqual([
         'explain_metric', 'get_keyword_history', 'get_scraper_settings', 'list_domains', 'list_keywords', 'propose_add_keywords', 'propose_refresh', 'search_trends',
      ]);
   });

   it('propose_add_keywords không ghi gì, trả action có credit', async () => {
      const deps = makeDeps();
      const r = await runTool('propose_add_keywords', { domain: 'wifim.vn', keywords: ['a', 'b'] }, deps);
      expect(r.action?.type).toBe('add_keywords');
      expect(r.action?.creditEstimate).toBe('~2 credit');
      expect(r.action?.payload).toEqual({ keywords: [
         { keyword: 'a', device: 'desktop', country: 'VN', domain: 'wifim.vn' },
         { keyword: 'b', device: 'desktop', country: 'VN', domain: 'wifim.vn' },
      ] });
   });

   it('domain không tồn tại → lỗi tiếng Việt, không action', async () => {
      const r = await runTool('propose_add_keywords', { domain: 'nope.com', keywords: ['a'] }, makeDeps());
      expect(r.action).toBeUndefined();
      expect((r.result as { error: string }).error).toMatch(/không tồn tại/);
   });

   it('>20 từ khóa → lỗi', async () => {
      const many = Array.from({ length: 21 }, (_, i) => `k${i}`);
      const r = await runTool('propose_add_keywords', { domain: 'wifim.vn', keywords: many }, makeDeps());
      expect(r.action).toBeUndefined();
      expect((r.result as { error: string }).error).toMatch(/Tối đa 20/);
   });

   it('lọc từ khóa đã theo dõi, hết thì báo lỗi', async () => {
      const deps = makeDeps();
      const r = await runTool('propose_add_keywords', { domain: 'wifim.vn', keywords: ['WiFim', 'moi'] }, deps);
      expect((r.action?.payload as { keywords: { keyword: string }[] }).keywords.map((k) => k.keyword)).toEqual(['moi']);
      const r2 = await runTool('propose_add_keywords', { domain: 'wifim.vn', keywords: ['wifim'] }, deps);
      expect(r2.action).toBeUndefined();
      expect((r2.result as { error: string }).error).toMatch(/đã được theo dõi/);
   });

   it('country sai → lỗi', async () => {
      const r = await runTool('propose_add_keywords', { domain: 'wifim.vn', keywords: ['a'], country: 'QQ' }, makeDeps());
      expect(r.action).toBeUndefined();
      expect((r.result as { error: string }).error).toMatch(/quốc gia/i);
   });

   it('list_keywords cắt 200 dòng, báo total, dịch lỗi', async () => {
      const big = Array.from({ length: 250 }, (_, i) => kw(i + 1, `k${i}`, i === 0 ? { lastUpdateError: { date: 'd', error: 'timeout', scraper: 'x' } } : {}));
      const r = await runTool('list_keywords', { domain: 'wifim.vn' }, makeDeps(big));
      const res = r.result as { total: number, keywords: { error?: string }[] };
      expect(res.total).toBe(250);
      expect(res.keywords).toHaveLength(200);
      expect(res.keywords[0].error).toMatch(/quá chậm/);
   });

   it('get_scraper_settings không lộ key', async () => {
      const r = await runTool('get_scraper_settings', {}, makeDeps());
      const text = JSON.stringify(r.result);
      expect(text).not.toContain('scaping_api');
      expect(text).not.toContain('SECRET-KEY');
      expect(text).not.toContain('smtp');
      expect(text).toContain('scrapingrobot');
   });

   it('propose_refresh: id có thật → ước tính; id lạ → lỗi', async () => {
      const deps = makeDeps([kw(1, 'a'), kw(2, 'b')]);
      const ok = await runTool('propose_refresh', { ids: [1, 2] }, deps);
      expect(ok.action?.type).toBe('refresh');
      expect(ok.action?.creditEstimate).toBe('~2 credit');
      const bad = await runTool('propose_refresh', { ids: [99] }, deps);
      expect(bad.action).toBeUndefined();
      const all = await runTool('propose_refresh', { domain: 'wifim.vn' }, deps);
      expect(all.action?.payload).toEqual({ domain: 'wifim.vn' });
   });

   it('tên công cụ lạ', async () => {
      const r = await runTool('hack_db', {}, makeDeps());
      expect(r.result).toEqual({ error: 'Không có công cụ này.' });
   });

   it('tham số sai kiểu không làm văng lỗi', async () => {
      const r = await runTool('list_keywords', { domain: 5 }, makeDeps());
      expect((r.result as { error: string }).error).toBeTruthy();
   });

   it('propose_refresh theo ids dùng cài đặt riêng của website và bỏ id trùng', async () => {
      const deps = makeDeps([kw(1, 'a'), kw(2, 'b')]);
      (deps.getDomains as jest.Mock).mockResolvedValue([{ domain: 'wifim.vn', scrape_strategy: 'custom', scrape_pagination_limit: 10 }]);
      const r = await runTool('propose_refresh', { ids: [1, 2, 2] }, deps);
      expect(r.action?.creditEstimate).toBe('~20 credit');
      expect(r.action?.payload).toEqual({ ids: [1, 2] });
   });

   it('device và domain không phân biệt hoa thường', async () => {
      const r = await runTool('propose_add_keywords', { domain: 'WifiM.vn', keywords: ['x'], device: 'Mobile' }, makeDeps());
      expect((r.action?.payload as { keywords: { device: string, domain: string }[] }).keywords[0]).toMatchObject({ device: 'mobile', domain: 'wifim.vn' });
   });
});
