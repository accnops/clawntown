declare module 'leo-profanity' {
  function check(text: string): boolean;
  function clean(text: string, replaceKey?: string): string;
  function list(): string[];
  function add(word: string | string[]): void;
  function remove(word: string | string[]): void;
  function reset(): void;
  function clearList(): void;
  function getDictionary(lang: string): string[];
  function loadDictionary(lang: string): void;
}
