<script setup>
import { onBeforeUnmount, watchEffect } from "vue";
import { useRoute } from "vuepress/client";

const route = useRoute();
const managedClasses = ["article-index-page", "article-detail-page"];

const ignoredDetailPrefixes = [
  "/article/",
  "/category/",
  "/loading/",
  "/star/",
  "/tag/",
  "/timeline/",
];

const ignoredDetailPaths = new Set([
  "/",
  "/index.html",
  "/books/",
  "/cyber/",
  "/posts/",
]);

const isArticleDetailPage = () => {
  const path = route.path;

  if (ignoredDetailPaths.has(path)) return false;
  if (ignoredDetailPrefixes.some((prefix) => path.startsWith(prefix))) {
    return false;
  }

  return route.meta?.type === "article" || path.endsWith(".html");
};

const syncPageClasses = () => {
  if (typeof document === "undefined") return;

  document.documentElement.classList.toggle(
    "article-index-page",
    route.path.startsWith("/article/"),
  );
  document.documentElement.classList.toggle(
    "article-detail-page",
    isArticleDetailPage(),
  );
};

watchEffect(syncPageClasses);

onBeforeUnmount(() => {
  if (typeof document === "undefined") return;

  managedClasses.forEach((className) => {
    document.documentElement.classList.remove(className);
  });
});
</script>

<template>
  <span hidden aria-hidden="true" />
</template>
