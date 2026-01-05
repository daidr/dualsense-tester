<script setup lang="ts">
import { ref } from 'vue'

const isRecording = ref(false)
const mediaRecorder = ref<MediaRecorder | null>(null)
const audioChunks = ref<Blob[]>([])
const audioContext = ref<AudioContext | null>(null)

async function toggleRecording() {
  if (isRecording.value) {
    await stopRecordingAndPlayback()
  }
  else {
    await startRecording()
  }
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    audioChunks.value = []
    mediaRecorder.value = new MediaRecorder(stream)

    mediaRecorder.value.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.value.push(event.data)
      }
    }

    mediaRecorder.value.start()
    isRecording.value = true
  }
  catch (error) {
    console.error('Failed to start recording:', error)
    isRecording.value = false
  }
}

async function stopRecordingAndPlayback() {
  try {
    if (!mediaRecorder.value || mediaRecorder.value.state === 'inactive') {
      console.error('No active recording')
      isRecording.value = false
      return
    }

    mediaRecorder.value.stop()
    mediaRecorder.value.stream.getTracks().forEach(track => track.stop())

    await new Promise(resolve => setTimeout(resolve, 100))

    if (audioChunks.value.length === 0) {
      console.error('No audio data recorded')
      isRecording.value = false
      return
    }

    const audioBlob = new Blob(audioChunks.value, { type: 'audio/webm' })

    if (!audioContext.value) {
      audioContext.value = new AudioContext()
    }

    const arrayBuffer = await audioBlob.arrayBuffer()
    const audioBuffer = await audioContext.value.decodeAudioData(arrayBuffer)

    const source = audioContext.value.createBufferSource()
    source.buffer = audioBuffer
    source.connect(audioContext.value.destination)
    source.start(0)

    mediaRecorder.value = null
    isRecording.value = false
  }
  catch (error) {
    console.error('Failed to stop recording and playback:', error)
    isRecording.value = false
  }
}
</script>

<template>
  <div
    tabindex="0" role="button" class="dou-sc-btn" :class="{
      active: isRecording,
    }"
    @click="toggleRecording"
  >
    {{ isRecording ? $t('shared.stop') : $t('shared.start') }}
  </div>
</template>

<style scoped lang="scss">
.dou-sc-btn {
  @apply w-auto h-6 text-xs px-2;

  &:hover {
    @apply bg-primary/75;
  }

  &:active, &.active {
    @apply bg-primary text-white scale-90;
  }
}
</style>
