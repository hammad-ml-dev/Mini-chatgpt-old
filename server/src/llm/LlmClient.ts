import type { ChatMessage } from "../types.js";

export interface LlmCompletionParams {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
}

export interface LlmClient {
  complete(params: LlmCompletionParams): Promise<string>;
}
