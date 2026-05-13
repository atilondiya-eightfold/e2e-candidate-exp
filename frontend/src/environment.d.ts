// TypeScript IntelliSense for VITE_ .env variables.
// VITE_ prefixed variables are exposed to the client while non-VITE_ variables aren't
// https://vitejs.dev/guide/env-and-mode.html

/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_APP_TITLE: string;
	readonly VITE_API_URL: string;
	readonly VITE_APP_MODE: "prototype" | "build";
	readonly VITE_ENABLE_THEME_PANEL: "true" | "false";
	readonly VITE_GROWTH_JOURNEY_LIVE: "true" | "false";
	readonly [key: string]: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
