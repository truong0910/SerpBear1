# Giao diện tiếng Việt + Trợ lý SEO Gemini — Thiết kế

Ngày: 2026-11-16 · Repo: SerpBear v3.1.2 (bản cài riêng, đã có sửa lỗi `/goto` và proxy Scraping Robot)

## 1. Vì sao làm

Người dùng chính **không chuyên marketing/SEO**. Họ thấy app khó dùng vì:
- Toàn bộ chữ là tiếng Anh và thuật ngữ SEO (SERP, Volume, Position…).
- Nút bị khóa (ví dụ "Load Ideas") không nói lý do, không biết phải làm gì để mở.
- Màn hình trống / số `0` không giải thích ý nghĩa (người dùng tưởng app hỏng khi thứ hạng = 0).

Mục tiêu: **mở app là hiểu đang xem gì và bước tiếp theo là gì**, và có một **trợ lý chat** vừa giải thích, vừa phân tích, vừa làm thay việc chính (có hỏi trước).

## 2. Mục tiêu / Không làm / Thất bại nếu

**Mục tiêu**
1. Toàn bộ chữ người dùng nhìn thấy (UI, thông báo toast, lỗi hiển thị) bằng tiếng Việt.
2. Mọi nút/tính năng bị khóa hiển thị **lý do + đường dẫn để mở khóa** ngay cạnh nút (không chỉ tooltip khi rê chuột — người dùng không phát hiện được tooltip).
3. Thuật ngữ khó có biểu tượng ⓘ, bấm hiện giải thích 1–2 câu đời thường.
4. Trạng thái trống hướng dẫn bước kế tiếp; thứ hạng `0` hiển thị thành chữ (ví dụ "Chưa lọt top 50").
5. Trợ lý chat Gemini: đọc dữ liệu của người dùng, tra xu hướng, giải thích chỉ số, đề nghị hành động có nút xác nhận.

**Không làm**
- Không đổi bố cục, màu, theme tổng thể.
- Không làm chế độ chuyển Anh/Việt (chỉ tiếng Việt).
- Không lưu lịch sử chat lâu dài (chỉ trong phiên đang mở; tải lại trang là mất).
- Không dịch log server (`console.log`) và tên trường API/DB.
- **[Quyết định của Claude]** Không dịch email thông báo định kỳ (`email/`). Người dùng đang tắt thông báo email (`notification_interval = never`). Nếu sau này bật lên thì làm thành việc riêng.

**Thất bại nếu (dù chạy được)**
- Chatbot tự thêm từ khóa / tự cào mà người dùng chưa bấm xác nhận → tiêu credit ngoài ý muốn.
- Gemini API key lộ ra trình duyệt.
- Chatbot bịa số liệu (thứ hạng, lượt tìm kiếm) không có trong dữ liệu.
- Chatbot trả lời bằng thuật ngữ khó hiểu không giải thích.

## 3. Ràng buộc

- Next.js 12 (pages router), React 18, react-query 3, Tailwind 3, Sequelize + SQLite. Không nâng cấp framework.
- API route hiện có dùng `verifyUser(req, res)` (cookie đăng nhập hoặc `APIKEY`) — API mới phải dùng y như vậy.
- Key Gemini đặt ở `.env.local` (`GEMINI_API_KEY`), chỉ đọc phía server. Người dùng tự dán key; không đưa vào `settings.json`/UI.
- Không có `GEMINI_API_KEY` → app vẫn chạy bình thường, nút chat hiển thị trạng thái khóa kèm lý do (đúng nguyên tắc mục tiêu 2).
- Credit: mỗi từ khóa tốn `số trang` request mỗi lần cào. Số trang lấy theo `resolveStrategy` (cài đặt riêng của domain ghi đè cài đặt chung):
  Basic = 1 · Custom = `scrape_pagination_limit` · Smart = 1–3, **tối đa 10 nếu bật `scrape_smart_full_fallback`** · scraper `nativePagination` (serpapi, searchapi, crazyserp) = 1.
  Mọi hành động tốn credit phải ghi ước tính trên nút xác nhận. **[Quyết định của Claude]** Hiển thị **khoảng min–max**, nếu min = max thì hiện một số (ví dụ "~5 credit", "1–10 credit"), để không bao giờ báo thấp hơn thực tế. Đơn vị là "credit" khi scraper là Scraping Robot, "lượt gọi" với các scraper khác.
- `POST /api/keywords` **tự cào ngay** các từ khóa vừa thêm (`refreshAndUpdateKeywords`). Vì vậy xác nhận "thêm từ khóa" là đã tốn credit: đề nghị thêm từ khóa phải tự có ước tính credit, và không được nối thêm một lệnh cào riêng sau đó.

## 4. Các cách đã cân nhắc

**Tiếng Việt hóa**
| Cách | Đánh đổi | Chọn |
|---|---|---|
| Sửa thẳng chuỗi trong từng component | Nhanh, không thêm thư viện, dễ đọc. Khó merge bản SerpBear gốc mới. | ✅ (người dùng chọn) |
| Thư viện i18n (next-i18next), en + vi | Chuyển ngôn ngữ được, merge upstream dễ hơn. Thêm dependency + cấu hình, không ai cần tiếng Anh. | ✗ |

**Chatbot**
| Cách | Đánh đổi | Chọn |
|---|---|---|
| Gemini function calling: công cụ đọc tự chạy, công cụ hành động chỉ trả "đề nghị" để UI xác nhận | Chỉ đọc dữ liệu cần thiết, mở rộng được, Gemini không thể tự thực thi. Phức tạp hơn một chút. | ✅ (người dùng chọn) |
| Nhồi toàn bộ dữ liệu vào prompt | Đơn giản. Tốn token, chậm, vỡ khi nhiều từ khóa; hành động phải parse JSON tự do. | ✗ |

**Mức tự chủ của chatbot:** người dùng chọn **B — làm thay nhưng hỏi trước** (thay vì A — chỉ khuyên).

## 5. Thiết kế — Phần 1: Tiếng Việt + giải thích

1. **Dịch chuỗi** trong `components/**`, `pages/**` (phần render), toast/lỗi hiển thị trong `services/**`. Giữ nguyên tên biến, key API.
   - Bảng thuật ngữ thống nhất (dùng xuyên suốt UI và trong prompt chatbot):
     Domain → Website · Keyword → Từ khóa · Position/Rank → Thứ hạng · SERP → Trang kết quả Google · Volume → Lượt tìm kiếm/tháng · Tracking → Theo dõi · Discover → Khám phá · Insight → Phân tích · Ideas → Gợi ý · Scraper → Công cụ lấy thứ hạng · Refresh/Reload SERPs → Cập nhật thứ hạng · Tags → Nhãn · Settings → Cài đặt · Search Console → Google Search Console (giữ tên riêng).
2. **Nút bị khóa:** thêm component dùng chung `LockedHint` (`components/common/LockedHint.tsx`): props `reason`, `actionLabel`, `onAction` (mở Settings đúng tab). Hiển thị dòng `🔒 <lý do> → <hành động>` ngay dưới/cạnh phần bị khóa. Áp dụng ít nhất cho: Load Ideas (cần Google Ads), tab Khám phá/Phân tích (cần Search Console), ô Thành phố (scraper không hỗ trợ), bất kỳ chỗ `cursor-not-allowed` nào khác (hiện có ~10 chỗ).
3. **Giải thích thuật ngữ:** component `InfoTip` (`components/common/InfoTip.tsx`): biểu tượng ⓘ, bấm (không chỉ hover — dùng được trên điện thoại) hiện popover 1–2 câu. Nội dung lấy từ một file `utils/glossary.ts` (map `key → {term, explain}`), cũng là nguồn cho công cụ `explain_metric` của chatbot.
   Tối thiểu: Thứ hạng, Thứ hạng tốt nhất, Lịch sử, Lượt tìm kiếm, Trang kết quả Google, Search Console (lượt hiển thị, lượt nhấp, CTR, vị trí trung bình), Chiến lược cào (Basic/Custom/Smart), credit.
4. **Trạng thái trống & số 0:**
   - Bảng từ khóa trống: "Chưa có từ khóa nào. Bấm **+** để thêm từ khóa bạn muốn theo dõi (ví dụ: tên dịch vụ của bạn)."
   - Thứ hạng `0` + không lỗi, **[Quyết định của Claude]** chữ hiển thị tùy chiến lược hiện hành của domain (keyword không lưu chiến lược đã dùng, nên lấy theo cài đặt hiện tại):
     Basic/Custom → "Chưa lọt top N" (N = số trang × 10) · `nativePagination` → "Chưa lọt top 100" · Smart → "Không thấy trong các trang đã kiểm tra".
   - Thứ hạng `0` + có `lastUpdateError` → "Lỗi khi cập nhật" + lý do tiếng Việt. **[Quyết định của Claude]** Dịch các mẫu lỗi phổ biến (hết credit/quota, sai key/xác thực, quá thời gian, bị Google chặn, không đọc được kết quả) bằng so khớp chuỗi trong một hàm `utils/errorText.ts`. Mẫu không nhận ra → "Không cập nhật được thứ hạng" kèm dòng "Chi tiết kỹ thuật" thu gọn chứa nguyên văn lỗi. Chatbot (`list_keywords`) dùng cùng hàm này.
   - Đang cào → "Đang cập nhật…".

## 6. Thiết kế — Phần 2: Trợ lý SEO

**Giao diện**
- Nút tròn nổi góc phải dưới, hiển thị trên mọi trang trừ `/login`; gắn trong `pages/_app.tsx` (component `components/chat/ChatWidget.tsx`). Bấm mở khung chat (desktop: panel bên phải; mobile: toàn màn hình).
- Tin nhắn hiển thị markdown đơn giản (đậm, danh sách, bảng nhỏ). Có vài câu gợi ý khi khung trống, ví dụ "Website của tôi đang đứng thứ mấy?", "Giải thích 'Lượt tìm kiếm' là gì?", "Gợi ý từ khóa cho wifi marketing".
- Biết ngữ cảnh trang: gửi kèm `slug` domain đang mở (nếu có) để chatbot hiểu "website này".
- Thẻ **đề nghị hành động**: tóm tắt việc sẽ làm + nút `[Xác nhận — tốn ~N credit]` và `[Bỏ qua]`. Bấm xác nhận → frontend gọi API **có sẵn** (`POST /api/keywords`, `POST /api/refresh`) rồi gửi kết quả lại vào hội thoại ("Đã thêm 3 từ khóa, đang cập nhật thứ hạng").

**Server: `pages/api/chat.ts`**
- `POST`, bảo vệ bằng `verifyUser`. Body: `{ messages: [{role, text}], context: { domain?: string } }`. Lịch sử do client giữ và gửi lại mỗi lần.
- Gọi Gemini bằng SDK chính thức của Google cho Node (thêm dependency). Model đặt qua env `GEMINI_MODEL` (có giá trị mặc định là model Gemini Flash hiện hành — builder kiểm tra tên model đúng lúc làm).
- System prompt: tiếng Việt, đối tượng không chuyên, tránh thuật ngữ (nếu dùng thì giải thích theo `glossary`), **chỉ nêu số liệu lấy từ công cụ**, không bịa; nói rõ khi thiếu dữ liệu (ví dụ chưa kết nối Google Ads nên không có lượt tìm kiếm).
- Vòng lặp function calling phía server (giới hạn ~5 vòng/yêu cầu):
  - **Công cụ đọc (tự chạy, gọi thẳng model/Sequelize như các API hiện có):**
    - `list_domains()` → tên, số từ khóa, thứ hạng trung bình.
    - `list_keywords(domain)` → từ khóa, quốc gia, thiết bị, thứ hạng, URL, lỗi gần nhất.
    - `get_keyword_history(keyword_id)` → lịch sử thứ hạng theo ngày + top kết quả lần cào gần nhất.
    - `get_scraper_settings()` → loại scraper, chiến lược, số trang (không trả API key).
    - `explain_metric(key)` → từ `utils/glossary.ts`.
    - `search_trends(query)` → một lời gọi Gemini **riêng** có bật Google Search grounding, trả về tóm tắt + nguồn. (Tách riêng để không phụ thuộc việc model có cho kết hợp grounding với function calling hay không.)
  - **Công cụ hành động (không thực thi):**
    - `propose_add_keywords(domain, keywords[], country, device)`
    - `propose_refresh(keyword_ids[] | domain)`
    - Server kiểm tra hợp lệ (domain tồn tại, tối đa 20 từ khóa/lần, quốc gia hợp lệ), tính **ước tính credit** = số từ khóa × số trang theo chiến lược hiện tại, rồi trả về cho client một object `action` thay vì thực thi. Gemini nhận lại "đã gửi đề nghị cho người dùng, chờ xác nhận".
- Response: `{ reply: string, action?: { type, payload, creditEstimate, summary } }`.
- Lỗi: thiếu key → 503 + thông báo tiếng Việt; Gemini lỗi/hết hạn mức → thông báo tiếng Việt dễ hiểu, không lộ chi tiết kỹ thuật.

**Bảo mật**
- API key Gemini chỉ ở server. Không gửi API key scraper / SMTP / Search Console vào prompt.
- Hành động chỉ được thực thi bởi request riêng do người dùng bấm, đi qua API sẵn có đã kiểm tra quyền.

## 7. Kiểm thử

- Unit test (jest, theo kiểu `__tests__/utils/scraper.test.ts`): hàm tính ước tính credit; hàm validate đề nghị hành động; vòng lặp tool với Gemini **giả lập** (không gọi mạng) đảm bảo công cụ hành động không bao giờ ghi DB.
- Cập nhật các test UI hiện có đang so khớp chữ tiếng Anh.
- Kiểm tra tay trên app: đọc lướt mọi trang không còn chữ tiếng Anh UI; mọi nút khóa có lý do; hỏi chatbot 3 câu (thứ hạng wifim.vn, giải thích chỉ số, gợi ý + thêm từ khóa có xác nhận).

## 8. Để builder tự quyết

- Câu chữ tiếng Việt cụ thể (theo bảng thuật ngữ), vị trí đặt `InfoTip`.
- Thư viện render markdown: `react-markdown` đã có sẵn (dùng lazy trong `components/settings/Changelog.tsx`), nên dùng lại.
- Cách giới hạn độ dài lịch sử gửi lên (ví dụ 20 tin gần nhất).
- Thứ tự làm: Phần 1 trước, Phần 2 sau (đã thống nhất).
