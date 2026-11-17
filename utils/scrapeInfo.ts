import allScrapers from '../scrapers/index';

const TOTAL_PAGES = 10;

// Mirrors resolveStrategy in utils/scraper.ts (kept separate: that file is server-only).
const resolve = (settings: SettingsType, domain?: Partial<DomainType>) => {
   const strategy = (domain?.scrape_strategy || settings.scrape_strategy || 'basic') as string;
   const limit = (domain?.scrape_strategy ? domain.scrape_pagination_limit : 0) || settings.scrape_pagination_limit || 5;
   const fallback = (domain?.scrape_strategy ? domain.scrape_smart_full_fallback : false) || settings.scrape_smart_full_fallback || false;
   return { strategy, limit, fallback };
};

const isNative = (settings: SettingsType): boolean => !!allScrapers.find((s: ScraperSettings) => s.id === settings?.scraper_type)?.nativePagination;

export const getPagesRange = (settings: SettingsType, domain?: Partial<DomainType>): { min: number, max: number } => {
   if (isNative(settings)) return { min: 1, max: 1 };
   const { strategy, limit, fallback } = resolve(settings, domain);
   if (strategy === 'custom') {
      const n = Math.max(1, Math.min(limit, TOTAL_PAGES));
      return { min: n, max: n };
   }
   if (strategy === 'smart') return { min: 1, max: fallback ? TOTAL_PAGES : 3 };
   return { min: 1, max: 1 };
};

export const creditEstimate = (keywordCount: number, settings: SettingsType, domain?: Partial<DomainType>) => {
   const { min: pMin, max: pMax } = getPagesRange(settings, domain);
   const min = keywordCount * pMin;
   const max = keywordCount * pMax;
   const unit: 'credit' | 'lượt gọi' = settings?.scraper_type === 'scrapingrobot' ? 'credit' : 'lượt gọi';
   const label = min === max ? `~${min} ${unit}` : `${min}–${max} ${unit}`;
   return { min, max, unit, label };
};

export const notFoundLabel = (settings: SettingsType, domain?: Partial<DomainType>): string => {
   if (isNative(settings)) return 'Chưa lọt top 100';
   const { strategy, limit } = resolve(settings, domain);
   if (strategy === 'smart') return 'Không thấy trong các trang đã kiểm tra';
   if (strategy === 'custom') return `Chưa lọt top ${Math.max(1, Math.min(limit, TOTAL_PAGES)) * 10}`;
   return 'Chưa lọt top 10';
};
