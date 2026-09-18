declare module "@/lib/pdf/brand.mjs" {
  export const BRAND: {
    name: string;
    wordmark: string;
    tagline: string;
    domain: string;
    colors: Record<string, string>;
  };
  export const FONT_STACK: { display: string; body: string; mono: string };
  export function klutchLogoSvg(opts?: { size?: number; mono?: string }): string;
  export function baseStyles(opts: { watermarkText: string }): string;
  export function pageHeaderTemplate(opts: { testName: string }): string;
  export function pageFooterTemplate(): string;
}
