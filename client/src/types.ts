export type Role = "system" | "user" | "assistant";

export interface ChatMessage {
  role: Role;
  content: string;
}

export interface Thread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface ChatRequestBody {
  threadId?: string;
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  systemPromptKey?: "default" | "code" | "concise";
  useCitationHints?: boolean;
}

export interface MlAnalyzeResult {
  language: string | null;
  keywords: string[];
  word_count: number;
  char_count: number;
}

export type SystemPromptKey = "default" | "code" | "concise";

export interface ModelOption {
  id: string;
  label: string;
}
