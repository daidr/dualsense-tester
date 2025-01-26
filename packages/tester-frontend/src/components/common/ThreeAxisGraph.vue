<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import { Application, Graphics } from 'pixi.js';
import SliderBox from './SliderBox.vue';

const { maxValue = 0x7FFF, value } = defineProps<{
  maxValue?: number,
  value: {
    x: number,
    y: number,
    z: number,
  }
}>();

const CanvasRef = useTemplateRef('CanvasRef');

const X_COLOR = "#2f81f7"
const Y_COLOR = "#f14c4c"
const Z_COLOR = "#f9aa53"
const MAX_COUNT = 700;

const factor = ref(1);

let currentMaxValue = computed(() => maxValue * factor.value);
let currentMinValue = computed(() => -currentMaxValue.value - 1);

let valueList: {
  x: number,
  y: number,
  z: number,
}[] = [];

watch(() => value, (value) => {
  if (!value) {
    return;
  }
  valueList.push(value);
  if (valueList.length > MAX_COUNT) {
    valueList.shift();
  }
}, {
  immediate: true,
});

onMounted(async () => {
  if (!CanvasRef.value) {
    return;
  }
  let isDisposed = false;
  const app = new Application();
  onBeforeUnmount(() => {
    isDisposed = true;
    app.destroy({
      removeView: false,
    })
  });
  await app.init({
    preference: 'webgpu',
    canvas: CanvasRef.value,
    resizeTo: CanvasRef.value,
    backgroundAlpha: 0,
    antialias: true,
    resolution: window.devicePixelRatio,
  });
  if (isDisposed) {
    return;
  }

  const lineX = new Graphics();
  const lineY = new Graphics();
  const lineZ = new Graphics();
  lineX.setStrokeStyle({
    color: X_COLOR,
    width: 1,
    alpha: 0.9
  });
  lineY.setStrokeStyle({
    color: Y_COLOR,
    width: 1,
    alpha: 0.9
  });
  lineZ.setStrokeStyle({
    color: Z_COLOR,
    width: 1,
    alpha: 0.9
  });

  app.stage.addChild(lineX, lineY, lineZ);

  app.ticker.add(() => {
    const { width, height } = app.screen;
    const _values = valueList.slice();
    const xStep = width / MAX_COUNT;
    const initialY = height / 2;
    const yStep = height / (currentMaxValue.value - currentMinValue.value);
    // 如果不满MAX_COUNT，从尾部绘制
    const rest = MAX_COUNT - _values.length;
    lineX.clear();
    lineY.clear();
    lineZ.clear();

    for (let i = 0; i < _values.length; ++i) {
      const item = _values[i];
      const x = (rest + i) * xStep;
      const yX = initialY - item.x * yStep;
      const yY = initialY - item.y * yStep;
      const yZ = initialY - item.z * yStep;
      if (i === 0) {
        lineX.moveTo(x, yX);
        lineY.moveTo(x, yY);
        lineZ.moveTo(x, yZ);
      } else {
        lineX.lineTo(x, yX);
        lineY.lineTo(x, yY);
        lineZ.lineTo(x, yZ);
      }
    }
    lineX.stroke();
    lineY.stroke();
    lineZ.stroke();
  });
})

function reset() {
  valueList = [];
}

defineExpose({
  reset,
});
</script>

<template>
  <div class="relative">
    <div class="dou-sc-colorborder rounded-xl overflow-hidden relative w-[calc(100%-30px)] h-full">
      <canvas class="absolute top-0 w-full h-full" ref="CanvasRef" w="1" h="1"></canvas>

    </div>
    <div class="absolute top-2 right-2 bottom-2">
      <SliderBox v-model="factor" :min="0.01" :max="1" :digits="3" :vertical="true" />
    </div>
  </div>
</template>

<style scoped></style>
