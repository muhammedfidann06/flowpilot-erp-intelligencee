/** Optional local preview only; GitHub Pages still serves authored files with no build step. */
import { defineConfig } from 'vite';
export default defineConfig({root:'dist',server:{host:'0.0.0.0',allowedHosts:['terminal.local'],hmr:false}});
