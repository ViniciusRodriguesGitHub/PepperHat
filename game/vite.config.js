import { defineConfig } from 'vite';

export default defineConfig({
  // Configuração base
  base: './',
  
  // Configuração do servidor de desenvolvimento
  server: {
    port: 8080,
    open: true,
    host: true
  },
  
  // Configuração de build
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser',
    rollupOptions: {
      input: {
        main: './index.html',
        modular: './example-modular.html'
      },
      output: {
        manualChunks: {
          'core': [
            './js/core/AssetManager.js',
            './js/core/GameState.js'
          ],
          'entities': [
            './js/entities/Player.js'
          ]
        }
      }
    }
  },
  
  // Configuração de assets
  assetsInclude: [
    '**/*.png',
    '**/*.jpg',
    '**/*.jpeg',
    '**/*.gif',
    '**/*.svg',
    '**/*.mp3',
    '**/*.wav',
    '**/*.ogg'
  ],
  
  // Configuração de otimização
  optimizeDeps: {
    include: []
  },
  
  // Configuração de plugins
  plugins: [
    // Plugin personalizado para assets do jogo
    {
      name: 'game-assets',
      generateBundle(options, bundle) {
        // Adicionar informações sobre assets no bundle
        const assetInfo = {
          images: Object.keys(bundle).filter(key => 
            key.endsWith('.png') || key.endsWith('.jpg') || key.endsWith('.jpeg')
          ),
          sounds: Object.keys(bundle).filter(key => 
            key.endsWith('.mp3') || key.endsWith('.wav') || key.endsWith('.ogg')
          )
        };
        
        this.emitFile({
          type: 'asset',
          fileName: 'assets-info.json',
          source: JSON.stringify(assetInfo, null, 2)
        });
      }
    }
  ]
});
