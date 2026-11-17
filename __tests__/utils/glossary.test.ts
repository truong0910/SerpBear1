import { glossary, getGlossary } from '../../utils/glossary';

describe('glossary', () => {
   it('mọi mục có term và giải thích ngắn', () => {
      Object.values(glossary).forEach((g) => { expect(g.term).toBeTruthy(); expect(g.explain.length).toBeLessThanOrEqual(240); });
   });
   it('getGlossary trả null cho key lạ', () => {
      expect(getGlossary('xyz')).toBeNull();
      expect(getGlossary('position')?.term).toBe('Thứ hạng');
   });
});
