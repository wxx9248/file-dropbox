// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2026-03-01",
  devtools: { enabled: true },
  app: {
    baseURL: process.env.FILE_DROPBOX_BASE_PATH || "/"
  },
  modules: ["@nuxt/ui", "@nuxt/eslint", "@nuxt/hints"],
  css: ["~/assets/css/main.css"],
  ssr: false,
  runtimeConfig: {
    public: {
      baseURL: process.env.FILE_DROPBOX_BASE_PATH || "/",
      maxFileSize: parseInt(
        process.env.FILE_DROPBOX_MAX_FILE_SIZE || "10737418240",
        10
      )
    }
  }
});
