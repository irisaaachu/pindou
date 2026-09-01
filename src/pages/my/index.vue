<template>
  <view class="app-page my-page">
    <view class="profile-card surface-card">
      <image v-if="avatarUrl" class="profile-card__avatar profile-card__avatar--image" :src="avatarUrl" mode="aspectFill" />
      <view v-else class="profile-card__avatar">{{ avatarLetter }}</view>
      <view class="profile-card__content">
        <text class="eyebrow">Pindou member</text>
        <text class="section-title">{{ presentation.title }}</text>
        <text class="section-copy">{{ presentation.detail }}</text>
      </view>
      <text class="soft-badge">{{ identityLabel }}</text>
      <button v-if="identityRuntime.state.status === 'authenticated'" class="profile-card__logout" @tap.stop="logout">
        退出登录
      </button>
    </view>

    <view class="settings surface-card">
      <view class="settings__row settings__row--action" @tap="handleProfileAction">
        <view>
          <text class="settings__title">头像与昵称</text>
          <text class="settings__copy">{{ presentation.privacy }}</text>
        </view>
        <text class="settings__status">{{ presentation.action }}</text>
      </view>
      <view class="settings__row">
        <view>
          <text class="settings__title">隐私与本地处理</text>
          <text class="settings__copy">照片优先留在设备中完成转换</text>
        </view>
        <text class="settings__status">设计已确认</text>
      </view>
      <view class="settings__row">
        <view>
          <text class="settings__title">关于 Pindou</text>
          <text class="settings__copy">色卡、原创内容与版本信息</text>
        </view>
        <text class="settings__status">MVP</text>
      </view>
    </view>

    <view class="my-note">
      <text class="my-note__title">先创作，再决定是否登录。</text>
      <text class="section-copy">微信身份、资料设置与云作品操作都会在你主动触发时请求授权。</text>
    </view>

    <ConsentDialog
      :visible="identityRuntime.consentVisible"
      @approve="identityRuntime.approveConsent"
      @decline="identityRuntime.declineConsent"
    />
    <ProfileEditor
      :visible="identityRuntime.profileEditorVisible"
      :user="identityRuntime.state.session?.user || null"
      :saving="identityRuntime.profileSaving"
      :supported="identityRuntime.profileEditingSupported"
      :read-avatar="readTemporaryAvatarFile"
      @close="identityRuntime.closeProfileEditor"
      @save="saveProfile"
    />
  </view>
</template>

<script setup lang="ts">
import { computed } from "vue";

import { readTemporaryAvatarFile } from "../../adapters/identity/platform";
import ConsentDialog from "../../components/identity/ConsentDialog.vue";
import ProfileEditor from "../../components/identity/ProfileEditor.vue";
import { getIdentityPresentation, identityRuntime } from "../../application/identity/runtime";
import type { ProfileDraft } from "../../domain/identity";

const presentation = computed(() => getIdentityPresentation(identityRuntime.state));
const avatarLetter = computed(() => (identityRuntime.state.session?.user.nickname || "P").slice(0, 1));
const avatarUrl = computed(() => identityRuntime.state.session?.user.avatarUrl || "");
const identityLabel = computed(() => {
  if (identityRuntime.state.status === "authenticated") return "已登录";
  if (identityRuntime.state.status === "restoring" || identityRuntime.state.status === "signing-in") return "处理中";
  if (identityRuntime.state.status === "error") return "需重试";
  return "未登录";
});

function handleProfileAction(): void {
  if (identityRuntime.state.status === "authenticated") {
    identityRuntime.openProfileEditor();
    return;
  }
  void identityRuntime.requestAuthenticatedAccess();
}

function saveProfile(draft: ProfileDraft): void {
  void identityRuntime.saveProfile(draft);
}

function logout(): void {
  void identityRuntime.logout();
}
</script>

<style scoped>
.my-page {
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}

.profile-card {
  display: flex;
  align-items: center;
  gap: 26rpx;
  padding: 36rpx;
  background: var(--color-blush);
}

.profile-card__avatar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 112rpx;
  height: 112rpx;
  color: #66537f;
  background: rgba(255, 255, 255, 0.72);
  border-radius: 38rpx;
  font-size: 44rpx;
  font-weight: 700;
}

.profile-card__avatar--image { object-fit: cover; }

.profile-card__logout {
  margin: 0;
  padding: 10rpx 16rpx;
  color: #66537f;
  background: rgba(255, 255, 255, 0.62);
  border-radius: 999rpx;
  font-size: 22rpx;
}

.profile-card__content {
  min-width: 0;
  flex: 1;
}

.profile-card__content .section-copy {
  margin-top: 8rpx;
}

.settings {
  padding: 6rpx 30rpx;
}

.settings__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  padding: 30rpx 4rpx;
  border-bottom: 1rpx solid var(--color-line);
}

.settings__row:last-child {
  border-bottom: 0;
}

.settings__title,
.settings__copy {
  display: block;
}

.settings__title {
  margin-bottom: 8rpx;
  font-size: 28rpx;
  font-weight: 700;
}

.settings__copy,
.settings__status {
  color: var(--color-muted);
  font-size: 22rpx;
  line-height: 1.5;
}

.settings__status {
  flex: 0 0 auto;
  text-align: right;
}

.my-note {
  padding: 28rpx 32rpx;
  background: var(--color-mint);
  border-radius: 28rpx;
}

.my-note__title {
  display: block;
  margin-bottom: 6rpx;
  font-size: 27rpx;
  font-weight: 700;
}

@media (max-width: 520px) {
  .profile-card {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .profile-card__content {
    min-width: 320rpx;
  }
}
</style>
