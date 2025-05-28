<script setup lang="ts">
import { usePageStore } from '@/store/page';
import { Application, Graphics } from 'pixi.js'
import { computed, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue';

const props = defineProps<{
    min: number
    max: number
    current: number
    direction: 'left' | 'right'
}>()

const CanvasRef = useTemplateRef('CanvasRef')

const pageStore = usePageStore()

const colorPalette = computed(() => {
    if (pageStore.colorModeState === 'dark') {
        return {
            normal: '#ffffff',
            active: '#2f81f7',
        }
    }
    return {
        normal: '#000000',
        active: '#2f81f7',
    }
})

onMounted(async () => {
    if (!CanvasRef.value) {
        return
    }
    let isDisposed = false
    const app = new Application()
    onBeforeUnmount(() => {
        isDisposed = true
        app.destroy({
            removeView: false,
        })
    })
    await app.init({
        preference: 'webgpu',
        canvas: CanvasRef.value,
        resizeTo: CanvasRef.value,
        backgroundAlpha: 0,
        antialias: true,
        resolution: window.devicePixelRatio,
    })
    if (isDisposed) {
        return
    }

    // Draw 100 radial lines spanning 200 degrees
    const graphics = new Graphics();
    app.stage.addChild(graphics);

    function draw() {
        if (isDisposed) {
            return
        }
        let centerX = 0;
        const centerY = app.screen.height / 2;
        if (props.direction === 'right') {
            centerX = app.screen.width - centerY;
        } else {
            centerX = centerY;
        }
        const outerRadius = centerY * 0.95;
        const innerRadius = outerRadius - 7;
        const activeInnerRadius = outerRadius - 14;
        const startAngle = props.direction === 'right' ? -100 : 80;
        const angleRange = 200;

        graphics.clear();

        for (let i = 0; i < 100; i++) {
            const index = props.direction === 'right' ? i : 99 - i;
            const isActive = index < props.current;
            const isDisabled = index < props.min || index >= props.max;
            const radius = isActive ? activeInnerRadius : innerRadius;
            const angle = (startAngle + (angleRange * i / 99)) * Math.PI / 180;


            if (isDisabled) {
                graphics.setStrokeStyle({
                    color: colorPalette.value.normal,
                    width: 2,
                    alpha: 0.3,
                    cap: 'round',
                    join: 'round',
                });
            } else {
                graphics.setStrokeStyle({
                    color: isActive ? colorPalette.value.active : colorPalette.value.normal,
                    width: 2,
                    alpha: 0.7,
                    cap: 'round',
                    join: 'round',
                });
            }

            const cosAngle = Math.cos(angle);
            const sinAngle = Math.sin(angle);

            graphics.moveTo(
                centerX + radius * cosAngle,
                centerY + radius * sinAngle
            );
            graphics.lineTo(
                centerX + outerRadius * cosAngle,
                centerY + outerRadius * sinAngle
            );
            graphics.stroke();
        }

    }

    app.renderer.on('resize', () => {
        draw();
    });

    watch(
        () => [props.min, props.max, props.current, props.direction, pageStore.colorModeState],
        () => {
            draw()
        },
        { immediate: true }
    )
})
</script>

<template>
    <div class="relative overflow-hidden aspect-[3/5]">
        <canvas ref="CanvasRef" class="absolute top-0 h-full w-full" w="1" h="1" />
    </div>
</template>

<style scoped></style>
