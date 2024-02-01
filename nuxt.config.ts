// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },

  app: {
    head: {
      title: 'File Dropbox',
      htmlAttrs: {
        lang: 'en'
      }
    }
  },

  modules: [
    '@nuxt/eslint',
    '@nuxt/scripts',
  ]
})