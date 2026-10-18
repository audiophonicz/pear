import { defineConfig } from 'vite';

// Relative base so the same build works whether served from a domain root
// (self-hosted via Docker/K8s) or a subpath (GitHub Pages at /pear/) --
// without needing separate builds per deployment target.
export default defineConfig({
  base: './',
});
