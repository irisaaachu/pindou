<template>
  <view class="app-page create-page">
    <view class="page-heading">
      <text class="eyebrow">Your studio</text>
      <text class="page-title">创作</text>
      <text class="section-copy">本地草稿无需登录，云作品会在你主动查看或保存时请求授权。</text>
    </view>

    <view class="library-grid">
      <view class="library-section surface-card">
        <view class="library-section__heading">
          <view>
            <text class="section-title">本地草稿</text>
            <text class="library-section__meta">保存在当前设备</text>
          </view>
          <text class="soft-badge">无需登录</text>
        </view>
        <view class="empty-state">
          <text class="empty-state__mark">01</text>
          <text class="empty-state__title">还没有本地草稿</text>
          <text class="section-copy">开始创作后，作品会在这里自动保存。</text>
        </view>
      </view>

      <view class="library-section library-section--cloud surface-card">
        <view class="library-section__heading">
          <view>
            <text class="section-title">云作品</text>
            <text class="library-section__meta">跨设备继续编辑</text>
          </view>
          <text class="soft-badge">授权后查看</text>
        </view>
        <view class="empty-state">
          <text class="empty-state__mark">02</text>
          <text class="empty-state__title">{{ cloudTitle }}</text>
          <text class="section-copy">{{ cloudCopy }}</text>
          <button class="cloud-action" :loading="identityRuntime.state.status === 'signing-in'" @tap="requestCloudWorks">
            {{ cloudAction }}
          </button>
        </view>
      </view>
    </view>

    <ConsentDialog
      :visible="identityRuntime.consentVisible"
      @approve="identityRuntime.approveConsent"
      @decline="identityRuntime.declineConsent"
    />
  </view>
</template>

<script setup lang="ts">
import { computed } from "vue";

import ConsentDialog from "../../components/identity/ConsentDialog.vue";
import { identityRuntime } from "../../application/identity/runtime";

const cloudReady = computed(() => identityRuntime.state.status === "authenticated");
const cloudTitle = computed(() => cloudReady.value ? "身份已就绪" : "云作品功能尚未接入");
const cloudCopy = computed(() => cloudReady.value
  ? "身份已就绪，云作品将在后续版本开放"
  : "未来只有在你主动使用云端功能时，才会请求微信身份授权。",
);
const cloudAction = computed(() => cloudReady.value ? "已完成身份确认" : "确认身份后查看");

function requestCloudWorks(): void {
  if (cloudReady.value) return;
  void identityRuntime.requestAuthenticatedAccess();
}
</script>

<style scoped>
.create-page {
  display: flex;
  flex-direction: column;
  gap: 34rpx;
}

.page-heading {
  padding: 24rpx 6rpx 8rpx;
}

.page-heading .section-copy {
  max-width: 720rpx;
  margin-top: 16rpx;
}

.library-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24rpx;
}

.library-section {
  min-width: 0;
  padding: 30rpx;
}

.library-section--cloud {
  background: #f6f1fb;
}

.library-section__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18rpx;
}

.library-section__meta {
  display: block;
  margin-top: 8rpx;
  color: var(--color-muted);
  font-size: 22rpx;
}

.empty-state__title {
  display: block;
  margin-bottom: 10rpx;
  font-size: 29rpx;
  font-weight: 700;
}

.cloud-action {
  width: fit-content;
  margin: 26rpx auto 0;
  color: #fffdf9;
  background: #79649a;
  border-radius: 18rpx;
  font-size: 24rpx;
}

@media (max-width: 700px) {
  .library-grid {
    grid-template-columns: 1fr;
  }
}
</style>
