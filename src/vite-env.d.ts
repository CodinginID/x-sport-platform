/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPERADMIN_EMAIL: string;
  readonly VITE_SUPERADMIN_PASSWORD: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
