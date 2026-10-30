import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Source icon already has its background and fits the maskable safe zone (ADR-7)
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: '#0A1628' } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: '#0A1628' } },
  },
  images: ['public/icon.svg'],
});
