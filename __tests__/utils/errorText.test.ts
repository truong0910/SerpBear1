import { toVietnameseError } from '../../utils/errorText';

describe('toVietnameseError', () => {
   it.each([
      ['Insufficient credit', /Hết credit/],
      ['HTTP 402', /Hết credit/],
      ['401 Unauthorized', /API key/],
      ['Invalid API key', /API key/],
      ['ETIMEDOUT', /quá chậm/],
      ['timeout of 5000ms', /quá chậm/],
      ['[ERROR] Scraped search results do not adhere to expected format', /Google chặn/],
      ['captcha required', /Google chặn/],
      ['Scraper failed on all 1 pages for x', /Không lấy được trang kết quả/],
   ])('%s', (raw, re) => expect(toVietnameseError(raw).message).toMatch(re));
   it('khác', () => expect(toVietnameseError('weird thing')).toEqual({ message: 'Không cập nhật được thứ hạng.', detail: 'weird thing' }));
   it('rỗng', () => { expect(toVietnameseError(undefined).detail).toBe(''); expect(toVietnameseError(null).message).toBe('Không cập nhật được thứ hạng.'); });
});
