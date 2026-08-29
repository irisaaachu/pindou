<template>
  <view class="app-page my-page">
    <view class="profile-card surface-card">
      <view class="profile-card__avatar">P</view>
      <view class="profile-card__content">
        <text class="eyebrow">Pindou member</text>
        <text class="section-title">游客状态</text>
        <text class="section-copy">头像和昵称以后可以自愿设置，不影响本地生成与导出。</text>
      </view>
      <text class="soft-badge">未登录</text>
    </view>

    <view class="settings surface-card">
      <view class="settings__row">
        <view>
          <text class="settings__title">头像与昵称</text>
          <text class="settings__copy">可选资料，云功能接入后开放</text>
        </view>
        <text class="settings__status">稍后开放</text>
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
      <text class="section-copy">只有保存或查看云作品时才会触发微信身份授权。</text>
    </view>
  </view>
</template>

<script setup lang="ts"></script>

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
