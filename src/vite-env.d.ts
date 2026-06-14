/// <reference types="vite/client" />

// troika-three-text (dependência transitiva do drei) não traz tipos próprios.
// Só usamos configureTextBuilder para forçar a thread principal (sem worker).
declare module 'troika-three-text' {
  export function configureTextBuilder(config: {
    useWorker?: boolean;
    sdfGlyphSize?: number;
    [key: string]: unknown;
  }): void;
}
