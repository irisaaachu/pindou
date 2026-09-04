<script setup lang="ts">
import { ref, watch } from "vue";

import type { GalleryDifficulty, GallerySizeClass } from "../../domain/gallery";

export interface GalleryFilterValue {
  usageTags?: string[];
  themeTags?: string[];
  featureTags?: string[];
  difficulty?: GalleryDifficulty;
  sizeClass?: GallerySizeClass;
}

const props = withDefaults(defineProps<{
  value: GalleryFilterValue;
  usageOptions?: string[];
  themeOptions?: string[];
  featureOptions?: string[];
}>(), {
  usageOptions: () => [],
  themeOptions: () => [],
  featureOptions: () => [],
});

const emit = defineEmits<{ apply: [value: GalleryFilterValue]; clear: [] }>();
const draft = ref<GalleryFilterValue>(copyValue(props.value));

watch(() => props.value, (value) => { draft.value = copyValue(value); }, { deep: true });

function copyValue(value: GalleryFilterValue): GalleryFilterValue {
  return {
    usageTags: value.usageTags ? [...value.usageTags] : undefined,
    themeTags: value.themeTags ? [...value.themeTags] : undefined,
    featureTags: value.featureTags ? [...value.featureTags] : undefined,
    difficulty: value.difficulty,
    sizeClass: value.sizeClass,
  };
}

function toggleTag(key: "usageTags" | "themeTags" | "featureTags", tag: string): void {
  const tags = draft.value[key] ?? [];
  draft.value = { ...draft.value, [key]: tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag] };
}

function apply(): void {
  emit("apply", copyValue(draft.value));
}

function clear(): void {
  draft.value = {};
  emit("clear");
}
</script>

<template>
  <view class="gallery-filters surface-card">
    <view class="gallery-filters__heading">
      <text class="gallery-filters__title">筛选图纸</text>
      <text class="gallery-filters__hint">可组合多个条件</text>
    </view>

    <view v-for="group in [
      { key: 'usageTags', title: '用途', options: usageOptions },
      { key: 'themeTags', title: '主题', options: themeOptions },
      { key: 'featureTags', title: '特性', options: featureOptions },
    ]" :key="group.key" class="filter-group">
      <text class="filter-group__title">{{ group.title }}</text>
      <view class="filter-group__options">
        <button
          v-for="option in group.options"
          :key="option"
          :class="['filter-option', { 'filter-option--active': draft[group.key as 'usageTags']?.includes(option) }]"
          @tap="toggleTag(group.key as 'usageTags' | 'themeTags' | 'featureTags', option)"
        >{{ option }}</button>
        <text v-if="group.options.length === 0" class="filter-group__empty">暂无可用选项</text>
      </view>
    </view>

    <view class="filter-group">
      <text class="filter-group__title">难度</text>
      <view class="filter-group__options">
        <button v-for="option in ['beginner', 'standard', 'advanced']" :key="option" :class="['filter-option', { 'filter-option--active': draft.difficulty === option }]" @tap="draft = { ...draft, difficulty: draft.difficulty === option ? undefined : option as GalleryDifficulty }">{{ option }}</button>
      </view>
    </view>

    <view class="filter-group">
      <text class="filter-group__title">尺寸</text>
      <view class="filter-group__options">
        <button v-for="option in ['small', 'medium', 'large']" :key="option" :class="['filter-option', { 'filter-option--active': draft.sizeClass === option }]" @tap="draft = { ...draft, sizeClass: draft.sizeClass === option ? undefined : option as GallerySizeClass }">{{ option }}</button>
      </view>
    </view>

    <view class="gallery-filters__actions">
      <button class="filter-clear" @tap="clear">清除筛选</button>
      <button class="filter-apply" @tap="apply">应用筛选</button>
    </view>
  </view>
</template>

<style scoped>
.gallery-filters { padding: 28rpx; }
.gallery-filters__heading, .gallery-filters__actions { display: flex; align-items: center; justify-content: space-between; gap: 18rpx; }
.gallery-filters__title { font-size: 28rpx; font-weight: 700; }
.gallery-filters__hint, .filter-group__empty { color: var(--color-muted); font-size: 21rpx; }
.filter-group { margin-top: 26rpx; }
.filter-group__title { display: block; margin-bottom: 12rpx; font-size: 23rpx; font-weight: 600; }
.filter-group__options { display: flex; flex-wrap: wrap; gap: 12rpx; }
.filter-option, .filter-clear, .filter-apply { min-height: 54rpx; margin: 0; padding: 0 18rpx; border-radius: 18rpx; font-size: 22rpx; line-height: 54rpx; }
.filter-option { color: #655e59; background: #f8f1e8; }
.filter-option--active { color: #fffdf9; background: var(--color-lavender-strong); }
.gallery-filters__actions { margin-top: 30rpx; }
.filter-clear { color: #66537f; background: #f2ebf8; }
.filter-apply { color: #fffdf9; background: var(--color-lavender-strong); }
</style>
