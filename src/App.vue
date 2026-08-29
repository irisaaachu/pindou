<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
onLaunch(() => {
  console.log("App Launch");
});
onShow(() => {
  console.log("App Show");
});
onHide(() => {
  console.log("App Hide");
});
</script>
<style>
page,
#app {
  --color-canvas: #fbf5ea;
  --color-surface: #fffdf9;
  --color-ink: #342f2b;
  --color-muted: #746c66;
  --color-blush: #f6dcda;
  --color-lavender: #e8e0f4;
  --color-mint: #dfeee4;
  --color-line: #eadfd3;
  --color-lavender-strong: #79649a;
  min-height: 100%;
  color: var(--color-ink);
  background: var(--color-canvas);
  font-family: "Avenir Next", "Nunito", "PingFang SC", "Microsoft YaHei", sans-serif;
}

view,
text {
  box-sizing: border-box;
}

.app-page {
  width: 100%;
  max-width: 1120rpx;
  min-height: 100vh;
  margin: 0 auto;
  padding: 32rpx 28rpx calc(48rpx + env(safe-area-inset-bottom));
}

.eyebrow {
  display: block;
  margin-bottom: 12rpx;
  color: var(--color-lavender-strong);
  font-size: 22rpx;
  font-weight: 600;
  letter-spacing: 4rpx;
  text-transform: uppercase;
}

.page-title,
.section-title {
  display: block;
  color: var(--color-ink);
  font-weight: 700;
  letter-spacing: 1rpx;
}

.page-title {
  font-size: 52rpx;
  line-height: 1.18;
}

.section-title {
  font-size: 34rpx;
  line-height: 1.3;
}

.section-copy {
  display: block;
  color: var(--color-muted);
  font-size: 26rpx;
  line-height: 1.7;
}

.surface-card {
  background: var(--color-surface);
  border: 1rpx solid rgba(218, 202, 189, 0.72);
  border-radius: 32rpx;
  box-shadow: 0 16rpx 44rpx rgba(104, 82, 67, 0.07);
}

.soft-badge {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 44rpx;
  padding: 0 18rpx;
  color: #66537f;
  background: rgba(255, 255, 255, 0.62);
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
}

.empty-state {
  padding: 44rpx 32rpx;
  text-align: center;
}

.empty-state__mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88rpx;
  height: 88rpx;
  margin: 0 auto 24rpx;
  color: #6d5b87;
  background: var(--color-lavender);
  border-radius: 28rpx;
  font-size: 38rpx;
  font-weight: 700;
}

@media (min-width: 768px) {
  .app-page {
    padding-right: 48rpx;
    padding-left: 48rpx;
  }
}
</style>
