import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenAI } from '@google/genai';
import db from '../../database/database';
import verifyUser from '../../utils/verifyUser';
import createDeps from '../../utils/chat/deps';
import { ChatError, ChatMessage, GeminiLike, runChat } from '../../utils/chat/runChat';
import { ChatAction } from '../../utils/chat/tools';

type ChatResponse = { enabled?: boolean, reply?: string, action?: ChatAction, error?: string };

const DEFAULT_MODEL = 'gemini-2.5-flash';
const MAX_TEXT = 4000;

const validMessages = (messages: unknown): messages is ChatMessage[] => Array.isArray(messages) && messages.length > 0 && messages.length <= 100
   && messages.every((m) => m && (m.role === 'user' || m.role === 'model') && typeof m.text === 'string' && m.text.length <= MAX_TEXT)
   && messages[messages.length - 1].role === 'user';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ChatResponse>) {
   await db.sync();
   const authorized = verifyUser(req, res);
   if (authorized !== 'authorized') {
      return res.status(401).json({ error: authorized });
   }
   const apiKey = process.env.GEMINI_API_KEY;
   if (req.method === 'GET') {
      return res.status(200).json({ enabled: !!apiKey });
   }
   if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Phương thức không được hỗ trợ.' });
   }
   if (!apiKey) {
      return res.status(503).json({ error: 'Chưa cấu hình Gemini API key. Thêm GEMINI_API_KEY vào .env.local rồi khởi động lại app.' });
   }
   const { messages, context } = req.body || {};
   if (!validMessages(messages)) {
      return res.status(400).json({ error: 'Yêu cầu không hợp lệ.' });
   }
   const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
   const domain = typeof context?.domain === 'string' ? context.domain.slice(0, 255) : undefined;

   const genai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1beta' } });
   const client: GeminiLike = {
      generateContent: async (request) => {
         const r = await genai.models.generateContent(request as Parameters<typeof genai.models.generateContent>[0]);
         return {
            text: r.text,
            functionCalls: r.functionCalls?.map((c) => ({ name: c.name || '', args: (c.args || {}) as Record<string, unknown> })),
            modelContent: r.candidates?.[0]?.content,
         };
      },
   };
   try {
      const result = await runChat({ messages, context: { domain } }, createDeps(genai, model), client, model);
      return res.status(200).json(result);
   } catch (error) {
      if (error instanceof ChatError) {
         return res.status(502).json({ error: error.message });
      }
      console.log('[ERROR] Chat failed: ', (error as Error)?.message);
      return res.status(502).json({ error: 'Trợ lý gặp lỗi, thử lại sau.' });
   }
}
