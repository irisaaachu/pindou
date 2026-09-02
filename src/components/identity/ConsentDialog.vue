<template>
  <view v-if="visible" class="consent-mask" @tap.self="$emit('decline')">
    <view class="consent-dialog surface-card">
      <text class="eyebrow">Cloud works</text>
      <text class="section-title">使用云作品需要微信身份</text>
      <text class="section-copy">登录仅用于确认你的云作品归属。微信登录不会上传你的原始创作照片。</text>
      <view class="consent-dialog__actions">
        <button class="consent-dialog__secondary" @tap="$emit('decline')">暂不登录</button>
        <button class="consent-dialog__primary" @tap="$emit('approve')">同意并继续</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{ visible: boolean }>();
defineEmits<{ approve: []; decline: [] }>();
</script>

<style scoped>
.consent-mask { position: fixed; z-index: 30; inset: 0; display: flex; align-items: flex-end; padding: 28rpx; background: rgba(52, 47, 43, 0.34); }
.consent-dialog { width: 100%; padding: 38rpx; }
.consent-dialog .section-copy { margin-top: 16rpx; }
.consent-dialog__actions { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; margin-top: 30rpx; }
.consent-dialog button { margin: 0; border-radius: 20rpx; font-size: 26rpx; }
.consent-dialog__secondary { color: var(--color-ink); background: #f4ede4; }
.consent-dialog__primary { color: #fffdf9; background: #79649a; }
</style>
