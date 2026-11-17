import { fireEvent, render, screen } from '@testing-library/react';
import Keyword from '../../components/keywords/Keyword';
import KeywordPosition from '../../components/keywords/KeywordPosition';
import { dummyKeywords } from '../../__mocks__/data';

const keywordProps = {
   keywordData: dummyKeywords[0],
   selected: false,
   index: 0,
   showSCData: false,
   scDataType: '',
   style: {},
   refreshkeyword: jest.fn(),
   favoriteKeyword: jest.fn(),
   removeKeyword: jest.fn(),
   selectKeyword: jest.fn(),
   manageTags: jest.fn(),
   showKeywordDetails: jest.fn(),
};
jest.mock('react-chartjs-2', () => ({
   Line: () => null,
 }));
describe('Keyword Component', () => {
   it('renders without crashing', async () => {
       render(<Keyword {...keywordProps} />);
       expect(await screen.findByText('compress image')).toBeInTheDocument();
   });
   it('Should Render Position Correctly', async () => {
      render(<Keyword {...keywordProps} />);
      const positionElement = document.querySelector('.keyword_position');
      expect(positionElement?.childNodes[0].nodeValue).toBe('19');
   });
   it('Should Display Position Change arrow', async () => {
      render(<Keyword {...keywordProps} />);
      const positionElement = document.querySelector('.keyword_position i');
      expect(positionElement?.textContent).toBe('▲ 1');
   });
   it('Should Display the SERP Page URL', async () => {
      render(<Keyword {...keywordProps} />);
      const positionElement = document.querySelector('.keyword_url');
      expect(positionElement?.textContent).toBe('/');
   });
   it('Should Display the Keyword Options on dots Click', async () => {
      const { container } = render(<Keyword {...keywordProps} />);
      const button = container.querySelector('.keyword_dots');
      if (button) fireEvent.click(button);
      expect(document.querySelector('.keyword_options')).toBeVisible();
   });
   // it('Should favorite Keywords', async () => {
   //    render(<Keyword {...keywordProps} />);
   //    const button = document.querySelector('.keyword .keyword_dots');
   //    if (button) fireEvent(button, new MouseEvent('click', { bubbles: true }));
   //    const option = document.querySelector('.keyword .keyword_options li:nth-child(1) a');
   //    if (option) fireEvent(option, new MouseEvent('click', { bubbles: true }));
   //    const { favoriteKeyword } = keywordFunctions;
   //    expect(favoriteKeyword).toHaveBeenCalled();
   // });
});

describe('Trạng thái thứ hạng và lỗi', () => {
   it('thứ hạng 0 hiện chữ theo chiến lược', () => {
      render(<KeywordPosition position={0} notFoundText="Chưa lọt top 50" />);
      expect(screen.getByText('Chưa lọt top 50')).toBeInTheDocument();
   });
   it('lỗi cào hiện tiếng Việt kèm chi tiết kỹ thuật', () => {
      const data = { ...dummyKeywords[0], lastUpdateError: { date: '2022-11-15T10:00:00.000Z', error: 'Scraper failed on all 1 pages', scraper: 'scrapingrobot' } };
      const { container } = render(<Keyword {...keywordProps} keywordData={data as any} />);
      const btn = container.querySelectorAll('button')[1];
      fireEvent.click(btn);
      expect(screen.getByText(/Không lấy được trang kết quả nào/)).toBeInTheDocument();
      expect(screen.getByText('Chi tiết kỹ thuật')).toBeInTheDocument();
   });
});
