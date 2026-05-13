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
		// Direct-to-API-server. We hit the public Eightfold v2 api_server
		// (App B) through its ALB, bypassing the BFF entirely. App B sees
		// `Host: rmeena.dev3.eightfold.ai` because changeOrigin: true makes
		// the proxy rewrite the Host header to match the target — so the
		// LiveKit JWT's service_endpoints naturally embed the public
		// hostname without any host-override hack.
		proxy: {
			"/api": {
				target:
					process.env["VITE_API_PROXY_TARGET"] ??
					"https://rmeena.dev3.eightfold.ai",
				changeOrigin: true,
				secure: true,
			},
		},
	},
	test: {
		environment: "jsdom",
		setupFiles: ["./vitest.setup.ts"],
		css: true,
	},
});
