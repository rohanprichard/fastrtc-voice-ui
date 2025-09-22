import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/widget.js',
      name: 'FastRTCVoiceWidget',
      formats: ['umd'],
      fileName: 'fastrtcvoice-widget'
    },
    rollupOptions: {
      output: {
        manualChunks: undefined,
      }
    },
    minify: 'terser',
    sourcemap: true
  }
});
