import { SYSTEM_PROMPT } from './prompt';
import { ChatAction, ChatDeps, runTool, toolDeclarations } from './tools';

export type ChatMessage = { role: 'user' | 'model', text: string };
type GeminiCall = { name: string, args: Record<string, unknown> };
export type GeminiLike = {
   generateContent(req: { model: string, contents: unknown[], config: unknown }): Promise<{ text?: string, functionCalls?: GeminiCall[], modelContent?: unknown }>,
};

export class ChatError extends Error {}

export const MAX_MESSAGES = 20;
export const MAX_ROUNDS = 5;
const TOO_LONG = 'Mình cần thêm thời gian, bạn hỏi cụ thể hơn nhé.';

const toChatError = (e: unknown): ChatError => {
   const { status, message = '' } = (e || {}) as { status?: number, message?: string };
   console.log('[ERROR] Gemini request failed: ', status, message.slice(0, 300));
   if (status === 429 || /RESOURCE_EXHAUSTED|\b429\b/.test(message)) {
      return new ChatError('Trợ lý đang quá tải hoặc hết hạn mức Gemini. Thử lại sau ít phút.');
   }
   if ((status === 400 || status === 403 || status === 401) && /API key|API_KEY/i.test(message)) {
      return new ChatError('Gemini API key không hợp lệ. Kiểm tra GEMINI_API_KEY trong .env.local.');
   }
   return new ChatError('Trợ lý gặp lỗi, thử lại sau.');
};

export const runChat = async (
   input: { messages: ChatMessage[], context: { domain?: string } },
   deps: ChatDeps,
   client: GeminiLike,
   model: string,
): Promise<{ reply: string, action?: ChatAction }> => {
   let recent = input.messages.slice(-MAX_MESSAGES);
   while (recent.length > 0 && recent[0].role !== 'user') recent = recent.slice(1);
   const contents: unknown[] = recent.map((m) => ({ role: m.role, parts: [{ text: m.text }] }));
   const systemInstruction = SYSTEM_PROMPT + (input.context?.domain ? `\n\nWebsite hiện tại: ${input.context.domain}` : '');
   const config = { systemInstruction, tools: [{ functionDeclarations: toolDeclarations }] };

   let action: ChatAction | undefined;
   for (let round = 0; round < MAX_ROUNDS; round += 1) {
      let response;
      try {
         response = await client.generateContent({ model, contents, config });
      } catch (e) {
         throw toChatError(e);
      }
      const calls = response.functionCalls || [];
      if (calls.length === 0) {
         return { reply: response.text || 'Mình chưa có câu trả lời, bạn thử hỏi lại nhé.', action };
      }
      const responseParts = [];
      for (const call of calls) {
         // eslint-disable-next-line no-await-in-loop
         const { result, action: proposed } = await runTool(call.name, call.args || {}, deps);
         if (proposed && action) {
            responseParts.push({ functionResponse: { name: call.name, response: { error: 'Mỗi lượt chỉ gửi một đề nghị. Hãy đợi người dùng xác nhận đề nghị đầu.' } } });
         } else {
            if (proposed) action = proposed;
            responseParts.push({ functionResponse: { name: call.name, response: { result } } });
         }
      }
      contents.push(response.modelContent || { role: 'model', parts: calls.map((c) => ({ functionCall: { name: c.name, args: c.args } })) });
      contents.push({ role: 'user', parts: responseParts });
   }
   return { reply: TOO_LONG, action };
};
