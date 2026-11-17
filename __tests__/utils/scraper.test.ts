/**
 * @jest-environment node
 */
import { extractScrapedResult, getSerp } from '../../utils/scraper';

const result = (href: string, title: string, cite: string) => `<div><div><a href="${href}"><h3>${title}</h3><cite>${cite}</cite></a></div></div>`;

describe('extractScrapedResult', () => {
   it('rebuilds the URL from <cite> when Google uses /goto links', () => {
      const html = `<html><body><div id="search">
         ${result('/goto?url=CAESabc', 'Cornell', 'https://it.cornell.edu › dns › examples-domain-names')}
         ${result('https://example.com/', 'Example', 'https://example.com')}
         ${result('/goto?url=CAESxyz', 'Reddit', '10+ comments · 5 years ago')}
      </div></body></html>`;
      const res = extractScrapedResult(html, 'desktop');
      expect(res.map((r) => r.url)).toEqual([
         'https://it.cornell.edu/dns/examples-domain-names',
         'https://example.com/',
         '/goto?url=CAESxyz',
      ]);
      expect(getSerp('it.cornell.edu', res).position).toBe(1);
   });
});
