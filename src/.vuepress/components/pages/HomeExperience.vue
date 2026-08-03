<template>
  <main class="custom-home" :style="homeStyle">
    <div class="custom-home__backdrop" aria-hidden="true">
      <div class="custom-home__backdrop-image" />
      <div class="custom-home__backdrop-shadow" />
      <div class="custom-home__backdrop-top-fade" />
    </div>

    <section class="custom-home__hero" aria-labelledby="home-title">
      <div class="custom-home__hero-sticky">
        <div class="custom-home__hero-inner">
          <img class="custom-home__logo" :src="logoSrc" :alt="siteTitle" />
          <p class="custom-home__eyebrow">Life / Learn / Notes</p>
          <h1 id="home-title">{{ heroTitle }}</h1>
          <p
            v-if="heroTagline"
            class="custom-home__tagline"
            :aria-label="heroTagline"
          >
            <span>{{ heroTagline }}</span>
          </p>
        </div>
      </div>
    </section>

    <section class="custom-home__latest" aria-label="文章列表与博主信息">
      <div class="custom-home__content">
        <div class="custom-home__cards" aria-label="文章列表">
          <ThreeDCard
            v-for="post in paginatedPosts"
            :key="post.link"
            :item="post"
          />

          <nav
            v-if="totalPages > 1"
            class="article-pagination"
            aria-label="文章分页"
          >
            <button
              type="button"
              :disabled="currentPage === 1"
              @click="currentPage -= 1"
            >
              Prev
            </button>
            <button
              v-for="page in totalPages"
              :key="page"
              type="button"
              :class="{ active: currentPage === page }"
              @click="currentPage = page"
            >
              {{ page }}
            </button>
            <button
              type="button"
              :disabled="currentPage === totalPages"
              @click="currentPage += 1"
            >
              Next
            </button>
          </nav>
        </div>

        <aside
          class="blogger-panel"
          :class="{ 'is-flipped': isProfileFlipped }"
          aria-label="博主信息"
          tabindex="0"
          @click="isProfileFlipped = !isProfileFlipped"
          @keydown.enter.prevent="isProfileFlipped = !isProfileFlipped"
        >
          <div class="blogger-panel__inner">
            <section
              class="blogger-panel__face blogger-panel__face--front"
              aria-label="博主介绍"
            >
              <img
                class="blogger-panel__avatar"
                :src="logoSrc"
                :alt="siteTitle"
              />
              <h2>{{ siteTitle }}</h2>
              <p v-if="blogDescription" class="blogger-panel__bio">
                {{ blogDescription }}
              </p>
              <p v-if="profileMotto" class="blogger-panel__motto">
                {{ profileMotto }}
              </p>
            </section>

            <section
              class="blogger-panel__face blogger-panel__face--back"
              aria-label="文章标签分类与平台链接"
              @click.stop
            >
              <p class="blogger-panel__level">Archive</p>
              <h2>文章标签</h2>

              <div class="blogger-panel__stats" aria-label="文章标签分类入口">
                <a href="/tag/">
                  <strong>{{ tagCount }}</strong>
                  <span>标签</span>
                </a>
                <a href="/category/">
                  <strong>{{ categoryCount }}</strong>
                  <span>分类</span>
                </a>
              </div>

              <div class="blogger-panel__actions" aria-label="个人入口">
                <RouteLink
                  class="rainbow-button rainbow-button--small"
                  :to="introLink"
                >
                  介绍
                </RouteLink>
              </div>

              <IconCloud
                v-if="socialLinks.length"
                class="blogger-panel__icon-cloud"
                aria-label="其他平台"
                :items="socialLinks"
              />
            </section>
          </div>
        </aside>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  usePageFrontmatter,
  RouteLink,
  useRoutes,
  useSiteData,
  withBase,
} from "vuepress/client";
import { useTheme } from "vuepress-theme-hope/client";

import IconCloud from "../ui/IconCloud.vue";
import ThreeDCard from "../ui/ThreeDCard.vue";

const frontmatter = usePageFrontmatter();
const siteData = useSiteData();
const routes = useRoutes();
const theme = useTheme();
const isProfileFlipped = ref(false);

const normalizeAsset = (value) => {
  if (!value || typeof value !== "string") return "";
  if (/^(https?:)?\/\//.test(value) || value.startsWith("data:")) return value;

  return withBase(value);
};

const formatDate = (value) => {
  if (typeof value === "string") return value;
  if (typeof value !== "number") return "";

  const date = new Date(value);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const normalizeTerms = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);

  return value ? [value] : [];
};

const formatCategory = (value) => {
  const categories = normalizeTerms(value);

  return categories[0] || "未分类";
};

const formatReadingTime = (value) => {
  if (typeof value === "string") return value;
  if (!value || typeof value.minutes !== "number") return "";

  return `${Math.max(1, Math.round(value.minutes))} 分钟`;
};

const normalizeIcon = (icon, label, href = "") => {
  const value = String(icon || label || href || "").toLowerCase();

  if (
    /^(https?:)?\/\//.test(icon || "") ||
    String(icon || "").startsWith("/")
  ) {
    return icon;
  }
  if (value.includes("github")) return "github";
  if (value.includes("mail") || value.includes("gmail") || value.includes("@"))
    return "mail";
  if (
    value.includes("image") ||
    value.includes("pic") ||
    value.includes("photo")
  )
    return "image";
  if (value.includes("telegram")) return "telegram";
  if (value.includes("youtube")) return "youtube";
  if (value.includes("bilibili")) return "bilibili";
  if (value.includes("twitter") || value.includes("x.com")) return "x";

  return icon || label || "user";
};

const normalizePlatform = (item, fallbackLabel = "") => {
  if (!item) return null;

  if (typeof item === "string") {
    return {
      label: fallbackLabel || item,
      href: item,
      icon: normalizeIcon(fallbackLabel, fallbackLabel, item),
    };
  }

  const href = item.href || item.link || item.url || item.to;
  const label = item.label || item.text || item.name || fallbackLabel || href;

  if (!href || !label) return null;

  return {
    label,
    href,
    icon: normalizeIcon(item.icon, label, href),
    image: item.image,
  };
};

const blogConfig = computed(() => theme.value.blog || {});
const siteTitle = computed(() => siteData.value.title || "");
const heroTitle = computed(
  () =>
    frontmatter.value.heroText || frontmatter.value.title || siteTitle.value,
);
const blogDescription = computed(
  () => blogConfig.value.description || siteData.value.description || "",
);
const heroTagline = computed(
  () => frontmatter.value.tagline || blogDescription.value,
);
const profileMotto = computed(() => frontmatter.value.footer || "");
const introLink = computed(() => blogConfig.value.intro || "/intro.html");
const logoSrc = computed(() =>
  normalizeAsset(
    frontmatter.value.heroImage || theme.value.logo || "/images/logo.svg",
  ),
);
const homeStyle = computed(() => {
  const lightImage = normalizeAsset(frontmatter.value.bgImage || "");
  const darkImage = normalizeAsset(frontmatter.value.bgImageDark || lightImage);

  return {
    "--home-bg-image": lightImage
      ? `url("${lightImage}")`
      : "var(--blog-bg-image)",
    "--home-bg-image-dark": darkImage
      ? `url("${darkImage}")`
      : "var(--blog-bg-image-dark)",
  };
});

const socialLinks = computed(() => {
  if (Array.isArray(blogConfig.value.platforms)) {
    return blogConfig.value.platforms
      .map((item) => normalizePlatform(item))
      .filter(Boolean);
  }

  return Object.entries(blogConfig.value.medias || {})
    .map(([label, item]) => normalizePlatform(item, label))
    .filter(Boolean);
});

const isHomeArticle = (link, route) =>
  route.meta?.type === "article" &&
  !link.startsWith("/books/") &&
  !link.startsWith("/notes/");

const posts = computed(() =>
  Object.entries(routes.value)
    .filter(([link, route]) => isHomeArticle(link, route))
    .map(([link, route]) => {
      const meta = route.meta || {};
      const excerpt = meta.excerpt || "";

      return {
        date: formatDate(meta.date),
        dateValue:
          typeof meta.date === "number"
            ? meta.date
            : Date.parse(meta.date || "") || 0,
        category: formatCategory(meta.category),
        title: meta.title,
        excerpt,
        preview: excerpt,
        readingTime: formatReadingTime(meta.readingTime),
        cover: meta.cover,
        link,
      };
    })
    .sort(
      (a, b) =>
        b.dateValue - a.dateValue || a.title.localeCompare(b.title, "zh-CN"),
    ),
);

const currentPage = ref(1);
const articleColumns = ref(3);
const pageRows = 3;
const tagCount = computed(() => {
  const tags = new Set();

  Object.entries(routes.value).forEach(([link, route]) => {
    if (!isHomeArticle(link, route)) return;
    normalizeTerms(route.meta.tag).forEach((tag) => tags.add(tag));
  });

  return tags.size;
});
const categoryCount = computed(() => {
  const categories = new Set();

  Object.entries(routes.value).forEach(([link, route]) => {
    if (!isHomeArticle(link, route)) return;
    normalizeTerms(route.meta.category).forEach((category) =>
      categories.add(category),
    );
  });

  return categories.size;
});
const pageSize = computed(() => articleColumns.value * pageRows);
const totalPages = computed(() =>
  Math.ceil(posts.value.length / pageSize.value),
);
const paginatedPosts = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;

  return posts.value.slice(start, start + pageSize.value);
});

const syncArticleColumns = () => {
  if (window.innerWidth < 720) {
    articleColumns.value = 1;
    return;
  }

  if (window.innerWidth < 1360) {
    articleColumns.value = 2;
    return;
  }

  articleColumns.value = 3;
};

watch(totalPages, (pages) => {
  if (currentPage.value > pages) {
    currentPage.value = Math.max(1, pages);
  }
});

onMounted(() => {
  syncArticleColumns();
  window.addEventListener("resize", syncArticleColumns);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", syncArticleColumns);
});
</script>

<style scoped>
.custom-home {
  position: relative;
  overflow-x: clip;
  overflow-y: visible;
  isolation: isolate;
  width: 100vw;
  max-width: none;
  min-height: 100svh;
  margin-top: calc(var(--navbar-height, 3.6rem) * -1);
  margin-left: calc(50% - 50vw);
  color: #e5f3ff;
  background: linear-gradient(180deg, #f8fbff 0%, #edf8ff 48%, #effdf7 100%);
}

.custom-home__backdrop {
  position: absolute;
  top: 0;
  left: 50%;
  width: 100vw;
  height: 132svh;
  z-index: 0;
  overflow: visible;
  pointer-events: none;
  transform: translateX(-50%);
}

.custom-home__backdrop-image {
  position: sticky;
  top: calc(100svh - 132svh);
  width: 100vw;
  height: 132svh;
  z-index: 0;
  opacity: 0.9;
  background-image: var(--home-bg-image, var(--blog-bg-image));
  background-position: center 42svh;
  background-size: 100vw auto;
  background-repeat: no-repeat;
  filter: blur(1.8px) saturate(1.08);
  pointer-events: none;
}

.custom-home__backdrop-shadow {
  position: absolute;
  inset: 0 0 -260px;
  z-index: 2;
  background: linear-gradient(
    180deg,
    rgba(248, 251, 255, 0.98) 45svh,
    rgba(248, 251, 255, 0.87) 49svh,
    rgba(248, 251, 255, 0.72) 56svh,
    rgba(248, 251, 255, 0.28) 78svh,
    rgba(248, 251, 255, 0.01) 92svh,
    rgba(248, 251, 255, 0) 100%
  );
}

.custom-home__backdrop-top-fade {
  position: absolute;
  inset: 0 0 auto;
  z-index: 3;
  height: 42svh;
  background: linear-gradient(
    180deg,
    rgba(248, 251, 255, 0.98) 0,
    rgba(248, 251, 255, 0.88) 16%,
    rgba(248, 251, 255, 0.58) 42%,
    rgba(248, 251, 255, 0.28) 72%,
    rgba(248, 251, 255, 0.1) 100%
  );
}

[data-theme="dark"] .custom-home {
  background: #020617;
}

[data-theme="dark"] .custom-home__backdrop-image {
  background-image: var(--home-bg-image-dark, var(--blog-bg-image-dark));
}

[data-theme="dark"] .custom-home__backdrop-shadow {
  background: linear-gradient(
    180deg,
    transparent 0,
    transparent 3svh,
    rgba(0, 0, 0, 0.97) 40svh,
    rgba(2, 6, 23, 0.86) 54svh,
    rgba(15, 23, 42, 0.62) 76svh,
    rgba(15, 23, 42, 0.36) 106svh,
    rgba(15, 23, 42, 0.22) 132svh,
    rgba(2, 6, 23, 0.38) 164svh,
    rgba(2, 6, 23, 0.66) 214svh
  );
}

[data-theme="dark"] .custom-home__backdrop-top-fade {
  background: linear-gradient(
    180deg,
    transparent 0,
    transparent 3svh,
    rgba(0, 0, 0, 0.97) 41svh,
    rgba(2, 6, 23, 0.2) 100%
  );
}

.custom-home__hero {
  position: relative;
  z-index: 2;
  min-height: 132svh;
  overflow: visible;
  isolation: isolate;
  background: transparent;
}

.custom-home__hero-sticky {
  position: relative;
  display: grid;
  min-height: 132svh;
  overflow: visible;
  isolation: isolate;
}

.custom-home__hero-inner {
  position: relative;
  z-index: 4;
  display: grid;
  justify-items: center;
  align-content: start;
  width: min(1040px, calc(100% - 32px));
  min-height: 68svh;
  margin: 0 auto;
  padding: calc(var(--navbar-height, 3.6rem) + 72px) 0 56px;
  overflow: visible;
  text-align: center;
}

.custom-home__logo {
  width: 92px;
  height: 92px;
  margin-bottom: 20px;
  object-fit: contain;
  filter: drop-shadow(0 18px 28px rgba(37, 99, 235, 0.22));
}

.custom-home__eyebrow {
  margin: 0;
  color: #5eead4;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.custom-home h1 {
  display: inline-block;
  max-width: 900px;
  margin: 14px 0 0;
  padding: 0 0.04em 0.18em;
  overflow: visible;
  color: transparent;
  font-size: 6.6rem;
  font-weight: 900;
  line-height: 1.22;
  letter-spacing: 0;
  background: linear-gradient(
    90deg,
    #22d3ee 0%,
    #a78bfa 12.5%,
    #fb7185 25%,
    #facc15 37.5%,
    #22d3ee 50%,
    #a78bfa 62.5%,
    #fb7185 75%,
    #facc15 87.5%,
    #22d3ee 100%
  );
  background-size: 200% 100%;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 14px rgba(34, 211, 238, 0.5),
    0 0 28px rgba(167, 139, 250, 0.42), 0 0 54px rgba(251, 113, 133, 0.35);
  animation: neon-gradient 7s linear infinite,
    neon-pulse 3.6s ease-in-out infinite alternate;
}

.custom-home__tagline {
  max-width: 700px;
  margin: 24px 0 0;
  color: #7dd3fc;
  font-size: 1.18rem;
  line-height: 1.8;
  text-shadow: 0 0 14px rgba(125, 211, 252, 0.48);
}

.custom-home__tagline span {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  border-right: 2px solid rgba(125, 211, 252, 0.9);
  white-space: nowrap;
  animation: typewriter-loop 6.6s steps(28, end) 0.4s infinite,
    typing-caret 760ms steps(1, end) infinite;
}

.custom-home :deep(.three-d-card__body) {
  border-color: rgba(255, 255, 255, 0.44);
  background: rgba(255, 255, 255, 0.4);
  box-shadow: 0 24px 58px rgba(15, 23, 42, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(26px) saturate(1.24);
  -webkit-backdrop-filter: blur(26px) saturate(1.24);
}

.custom-home :deep(.three-d-card:hover),
.custom-home :deep(.three-d-card:focus-visible) {
  text-decoration: none !important;
}

.custom-home :deep(.three-d-card strong) {
  color: #0f172a;
}

.custom-home :deep(.three-d-card__excerpt),
.custom-home :deep(.three-d-card__meta),
.custom-home :deep(.three-d-card__footer) {
  color: rgba(51, 65, 85, 0.76);
}

[data-theme="dark"] .custom-home :deep(.three-d-card__body) {
  border-color: rgba(148, 163, 184, 0.22);
  background: rgba(15, 23, 42, 0.4);
  box-shadow: 0 24px 58px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .custom-home :deep(.three-d-card strong) {
  color: #e5f3ff;
}

[data-theme="dark"] .custom-home :deep(.three-d-card__excerpt),
[data-theme="dark"] .custom-home :deep(.three-d-card__meta),
[data-theme="dark"] .custom-home :deep(.three-d-card__footer) {
  color: rgba(226, 232, 240, 0.72);
}

.custom-home__latest {
  position: relative;
  z-index: 2;
  overflow: visible;
  isolation: isolate;
  width: min(1420px, calc(100% - 20px));
  margin: 0 auto;
  padding: 72px 0 96px;
}

.custom-home__latest::before {
  position: absolute;
  top: -96px;
  bottom: -120px;
  left: 50%;
  z-index: -1;
  width: 100vw;
  content: "";
  background: radial-gradient(
      circle at 18% 12%,
      rgba(125, 211, 252, 0.22),
      transparent 34%
    ),
    radial-gradient(
      circle at 82% 18%,
      rgba(45, 212, 191, 0.18),
      transparent 30%
    ),
    linear-gradient(180deg, #edf8ff 0%, #eaf7ff 42%, #effdf7 100%);
  transform: translateX(-50%);
}

[data-theme="dark"] .custom-home__latest::before {
  background: radial-gradient(
      ellipse at 16% 18%,
      rgba(34, 211, 238, 0.26),
      rgba(34, 211, 238, 0.08) 28%,
      transparent 48%
    ),
    radial-gradient(
      ellipse at 76% 10%,
      rgba(167, 139, 250, 0.28),
      rgba(167, 139, 250, 0.08) 30%,
      transparent 52%
    ),
    radial-gradient(
      ellipse at 54% 42%,
      rgba(45, 212, 191, 0.2),
      transparent 46%
    ),
    radial-gradient(
      ellipse at 90% 62%,
      rgba(244, 114, 182, 0.16),
      transparent 42%
    ),
    linear-gradient(180deg, #020617 0%, #08111f 42%, #020617 100%);
}

.custom-home__content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 22px;
  align-items: start;
  overflow: visible;
}

.custom-home__cards {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin: -28px;
  padding: 28px;
  overflow: visible;
  perspective: 1200px;
}

.article-pagination {
  display: flex;
  grid-column: 1 / -1;
  justify-content: center;
  gap: 8px;
  margin-top: 10px;
}

.article-pagination button {
  min-width: 38px;
  min-height: 34px;
  border: 1px solid rgba(125, 211, 252, 0.26);
  border-radius: 8px;
  color: #e5f3ff;
  font-weight: 800;
  cursor: pointer;
  background: rgba(15, 23, 42, 0.42);
}

.article-pagination button.active,
.article-pagination button:hover:not(:disabled),
.article-pagination button:focus-visible:not(:disabled) {
  border-color: rgba(125, 211, 252, 0.72);
  background: rgba(37, 99, 235, 0.38);
}

.article-pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.blogger-panel {
  position: sticky;
  top: calc(var(--navbar-height, 3.6rem) + 18px);
  z-index: 1;
  min-height: 520px;
  perspective: 1200px;
  outline: none;
}

.blogger-panel__inner {
  position: relative;
  min-height: 520px;
  transform-style: preserve-3d;
  transition: transform 560ms cubic-bezier(0.22, 1, 0.36, 1);
}

.blogger-panel:hover .blogger-panel__inner,
.blogger-panel:focus-within .blogger-panel__inner,
.blogger-panel.is-flipped .blogger-panel__inner {
  transform: rotateY(180deg);
}

.blogger-panel__face {
  position: absolute;
  inset: 0;
  display: grid;
  justify-items: center;
  align-content: center;
  border: 1px solid rgba(255, 255, 255, 0.42);
  border-radius: 8px;
  padding: 28px 22px;
  color: #0f172a;
  text-align: center;
  overflow: hidden;
  backface-visibility: hidden;
  background: rgba(255, 255, 255, 0.38);
  box-shadow: 0 24px 58px rgba(15, 23, 42, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.64);
  backdrop-filter: blur(28px) saturate(1.24);
  -webkit-backdrop-filter: blur(28px) saturate(1.24);
}

[data-theme="dark"] .blogger-panel__face {
  border-color: rgba(148, 163, 184, 0.22);
  color: #e5f3ff;
  background: rgba(15, 23, 42, 0.38);
  box-shadow: 0 24px 58px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.blogger-panel__face--back {
  align-content: start;
  transform: rotateY(180deg);
}

.blogger-panel__avatar {
  position: relative;
  z-index: 1;
  width: 84px;
  height: 84px;
  object-fit: contain;
  filter: drop-shadow(0 16px 24px rgba(34, 211, 238, 0.22));
}

.blogger-panel__level {
  position: relative;
  z-index: 1;
  margin: 14px 0 0;
  color: #f59e0b;
  font-size: 0.82rem;
  font-weight: 800;
}

.blogger-panel h2 {
  position: relative;
  z-index: 1;
  margin: 6px 0 0;
  font-size: 1.6rem;
  letter-spacing: 0;
}

.blogger-panel__bio {
  position: relative;
  z-index: 1;
  margin: 10px 0 0;
  color: rgba(51, 65, 85, 0.76);
  line-height: 1.7;
}

.blogger-panel__motto {
  position: relative;
  z-index: 1;
  margin: 22px 0 0;
  color: rgba(71, 85, 105, 0.72);
  font-size: 0.95rem;
  line-height: 1.7;
}

[data-theme="dark"] .blogger-panel__bio {
  color: rgba(226, 232, 240, 0.72);
}

[data-theme="dark"] .blogger-panel__motto {
  color: rgba(226, 232, 240, 0.66);
}

.blogger-panel__stats {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
  margin-top: 22px;
}

.blogger-panel__stats a {
  display: grid;
  gap: 2px;
  border: 1px solid rgba(37, 99, 235, 0.16);
  border-radius: 8px;
  padding: 10px 8px;
  color: inherit;
  text-decoration: none;
  background: rgba(37, 99, 235, 0.08);
}

.blogger-panel__stats a:hover,
.blogger-panel__stats a:focus-visible {
  border-color: rgba(37, 99, 235, 0.36);
  background: rgba(37, 99, 235, 0.14);
}

.blogger-panel__stats strong {
  color: #2563eb;
  font-size: 1.2rem;
}

.blogger-panel__stats span {
  color: rgba(71, 85, 105, 0.72);
  font-size: 0.82rem;
}

[data-theme="dark"] .blogger-panel__stats span {
  color: rgba(226, 232, 240, 0.7);
}

.blogger-panel__actions {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  width: 100%;
  margin-top: 24px;
}

.blogger-panel__icon-cloud {
  position: relative;
  z-index: 1;
  width: min(100%, 230px);
  margin-top: 14px;
}

.panel-button {
  display: inline-grid;
  place-items: center;
  min-height: 34px;
  border: 1px solid rgba(37, 99, 235, 0.22);
  border-radius: 8px;
  padding: 0 14px;
  color: #0f172a;
  font-size: 0.86rem;
  font-weight: 800;
  text-decoration: none;
  background: rgba(255, 255, 255, 0.72);
}

[data-theme="dark"] .panel-button {
  border-color: rgba(125, 211, 252, 0.28);
  color: #e5f3ff;
  background: rgba(15, 23, 42, 0.44);
}

.rainbow-button {
  --rainbow-button-bg: #ffffff;
  --rainbow-button-fg: #020617;
  --rainbow-button-cover: rgba(255, 255, 255, 0.98);
  --rainbow-button-cover-clear: rgba(255, 255, 255, 0);
  --rainbow-button-glow: rgba(125, 211, 252, 0.42);
  --rainbow-button-shadow: rgba(15, 23, 42, 0.14);

  position: relative;
  display: inline-grid;
  place-items: center;
  min-height: 34px;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 0 13px;
  color: var(--rainbow-button-fg);
  font: inherit;
  font-weight: 900;
  cursor: pointer;
  overflow: visible;
  isolation: isolate;
  background: linear-gradient(
        var(--rainbow-button-bg),
        var(--rainbow-button-bg)
      )
      padding-box,
    linear-gradient(
        180deg,
        var(--rainbow-button-cover) 0%,
        var(--rainbow-button-cover) 58%,
        var(--rainbow-button-cover-clear) 100%
      )
      border-box,
    linear-gradient(90deg, #ffbe7b, #7dd3fc, #c084fc, #fb7185, #ffbe7b)
      border-box;
  background-origin: border-box;
  background-clip: padding-box, border-box, border-box;
  background-size: 200% auto;
  box-shadow: 0 1px 2px var(--rainbow-button-shadow),
    0 10px 22px -14px var(--rainbow-button-glow);
  text-decoration: none;
  transition: transform 160ms ease, box-shadow 160ms ease;
  animation: rainbow-button-shift 2s linear infinite;
}

[data-theme="dark"] .rainbow-button {
  --rainbow-button-bg: #020617;
  --rainbow-button-fg: #f8fafc;
  --rainbow-button-cover: rgba(2, 6, 23, 0.98);
  --rainbow-button-cover-clear: rgba(2, 6, 23, 0);
  --rainbow-button-glow: rgba(34, 211, 238, 0.5);
  --rainbow-button-shadow: rgba(34, 211, 238, 0.16);
}

.rainbow-button--small {
  min-width: 64px;
  font-size: 0.86rem;
}

.rainbow-button::before {
  position: absolute;
  right: 10%;
  bottom: -5px;
  left: 10%;
  z-index: -1;
  height: 10px;
  border-radius: 999px;
  content: "";
  opacity: 0.72;
  background: linear-gradient(
    90deg,
    #ffbe7b,
    #7dd3fc,
    #c084fc,
    #fb7185,
    #ffbe7b
  );
  background-size: 200% auto;
  filter: blur(10px);
  pointer-events: none;
  animation: rainbow-button-shift 2s linear infinite;
}

.rainbow-button:hover,
.rainbow-button:focus-visible {
  transform: translateY(-1px);
  box-shadow: 0 0 22px var(--rainbow-button-glow),
    0 8px 20px var(--rainbow-button-shadow);
}

@keyframes neon-pulse {
  from {
    filter: saturate(1);
  }

  to {
    filter: saturate(1.35) brightness(1.12);
  }
}

@keyframes rainbow-button-shift {
  from {
    background-position: 0% 50%;
  }

  to {
    background-position: 200% 50%;
  }
}

@keyframes neon-gradient {
  from {
    background-position: 0% 50%;
  }

  to {
    background-position: 200% 50%;
  }
}

@keyframes typewriter-loop {
  0%,
  8% {
    width: 0;
  }

  45%,
  76% {
    width: 100%;
  }

  100% {
    width: 0;
  }
}

@keyframes typing-caret {
  50% {
    border-color: transparent;
  }
}

@media (max-width: 719px) {
  .custom-home__hero-inner {
    padding: 72px 0 58px;
  }

  .custom-home h1 {
    font-size: 3.6rem;
  }

  .custom-home__tagline {
    font-size: 1rem;
  }

  .custom-home__tagline span {
    white-space: normal;
    border-right: 0;
    animation: none;
  }

  .custom-home__logo {
    width: 74px;
    height: 74px;
  }

  .custom-home__content,
  .custom-home__cards {
    grid-template-columns: 1fr;
  }

  .blogger-panel {
    position: relative;
    order: -1;
    top: auto;
  }
}

@media (min-width: 720px) and (max-width: 959px) {
  .custom-home h1 {
    font-size: 5rem;
  }

  .custom-home__content {
    grid-template-columns: 1fr;
  }

  .custom-home__cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .blogger-panel {
    position: relative;
    order: -1;
    top: auto;
  }
}

@media (min-width: 960px) and (max-width: 1199px) {
  .custom-home__latest {
    width: min(1040px, calc(100% - 20px));
  }

  .custom-home__content {
    grid-template-columns: 1fr;
  }

  .custom-home__cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .blogger-panel {
    position: relative;
    order: -1;
    top: auto;
  }
}

@media (min-width: 1200px) and (max-width: 1359px) {
  .custom-home__cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
