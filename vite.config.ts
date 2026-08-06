import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    // office-api's CORS policy only allows http://localhost:3000 for
    // credentialed requests (refresh cookie) — keep this in sync with
    // Office.Api/Program.cs's FrontendCorsPolicy.
    port: 3000,
    strictPort: true,
  },
});
