<script setup>
import { onBeforeUnmount, onMounted } from "vue";
import { useRoute, withBase } from "vuepress/client";
import { useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const getCurrentSearch = () => {
  const queryStart = route.fullPath.indexOf("?");
  const hashStart = route.fullPath.indexOf("#");

  if (queryStart === -1) return "";

  return route.fullPath.slice(
    queryStart,
    hashStart === -1 ? undefined : hashStart,
  );
};

const stripBase = (pathname) => {
  const basePath = new URL(withBase("/"), window.location.origin).pathname;
  const normalizedBase = basePath.endsWith("/")
    ? basePath.slice(0, -1)
    : basePath;

  if (!normalizedBase || normalizedBase === "/") return pathname || "/";
  if (!pathname.startsWith(`${normalizedBase}/`) && pathname !== normalizedBase) {
    return pathname || "/";
  }

  const stripped = pathname.slice(normalizedBase.length) || "/";

  return stripped.startsWith("/") ? stripped : `/${stripped}`;
};

const shouldSkipEvent = (event, anchor) =>
  event.defaultPrevented ||
  event.button !== 0 ||
  event.metaKey ||
  event.ctrlKey ||
  event.shiftKey ||
  event.altKey ||
  anchor.hasAttribute("download") ||
  (anchor.target && anchor.target !== "_self");

const resolveInternalTarget = (anchor) => {
  const rawHref = anchor.getAttribute("href") || "";

  if (
    !rawHref ||
    rawHref.startsWith("#") ||
    /^(mailto|tel|javascript):/i.test(rawHref)
  ) {
    return "";
  }

  const url = new URL(anchor.href, window.location.href);

  if (url.origin !== window.location.origin) return "";

  const pathname = stripBase(url.pathname);
  const extension = pathname.match(/\/[^/]+\.(\w+)$/)?.[1]?.toLowerCase();

  if (extension && extension !== "html") return "";
  if (pathname === "/loading/" || pathname === "/loading.html") return "";

  if (pathname === route.path && url.search === getCurrentSearch()) {
    return "";
  }

  return `${pathname}${url.search}${url.hash}`;
};

const handleDocumentClick = (event) => {
  const target = event.target;
  const anchor =
    target instanceof Element ? target.closest("a[href]") : null;

  if (!anchor || shouldSkipEvent(event, anchor)) return;

  const internalTarget = resolveInternalTarget(anchor);

  if (!internalTarget) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  router
    .push(`/loading/?to=${encodeURIComponent(internalTarget)}`)
    .catch(() => {});
};

onMounted(() => {
  document.addEventListener("click", handleDocumentClick, true);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick, true);
});
</script>

<template>
  <span hidden aria-hidden="true" />
</template>
