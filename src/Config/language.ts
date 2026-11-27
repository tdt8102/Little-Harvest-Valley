export const LANGUAGES = ['vi', 'en'] as const;
export type Language = typeof LANGUAGES[number];
export const DEFAULT_LANGUAGE: Language = 'vi';
export const isLanguage = (value: unknown): value is Language => LANGUAGES.some(language => language === value);
