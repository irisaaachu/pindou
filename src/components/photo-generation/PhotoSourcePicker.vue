<script setup lang="ts">
defineEmits<{ camera: []; album: [] }>();
</script>
<template><view class="picker surface-card"><text class="eyebrow">Local photo</text><text class="section-title">选择一张照片</text><text class="section-copy">照片仅在本机处理，不会自动上传</text><view class="picker__actions"><button class="primary" @tap="$emit('camera')">拍一张</button><button class="secondary" @tap="$emit('album')">从相册选择</button></view></view></template>
<style scoped>.picker{padding:36rpx;text-align:center}.section-title,.section-copy{display:block;margin-top:14rpx}.picker__actions{display:grid;grid-template-columns:1fr 1fr;gap:16rpx;margin-top:30rpx}.primary,.secondary{margin:0;border-radius:20rpx;font-size:26rpx}.primary{color:#fff;background:var(--color-lavender-strong)}.secondary{color:var(--color-ink);background:var(--color-mint)}</style>
