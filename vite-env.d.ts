/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_OPENWEATHER_API_KEY?: string;
    readonly VITE_AGRO_API_KEY?: string;
    readonly VITE_AGRO_API_BASE?: string;
    readonly VITE_PERENUAL_API_KEY?: string;
    readonly VITE_PERENUAL_API_BASE?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
