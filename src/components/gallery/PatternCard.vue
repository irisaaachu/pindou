<script setup lang="ts">
import { ref } from "vue";

import type { GalleryPatternSummary } from "../../domain/gallery";

const props = defineProps<{ pattern: GalleryPatternSummary }>();
const emit = defineEmits<{ select: [pattern: GalleryPatternSummary] }>();

const coverFailed = ref(false);

function select(): void {
  emit("select", props.pattern);
}
</script>

<template>
  <view class="pattern-card surface-card" role="button" @tap="select">
    <view class="pattern-card__cover">
      <image
        v-if="!coverFailed"
        class="pattern-card__image"
        :src="pattern.coverRef"
        mode="aspectFill"
        @error="coverFailed = true"
      />
      <view v-else class="pattern-card__fallback" aria-label="图纸封面暂不可用">
        <text>PD</text>
      </view>
    </view>
    <view class="pattern-card__body">
      <text class="pattern-card__name">{{ pattern.name }}</text>
      <text class="pattern-card__meta">{{ pattern.width }} × {{ pattern.height }} 格</text>
      <view class="pattern-card__badges">
        <text class="pattern-card__difficulty">{{ pattern.difficulty }}</text>
        <text v-if="pattern.hasEditableText" class="pattern-card__feature">可编辑文字</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.pattern-card {
  min-width: 0;
  overflow: hidden;
}

.pattern-card__cover {
  width: 100%;
  height: 218rpx;
  background: #f3e9df;
}

.pattern-card__image,
.pattern-card__fallback {
  width: 100%;
  height: 100%;
}

.pattern-card__fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #846d7b;
  background: linear-gradient(145deg, #f4dfd8, #ece5f4);
  font-size: 32rpx;
  font-weight: 700;
  letter-spacing: 4rpx;
}

.pattern-card__body { padding: 20rpx; }

.pattern-card__name {
  display: block;
  overflow: hidden;
  color: var(--color-ink);
  font-size: 27rpx;
  font-weight: 700;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pattern-card__meta {
  display: block;
  margin-top: 8rpx;
  color: var(--color-muted);
  font-size: 21rpx;
}

.pattern-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 16rpx;
}

.pattern-card__difficulty,
.pattern-card__feature {
  padding: 5rpx 10rpx;
  border-radius: 999rpx;
  font-size: 19rpx;
  line-height: 1.3;
}

.pattern-card__difficulty { color: #6a5b52; background: #f7eee2; }
.pattern-card__feature { color: #66537f; background: var(--color-lavender); }
</style>
