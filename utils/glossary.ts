export type GlossaryKey = 'position' | 'best' | 'history' | 'volume' | 'serp' | 'sc_impressions' | 'sc_clicks' | 'sc_ctr' | 'sc_position' | 'strategy_basic' | 'strategy_custom' | 'strategy_smart' | 'credit' | 'tags';

export const glossary: Record<GlossaryKey, { term: string, explain: string }> = {
   position: { term: 'Thứ hạng', explain: 'Vị trí website của bạn trên Google khi ai đó tìm từ khóa này. Số càng nhỏ càng tốt — 1 là đứng đầu.' },
   best: { term: 'Tốt nhất', explain: 'Thứ hạng cao nhất mà website từng đạt được cho từ khóa này kể từ khi bắt đầu theo dõi.' },
   history: { term: 'Lịch sử', explain: 'Biểu đồ nhỏ cho thấy thứ hạng thay đổi thế nào trong 7 ngày gần đây. Đường đi lên nghĩa là thứ hạng đang tốt hơn.' },
   volume: { term: 'Lượt tìm kiếm/tháng', explain: 'Ước tính có bao nhiêu người tìm từ khóa này trên Google mỗi tháng. Càng cao thì càng nhiều người quan tâm.' },
   serp: { term: 'Trang kết quả Google', explain: 'Trang Google hiện ra sau khi bạn gõ từ khóa tìm kiếm. Đây là các kết quả mà công cụ đã đọc được.' },
   sc_impressions: { term: 'Lượt hiển thị', explain: 'Số lần website của bạn xuất hiện trong kết quả Google, dù người ta có bấm vào hay không.' },
   sc_clicks: { term: 'Lượt nhấp', explain: 'Số lần người dùng bấm vào website của bạn từ kết quả tìm kiếm Google.' },
   sc_ctr: { term: 'Tỷ lệ nhấp (CTR)', explain: 'Trong 100 lần website hiện ra, có bao nhiêu lần được bấm vào. Càng cao nghĩa là tiêu đề càng hấp dẫn.' },
   sc_position: { term: 'Vị trí trung bình', explain: 'Thứ hạng trung bình của website trên Google theo dữ liệu của Google Search Console. Số nhỏ là tốt.' },
   strategy_basic: { term: 'Cơ bản', explain: 'Chỉ kiểm tra trang kết quả đầu tiên của Google (khoảng top 10). Rẻ nhất, nhưng từ khóa ngoài top 10 sẽ hiện là chưa lọt top.' },
   strategy_custom: { term: 'Tùy chỉnh', explain: 'Luôn kiểm tra đúng số trang bạn chọn. Số trang càng nhiều thì tìm được thứ hạng sâu hơn nhưng tốn nhiều credit hơn.' },
   strategy_smart: { term: 'Thông minh', explain: 'Bắt đầu từ trang đầu, chỉ kiểm tra thêm trang khi cần. Cân bằng giữa chi phí và độ đầy đủ.' },
   credit: { term: 'Credit', explain: 'Đơn vị tính tiền của dịch vụ lấy thứ hạng. Mỗi lần kiểm tra một trang kết quả Google thường tốn khoảng 1 credit.' },
   tags: { term: 'Nhãn', explain: 'Từ ngắn do bạn đặt để gom nhóm từ khóa (ví dụ: "dịch vụ", "blog") cho dễ lọc và theo dõi.' },
};

export const getGlossary = (key: string): { term: string, explain: string } | null => (
   Object.prototype.hasOwnProperty.call(glossary, key) ? glossary[key as GlossaryKey] : null
);
