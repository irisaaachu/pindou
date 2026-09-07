<script setup lang="ts">
/* global uni */
import { getCurrentInstance, nextTick, watch } from "vue";
import type { CropTransform, PhotoInput } from "../../domain/photo-generation";
const props = defineProps<{ image: PhotoInput; crop: CropTransform }>();
const emit = defineEmits<{ change: [CropTransform]; confirm: [] }>();
const component=getCurrentInstance()?.proxy;const canvasId=`photo-crop-${Math.random().toString(36).slice(2)}`;
const previewApi=uni as unknown as {canvasPutImageData(options:{canvasId:string;data:Uint8ClampedArray;width:number;height:number},component?:unknown):void};
watch(()=>props.image,async(image)=>{await nextTick();previewApi.canvasPutImageData({canvasId,data:image.data,width:image.width,height:image.height},component);},{immediate:true});
function changeScale(event: Event): void { const scale = Number((event as Event & { detail: { value: number } }).detail.value); const width=props.crop.width*props.crop.scale/scale;const height=props.crop.height*props.crop.scale/scale;emit("change",{...props.crop,x:props.crop.x+(props.crop.width-width)/2,y:props.crop.y+(props.crop.height-height)/2,width,height,scale}); }
function changeAxis(axis:"x"|"y",event:Event):void{const value=Number((event as Event&{detail:{value:number}}).detail.value);emit("change",{...props.crop,[axis]:value});}
</script>
<template><view class="cropper surface-card"><view class="cropper__frame"><canvas :canvas-id="canvasId" :id="canvasId" class="cropper__canvas" :width="image.width" :height="image.height" :style="{aspectRatio:`${image.width}/${image.height}`}"/><text>{{ image.width }} × {{ image.height }} px · 拖动滑杆调整裁剪</text></view><text class="label">缩放</text><slider :value="crop.scale" :min="1" :max="4" :step="0.05" active-color="#8067a2" @change="changeScale"/><text class="label">左右</text><slider :value="crop.x" :min="0" :max="Math.max(0,image.width-crop.width)" active-color="#8067a2" @change="changeAxis('x',$event)"/><text class="label">上下</text><slider :value="crop.y" :min="0" :max="Math.max(0,image.height-crop.height)" active-color="#8067a2" @change="changeAxis('y',$event)"/><button class="primary" @tap="$emit('confirm')">确认裁剪并生成</button></view></template>
<style scoped>.cropper{padding:24rpx}.cropper__frame{display:flex;min-height:360rpx;flex-direction:column;align-items:center;justify-content:center;gap:12rpx;overflow:hidden;border:2rpx dashed #cabbd8;border-radius:24rpx;background:#f3eafa;color:#655e59;font-size:22rpx}.cropper__canvas{display:block;width:100%;height:auto;max-height:520rpx}.label{display:block;margin:14rpx 24rpx 0;color:#655e59;font-size:22rpx}.primary{margin-top:20rpx;color:#fff;background:var(--color-lavender-strong);border-radius:20rpx}</style>
