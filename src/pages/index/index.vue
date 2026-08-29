<script setup lang="ts">
type EntryTone = "blush" | "lavender" | "mint";

type CreationEntry = {
  title: string;
  description: string;
  label: string;
  mark: string;
  tone: EntryTone;
};

const creationEntries: CreationEntry[] = [
  {
    title: "照片生成器",
    description: "拍照或选择相册图片，快速预览清晰的拼豆图纸。",
    label: "上传即生成",
    mark: "PIX",
    tone: "blush",
  },
  {
    title: "拼豆图纸图库",
    description: "从门牌、生日、节日等使用场景中寻找灵感。",
    label: "按场景浏览",
    mark: "LIB",
    tone: "lavender",
  },
  {
    title: "DIY 图纸",
    description: "组合边框、原创角色、装饰元素和文字。",
    label: "自由组合",
    mark: "DIY",
    tone: "mint",
  },
];
</script>

<template>
  <view class="app-page home-page">
    <view class="hero surface-card">
      <view class="hero__content">
        <text class="eyebrow">Pindou Studio</text>
        <text class="page-title">把喜欢的画面，变成可以亲手完成的拼豆图纸。</text>
        <text class="hero__copy section-copy">
          清晰生成、轻松修改，也可以从图库和原创元素开始创作。
        </text>
      </view>
      <view class="bead-motif">
        <view class="bead bead--pink"></view>
        <view class="bead bead--purple"></view>
        <view class="bead bead--cream"></view>
        <view class="bead bead--mint"></view>
        <view class="bead bead--rose"></view>
        <view class="bead bead--lilac"></view>
      </view>
    </view>

    <view class="section-heading">
      <view>
        <text class="eyebrow">Create your way</text>
        <text class="section-title">从哪里开始？</text>
      </view>
      <text class="section-heading__note">三个入口将按 Milestone 逐步接入</text>
    </view>

    <view class="entry-grid">
      <view
        v-for="entry in creationEntries"
        :key="entry.title"
        :class="['entry-card', `entry-card--${entry.tone}`]"
      >
        <view class="entry-card__topline">
          <text class="entry-card__mark">{{ entry.mark }}</text>
          <text class="soft-badge">{{ entry.label }}</text>
        </view>
        <view>
          <text class="entry-card__title">{{ entry.title }}</text>
          <text class="entry-card__copy">{{ entry.description }}</text>
        </view>
        <text class="entry-card__status">功能建设中</text>
      </view>
    </view>

    <view class="privacy-note surface-card">
      <text class="privacy-note__mark">LOCAL</text>
      <view class="privacy-note__content">
        <text class="privacy-note__title">照片优先在本地处理</text>
        <text class="section-copy">生成与导出无需登录，保存云作品时才会请求微信身份授权。</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  gap: 36rpx;
}

.hero {
  position: relative;
  display: flex;
  min-height: 340rpx;
  padding: 48rpx 38rpx;
  overflow: hidden;
  background: var(--color-blush);
}

.hero__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  max-width: 720rpx;
}

.hero__copy {
  max-width: 620rpx;
  margin-top: 22rpx;
}

.bead-motif {
  position: absolute;
  right: -28rpx;
  bottom: -24rpx;
  display: grid;
  grid-template-columns: repeat(3, 76rpx);
  gap: 14rpx;
  padding: 30rpx;
  transform: rotate(-8deg);
}

.bead {
  width: 76rpx;
  height: 76rpx;
  border: 14rpx solid rgba(255, 255, 255, 0.78);
  border-radius: 50%;
  box-shadow: 0 10rpx 20rpx rgba(111, 77, 83, 0.12);
}

.bead--pink { background: #dda5ad; }
.bead--purple { background: #a38dbd; }
.bead--cream { background: #f4dfbb; }
.bead--mint { background: #a9ccb6; }
.bead--rose { background: #c78491; }
.bead--lilac { background: #c7b5d8; }

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24rpx;
  padding: 0 4rpx;
}

.section-heading__note {
  color: var(--color-muted);
  font-size: 22rpx;
  line-height: 1.5;
  text-align: right;
}

.entry-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22rpx;
}

.entry-card {
  display: flex;
  min-height: 340rpx;
  padding: 30rpx;
  flex-direction: column;
  justify-content: space-between;
  border-radius: 30rpx;
}

.entry-card--blush { background: #f8e5e2; }
.entry-card--lavender { background: var(--color-lavender); }
.entry-card--mint { background: var(--color-mint); }

.entry-card__topline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.entry-card__mark {
  color: rgba(52, 47, 43, 0.72);
  font-size: 22rpx;
  font-weight: 700;
  letter-spacing: 3rpx;
}

.entry-card__title {
  display: block;
  margin-bottom: 14rpx;
  color: var(--color-ink);
  font-size: 34rpx;
  font-weight: 700;
}

.entry-card__copy {
  display: block;
  color: #655e59;
  font-size: 25rpx;
  line-height: 1.65;
}

.entry-card__status {
  color: rgba(52, 47, 43, 0.58);
  font-size: 22rpx;
  font-weight: 600;
}

.privacy-note {
  display: flex;
  align-items: center;
  gap: 26rpx;
  padding: 28rpx 32rpx;
}

.privacy-note__mark {
  flex: 0 0 auto;
  color: #5e765f;
  font-size: 20rpx;
  font-weight: 700;
  letter-spacing: 3rpx;
}

.privacy-note__content { min-width: 0; }

.privacy-note__title {
  display: block;
  margin-bottom: 4rpx;
  font-size: 27rpx;
  font-weight: 700;
}

@media (max-width: 700px) {
  .hero {
    min-height: 420rpx;
    padding-bottom: 150rpx;
  }

  .bead-motif {
    right: 8rpx;
    bottom: -38rpx;
    grid-template-columns: repeat(3, 62rpx);
  }

  .bead {
    width: 62rpx;
    height: 62rpx;
    border-width: 11rpx;
  }

  .section-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .section-heading__note { text-align: left; }
  .entry-grid { grid-template-columns: 1fr; }
  .entry-card { min-height: 280rpx; }
}
</style>
