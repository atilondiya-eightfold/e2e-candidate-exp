import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { normalizePath } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { defineConfig } from "vitest/config";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
		viteStaticCopy({
			targets: [
				{
					src: normalizePath(path.resolve("./src/assets/locales")),
					dest: normalizePath(path.resolve("./dist")),
				},
			],
		}),
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
		dedupe: ["react", "react-dom"],
	},
	server: {
		host: true,
		strictPort: true,
		// Proxy to App B (api_server_v2_service) on :8003. The public ALB
		// at rmeena.dev3.eightfold.ai routes everything to :8000 (App A),
		// so /api/v2/* + /oauth/v1/* — which live on App B — only resolve
		// when we hit App B directly. Run Vite on the dev box (or tunnel
		// :8003 over SSH and set VITE_API_PROXY_TARGET to the tunnel URL).
		//
		// App B reads EF_PUBLIC_HOST=rmeena.dev3.eightfold.ai at startup
		// and uses it as the LiveKit JWT's embedded host so the agent's
		// callback URLs are publicly reachable regardless of the proxy
		// path. (App A on :8000 serves /api/voice_agent/* natively; the
		// agent worker hits that via the public ALB, not through Vite.)
		proxy: {
			"/api": {
				target:
					process.env["VITE_API_PROXY_TARGET"] ??
					"http://localhost:8003",
				changeOrigin: true,
				secure: false,
			},
			// Token mint endpoint — the browser POSTs /oauth/v1/authenticate
			// to App B (see client.ts).
			"/oauth": {
				target:
					process.env["VITE_API_PROXY_TARGET"] ??
					"http://localhost:8003",
				changeOrigin: true,
				secure: false,
			},
		},
	},
	test: {
		environment: "jsdom",
		setupFiles: ["./vitest.setup.ts"],
		css: true,
	},
});
