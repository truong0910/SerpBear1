const scrapingRobot:ScraperSettings = {
   id: 'scrapingrobot',
   name: 'Scraping Robot',
   website: 'scrapingrobot.com',
   scrapeURL: (keyword, settings, countryData, pagination) => {
      const country = keyword.country || 'US';
      const device = keyword.device === 'mobile' ? '&mobile=true' : '';
      const lang = countryData[country][2];
      const p = pagination || { start: 0, num: 10 };
      const url = encodeURI(`https://www.google.com/search?num=${p.num}&start=${p.start}&hl=${lang}&gl=${country}&q=${keyword.keyword}`);
      // Non-US proxies (e.g. VN) get Google's "enable JS" wall instead of results; gl/hl above already localize the SERP.
      // ponytail: always US proxy loses IP-based locality; add per-country fallback if local results drift.
      return `https://api.scrapingrobot.com/?token=${settings.scaping_api}&proxyCountry=US&render=false${device}&url=${url}`;
   },
   resultObjectKey: 'result',
};

export default scrapingRobot;
