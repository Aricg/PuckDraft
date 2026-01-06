<template>
  <div class="cam-container">
    <h2>Ice Cam</h2>
    
    <div v-if="loading" class="loading">Loading cameras...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    
    <div v-else>
      <!-- Device Selection -->
      <div class="controls">
        <label>Camera: 
          <select v-model="selectedDevice">
            <option v-for="device in deviceList" :key="device" :value="device">{{ device }}</option>
          </select>
        </label>

        <label>Date: 
          <select v-model="selectedDate" :disabled="!selectedDevice">
            <option v-for="date in availableDates" :key="date" :value="date">{{ date }}</option>
          </select>
        </label>
      </div>

      <!-- Player -->
      <div v-if="currentImage" class="player">
        <h3>{{ selectedDevice }} - {{ selectedDate }}</h3>
        
        <div class="image-wrapper">
          <img :src="currentImage.url" :alt="currentImage.filename" />
          <div class="timestamp-overlay">{{ formatTime(currentImage.timestamp) }}</div>
        </div>

        <div class="playback-controls">
          <button @click="togglePlay">{{ isPlaying ? 'Pause' : 'Play' }}</button>
          <input 
            type="range" 
            min="0" 
            :max="images.length - 1" 
            v-model.number="currentIndex" 
            class="slider"
          >
          <span>{{ currentIndex + 1 }} / {{ images.length }}</span>
        </div>
      </div>
      
      <div v-else class="no-data">
        <p>No images found for this selection.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';

const imageData = ref({});
const loading = ref(true);
const error = ref(null);

const selectedDevice = ref('');
const selectedDate = ref('');
const currentIndex = ref(0);
const isPlaying = ref(false);
let intervalId = null;

// Derived lists
const deviceList = computed(() => Object.keys(imageData.value));
const availableDates = computed(() => {
  if (!selectedDevice.value || !imageData.value[selectedDevice.value]) return [];
  // Sort dates descending (newest first)
  return Object.keys(imageData.value[selectedDevice.value]).sort().reverse();
});

const images = computed(() => {
  if (!selectedDevice.value || !selectedDate.value) return [];
  return imageData.value[selectedDevice.value][selectedDate.value] || [];
});

const currentImage = computed(() => {
  if (images.value.length === 0) return null;
  return images.value[currentIndex.value];
});

// Load Data
const loadImages = async () => {
  try {
    const res = await fetch('/api/cam/images');
    if (!res.ok) throw new Error('Failed to load images');
    imageData.value = await res.json();
    
    // Auto-select first available
    if (deviceList.value.length > 0 && !selectedDevice.value) {
      selectedDevice.value = deviceList.value[0];
    }
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

// Watchers to reset selection defaults
watch(selectedDevice, (newDevice) => {
  if (newDevice && imageData.value[newDevice]) {
    const dates = Object.keys(imageData.value[newDevice]).sort().reverse();
    if (dates.length > 0) {
      selectedDate.value = dates[0]; // Select newest date
    }
  }
});

watch([selectedDevice, selectedDate], () => {
  currentIndex.value = 0;
  isPlaying.value = false;
  if (intervalId) clearInterval(intervalId);
});

// Playback Logic
const togglePlay = () => {
  if (isPlaying.value) {
    isPlaying.value = false;
    clearInterval(intervalId);
  } else {
    isPlaying.value = true;
    intervalId = setInterval(() => {
      if (currentIndex.value < images.value.length - 1) {
        currentIndex.value++;
      } else {
        currentIndex.value = 0; // Loop
      }
    }, 200); // 5 FPS
  }
};

const formatTime = (ts) => {
  return new Date(ts).toLocaleTimeString();
};

onMounted(() => {
  loadImages();
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});
</script>

<style scoped>
.cam-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  text-align: center;
}

.controls {
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
  gap: 20px;
}

.image-wrapper {
  position: relative;
  max-width: 100%;
  border: 1px solid #ccc;
  margin-bottom: 10px;
}

.image-wrapper img {
  width: 100%;
  display: block;
}

.timestamp-overlay {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 5px 10px;
  border-radius: 4px;
  font-family: monospace;
}

.playback-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin-top: 10px;
}

.slider {
  flex-grow: 1;
  max-width: 400px;
}

button {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #0056b3;
}
</style>
