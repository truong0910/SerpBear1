# Giao diện tiếng Việt + Trợ lý SEO Gemini — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Người không chuyên marketing dùng được SerpBear: toàn bộ UI tiếng Việt, nút khóa có lý do, thuật ngữ có giải thích, và một trợ lý chat Gemini đọc dữ liệu + đề nghị hành động có xác nhận.

**Architecture:** Phần 1 sửa chuỗi trực tiếp trong component, thêm 3 tiện ích thuần (`glossary`, `scrapeInfo`, `errorText`) và 2 component nhỏ (`InfoTip`, `LockedHint`). Phần 2 thêm `/api/chat` chạy vòng lặp function calling của Gemini phía server; công cụ hành động chỉ trả "đề nghị", frontend gọi API sẵn có khi người dùng bấm xác nhận.

**Tech Stack:** Next.js 12 (pages router), React 18, react-query 3, Tailwind 3, Sequelize/SQLite, Jest 29, `@google/genai` (SDK Gemini chính thức), `react-markdown` 9 (đã có).

**Spec:** `docs/superpowers/specs/2026-11-16-vietnamese-ui-gemini-chatbot-design.md`

## Global Constraints

- Không nâng cấp Next/React/Tailwind; không thêm thư viện i18n.
- Mọi API mới gọi `verifyUser(req, res)` và trả 401 nếu không `'authorized'`, y như `pages/api/keywords.ts`.
- `GEMINI_API_KEY` chỉ đọc ở server (không có tiền tố `NEXT_PUBLIC_`); model lấy từ `GEMINI_MODEL`, mặc định `gemini-2.5-flash` (builder chạy thử 1 lần với key thật; nếu model không tồn tại thì đổi mặc định sang model Flash hiện hành).
- Không gửi `scaping_api`, `smtp_password`, `search_console_private_key`, `adwords_*` vào prompt/công cụ.
- Không dịch `console.log`, tên trường API/DB, email `email/`.
- Bảng thuật ngữ (dùng y nguyên): Domain → Website · Keyword → Từ khóa · Position/Rank → Thứ hạng · SERP → Trang kết quả Google · Volume → Lượt tìm kiếm/tháng · Tracking → Theo dõi · Discover → Khám phá · Insight → Phân tích · Ideas → Gợi ý · Scraper → Công cụ lấy thứ hạng · Refresh/Reload SERPs → Cập nhật thứ hạng · Tags → Nhãn · Settings → Cài đặt · Search Console → Google Search Console.
- Số trang mỗi lần cào: Basic = 1 · Custom = `scrape_pagination_limit` · Smart = 1–3, tối đa 10 nếu `scrape_smart_full_fallback` · `nativePagination` = 1. Cài đặt domain ghi đè cài đặt chung (`resolveStrategy`).
- Ước tính credit hiển thị khoảng min–max (một số nếu bằng nhau), đơn vị "credit" khi `scraper_type === 'scrapingrobot'`, ngược lại "lượt gọi".
- `POST /api/keywords` tự cào ngay: xác nhận "thêm từ khóa" = tốn credit; không nối thêm lệnh cào.
- Đề nghị thêm từ khóa: tối đa 20 từ khóa/lần.

## Review Focus

1. **Bấm "Xác nhận" hai lần** → chỉ gửi một request (nút disable ngay sau lần bấm đầu). Test ở Task 13.
2. **Gemini gọi tên công cụ không tồn tại hoặc tham số sai** → vòng lặp trả lỗi cho model và vẫn ra câu trả lời, không văng 500. Test ở Task 11.
3. **Đề nghị thêm từ khóa cho domain không tồn tại / >20 từ khóa / từ khóa đã có sẵn** → bị từ chối hoặc lọc trùng, kèm câu tiếng Việt. Test ở Task 10.
4. **Thiếu/sai `GEMINI_API_KEY`, hết hạn mức** → nút chat hiện khóa kèm lý do; lỗi gọi Gemini ra câu tiếng Việt, app khác vẫn chạy. Test ở Task 11 + 12.
5. **Domain có hàng trăm từ khóa** → `list_keywords` cắt còn 200 dòng và báo tổng số, không làm nổ token. Test ở Task 10.

---

## Phần 0 — Chuẩn bị

### Task 0: Nhánh làm việc + commit các sửa lỗi trước đó

**Files:** đã sửa trước: `utils/scraper.ts`, `scrapers/services/scrapingrobot.ts`, `jest.setup.js`, `__tests__/utils/scraper.test.ts`; tài liệu `docs/superpowers/**`.

- [ ] **Step 1:** `git checkout -b feat/vi-ui-chatbot`
- [ ] **Step 2:** `npx jest --ci __tests__/utils` → PASS 1 test.
- [ ] **Step 3: Commit sửa lỗi**

```bash
git add utils/scraper.ts scrapers/services/scrapingrobot.ts jest.setup.js __tests__/utils/scraper.test.ts
git commit -m "fix(scraper): resolve Google /goto links via cite; use US proxy for Scraping Robot"
git add docs/superpowers
git commit -m "docs: design and plan for Vietnamese UI + Gemini assistant"
```

(`.claude/launch.json` không commit.)

---

## Phần 1 — Tiếng Việt + giải thích

### Task 1: Từ điển thuật ngữ + `InfoTip`

**Files:**
- Create: `utils/glossary.ts`, `components/common/InfoTip.tsx`
- Test: `__tests__/utils/glossary.test.ts`, `__tests__/components/InfoTip.test.tsx`

**Interfaces:**
- Produces: `type GlossaryKey = 'position' | 'best' | 'history' | 'volume' | 'serp' | 'sc_impressions' | 'sc_clicks' | 'sc_ctr' | 'sc_position' | 'strategy_basic' | 'strategy_custom' | 'strategy_smart' | 'credit' | 'tags'`; `const glossary: Record<GlossaryKey, { term: string, explain: string }>`; `getGlossary(key: string): { term: string, explain: string } | null`.
- Produces: `<InfoTip term: GlossaryKey />` — nút ⓘ, **bấm** mở/đóng popover (`role="tooltip"`) chứa `term` đậm + `explain`; bấm ra ngoài hoặc Escape thì đóng.

- [ ] **Step 1: Test**

```ts
// glossary.test.ts
it('mọi mục có term và giải thích ngắn', () => {
  Object.values(glossary).forEach((g) => { expect(g.term).toBeTruthy(); expect(g.explain.length).toBeLessThanOrEqual(240); });
});
it('getGlossary trả null cho key lạ', () => { expect(getGlossary('xyz')).toBeNull(); expect(getGlossary('position')?.term).toBe('Thứ hạng'); });
// InfoTip.test.tsx
it('bấm ⓘ thì hiện giải thích, bấm lần nữa thì ẩn', () => {
  render(<InfoTip term="volume" />);
  fireEvent.click(screen.getByRole('button', { name: /giải thích/i }));
  expect(screen.getByRole('tooltip')).toHaveTextContent('Lượt tìm kiếm');
  fireEvent.click(screen.getByRole('button', { name: /giải thích/i }));
  expect(screen.queryByRole('tooltip')).toBeNull();
});
```

- [ ] **Step 2:** `npx jest --ci __tests__/utils/glossary __tests__/components/InfoTip` → FAIL (module not found).
- [ ] **Step 3:** Viết `utils/glossary.ts` (câu chữ đời thường, 1–2 câu/mục; ví dụ `position`: "Thứ hạng: vị trí website của bạn trên Google khi ai đó tìm từ khóa này. Số càng nhỏ càng tốt — 1 là đứng đầu."). Viết `InfoTip.tsx` (nút `aria-label="Giải thích {term}"`, Tailwind, không thư viện).
- [ ] **Step 4:** Chạy lại → PASS.
- [ ] **Step 5:** `git commit -m "feat(ui): glossary and InfoTip"`

### Task 2: Thông tin chiến lược cào (`scrapeInfo`)

**Files:**
- Modify: `utils/scraper.ts:150` — thêm `export` cho `resolveStrategy`
- Create: `utils/scrapeInfo.ts`
- Test: `__tests__/utils/scrapeInfo.test.ts` (`@jest-environment node`)

**Interfaces:**
- Produces: `getPagesRange(settings: SettingsType, domain?: Partial<DomainType>): { min: number, max: number }`
- Produces: `creditEstimate(keywordCount: number, settings: SettingsType, domain?: Partial<DomainType>): { min: number, max: number, unit: 'credit' | 'lượt gọi', label: string }` — `label` ví dụ `"~5 credit"` hoặc `"3–30 lượt gọi"`.
- Produces: `notFoundLabel(settings: SettingsType, domain?: Partial<DomainType>): string`
- `nativePagination` xác định qua `allScrapers.find((s) => s.id === settings.scraper_type)?.nativePagination`.

- [ ] **Step 1: Test**

```ts
const base = { scraper_type: 'scrapingrobot', scrape_strategy: 'basic', scrape_pagination_limit: 5, scrape_smart_full_fallback: false } as SettingsType;
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
```

- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** Viết `utils/scrapeInfo.ts` dùng `resolveStrategy` (đã export).
- [ ] **Step 4:** Chạy → PASS; chạy lại `__tests__/utils/scraper.test.ts` → PASS.
- [ ] **Step 5:** `git commit -m "feat: scrape strategy info (pages, credit estimate, not-found label)"`

### Task 3: Lỗi cào sang tiếng Việt (`errorText`)

**Files:** Create `utils/errorText.ts`; Test `__tests__/utils/errorText.test.ts`

**Interfaces:**
- Produces: `toVietnameseError(raw: string | undefined | null): { message: string, detail: string }`

Bảng mẫu (so khớp không phân biệt hoa thường, theo thứ tự):
| Mẫu trong `raw` | `message` |
|---|---|
| `quota`, `credit`, `insufficient`, `402`, `limit exceeded` | Hết credit/hạn mức của công cụ lấy thứ hạng. Kiểm tra tài khoản dịch vụ. |
| `401`, `403`, `unauthorized`, `invalid api key`, `invalid token`, `forbidden` | API key của công cụ lấy thứ hạng không đúng. Kiểm tra lại trong Cài đặt › Công cụ lấy thứ hạng. |
| `timeout`, `timed out`, `ETIMEDOUT`, `ECONNRESET` | Công cụ lấy thứ hạng phản hồi quá chậm. Thử cập nhật lại sau. |
| `do not adhere to expected format`, `enablejs`, `captcha`, `unusual traffic` | Google chặn lượt kiểm tra này nên không đọc được kết quả. Thử lại sau. |
| `failed on all`, `too unreliable` | Không lấy được trang kết quả nào. Thử cập nhật lại sau. |
| (khác / rỗng) | Không cập nhật được thứ hạng. |

`detail` = `raw` nguyên văn (chuỗi rỗng nếu không có).

- [ ] **Step 1: Test** — mỗi dòng bảng một `it`, ví dụ:
```ts
expect(toVietnameseError('Scraper failed on all 1 pages for x').message).toMatch(/Không lấy được trang kết quả/);
expect(toVietnameseError('[ERROR] Scraped search results do not adhere to expected format').message).toMatch(/Google chặn/);
expect(toVietnameseError('weird thing')).toEqual({ message: 'Không cập nhật được thứ hạng.', detail: 'weird thing' });
expect(toVietnameseError(undefined).detail).toBe('');
```
- [ ] **Step 2:** Chạy → FAIL. **Step 3:** Viết hàm. **Step 4:** Chạy → PASS.
- [ ] **Step 5:** `git commit -m "feat: Vietnamese scraper error text"`

### Task 4: `LockedHint` + mở Cài đặt đúng tab

**Files:**
- Create: `components/common/LockedHint.tsx`; Test `__tests__/components/LockedHint.test.tsx`
- Modify: `components/settings/Settings.tsx:38-39` — prop `initialTab?: 'scraper' | 'notification' | 'integrations'` (mặc định `'scraper'`)
- Modify (thêm state `settingsTab` cạnh `showSettings`, truyền `initialTab`): `pages/domains/index.tsx`, `pages/domain/[slug]/index.tsx`, `pages/domain/ideas/[slug]/index.tsx`, `pages/domain/insight/[slug]/index.tsx`, `pages/domain/console/[slug]/index.tsx`, `pages/research/index.tsx`
- Modify (gắn `LockedHint`): `components/ideas/KeywordIdeasUpdater.tsx:126-131`, `pages/research/index.tsx:107-125`, `components/keywords/AddKeywords.tsx:160-170` (ô Thành phố), `components/settings/AdWordsSettings.tsx:78-132`, `components/keywords/KeywordFilter.tsx:232` (mục sắp xếp bị khóa); tab Khám phá/Phân tích khi chưa kết nối Search Console — trang `pages/domain/console|insight/[slug]` hiển thị `LockedHint` ở vùng nội dung.

**Interfaces:**
- Produces: `<LockedHint reason: string, actionLabel?: string, onAction?: () => void />` — render `🔒 {reason}` và, nếu có `onAction`, nút link `→ {actionLabel}`.
- Lý do cụ thể (copy):
  - Gợi ý từ khóa: "Cần kết nối Google Ads để lấy gợi ý từ khóa." → "Mở Cài đặt › Tích hợp"
  - Search Console: "Cần kết nối Google Search Console để xem dữ liệu này." → "Mở Cài đặt › Tích hợp"
  - Thành phố: "Công cụ lấy thứ hạng đang dùng không hỗ trợ chọn thành phố." → "Đổi công cụ trong Cài đặt"
  - AdWords: "Điền đủ Client ID và Client Secret trước." / "Điền đủ 4 thông tin Google Ads trước."
  - Nút "Xuất/Thêm" khi chưa có gợi ý nào: "Chưa có gợi ý nào để thao tác."

- [ ] **Step 1: Test**
```tsx
it('hiện lý do và gọi onAction', () => {
  const fn = jest.fn();
  render(<LockedHint reason="Cần kết nối Google Ads." actionLabel="Mở Cài đặt" onAction={fn} />);
  expect(screen.getByText(/Cần kết nối Google Ads/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /Mở Cài đặt/ }));
  expect(fn).toHaveBeenCalledTimes(1);
});
it('không có onAction thì không có nút', () => {
  render(<LockedHint reason="x" />); expect(screen.queryByRole('button')).toBeNull();
});
```
- [ ] **Step 2:** FAIL → **Step 3:** viết component, thêm `initialTab`, gắn vào các vị trí trên (component con cần mở Cài đặt nhận thêm prop `openSettings?: (tab) => void` từ trang).
- [ ] **Step 4:** `npx jest --ci` → test mới PASS; số test đạt không giảm so với trước (25, cộng test mới).
- [ ] **Step 5:** Kiểm tra tay: `/research` thấy dòng 🔒 dưới nút gợi ý; bấm → Cài đặt mở ở tab Tích hợp.
- [ ] **Step 6:** `git commit -m "feat(ui): explain locked features with LockedHint"`

### Task 5: Thứ hạng 0, lỗi và trạng thái trống

**Files:**
- Modify: `components/keywords/KeywordPosition.tsx` — prop `notFoundText?: string` (mặc định `'Chưa lọt top 100'`), hiển thị text đó thay `'>100'`; đang cập nhật: `title="Đang cập nhật…"`.
- Modify: `components/keywords/KeywordsTable.tsx` — tính `notFoundLabel(settings, domain)` một lần, truyền xuống `Keyword` → `KeywordPosition`; đổi câu trống dòng 254 thành "Chưa có từ khóa nào cho loại thiết bị này. Bấm **+** để thêm từ khóa bạn muốn theo dõi (ví dụ: tên dịch vụ của bạn)."
- Modify: `components/keywords/Keyword.tsx:120-124` (popup lỗi) — hiển thị `toVietnameseError(lastUpdateError.error).message`, kèm `<details><summary>Chi tiết kỹ thuật</summary>{detail}</details>`.
- Test: `__tests__/components/Keyword.test.tsx` (thêm case)

**Interfaces:** Consumes `notFoundLabel` (Task 2), `toVietnameseError` (Task 3).

- [ ] **Step 1: Test** — thêm vào `Keyword.test.tsx`:
```tsx
it('thứ hạng 0 hiện chữ theo chiến lược', () => {
  render(<KeywordPosition position={0} notFoundText="Chưa lọt top 50" />);
  expect(screen.getByText('Chưa lọt top 50')).toBeInTheDocument();
});
```
- [ ] **Step 2:** FAIL → **Step 3:** sửa 3 file. → **Step 4:** PASS.
- [ ] **Step 5:** `git commit -m "feat(ui): readable not-found position, errors and empty states"`

### Task 6: Dịch — khung chung, trang domain, đăng nhập

**Files (chỉ đổi chuỗi hiển thị):** `components/common/{TopBar,Sidebar,Footer,Modal,SelectField,InputField,SecretField,ToggleField,Chart,ChartSlim,SidePanel}.tsx`, `components/domains/*.tsx`, `pages/domains/index.tsx`, `pages/login/index.tsx`, `pages/index.tsx`, `pages/_document.tsx` (`lang="vi"`), các `<title>` của mọi trang (ví dụ `Domains - SerpBear` → `Website - SerpBear`). Create `scripts/find-english.js`. Test: `__tests__/pages/index.test.tsx`, `__tests__/pages/domains.test.tsx`, `__tests__/components/{Topbar,Sidebar,DomainItem}.test.tsx`.

- [ ] **Step 1:** Tạo `scripts/find-english.js <paths...>`: duyệt file `.tsx/.ts`, in `file:line: text` cho text node JSX và chuỗi trong `title=`/`placeholder=`/`toast(`/`label:` chỉ gồm chữ ASCII và có ≥ 2 từ tiếng Anh, trừ danh sách cho phép (SerpBear, Google, Search Console, Google Ads, CSV, URL, API, Client ID, Client Secret). Regex trên nội dung file; chấp nhận sai sót nhỏ. Chạy trên `components/common` → in ra nhiều dòng (xác nhận script bắt được).
- [ ] **Step 2:** Đổi các assertion chữ tiếng Anh trong các test trên sang chữ tiếng Việt mới (ví dụ `'Add Domain'` → `'Thêm website'`). Chạy → FAIL.
- [ ] **Step 3:** Dịch chuỗi theo bảng thuật ngữ.
- [ ] **Step 4:** `npx jest --ci` → các test trên PASS.
- [ ] **Step 5:** `node scripts/find-english.js components/common components/domains pages/domains pages/login pages/index.tsx` → không in dòng nào.
- [ ] **Step 6:** `git commit -m "i18n(vi): shell, domains and login"`

### Task 7: Dịch — từ khóa

**Files:** `components/keywords/*.tsx`, `pages/domain/[slug]/index.tsx`, toast trong `services/keywords.tsx`. Thêm `InfoTip` cạnh tiêu đề cột: Thứ hạng (`position`), Tốt nhất (`best`), Lịch sử (`history`), Lượt tìm kiếm (`volume`), Search Console (`sc_position`); trong `KeywordDetails` cạnh "Trang kết quả Google" (`serp`); trong `AddKeywords` cạnh "Nhãn" (`tags`).
Test: `__tests__/components/Keyword.test.tsx`.

- [ ] **Step 1:** Cập nhật assertion tiếng Anh → tiếng Việt; chạy → FAIL.
- [ ] **Step 2:** Dịch; gắn `InfoTip`. Ngày tháng: `toLocaleDateString('en-US', …)` → `'vi-VN'`.
- [ ] **Step 3:** `npx jest --ci` → PASS (trừ 15 test cũ của `__tests__/pages/domain.test.tsx` vốn đã hỏng từ trước — không sửa trong kế hoạch này).
- [ ] **Step 4:** `node scripts/find-english.js components/keywords "pages/domain/[slug]" services/keywords.tsx` → sạch.
- [ ] **Step 5:** `git commit -m "i18n(vi): keywords"`

### Task 8: Dịch — cài đặt

**Files:** `components/settings/*.tsx`, toast trong `services/settings.ts`. `InfoTip` cạnh "Chiến lược cào" (dùng `strategy_basic|custom|smart` trong mô tả từng lựa chọn) và cạnh chữ credit. `Changelog.tsx`: chỉ dịch tiêu đề, giữ nội dung changelog tiếng Anh.

- [ ] **Step 1:** Dịch + `InfoTip`. **Step 2:** `npx jest --ci` → không giảm số test đạt. **Step 3:** `node scripts/find-english.js components/settings services/settings.ts` → sạch.
- [ ] **Step 4:** `git commit -m "i18n(vi): settings"`

### Task 9: Dịch — gợi ý, phân tích, Search Console, nghiên cứu

**Files:** `components/ideas/*.tsx`, `components/insight/*.tsx`, `pages/domain/{ideas,insight,console}/[slug]/index.tsx`, `pages/research/index.tsx`, toast trong `services/{adwords,domains}.tsx`, `components/keywords/SCKeyword*.tsx`. `InfoTip` cạnh Lượt hiển thị (`sc_impressions`), Lượt nhấp (`sc_clicks`), CTR (`sc_ctr`), Vị trí trung bình (`sc_position`).

- [ ] **Step 1:** Dịch + `InfoTip`. **Step 2:** `npx jest --ci` → không giảm. **Step 3:** `node scripts/find-english.js components pages services` (toàn bộ, bỏ qua `pages/api`) → sạch.
- [ ] **Step 4:** `npm run build` → "Compiled successfully".
- [ ] **Step 5: Kiểm tra tay:** đăng nhập, đi qua Website → một website → 4 tab → Nghiên cứu → Cài đặt (3 tab): không còn chữ tiếng Anh giao diện; ⓘ bấm được trên viewport mobile.
- [ ] **Step 6:** `git commit -m "i18n(vi): ideas, insight, console, research"`

---

## Phần 2 — Trợ lý SEO

### Task 10: Công cụ của trợ lý (đọc + đề nghị)

**Files:**
- `npm install @google/genai` (sửa `package.json`, `package-lock.json`)
- Create: `utils/chat/tools.ts`; Test `__tests__/utils/chatTools.test.ts` (`@jest-environment node`)

**Interfaces:**
- Produces:
```ts
type ChatDeps = {
  getDomains(): Promise<DomainType[]>,
  getKeywords(domain: string): Promise<KeywordType[]>,
  getKeyword(id: number): Promise<KeywordType | null>,
  getSettings(): Promise<SettingsType>,
  searchTrends(query: string): Promise<{ summary: string, sources: { title: string, url: string }[] }>,
};
type ChatAction =
  | { type: 'add_keywords', payload: { keywords: KeywordAddPayload[] }, creditEstimate: string, summary: string }
  | { type: 'refresh', payload: { ids: number[] } | { domain: string }, creditEstimate: string, summary: string };
type ToolResult = { result: unknown, action?: ChatAction };
const toolDeclarations: FunctionDeclaration[]; // list_domains, list_keywords, get_keyword_history, get_scraper_settings, explain_metric, search_trends, propose_add_keywords, propose_refresh
function runTool(name: string, args: Record<string, unknown>, deps: ChatDeps): Promise<ToolResult>;
```
- `ChatDeps` **không có hàm ghi** — đây là cơ chế bảo đảm công cụ không thể tự thực thi.
- `list_keywords`: tối đa 200 dòng, trả `{ total, keywords }`; mỗi dòng gồm `id, keyword, country, device, position, url, error` (`error` = `toVietnameseError(...).message` nếu có lỗi).
- `get_scraper_settings`: chỉ `scraper_type, scrape_strategy, scrape_pagination_limit, scrape_smart_full_fallback`.
- `propose_add_keywords(domain, keywords[], country='VN', device='desktop')`: domain phải tồn tại; lọc trùng với từ khóa đã có (cùng keyword+country+device); >20 → `{ result: { error: 'Tối đa 20 từ khóa mỗi lần.' } }`; country phải là key trong `utils/countries`; còn lại 0 → error "Các từ khóa này đã được theo dõi." `creditEstimate` = `creditEstimate(n, settings, domain).label`.
- `propose_refresh`: `ids` phải thuộc từ khóa có thật; ước tính theo số id hoặc số từ khóa của domain.
- Tên công cụ lạ → `{ result: { error: 'Không có công cụ này.' } }`.

- [ ] **Step 1: Test** (deps giả lập bằng `jest.fn`)
```ts
it('propose_add_keywords không ghi gì, trả action có credit', async () => {
  const r = await runTool('propose_add_keywords', { domain: 'wifim.vn', keywords: ['a', 'b'] }, deps);
  expect(r.action?.type).toBe('add_keywords');
  expect(r.action?.creditEstimate).toBe('~2 credit');
});
it('domain không tồn tại → lỗi tiếng Việt, không action', async () => { /* expect r.action undefined, r.result.error matches /không tồn tại/ */ });
it('>20 từ khóa → lỗi', ...);
it('lọc từ khóa đã theo dõi', ...);       // existing 'wifim' VN desktop → only new ones in payload
it('list_keywords cắt 200 dòng, báo total', ...); // 250 fake → keywords.length 200, total 250
it('get_scraper_settings không lộ key', ...);     // JSON.stringify(result) not contains 'scaping_api'
it('tên công cụ lạ', ...);
```
- [ ] **Step 2:** FAIL → **Step 3:** viết `tools.ts` → **Step 4:** PASS.
- [ ] **Step 5:** `git commit -m "feat(chat): assistant tools with propose-only actions"`

### Task 11: Vòng lặp hội thoại Gemini

**Files:** Create `utils/chat/runChat.ts`, `utils/chat/prompt.ts`; Test `__tests__/utils/runChat.test.ts` (`@jest-environment node`)

**Interfaces:**
- Consumes: `toolDeclarations`, `runTool`, `ChatDeps`, `ChatAction` (Task 10).
- Produces:
```ts
type ChatMessage = { role: 'user' | 'model', text: string };
type GeminiLike = { generateContent(req: { model: string, contents: unknown[], config: unknown }): Promise<{ text?: string, functionCalls?: { name: string, args: Record<string, unknown> }[] }> };
class ChatError extends Error {}
function runChat(input: { messages: ChatMessage[], context: { domain?: string } }, deps: ChatDeps, client: GeminiLike, model: string): Promise<{ reply: string, action?: ChatAction }>;
const SYSTEM_PROMPT: string; // prompt.ts
```
- Gửi tối đa 20 tin gần nhất. Tối đa 5 vòng gọi công cụ; quá → trả câu "Mình cần thêm thời gian, bạn hỏi cụ thể hơn nhé." Nhiều action trong một lượt → giữ action **đầu tiên**, báo model rằng chỉ một đề nghị được gửi.
- `SYSTEM_PROMPT` (tiếng Việt): vai trợ lý SEO cho người không chuyên; giải thích thuật ngữ theo `glossary`; **chỉ nêu số liệu có từ công cụ**, không bịa; thiếu dữ liệu thì nói rõ (ví dụ chưa kết nối Google Ads nên không có lượt tìm kiếm); muốn thêm/cập nhật thì dùng `propose_*` và nhắc người dùng bấm Xác nhận; nếu `context.domain` có thì "website này" = domain đó.
- Lỗi từ `client` → ném `ChatError` với `message` tiếng Việt: hết hạn mức (429/`RESOURCE_EXHAUSTED`) → "Trợ lý đang quá tải hoặc hết hạn mức Gemini. Thử lại sau ít phút."; key sai (400/403 `API key`) → "Gemini API key không hợp lệ. Kiểm tra GEMINI_API_KEY trong .env.local."; khác → "Trợ lý gặp lỗi, thử lại sau."

- [ ] **Step 1: Test** (client giả lập trả kịch bản)
```ts
it('gọi công cụ đọc rồi trả lời', ...);          // 1st: functionCalls list_domains; 2nd: text → reply text, deps.getDomains called
it('trả action khi model gọi propose_add_keywords', ...);
it('công cụ lạ không làm vỡ vòng lặp', ...);       // functionCalls [{name:'hack_db'}] then text → reply ok
it('dừng sau 5 vòng', ...);                        // client always returns functionCalls → reply matches /cần thêm thời gian/
it('429 → ChatError tiếng Việt', ...);
it('chỉ gửi 20 tin gần nhất', ...);                // 30 messages → first generateContent call has 20 contents
```
- [ ] **Step 2:** FAIL → **Step 3:** viết → **Step 4:** PASS.
- [ ] **Step 5:** `git commit -m "feat(chat): Gemini tool-calling loop"`

### Task 12: API `/api/chat`

**Files:** Create `pages/api/chat.ts`, `utils/chat/deps.ts`; Modify `.env.example` (thêm `GEMINI_API_KEY=` và `GEMINI_MODEL=` trống, có comment).

**Interfaces:**
- `GET /api/chat` → `{ enabled: boolean }` (`enabled = !!process.env.GEMINI_API_KEY`).
- `POST /api/chat` body `{ messages: ChatMessage[], context?: { domain?: string } }` → 200 `{ reply, action? }`; thiếu key → 503 `{ error: 'Chưa cấu hình Gemini API key. Thêm GEMINI_API_KEY vào .env.local rồi khởi động lại app.' }`; `ChatError` → 502 `{ error: message }`; body sai → 400 `{ error: 'Yêu cầu không hợp lệ.' }`.
- `utils/chat/deps.ts`: `createDeps(client): ChatDeps` dùng Sequelize models `Domain`, `Keyword` + `parseKeywords` + `getAppSettings`; `searchTrends` gọi `client.models.generateContent` với `config: { tools: [{ googleSearch: {} }] }`, lấy nguồn từ `candidates[0].groundingMetadata.groundingChunks[].web`.
- Client thật: `new GoogleGenAI({ apiKey })`, `client.models` thỏa `GeminiLike`.

- [ ] **Step 1:** Viết route + deps (logic đã có test ở Task 10–11).
- [ ] **Step 2: Kiểm tra (chưa có key)** — `npm run build && npm start`, đăng nhập trên trình duyệt, chạy trong console: `await fetch('/api/chat').then(r=>r.json())` → `{enabled:false}`; POST → 503 với câu tiếng Việt; gọi khi chưa đăng nhập → 401.
- [ ] **Step 3: Kiểm tra (người dùng tự thêm key vào `.env.local`, khởi động lại)** — POST `{messages:[{role:'user',text:'wifim.vn đang đứng thứ mấy cho từ khóa wifim?'}]}` → `reply` nhắc thứ hạng 1; log server không in key.
- [ ] **Step 4:** `git commit -m "feat(chat): /api/chat endpoint"`

### Task 13: Khung chat trên giao diện

**Files:** Create `components/chat/ChatWidget.tsx`, `components/chat/ActionCard.tsx`, `services/chat.ts`; Modify `pages/_app.tsx` (render `<ChatWidget />` khi `router.pathname !== '/login'`); Test `__tests__/components/ChatWidget.test.tsx`, `__tests__/components/ActionCard.test.tsx`.

**Interfaces:**
- `services/chat.ts`: `useChatStatus()` (react-query GET `/api/chat`), `sendChat(messages, context): Promise<{ reply, action? }>` (ném lỗi với `error` từ server).
- `<ActionCard action: ChatAction, onConfirm: () => Promise<void>, onDismiss: () => void />` — hiển thị `summary`, nút `Xác nhận — tốn {creditEstimate}` và `Bỏ qua`; sau lần bấm đầu: disable cả hai nút, hiện "Đang thực hiện…"; xong → "Đã xong".
- `ChatWidget`: nút tròn nổi góc phải dưới; `enabled=false` → bấm mở khung có `LockedHint reason="Chưa cấu hình Gemini API key (GEMINI_API_KEY trong .env.local)."`; khung trống hiện 3 câu gợi ý (bấm = gửi); tin của model render bằng `react-markdown` (dynamic import như `Changelog.tsx`); `context.domain` lấy từ `router.query.slug` → tra domain qua `useFetchDomains` (slug → domain).
- Xác nhận `add_keywords` → `POST /api/keywords` body `{ keywords: payload.keywords }`; `refresh` → `POST /api/refresh?id=<ids.join(',')>` hoặc `?id=all&domain=<domain>`. Sau đó `queryClient.invalidateQueries('keywords')` và thêm tin hệ thống vào hội thoại ("Đã thêm N từ khóa, đang cập nhật thứ hạng." / "Đã yêu cầu cập nhật thứ hạng.") rồi gửi tiếp cho trợ lý.
- Desktop: panel cố định bên phải rộng 380px; màn < 768px: toàn màn hình.

- [ ] **Step 1: Test**
```tsx
it('bấm Xác nhận hai lần chỉ gọi một lần', async () => {
  const onConfirm = jest.fn(() => new Promise<void>((r) => setTimeout(r, 50)));
  render(<ActionCard action={addAction} onConfirm={onConfirm} onDismiss={jest.fn()} />);
  const btn = screen.getByRole('button', { name: /Xác nhận — tốn ~2 credit/ });
  fireEvent.click(btn); fireEvent.click(btn);
  expect(onConfirm).toHaveBeenCalledTimes(1);
  expect(btn).toBeDisabled();
});
it('chưa có key thì hiện lý do khóa', ...);   // mock useChatStatus → {enabled:false}; open → text /Chưa cấu hình Gemini API key/
it('gửi câu gợi ý và hiện trả lời', ...);    // mock sendChat → {reply:'**Thứ hạng** 1'}; expect strong 'Thứ hạng'
```
- [ ] **Step 2:** FAIL → **Step 3:** viết → **Step 4:** PASS.
- [ ] **Step 5:** `git commit -m "feat(chat): chat widget with confirm-before-acting"`

### Task 14: Kiểm tra cuối

- [ ] **Step 1:** `npx jest --ci` → mọi test mới PASS; chỉ còn 2 bộ lỗi cũ (`__tests__/pages/domain.test.tsx`, `__tests__/hooks/domains.test.tsx`), không thêm bộ lỗi nào.
- [ ] **Step 2:** `npm run lint` → không lỗi mới trong các file đã sửa.
- [ ] **Step 3:** `npm run build` → "Compiled successfully".
- [ ] **Step 4: Kiểm tra tay trên app (có key Gemini):**
  - Hỏi "wifim.vn đang đứng thứ mấy?" → trả lời đúng số liệu trong bảng.
  - Hỏi "Lượt tìm kiếm là gì?" → giải thích đời thường.
  - Hỏi "Gợi ý 2 từ khóa về wifi marketing cho wifim.vn rồi thêm vào" → thẻ đề nghị có ước tính credit; bấm Bỏ qua → không có request `POST /api/keywords` trong log; hỏi lại, bấm Xác nhận → đúng một request, từ khóa xuất hiện trong bảng.
  - Mobile (375px): khung chat toàn màn hình, ⓘ bấm được.
- [ ] **Step 5:** Báo kết quả cho người dùng (kể cả phần chưa kiểm được).
