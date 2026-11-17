const rules: [RegExp, string][] = [
   [/quota|credit|insufficient|402|limit exceeded/i, 'Hết credit/hạn mức của công cụ lấy thứ hạng. Kiểm tra tài khoản dịch vụ.'],
   [/401|403|unauthorized|invalid api key|invalid token|forbidden/i, 'API key của công cụ lấy thứ hạng không đúng. Kiểm tra lại trong Cài đặt › Công cụ lấy thứ hạng.'],
   [/timeout|timed out|ETIMEDOUT|ECONNRESET/i, 'Công cụ lấy thứ hạng phản hồi quá chậm. Thử cập nhật lại sau.'],
   [/do not adhere to expected format|enablejs|captcha|unusual traffic/i, 'Google chặn lượt kiểm tra này nên không đọc được kết quả. Thử lại sau.'],
   [/failed on all|too unreliable/i, 'Không lấy được trang kết quả nào. Thử cập nhật lại sau.'],
];

export const toVietnameseError = (raw: string | undefined | null): { message: string, detail: string } => {
   const detail = raw || '';
   const hit = rules.find(([re]) => re.test(detail));
   return { message: hit ? hit[1] : 'Không cập nhật được thứ hạng.', detail };
};
