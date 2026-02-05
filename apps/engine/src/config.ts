export const config = {
  tickInterval: 1000, // 1 second
  supabaseUrl: process.env.SUPABASE_URL || 'http://localhost:54321',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || '',
  llmProxyUrl: process.env.LLM_PROXY_URL || 'http://localhost:3001',
} as const;
