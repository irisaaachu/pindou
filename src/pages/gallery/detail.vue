<script setup lang="ts">
/* global uni */
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";

import { createProductionGalleryRuntime } from "../../application/gallery";

const galleryRuntime = createProductionGalleryRuntime();
const detailState = computed(() => galleryRuntime.state.detail);
const previewFailed = ref(false);
const usePending = ref(false);
const useStatus = ref<"idle" | "ready" | "failure">("idle");

function formatDifficulty(value: "beginner" | "standard" | "advanced"): string {
  return { beginner: "入门", standard: "标准", advanced: "进阶" }[value];
}

function formatDirection(value: "normal" | "reverse"): string {
  return value === "normal" ? "正向拼制" : "反向拼制";
}

function formatSource(value: "original" | "commissioned" | "licensed"): string {
  return { original: "原创", commissioned: "委托创作", licensed: "已授权" }[value];
}

function loadPattern(rawId: string | undefined): void {
  let id = "";
  try {
    id = rawId ? decodeURIComponent(rawId) : "";
  } catch {
    id = "";
  }
  previewFailed.value = false;
  useStatus.value = "idle";
  void galleryRuntime.controller.loadDetail(id);
}

async function usePattern(): Promise<void> {
  if (usePending.value) return;
  usePending.value = true;
  useStatus.value = "idle";
  try {
    const result = await galleryRuntime.useCurrentDetail();
    useStatus.value = result.ok ? "ready" : "failure";
  } finally {
    usePending.value = false;
  }
}

function returnToGallery(): void {
  uni.navigateBack({ fail: () => uni.redirectTo({ url: "/pages/gallery/index" }) });
}

function previewConstructionChart(): void {
  if (detailState.value.status !== "ready" || previewFailed.value) return;
  uni.previewImage({
    current: detailState.value.detail.previewRef,
    urls: [detailState.value.detail.previewRef],
    fail: () => uni.showToast({ title: "暂时无法放大图纸", icon: "none" }),
  });
}

onLoad((options) => { loadPattern(options?.id); });
</script>

<template>
  <view class="app-page detail-page">
    <view v-if="detailState.status === 'loading'" class="detail-loading surface-card">
      <view class="detail-loading__preview"></view>
      <view class="detail-loading__line"></view>
      <view class="detail-loading__line detail-loading__line--short"></view>
    </view>

    <view v-else-if="detailState.status === 'not-found'" class="detail-message surface-card">
      <text class="detail-message__title">这张图纸暂时不可用</text>
      <text class="section-copy">它可能已下架，试试浏览其他图纸。</text>
      <button class="detail-action" @tap="returnToGallery">返回图库</button>
    </view>

    <view v-else-if="detailState.status === 'unsupported'" class="detail-message surface-card">
      <text class="detail-message__title">请更新应用后再试</text>
      <text class="section-copy">这张图纸使用了当前版本尚不支持的格式。</text>
      <button class="detail-action" @tap="galleryRuntime.controller.retryDetail">重新尝试</button>
    </view>

    <view v-else-if="detailState.status === 'failure'" class="detail-message surface-card">
      <text class="detail-message__title">图纸详情暂时无法加载</text>
      <text class="section-copy">请检查网络后重试。</text>
      <button class="detail-action" @tap="galleryRuntime.controller.retryDetail">重新尝试</button>
    </view>

    <template v-else-if="detailState.status === 'ready'">
      <view class="detail-preview surface-card">
        <image v-if="!previewFailed" class="detail-preview__image" :src="detailState.detail.previewRef" mode="widthFix" @error="previewFailed = true" @tap="previewConstructionChart" />
        <text v-if="!previewFailed" class="detail-preview__hint">点击放大查看色号</text>
        <view v-else class="detail-preview__fallback"><text>PD</text><text>预览暂不可用</text></view>
      </view>

      <view class="detail-heading">
        <text class="eyebrow">Pattern detail</text>
        <text class="page-title">{{ detailState.detail.name }}</text>
        <text class="section-copy">{{ detailState.detail.description }}</text>
        <view class="detail-tags"><text v-for="tag in [...detailState.detail.tags.usage, ...detailState.detail.tags.themes, ...detailState.detail.tags.features]" :key="tag" class="detail-tag">{{ tag }}</text></view>
      </view>

      <view class="detail-stats surface-card">
        <view><text class="detail-stats__label">图纸尺寸</text><text class="detail-stats__value">{{ detailState.detail.width }} × {{ detailState.detail.height }} 格</text></view>
        <view><text class="detail-stats__label">成品约</text><text class="detail-stats__value">{{ detailState.detail.physicalWidthMm }} × {{ detailState.detail.physicalHeightMm }} mm</text></view>
        <view><text class="detail-stats__label">难度</text><text class="detail-stats__value">{{ formatDifficulty(detailState.detail.difficulty) }}</text></view>
        <view><text class="detail-stats__label">颜色 / 豆数</text><text class="detail-stats__value">{{ detailState.detail.colorCount }} 色 / {{ detailState.detail.beadCount }} 颗</text></view>
      </view>

      <view class="detail-information surface-card">
        <view class="detail-information__row"><text>默认色板</text><text>{{ detailState.detail.palette.id }} · {{ detailState.detail.palette.version }}</text></view>
        <view class="detail-information__row"><text>拼制方向</text><text>{{ formatDirection(detailState.detail.direction) }}</text></view>
        <view class="detail-information__row"><text>文字</text><text>{{ detailState.detail.editableTextRegions.length ? `可编辑文字 · ${detailState.detail.editableTextRegions.length} 处` : "无可编辑文字" }}</text></view>
        <view class="detail-information__row"><text>创作者</text><text>{{ detailState.detail.creator }} · {{ formatSource(detailState.detail.sourceType) }}</text></view>
        <text class="detail-information__note">内容来源与使用状态已审核</text>
      </view>

      <view class="detail-use surface-card">
        <text v-if="useStatus === 'ready'" class="detail-use__message">图纸副本已准备好；完整编辑器将在后续版本开放</text>
        <text v-else-if="useStatus === 'failure'" class="detail-use__message">暂时无法创建副本，请重新尝试。</text>
        <text v-else class="section-copy">创建一份只保存在当前设备的独立副本。</text>
        <button class="detail-use__button" :loading="usePending" :disabled="usePending" @tap="usePattern">使用这张图纸</button>
        <button v-if="useStatus === 'ready'" class="detail-use__return" @tap="returnToGallery">返回图库</button>
      </view>
    </template>
  </view>
</template>

<style scoped>
.detail-page { display: flex; flex-direction: column; gap: 26rpx; }.detail-loading, .detail-message, .detail-preview, .detail-stats, .detail-information, .detail-use { overflow: hidden; }.detail-loading { padding: 24rpx; }.detail-loading__preview { height: 520rpx; background: linear-gradient(90deg, #f4ede5, #fbf6ef, #f4ede5); }.detail-loading__line { width: 72%; height: 32rpx; margin-top: 28rpx; border-radius: 999rpx; background: #f4ede5; }.detail-loading__line--short { width: 48%; height: 22rpx; margin-top: 16rpx; }.detail-message { padding: 48rpx 32rpx; text-align: center; }.detail-message__title { display: block; margin-bottom: 12rpx; font-size: 30rpx; font-weight: 700; }.detail-action, .detail-use__button { margin: 28rpx auto 0; color: #fffdf9; background: var(--color-lavender-strong); border-radius: 18rpx; font-size: 24rpx; }.detail-preview { background: #f3e9df; }.detail-preview__image { display: block; width: 100%; min-height: 360rpx; }.detail-preview__fallback { display: flex; min-height: 520rpx; flex-direction: column; align-items: center; justify-content: center; gap: 14rpx; color: #846d7b; background: linear-gradient(145deg, #f4dfd8, #ece5f4); font-size: 25rpx; }.detail-preview__fallback text:first-child { font-size: 42rpx; font-weight: 700; letter-spacing: 5rpx; }.detail-heading { padding: 4rpx 6rpx; }.detail-heading .section-copy { margin-top: 14rpx; }.detail-tags { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 20rpx; }.detail-tag { padding: 7rpx 14rpx; color: #66537f; background: var(--color-lavender); border-radius: 999rpx; font-size: 21rpx; }.detail-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 26rpx 18rpx; padding: 30rpx; }.detail-stats__label, .detail-stats__value { display: block; }.detail-stats__label { color: var(--color-muted); font-size: 21rpx; }.detail-stats__value { margin-top: 8rpx; color: var(--color-ink); font-size: 25rpx; font-weight: 700; }.detail-information { padding: 28rpx 30rpx; }.detail-information__row { display: flex; justify-content: space-between; gap: 22rpx; padding: 14rpx 0; color: var(--color-muted); font-size: 23rpx; }.detail-information__row text:last-child { color: var(--color-ink); text-align: right; }.detail-information__note { display: block; margin-top: 14rpx; color: #5e765f; font-size: 21rpx; }.detail-use { padding: 30rpx; text-align: center; }.detail-use__message { display: block; color: var(--color-ink); font-size: 25rpx; font-weight: 700; line-height: 1.6; }.detail-use__button { display: block; width: 100%; min-height: 82rpx; line-height: 82rpx; }.detail-use__return { margin-top: 18rpx; color: #66537f; background: transparent; font-size: 23rpx; }
</style>
