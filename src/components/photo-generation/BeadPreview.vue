<script setup lang="ts">
/* global uni */
import { computed, getCurrentInstance, nextTick, watch } from "vue";
import { getMardLabPalette, type BeadGrid, type PhotoInput } from "../../domain/photo-generation";
import type { PreviewMode } from "../../application/photo-generation";

interface DrawingContext { setFillStyle(color:string):void;fillRect(x:number,y:number,width:number,height:number):void;beginPath():void;arc(x:number,y:number,radius:number,start:number,end:number):void;fill():void;draw(reserve?:boolean):void;setImageSmoothingEnabled?(enabled:boolean):void }
interface PreviewApi { getSystemInfoSync():{pixelRatio?:number};createCanvasContext(id:string,component?:unknown):DrawingContext;canvasPutImageData(options:{canvasId:string;data:Uint8ClampedArray;width:number;height:number},component?:unknown):void }
const previewApi=uni as unknown as PreviewApi;
const props=defineProps<{grid:BeadGrid;mode:PreviewMode;image?:PhotoInput}>();
const colors=new Map(getMardLabPalette().map(color=>[color.code,color.hex]));
const component=getCurrentInstance()?.proxy;const id=`photo-preview-${Math.random().toString(36).slice(2)}`;
const ratio=Math.max(1,previewApi.getSystemInfoSync().pixelRatio??1);const logicalCell=10;
const width=computed(()=>props.mode==="original"&&props.image?props.image.width:props.grid.width*logicalCell*ratio);
const height=computed(()=>props.mode==="original"&&props.image?props.image.height:props.grid.height*logicalCell*ratio);
const aspect=computed(()=>props.mode==="original"&&props.image?`${props.image.width}/${props.image.height}`:`${props.grid.width}/${props.grid.height}`);
async function draw():Promise<void>{await nextTick();if(props.mode==="original"&&props.image){previewApi.canvasPutImageData({canvasId:id,data:props.image.data,width:props.image.width,height:props.image.height},component);return;}const context=previewApi.createCanvasContext(id,component);context.setImageSmoothingEnabled?.(false);const cell=logicalCell*ratio;context.setFillStyle("#ffffff");context.fillRect(0,0,width.value,height.value);props.grid.cells.forEach((code,index)=>{if(!code)return;const x=index%props.grid.width,y=Math.floor(index/props.grid.width);context.setFillStyle(colors.get(code)??"#ffffff");if(props.mode==="round"){context.beginPath();context.arc((x+.5)*cell,(y+.5)*cell,cell*.43,0,Math.PI*2);context.fill();}else{context.fillRect(x*cell,y*cell,cell-ratio,cell-ratio);}});context.draw(false);}
watch(()=>[props.mode,props.image,props.grid] as const,()=>{void draw();},{immediate:true,deep:true});
</script>
<template><canvas :canvas-id="id" :id="id" class="preview-canvas" :width="width" :height="height" :style="{aspectRatio:aspect}"/></template>
<style scoped>.preview-canvas{display:block;width:100%;height:auto;background:#fff;image-rendering:pixelated}</style>
