// Provider-Vorlagen für den Endpunkt-Dialog.
// Füllen alle Felder außer dem API-Key vor.
import type { EndpointFormat } from '../../shared/types'

export interface EndpointTemplate {
  id: string
  label: string
  url: string
  model: string
  format: EndpointFormat
  hint?: string
}

export const ENDPOINT_TEMPLATES: EndpointTemplate[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    format: 'openai',
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    url: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-20250514',
    format: 'anthropic',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'openai/gpt-4o-mini',
    format: 'openai',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    url: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    format: 'openai',
  },
  {
    id: 'kimi',
    label: 'Kimi (Moonshot)',
    url: 'https://api.moonshot.cn/v1/chat/completions',
    model: 'moonshot-v1-8k',
    format: 'openai',
  },
  {
    id: 'qwen',
    label: 'Qwen (Alibaba Cloud)',
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-plus',
    format: 'openai',
  },
  {
    id: 'gemini',
    label: 'Gemini (Google)',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    model: 'gemini-2.5-flash',
    format: 'openai',
  },
  {
    id: 'mistral',
    label: 'Mistral',
    url: 'https://api.mistral.ai/v1/chat/completions',
    model: 'mistral-small-latest',
    format: 'openai',
  },
  {
    id: 'groq',
    label: 'Groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    format: 'openai',
  },
  {
    id: 'ollama',
    label: 'Ollama (lokal)',
    url: 'http://localhost:11434/v1/chat/completions',
    model: 'llama3.2',
    format: 'openai',
    hint: 'Lokaler Server – in der Regel kein API-Key nötig.',
  },
]
