import { defineClientConfig } from 'vuepress/client'

import GlobalSnowfallBackdrop from './components/effects/GlobalSnowfallBackdrop.vue'
import GlobalParticleBackdrop from './components/effects/GlobalParticleBackdrop.vue'
import GlobalScrollProgress from './components/effects/GlobalScrollProgress.vue'
import LoadingRouteInterceptor from './components/effects/LoadingRouteInterceptor.vue'
import PageParticleBackdrop from './components/effects/PageParticleBackdrop.vue'
import RoutePageClasses from './components/effects/RoutePageClasses.vue'
import SleekLineCursor from './components/effects/SleekLineCursor.vue'
import ArticleLoadingPage from './components/pages/ArticleLoadingPage.vue'
import BookShelf from './components/pages/BookShelf.vue'
import HomeExperience from './components/pages/HomeExperience.vue'

export default defineClientConfig({
  enhance({ app }) {
    app.component('ArticleLoadingPage', ArticleLoadingPage)
    app.component('BookShelf', BookShelf)
    app.component('HomeExperience', HomeExperience)
  },
  rootComponents: [
    SleekLineCursor,
    PageParticleBackdrop,
    GlobalParticleBackdrop,
    GlobalSnowfallBackdrop,
    GlobalScrollProgress,
    LoadingRouteInterceptor,
    RoutePageClasses,
  ],
})
