/* eslint-disable max-len */
import type { FunctionDeclaration, Type } from '@google/genai';
import countries from '../countries';
import { toVietnameseError } from '../errorText';
import { getGlossary, glossary } from '../glossary';
import { creditEstimate } from '../scrapeInfo';

// ChatDeps has NO write functions on purpose: tools can only read or *propose*; the user's click performs the action.
export type ChatDeps = {
   getDomains(): Promise<DomainType[]>,
   getKeywords(domain: string): Promise<KeywordType[]>,
   getKeyword(id: number): Promise<KeywordType | null>,
   getSettings(): Promise<SettingsType>,
   searchTrends(query: string): Promise<{ summary: string, sources: { title: string, url: string }[] }>,
};

export type ChatAction =
   | { type: 'add_keywords', payload: { keywords: KeywordAddPayload[] }, creditEstimate: string, summary: string }
   | { type: 'refresh', payload: { ids: number[] } | { domain: string }, creditEstimate: string, summary: string };

export type ToolResult = { result: unknown, action?: ChatAction };

export const MAX_ADD_KEYWORDS = 20;
export const MAX_LIST_KEYWORDS = 200;

const T = (v: string) => v as unknown as Type; // string enum values; avoids importing the ESM SDK at runtime
const str = (description: string) => ({ type: T('STRING'), description });

export const toolDeclarations: FunctionDeclaration[] = [
   { name: 'list_domains', description: 'Liệt kê các website đang theo dõi, kèm số từ khóa và thứ hạng trung bình.' },
   {
      name: 'list_keywords',
      description: 'Liệt kê từ khóa của một website kèm thứ hạng hiện tại (tối đa 200 dòng).',
      parameters: { type: T('OBJECT'), properties: { domain: str('Tên website, ví dụ wifim.vn') }, required: ['domain'] },
   },
   {
      name: 'get_keyword_history',
      description: 'Lấy lịch sử thứ hạng theo ngày của một từ khóa.',
      parameters: { type: T('OBJECT'), properties: { keyword_id: { type: T('NUMBER'), description: 'ID từ khóa (lấy từ list_keywords)' } }, required: ['keyword_id'] },
   },
   { name: 'get_scraper_settings', description: 'Xem công cụ lấy thứ hạng và chiến lược đang dùng (ảnh hưởng chi phí credit).' },
   {
      name: 'explain_metric',
      description: `Giải thích một chỉ số/thuật ngữ bằng lời đơn giản. Các mã: ${Object.keys(glossary).join(', ')}.`,
      parameters: { type: T('OBJECT'), properties: { term: str('Mã thuật ngữ') }, required: ['term'] },
   },
   {
      name: 'search_trends',
      description: 'Tìm trên Google xu hướng/ý tưởng từ khóa mới cho một chủ đề.',
      parameters: { type: T('OBJECT'), properties: { query: str('Chủ đề cần tìm xu hướng') }, required: ['query'] },
   },
   {
      name: 'propose_add_keywords',
      description: 'ĐỀ NGHỊ thêm từ khóa mới (tối đa 20). Không tự thêm: người dùng phải bấm Xác nhận và việc này tốn credit.',
      parameters: {
         type: T('OBJECT'),
         properties: {
            domain: str('Tên website'),
            keywords: { type: T('ARRAY'), items: { type: T('STRING') }, description: 'Danh sách từ khóa' },
            country: str('Mã quốc gia 2 chữ, mặc định VN'),
            device: str('desktop hoặc mobile, mặc định desktop'),
         },
         required: ['domain', 'keywords'],
      },
   },
   {
      name: 'propose_refresh',
      description: 'ĐỀ NGHỊ cập nhật thứ hạng cho vài từ khóa (ids) hoặc cả website (domain). Người dùng phải bấm Xác nhận; tốn credit.',
      parameters: {
         type: T('OBJECT'),
         properties: { ids: { type: T('ARRAY'), items: { type: T('NUMBER') }, description: 'ID từ khóa' }, domain: str('Tên website (nếu cập nhật tất cả)') },
      },
   },
];

const err = (error: string): ToolResult => ({ result: { error } });
const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const dedupeKey = (keyword: string, country: string, device: string) => `${keyword.trim().toLowerCase()}|${country}|${device}`;

const listKeywords = async (args: Record<string, unknown>, deps: ChatDeps): Promise<ToolResult> => {
   if (!isStr(args.domain)) return err('Thiếu tên website.');
   const all = await deps.getKeywords(args.domain);
   const keywords = all.slice(0, MAX_LIST_KEYWORDS).map((k) => ({
      id: k.ID,
      keyword: k.keyword,
      country: k.country,
      device: k.device,
      position: k.position,
      url: k.url,
      volume: k.volume,
      ...(k.lastUpdateError ? { error: toVietnameseError(k.lastUpdateError.error).message } : {}),
   }));
   return { result: { total: all.length, keywords, ...(all.length > MAX_LIST_KEYWORDS ? { note: `Chỉ hiện ${MAX_LIST_KEYWORDS} dòng đầu.` } : {}) } };
};

const proposeAdd = async (args: Record<string, unknown>, deps: ChatDeps): Promise<ToolResult> => {
   const { domain, keywords } = args;
   if (!isStr(domain) || !Array.isArray(keywords)) return err('Thiếu website hoặc danh sách từ khóa.');
   const list = keywords.filter(isStr).map((k) => k.trim());
   if (list.length === 0) return err('Danh sách từ khóa trống.');
   if (list.length > MAX_ADD_KEYWORDS) return err(`Tối đa ${MAX_ADD_KEYWORDS} từ khóa mỗi lần.`);
   const country = isStr(args.country) ? args.country.toUpperCase() : 'VN';
   const device = String(args.device).toLowerCase() === 'mobile' ? 'mobile' : 'desktop';
   if (!countries[country]) return err(`Mã quốc gia "${country}" không hợp lệ.`);

   const domainObj = (await deps.getDomains()).find((d) => d.domain.toLowerCase() === domain.trim().toLowerCase());
   if (!domainObj) return err(`Website "${domain}" không tồn tại trong danh sách theo dõi.`);

   const existing = new Set((await deps.getKeywords(domainObj.domain)).map((k) => dedupeKey(k.keyword, k.country, k.device)));
   const seen = new Set<string>();
   const fresh = list.filter((k) => {
      const key = dedupeKey(k, country, device);
      if (existing.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
   });
   if (fresh.length === 0) return err('Các từ khóa này đã được theo dõi.');

   const settings = await deps.getSettings();
   const credit = creditEstimate(fresh.length, settings, domainObj).label;
   return {
      result: { proposed: fresh, skipped: list.length - fresh.length, note: 'Đã gửi đề nghị. Nhắc người dùng bấm Xác nhận để thêm; chưa có gì được thêm.' },
      action: {
         type: 'add_keywords',
         payload: { keywords: fresh.map((keyword) => ({ keyword, device, country, domain: domainObj.domain })) },
         creditEstimate: credit,
         summary: `Thêm ${fresh.length} từ khóa vào ${domainObj.domain}: ${fresh.join(', ')}`,
      },
   };
};

const proposeRefresh = async (args: Record<string, unknown>, deps: ChatDeps): Promise<ToolResult> => {
   const settings = await deps.getSettings();
   if (Array.isArray(args.ids) && args.ids.length > 0) {
      const ids = [...new Set(args.ids.filter((i): i is number => typeof i === 'number' && Number.isInteger(i)))];
      const found = await Promise.all(ids.map((id) => deps.getKeyword(id)));
      if (ids.length === 0 || found.some((f) => !f)) return err('Có từ khóa không tồn tại. Hãy lấy ID từ list_keywords.');
      // Domain-level strategy overrides change the real cost, so estimate per keyword's domain.
      const domains = await deps.getDomains();
      const total = found.reduce((sum, f) => {
         const e = creditEstimate(1, settings, domains.find((d) => d.domain === f?.domain));
         return { min: sum.min + e.min, max: sum.max + e.max, unit: e.unit };
      }, { min: 0, max: 0, unit: creditEstimate(1, settings).unit });
      return {
         result: { note: 'Đã gửi đề nghị. Nhắc người dùng bấm Xác nhận; chưa cập nhật gì.' },
         action: {
            type: 'refresh',
            payload: { ids },
            creditEstimate: total.min === total.max ? `~${total.min} ${total.unit}` : `${total.min}–${total.max} ${total.unit}`,
            summary: `Cập nhật thứ hạng ${ids.length} từ khóa: ${found.map((f) => f?.keyword).join(', ')}`,
         },
      };
   }
   if (isStr(args.domain)) {
      const domainObj = (await deps.getDomains()).find((d) => d.domain.toLowerCase() === String(args.domain).trim().toLowerCase());
      if (!domainObj) return err(`Website "${args.domain}" không tồn tại trong danh sách theo dõi.`);
      const count = (await deps.getKeywords(domainObj.domain)).length;
      if (count === 0) return err('Website này chưa có từ khóa nào.');
      return {
         result: { note: 'Đã gửi đề nghị. Nhắc người dùng bấm Xác nhận; chưa cập nhật gì.' },
         action: {
            type: 'refresh',
            payload: { domain: domainObj.domain },
            creditEstimate: creditEstimate(count, settings, domainObj).label,
            summary: `Cập nhật thứ hạng toàn bộ ${count} từ khóa của ${domainObj.domain}`,
         },
      };
   }
   return err('Cần ids hoặc domain.');
};

export const runTool = async (name: string, args: Record<string, unknown>, deps: ChatDeps): Promise<ToolResult> => {
   const a = args || {};
   try {
      switch (name) {
         case 'list_domains': {
            const domains = await deps.getDomains();
            return { result: { domains: domains.map((d) => ({ domain: d.domain, keywordCount: d.keywordCount, avgPosition: d.avgPosition })) } };
         }
         case 'list_keywords': return await listKeywords(a, deps);
         case 'get_keyword_history': {
            if (typeof a.keyword_id !== 'number') return err('Thiếu keyword_id.');
            const k = await deps.getKeyword(a.keyword_id);
            if (!k) return err('Không tìm thấy từ khóa này.');
            return { result: { keyword: k.keyword, domain: k.domain, position: k.position, history: k.history } };
         }
         case 'get_scraper_settings': {
            const s = await deps.getSettings();
            return { result: {
               scraper_type: s.scraper_type,
               scrape_strategy: s.scrape_strategy,
               scrape_pagination_limit: s.scrape_pagination_limit,
               scrape_smart_full_fallback: s.scrape_smart_full_fallback,
            } };
         }
         case 'explain_metric': {
            const g = isStr(a.term) ? getGlossary(a.term) : null;
            return { result: g || { error: 'Không có thuật ngữ này.', available: Object.keys(glossary) } };
         }
         case 'search_trends':
            return isStr(a.query) ? { result: await deps.searchTrends(a.query) } : err('Thiếu chủ đề cần tìm.');
         case 'propose_add_keywords': return await proposeAdd(a, deps);
         case 'propose_refresh': return await proposeRefresh(a, deps);
         default: return err('Không có công cụ này.');
      }
   } catch (e) {
      return err('Công cụ gặp lỗi khi lấy dữ liệu.');
   }
};
