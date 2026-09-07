<script setup lang="ts">
/* global uni */
import { computed, ref } from "vue";
import { onUnload } from "@dcloudio/uni-app";
import PhotoSourcePicker from "../../components/photo-generation/PhotoSourcePicker.vue";
import PhotoCropper from "../../components/photo-generation/PhotoCropper.vue";
import GenerationSettings from "../../components/photo-generation/GenerationSettings.vue";
import BeadPreview from "../../components/photo-generation/BeadPreview.vue";
import { createPhotoGenerationRuntime, type PreviewMode } from "../../application/photo-generation";
import { createUniMediaPlatform, createWeChatMediaAdapter, type DecodedMedia, type UniMediaApi } from "../../adapters/photo-generation";
import { createPhotoGenerationEngine, normalizeDimensions, type ImageOrientation } from "../../domain/photo-generation";

interface ImageInfo { width:number;height:number;orientation?:string }
interface LocalImage { src:string;onload:()=>void;onerror:(error:unknown)=>void }
interface LocalContext { drawImage(image:LocalImage,x:number,y:number,width:number,height:number):void;getImageData(x:number,y:number,width:number,height:number):{data:Uint8ClampedArray} }
interface LocalCanvas { width:number;height:number;createImage():LocalImage;getContext(type:"2d") : LocalContext }
interface LocalMediaApi extends UniMediaApi { getImageInfo(options:{src:string;success(info:ImageInfo):void;fail(error:unknown):void}):void;createOffscreenCanvas(options:{type:"2d";width:number;height:number}):LocalCanvas }

const localApi=uni as unknown as LocalMediaApi;
function orientation(value?:string):ImageOrientation{return value==="down"?3:value==="right"?6:value==="left"?8:1;}
async function decodeImage(filePath:string,maxSide:number):Promise<DecodedMedia>{
  const info=await new Promise<ImageInfo>((resolve,reject)=>localApi.getImageInfo({src:filePath,success:resolve,fail:reject}));
  const size=normalizeDimensions(info.width,info.height,maxSide);const canvas=localApi.createOffscreenCanvas({type:"2d",...size});canvas.width=size.width;canvas.height=size.height;
  const image=canvas.createImage();await new Promise<void>((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=filePath;});
  const context=canvas.getContext("2d");context.drawImage(image,0,0,size.width,size.height);return{...size,data:context.getImageData(0,0,size.width,size.height).data,orientation:orientation(info.orientation)};
}
const media=createWeChatMediaAdapter(createUniMediaPlatform(localApi,decodeImage));
const runtime=createPhotoGenerationRuntime({media,engine:createPhotoGenerationEngine({now:()=>Date.now()})});
const view=computed(()=>runtime.state.view);const enlarged=ref(false);const previewModes:{value:PreviewMode;label:string}[]=[{value:"original",label:"原图"},{value:"round",label:"拼豆效果"},{value:"square",label:"方格预览"}];
const currentImage=computed(()=>"image" in view.value?view.value.image:undefined);
const currentResult=computed(()=>view.value.status==="ready"?view.value.result:view.value.status==="generating"||view.value.status==="failure"?view.value.previousResult:undefined);
const failureCopy=computed(()=>view.value.status!=="failure"?"":view.value.error==="PERMISSION_DENIED"?"需要相机权限才能拍照，你仍可从相册选择。":view.value.error==="OUT_OF_MEMORY"?"图片较大，设备内存不足，请换一张照片。":"这张照片暂时无法处理，请换一张再试。");
function choose(source:"camera"|"album"):void{void runtime.controller.choosePhoto(source);}function confirm():void{void runtime.controller.confirmCrop();}function regenerate():void{void runtime.controller.regenerate();}
onUnload(()=>runtime.controller.dispose());
</script>
<template><view class="app-page generator-page"><view class="heading"><text class="eyebrow">Photo to beads</text><text class="page-title">照片生成拼豆图纸</text><text class="section-copy">照片仅在本机处理，不会自动上传</text></view><PhotoSourcePicker v-if="view.status==='idle'" @camera="choose('camera')" @album="choose('album')"/><PhotoCropper v-else-if="view.status==='cropping'" :image="view.image" :crop="view.crop" @change="runtime.controller.updateCrop" @confirm="confirm"/><view v-else-if="view.status==='generating'&&!currentResult" class="message surface-card"><text>正在生成高清图纸…</text></view><view v-else-if="view.status==='failure'&&!currentResult" class="message surface-card"><text>{{failureCopy}}</text><button @tap="choose('album')">从相册选择</button></view><template v-if="currentResult"><view class="preview-card surface-card" @tap="enlarged=true"><view class="tabs"><button v-for="mode in previewModes" :key="mode.value" :class="{active:runtime.state.previewMode===mode.value}" @tap.stop="runtime.controller.setPreviewMode(mode.value)">{{mode.label}}</button></view><BeadPreview :grid="currentResult.grid" :image="currentImage" :mode="runtime.state.previewMode"/><text class="summary">{{currentResult.summary.beadCount}} 颗 · {{currentResult.summary.colorCount}} 色 · {{currentResult.grid.width}} × {{currentResult.grid.height}}</text><view class="metrics"><text>实体尺寸 {{currentResult.summary.physicalWidthMm}} × {{currentResult.summary.physicalHeightMm}} mm</text><text>推荐模式 {{currentResult.summary.recommendedMode==='cartoon'?'卡通':'写实'}}</text><text>生成耗时 {{currentResult.summary.elapsedMs}} ms</text></view></view><GenerationSettings :model-value="runtime.state.settings" :pending="runtime.state.hasPendingSettings" :busy="view.status==='generating'" @change="runtime.controller.updateSettings" @regenerate="regenerate"/><button class="replace" @tap="runtime.controller.replacePhoto('album')">更换照片</button></template><view v-if="enlarged&&currentResult" class="overlay" @tap="enlarged=false"><view class="overlay__content"><BeadPreview :grid="currentResult.grid" :image="currentImage" :mode="runtime.state.previewMode"/></view></view></view></template>
<style scoped>.generator-page{display:flex;flex-direction:column;gap:24rpx}.heading{padding:18rpx 6rpx}.heading text{display:block;margin-top:10rpx}.message,.preview-card{padding:28rpx;text-align:center}.tabs{display:flex;gap:10rpx;margin-bottom:20rpx}.tabs button{flex:1;margin:0;padding:0;border-radius:999rpx;font-size:22rpx}.tabs .active{color:#fff;background:var(--color-lavender-strong)}.summary{display:block;margin-top:20rpx;color:#655e59;font-size:23rpx}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10rpx;margin-top:14rpx;color:#766d67;font-size:20rpx}.replace{color:#66537f;background:var(--color-lavender);border-radius:20rpx}.overlay{position:fixed;z-index:20;inset:0;display:flex;align-items:center;padding:24rpx;background:rgba(36,31,29,.82)}.overlay__content{width:100%;max-height:90vh;overflow:auto;background:#fff}</style>
