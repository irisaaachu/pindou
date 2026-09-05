<script setup lang="ts">
/* global uni */
import { computed, ref } from "vue";
import { onLoad, onUnload } from "@dcloudio/uni-app";
import GalleryFilters, { type GalleryFilterValue } from "../../components/gallery/GalleryFilters.vue";
import PatternCard from "../../components/gallery/PatternCard.vue";
import { createProductionGalleryRuntime } from "../../application/gallery";
import type { GalleryListQuery, GalleryPatternSummary } from "../../domain/gallery";

function createGalleryRuntime() { return createProductionGalleryRuntime(); }
const galleryRuntime = createGalleryRuntime();
const searchText = ref("");
const showFilters = ref(false);
const query = ref<GalleryListQuery>({ order: "featured", limit: 24 });
let searchTimer: ReturnType<typeof setTimeout> | undefined;
const listState = computed(() => galleryRuntime.state.list);
const categoryState = computed(() => galleryRuntime.state.categories);
const items = computed(() => "items" in listState.value ? listState.value.items ?? [] : []);
const hasActiveFilters = computed(() => Boolean(query.value.search || query.value.usageTags?.length || query.value.themeTags?.length || query.value.featureTags?.length || query.value.difficulty || query.value.sizeClass));
const filterValue = computed<GalleryFilterValue>(() => ({ usageTags: query.value.usageTags ? [...query.value.usageTags] : undefined, themeTags: query.value.themeTags ? [...query.value.themeTags] : undefined, featureTags: query.value.featureTags ? [...query.value.featureTags] : undefined, difficulty: query.value.difficulty, sizeClass: query.value.sizeClass }));
const quickCategories = computed(() => categoryState.value.status === "ready" ? categoryState.value.items.filter((category) => category.quickEntry) : []);
const usageOptions = computed(() => categoryState.value.status === "ready" ? categoryState.value.items.map((category) => category.slug) : []);
const themeOptions = ["cute", "floral", "animal", "seasonal", "minimal"];
const featureOptions = ["editable-text", "reversible", "gift-ready"];

function currentQuery(overrides: Partial<GalleryListQuery> = {}): GalleryListQuery {
  const search = searchText.value.trim();
  return { ...query.value, ...overrides, search: search || undefined, cursor: undefined, limit: 24 };
}
function refresh(overrides: Partial<GalleryListQuery> = {}): void { query.value = currentQuery(overrides); void galleryRuntime.controller.refresh(query.value); }
function queueSearch(event: Event): void { searchText.value = (event as Event & { detail: { value: string } }).detail.value; if (searchTimer) clearTimeout(searchTimer); searchTimer = setTimeout(() => refresh(), 300); }
function submitSearch(): void { if (searchTimer) clearTimeout(searchTimer); refresh(); }
function applyFilters(value: GalleryFilterValue): void { showFilters.value = false; refresh({ ...value }); }
function clearFilters(): void { searchText.value = ""; showFilters.value = false; refresh({ usageTags: undefined, themeTags: undefined, featureTags: undefined, difficulty: undefined, sizeClass: undefined }); }
function selectCategory(slug: string): void { refresh({ usageTags: [slug] }); }
function showNewest(): void { refresh({ order: "newest" }); }
function openDetail(pattern: GalleryPatternSummary): void { uni.navigateTo({ url: `/pages/gallery/detail?id=${encodeURIComponent(pattern.id)}` }); }
onLoad(() => { void galleryRuntime.controller.loadCategories(); refresh(); });
onUnload(() => { if (searchTimer) clearTimeout(searchTimer); });
</script>

<template>
  <view class="app-page gallery-page">
    <view class="gallery-page__heading"><text class="eyebrow">Pattern library</text><text class="page-title">从一张好图纸开始</text><text class="section-copy">按场景、主题和难度，找到想亲手完成的作品。</text></view>
    <view class="gallery-search surface-card"><input class="gallery-search__input" :value="searchText" placeholder="搜索图纸或标签" confirm-type="search" @input="queueSearch" @confirm="submitSearch" /><button class="gallery-search__button" @tap="submitSearch">搜索</button></view>
    <scroll-view class="quick-entries" scroll-x><view class="quick-entries__inner"><button :class="['quick-entry', { 'quick-entry--active': query.order === 'featured' }]" @tap="refresh({ order: 'featured' })">精选</button><button :class="['quick-entry', { 'quick-entry--active': query.order === 'newest' }]" @tap="showNewest">最新</button><button v-for="category in quickCategories" :key="category.id" :class="['quick-entry', { 'quick-entry--active': query.usageTags?.includes(category.slug) }]" @tap="selectCategory(category.slug)">{{ category.shortLabel }}</button><button class="quick-entry quick-entry--more" @tap="showFilters = !showFilters">更多筛选</button></view></scroll-view>
    <GalleryFilters v-if="showFilters" :value="filterValue" :usage-options="usageOptions" :theme-options="themeOptions" :feature-options="featureOptions" @apply="applyFilters" @clear="clearFilters" />
    <view v-if="listState.status === 'loading' && items.length === 0" class="pattern-grid"><view v-for="index in 6" :key="index" class="pattern-skeleton surface-card"><view></view><view></view></view></view>
    <view v-else-if="listState.status === 'failure' && items.length === 0" class="gallery-message surface-card"><text class="gallery-message__title">暂时无法加载图库</text><text class="section-copy">请检查网络后重试。</text><button class="gallery-message__action" @tap="galleryRuntime.controller.retryList">重新尝试</button></view>
    <view v-else-if="listState.status === 'empty'" class="gallery-message surface-card"><text class="gallery-message__title">{{ hasActiveFilters ? '没有符合条件的图纸' : '图库正在准备中' }}</text><text class="section-copy">{{ hasActiveFilters ? '试试清除筛选，发现更多灵感。' : '首批原创图纸将陆续上架。' }}</text><button v-if="hasActiveFilters" class="gallery-message__action" @tap="clearFilters">清除筛选</button></view>
    <template v-else><view class="pattern-grid"><PatternCard v-for="pattern in items" :key="`${pattern.id}-${pattern.version}`" :pattern="pattern" @select="openDetail" /></view><button v-if="listState.status === 'failure'" class="gallery-message__action" @tap="galleryRuntime.controller.retryList">重新尝试</button><button v-if="listState.status === 'ready' && listState.nextCursor" class="load-more" @tap="galleryRuntime.controller.loadNextPage">加载更多</button></template>
  </view>
</template>

<style scoped>
.gallery-page { display: flex; flex-direction: column; gap: 26rpx; }.gallery-page__heading { padding: 20rpx 6rpx 0; }.gallery-page__heading .section-copy { margin-top: 14rpx; }.gallery-search { display: flex; align-items: center; gap: 12rpx; padding: 12rpx 14rpx 12rpx 24rpx; }.gallery-search__input { flex: 1; min-width: 0; font-size: 26rpx; }.gallery-search__button, .gallery-message__action, .load-more { min-height: 60rpx; margin: 0; color: #fffdf9; background: var(--color-lavender-strong); border-radius: 18rpx; font-size: 22rpx; line-height: 60rpx; }.gallery-search__button { padding: 0 22rpx; }.quick-entries { width: 100%; white-space: nowrap; }.quick-entries__inner { display: inline-flex; gap: 12rpx; padding: 0 2rpx; }.quick-entry { min-height: 58rpx; margin: 0; padding: 0 20rpx; color: #655e59; background: #f6ede5; border-radius: 999rpx; font-size: 22rpx; line-height: 58rpx; }.quick-entry--active { color: #fffdf9; background: var(--color-lavender-strong); }.quick-entry--more { color: #66537f; background: var(--color-lavender); }.pattern-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20rpx; }.pattern-skeleton { min-height: 350rpx; overflow: hidden; }.pattern-skeleton view { height: 218rpx; background: linear-gradient(90deg, #f4ede5, #fbf6ef, #f4ede5); }.pattern-skeleton view + view { width: 55%; height: 24rpx; margin: 26rpx 20rpx; border-radius: 999rpx; }.gallery-message { padding: 42rpx 30rpx; text-align: center; }.gallery-message__title { display: block; margin-bottom: 12rpx; font-size: 30rpx; font-weight: 700; }.gallery-message__action, .load-more { display: block; width: fit-content; margin: 26rpx auto 0; padding: 0 28rpx; }.load-more { background: #8d719d; }
</style>
