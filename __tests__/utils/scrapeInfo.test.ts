/**
 * @jest-environment node
 */
import { creditEstimate, getPagesRange, notFoundLabel } from '../../utils/scrapeInfo';

const base = { scraper_type: 'scrapingrobot', scrape_strategy: 'basic', scrape_pagination_limit: 5, scrape_smart_full_fallback: false } as SettingsType;

describe('scrapeInfo', () => {
   it('basic = 1 trang', () => expect(getPagesRange(base)).toEqual({ min: 1, max: 1 }));
   it('custom = limit', () => expect(getPagesRange({ ...base, scrape_strategy: 'custom' })).toEqual({ min: 5, max: 5 }));
   it('smart = 1–3, fallback = 1–10', () => {
      expect(getPagesRange({ ...base, scrape_strategy: 'smart' })).toEqual({ min: 1, max: 3 });
      expect(getPagesRange({ ...base, scrape_strategy: 'smart', scrape_smart_full_fallback: true })).toEqual({ min: 1, max: 10 });
   });
   it('domain ghi đè', () => expect(getPagesRange(base, { scrape_strategy: 'custom', scrape_pagination_limit: 3 })).toEqual({ min: 3, max: 3 }));
   it('nativePagination = 1', () => expect(getPagesRange({ ...base, scraper_type: 'serpapi', scrape_strategy: 'custom' })).toEqual({ min: 1, max: 1 }));
   it('credit label', () => {
      expect(creditEstimate(5, { ...base, scrape_strategy: 'custom' }).label).toBe('~25 credit');
      expect(creditEstimate(3, { ...base, scraper_type: 'serper', scrape_strategy: 'smart' }).label).toBe('3–9 lượt gọi');
   });
   it('notFoundLabel', () => {
      expect(notFoundLabel({ ...base, scrape_strategy: 'custom' })).toBe('Chưa lọt top 50');
      expect(notFoundLabel(base)).toBe('Chưa lọt top 10');
      expect(notFoundLabel({ ...base, scraper_type: 'serpapi' })).toBe('Chưa lọt top 100');
      expect(notFoundLabel({ ...base, scrape_strategy: 'smart' })).toBe('Không thấy trong các trang đã kiểm tra');
   });
});
