<template>
  <main class="book-shelf" aria-labelledby="books-title">
    <section class="book-shelf__hero">
      <p>Reading Notes</p>
      <h1 id="books-title">Books</h1>
      <span
        >一篇文章固然无法代替作者的思考与心血，但它可以决定你是否继续深度阅读，了解全貌找到重点，一步步靠近你要“攀登的山”。</span
      >
      <HaloSearch
        v-model="searchKeyword"
        class="book-shelf__search"
        placeholder="搜索书名..."
        aria-label="搜索书名"
      />
    </section>

    <section
      v-if="filteredBooks.length"
      class="book-shelf__list"
      aria-label="读书笔记列表"
    >
      <article
        v-for="book in paginatedBooks"
        :key="book.link"
        class="book-note"
      >
        <RouteLink
          class="book-note__visual"
          :to="toLoadingRoute(book.link)"
          :aria-label="`阅读${book.title}`"
        >
          <Book
            :color="book.bookColor"
            size="lg"
            radius="lg"
            shadow-size="xl"
            :cover="book.cover"
            :cover-alt="book.title"
          >
            <BookHeader>
              <span v-for="tag in book.tags" :key="tag" class="book-badge">{{
                tag
              }}</span>
            </BookHeader>
            <BookTitle>{{ book.title }}</BookTitle>
            <BookDescription>{{ book.author }}</BookDescription>
          </Book>
        </RouteLink>

        <div class="book-note__content">
          <p class="book-note__meta">
            {{ book.author }} / {{ book.category }} / {{ book.date }}
          </p>
          <h2>
            <RouteLink :to="toLoadingRoute(book.link)">{{
              book.title
            }}</RouteLink>
          </h2>
          <p>{{ book.excerpt }}</p>

          <div class="book-note__summary">
            <span>{{ book.readingTime }}</span>
            <RouteLink :to="toLoadingRoute(book.link)">阅读全文</RouteLink>
          </div>
        </div>
      </article>
    </section>

    <nav
      v-if="filteredBooks.length && totalPages > 1"
      class="book-pagination"
      aria-label="读书分页"
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

      <form class="book-pagination__jump" @submit.prevent="jumpToPage">
        <label for="book-page-jump">跳转到</label>
        <input
          id="book-page-jump"
          v-model.number="jumpPage"
          type="number"
          min="1"
          :max="totalPages"
          aria-label="跳转页码"
        />
        <button type="submit">前往</button>
      </form>
    </nav>

    <p v-if="!filteredBooks.length" class="book-shelf__empty">
      {{ emptyText }}
    </p>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { RouteLink, useRoutes, withBase } from "vuepress/client";

import { Book, BookDescription, BookHeader, BookTitle } from "../ui/book";
import { HaloSearch } from "../ui/halo-search";

const routes = useRoutes();
const books = ref([]);
const searchKeyword = ref("");
const currentPage = ref(1);
const jumpPage = ref(1);
const pageSize = 6;

const formatDate = (value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();

    return trimmed.split(/[T\s]/)[0] || trimmed;
  }
  if (typeof value !== "number") return "";

  const date = new Date(value);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatReadingTime = (value) => {
  if (typeof value === "string") return value;
  if (!value || typeof value.minutes !== "number") return "";

  return `${Math.max(1, Math.round(value.minutes))} 分钟`;
};

const normalizeAsset = (value) => {
  if (!value || typeof value !== "string") return "";
  if (/^(https?:)?\/\//.test(value) || value.startsWith("data:")) return value;

  return withBase(value);
};

const toLoadingRoute = (target) => `/loading/?to=${encodeURIComponent(target)}`;

const loadBooks = async () => {
  const bookRoutes = Object.entries(routes.value).filter(
    ([link, route]) =>
      link.startsWith("/books/") && link !== "/books/" && route.meta?.title,
  );
  const loadedBooks = await Promise.all(
    bookRoutes.map(async ([link, route]) => {
      const module = await route.loader();
      const pageData = module._pageData || {};
      const frontmatter = pageData.frontmatter || {};
      return {
        link,
        title: pageData.title || route.meta.title,
        author: frontmatter.bookAuthor || frontmatter.author || "未知作者",
        category:
          frontmatter.bookCategory || frontmatter.category || "未知分类",
        date: formatDate(frontmatter.date),
        dateValue: frontmatter.date ? Date.parse(frontmatter.date) || 0 : 0,
        excerpt: frontmatter.excerpt || pageData.excerpt || "",
        cover: normalizeAsset(frontmatter.bookCover || frontmatter.cover),
        bookColor: frontmatter.bookColor || "zinc",
        readingTime: formatReadingTime(pageData.readingTime),
        tags: Array.isArray(frontmatter.tag)
          ? frontmatter.tag.slice(0, 2)
          : ["读书"],
      };
    }),
  );

  books.value = loadedBooks.sort(
    (a, b) =>
      b.dateValue - a.dateValue || a.title.localeCompare(b.title, "zh-CN"),
  );
};

const filteredBooks = computed(() => {
  const keyword = searchKeyword.value.trim().toLocaleLowerCase("zh-CN");

  if (!keyword) return books.value;

  return books.value.filter((book) =>
    book.title.toLocaleLowerCase("zh-CN").includes(keyword),
  );
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredBooks.value.length / pageSize)),
);

const paginatedBooks = computed(() => {
  const start = (currentPage.value - 1) * pageSize;

  return filteredBooks.value.slice(start, start + pageSize);
});

const emptyText = computed(() =>
  searchKeyword.value.trim() ? "没有匹配的书名。" : "暂无读书笔记。",
);

const jumpToPage = () => {
  const page = Number(jumpPage.value);

  if (!Number.isFinite(page)) return;

  currentPage.value = Math.min(totalPages.value, Math.max(1, Math.trunc(page)));
};

onMounted(loadBooks);
watch(routes, loadBooks);
watch(searchKeyword, () => {
  currentPage.value = 1;
});
watch(totalPages, (pages) => {
  if (currentPage.value > pages) currentPage.value = pages;
});
watch(currentPage, (page) => {
  jumpPage.value = page;
});
</script>

<style scoped>
.book-shelf {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  min-height: 100svh;
  margin-top: calc(var(--navbar-height, 3.6rem) * -1);
  margin-left: 0;
  padding: calc(var(--navbar-height, 3.6rem) + 42px) 0 92px;
  overflow: hidden;
  color: #e5f3ff;
  background: #020617;
}

.book-shelf::before {
  position: absolute;
  inset: 0;
  z-index: 1;
  content: "";
  background:
    linear-gradient(
      120deg,
      rgba(2, 6, 23, 0.82),
      rgba(15, 23, 42, 0.74) 46%,
      rgba(19, 78, 74, 0.58)
    ),
    linear-gradient(90deg, rgba(37, 99, 235, 0.12), rgba(245, 158, 11, 0.08)),
    linear-gradient(rgba(37, 99, 235, 0.16) 1px, transparent 1px),
    linear-gradient(90deg, rgba(20, 184, 166, 0.14) 1px, transparent 1px);
  background-size:
    auto,
    auto,
    52px 52px,
    52px 52px;
  pointer-events: none;
}

.book-shelf::after {
  position: absolute;
  inset: -18px;
  z-index: 0;
  content: "";
  opacity: 0.72;
  background-image: var(--blog-bg-image);
  background-position: center;
  background-size: contain;
  filter: blur(12px);
  transform: scale(1.04);
  pointer-events: none;
}

[data-theme="dark"] .book-shelf::after {
  background-image: var(--blog-bg-image-dark);
}

.book-shelf > * {
  position: relative;
  z-index: 2;
  width: min(1120px, calc(100% - 32px));
  margin-right: auto;
  margin-left: auto;
}

.book-shelf__hero {
  padding: 48px 0 40px;
}

.book-shelf__hero p {
  margin: 0;
  color: #5eead4;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.book-shelf__hero h1 {
  margin: 10px 0 0;
  color: #e5f3ff;
  font-size: clamp(2.4rem, 6vw, 4.8rem);
  line-height: 1.05;
  letter-spacing: 0;
}

.book-shelf__hero span {
  display: block;
  max-width: 620px;
  margin-top: 16px;
  color: rgba(226, 232, 240, 0.72);
  line-height: 1.8;
}

.book-shelf__search {
  width: min-content;
  margin: 28px auto 0;
}

.book-shelf__list {
  display: grid;
  gap: 0;
}

.book-shelf__empty {
  display: grid;
  min-height: 280px;
  margin: 24px auto 0;
  color: rgba(226, 232, 240, 0.72);
  line-height: 1.8;
  place-items: center;
  text-align: center;
}

.book-pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 28px;
}

.book-pagination button,
.book-pagination input {
  min-height: 36px;
  border: 1px solid rgba(125, 211, 252, 0.28);
  border-radius: 8px;
  color: #e5f3ff;
  font: inherit;
  font-weight: 800;
  background: rgba(15, 23, 42, 0.48);
}

.book-pagination button {
  min-width: 40px;
  padding: 0 12px;
}

.book-pagination button.active,
.book-pagination button:hover:not(:disabled),
.book-pagination button:focus-visible:not(:disabled) {
  border-color: rgba(125, 211, 252, 0.72);
  background: rgba(37, 99, 235, 0.42);
}

.book-pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.book-pagination__jump {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-left: 8px;
  color: rgba(226, 232, 240, 0.72);
  font-size: 0.9rem;
}

.book-pagination input {
  width: 72px;
  padding: 0 10px;
  text-align: center;
  outline: none;
}

.book-pagination input:focus {
  border-color: rgba(125, 211, 252, 0.72);
  box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.14);
}

.book-note {
  display: grid;
  grid-template-columns: minmax(240px, 320px) minmax(0, 1fr);
  gap: 42px;
  align-items: center;
  padding: 42px 0;
}

.book-note + .book-note {
  border-top: 1px solid rgba(148, 163, 184, 0.2);
}

.book-note__visual {
  display: grid;
  justify-items: center;
  color: inherit;
  text-decoration: none;
  perspective: 1200px;
}

.book-badge {
  border: 1px solid rgba(255, 255, 255, 0.26);
  border-radius: 999px;
  padding: 4px 8px;
  color: rgba(255, 255, 255, 0.86);
  font-size: 0.72rem;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.12);
}

.book-note__content {
  max-width: 680px;
}

.book-note__meta {
  margin: 0;
  color: #5eead4;
  font-size: 0.86rem;
  font-weight: 800;
}

.book-note__content h2 {
  margin: 10px 0 0;
  font-size: 2rem;
  line-height: 1.25;
  letter-spacing: 0;
}

.book-note__content h2 a {
  color: inherit;
  text-decoration: none;
}

.book-note__content h2 a:hover,
.book-note__content h2 a:focus-visible {
  color: #2563eb;
}

.book-note__content p {
  color: rgba(226, 232, 240, 0.74);
  line-height: 1.85;
}

.book-note__summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 22px;
  color: rgba(226, 232, 240, 0.72);
  font-size: 0.9rem;
}

.book-note__summary a {
  border: 1px solid rgba(37, 99, 235, 0.22);
  border-radius: 8px;
  padding: 7px 12px;
  color: #2563eb;
  font-weight: 800;
  text-decoration: none;
}

.book-note__summary a:hover,
.book-note__summary a:focus-visible {
  border-color: rgba(37, 99, 235, 0.48);
}

@media (max-width: 719px) {
  .book-note {
    grid-template-columns: 1fr;
    gap: 30px;
    padding: 32px 0;
  }

  .book-note__content h2 {
    font-size: 1.65rem;
  }

  .book-pagination__jump {
    width: 100%;
    margin-left: 0;
  }
}
</style>
