import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: [
    '@nuxtjs/tailwindcss',
    '@vueuse/nuxt',
  ],
  build: {
    transpile: ['@headlessui/vue', '@heroicons/vue'],
  },
  vueuse: {
    ssrHandlers: true,
  },
  runtimeConfig: {
    public: {
      version: '1.5.0'
    }
  },
  compatibilityDate: '2024-11-20',
  components: [
    {
      path: '~/node_modules/@headlessui/vue/dist/components',
      prefix: 'Headless',
    },
  ],
})