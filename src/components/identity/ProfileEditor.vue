<template>
  <view v-if="visible" class="editor-mask" @tap.self="$emit('close')">
    <view class="profile-editor surface-card">
      <text class="eyebrow">Your profile</text>
      <text class="section-title">头像与昵称</text>
      <!-- #ifdef MP-WEIXIN -->
      <view v-if="supported" class="profile-editor__form">
        <button class="profile-editor__avatar" open-type="chooseAvatar" @chooseavatar="chooseAvatar">
          <image v-if="avatarPreview" :src="avatarPreview" mode="aspectFill" />
          <text v-else>{{ avatarLetter }}</text>
        </button>
        <input v-model="nickname" class="profile-editor__input" type="nickname" placeholder="设置昵称（可选）" />
      </view>
      <!-- #endif -->
      <view v-if="!supported" class="profile-editor__unsupported">
        <view class="profile-editor__default-avatar">{{ avatarLetter }}</view>
        <text class="profile-editor__default-name">{{ user?.nickname || "拼豆朋友" }}</text>
        <text class="section-copy">当前平台暂不支持微信头像与昵称设置。</text>
      </view>
      <text v-if="failure" class="profile-editor__failure">{{ failure }}</text>
      <view class="profile-editor__actions">
        <button class="profile-editor__secondary" @tap="$emit('close')">取消</button>
        <button v-if="supported" class="profile-editor__primary" :loading="saving" @tap="save">保存资料</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

import type { AvatarFile } from "../../adapters/identity/platform";
import type { IdentityUser, ProfileDraft } from "../../domain/identity";

const props = defineProps<{
  visible: boolean;
  user: IdentityUser | null;
  saving: boolean;
  failure: string | null;
  supported: boolean;
  readAvatar: (filePath: string) => Promise<AvatarFile>;
}>();
const emit = defineEmits<{ close: []; save: [draft: ProfileDraft] }>();

const nickname = ref("");
const avatar = ref<AvatarFile | null>(null);
const avatarPreview = ref("");
const avatarLetter = computed(() => (nickname.value || props.user?.nickname || "P").slice(0, 1));

watch(() => props.visible, (visible) => {
  if (!visible) return;
  nickname.value = props.user?.nickname || "";
  avatar.value = null;
  avatarPreview.value = props.user?.avatarUrl || "";
});

async function chooseAvatar(event: { detail?: { avatarUrl?: string } }): Promise<void> {
  const filePath = event.detail?.avatarUrl;
  if (!filePath) return;
  try {
    avatar.value = await props.readAvatar(filePath);
    avatarPreview.value = filePath;
  } catch {
    // eslint-disable-next-line no-undef
    uni.showToast({ title: "头像文件无法使用", icon: "none" });
  }
}

function save(): void {
  emit("save", { nickname: nickname.value, avatar: avatar.value });
}
</script>

<style scoped>
.editor-mask { position: fixed; z-index: 30; inset: 0; display: flex; align-items: flex-end; padding: 28rpx; background: rgba(52, 47, 43, 0.34); }
.profile-editor { width: 100%; padding: 38rpx; }
.profile-editor__form { display: flex; align-items: center; gap: 24rpx; margin-top: 28rpx; }
.profile-editor__avatar { width: 112rpx; height: 112rpx; padding: 0; overflow: hidden; color: #66537f; background: var(--color-blush); border-radius: 36rpx; line-height: 112rpx; }
.profile-editor__avatar image { width: 100%; height: 100%; }
.profile-editor__input { flex: 1; min-width: 0; padding: 18rpx 22rpx; background: #f8f3ec; border-radius: 18rpx; font-size: 28rpx; }
.profile-editor__unsupported { margin-top: 20rpx; }
.profile-editor__failure { display: block; margin-top: 18rpx; color: #b35463; font-size: 24rpx; line-height: 1.5; }
.profile-editor__default-avatar { display: flex; align-items: center; justify-content: center; width: 88rpx; height: 88rpx; margin-bottom: 12rpx; color: #66537f; background: var(--color-blush); border-radius: 30rpx; font-size: 34rpx; font-weight: 700; }
.profile-editor__default-name { display: block; margin-bottom: 4rpx; font-size: 28rpx; font-weight: 700; }
.profile-editor__actions { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; margin-top: 32rpx; }
.profile-editor__actions button { margin: 0; border-radius: 20rpx; font-size: 26rpx; }
.profile-editor__secondary { color: var(--color-ink); background: #f4ede4; }
.profile-editor__primary { color: #fffdf9; background: #79649a; }
</style>
