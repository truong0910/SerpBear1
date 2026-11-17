import type { GoogleGenAI } from '@google/genai';
import Domain from '../../database/models/domain';
import Keyword from '../../database/models/keyword';
import { getAppSettings } from '../../pages/api/settings';
import getdomainStats from '../domains';
import parseKeywords from '../parseKeywords';
import { ChatDeps } from './tools';

/** Read-only data access for the assistant. Deliberately exposes no write operations. */
const createDeps = (client: GoogleGenAI, model: string): ChatDeps => ({
   getDomains: async () => {
      const all = await Domain.findAll();
      // search_console holds service-account credentials: never expose it to the assistant.
      const domains = all.map((d) => ({ ...d.get({ plain: true }), search_console: '' })) as DomainType[];
      return getdomainStats(domains);
   },
   getKeywords: async (domain) => {
      const all = await Keyword.findAll({ where: { domain } });
      return parseKeywords(all.map((k) => k.get({ plain: true })));
   },
   getKeyword: async (id) => {
      const found = await Keyword.findByPk(id);
      return found ? parseKeywords([found.get({ plain: true })])[0] : null;
   },
   getSettings: () => getAppSettings(),
   searchTrends: async (query) => {
      const response = await client.models.generateContent({
         model,
         contents: `Tóm tắt ngắn gọn bằng tiếng Việt các xu hướng và ý tưởng từ khóa SEO liên quan đến: ${query}`,
         config: { tools: [{ googleSearch: {} }] },
      });
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = chunks.map((c) => c.web).filter((w): w is { title?: string, uri?: string } => !!w?.uri).slice(0, 5)
         .map((w) => ({ title: w.title || w.uri || '', url: w.uri || '' }));
      return { summary: response.text || '', sources };
   },
});

export default createDeps;
