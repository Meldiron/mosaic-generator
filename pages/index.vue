<template>
  <div
    :class="{ dark: isDarkMode }"
    class="min-h-screen bg-gray-100 dark:bg-gray-900"
  >
    <!-- Overlay to close sidebar when clicking outside -->
    <div
      v-if="isSidebarOpen"
      class="fixed inset-0 bg-black bg-opacity-50 z-40"
      @click="closeSidebar"
    ></div>

    <!-- Hamburger button (now below the sidebar) -->
    <button
      @click="toggleSidebar"
      class="fixed top-4 right-4 z-30 p-2 rounded-md bg-white dark:bg-gray-800 shadow-md"
      aria-label="Toggle sidebar"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-6 w-6 text-gray-600 dark:text-gray-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
    </button>

    <!-- Sidebar -->
    <div
      :class="{
        'translate-x-0': isSidebarOpen,
        'translate-x-full': !isSidebarOpen,
      }"
      class="fixed top-0 right-0 h-full w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out z-50"
    >
      <div class="p-4">
        <button
          @click="toggleDarkMode"
          class="w-full mb-4 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-bold py-2 px-4 rounded"
          aria-label="Toggle dark mode"
        >
          {{ isDarkMode ? "Light Mode" : "Dark Mode" }}
        </button>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Version: {{ config.public.version }}
        </p>
      </div>
    </div>

    <!-- Main content -->
    <div class="py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-7xl mx-auto">
        <h1
          class="text-3xl font-bold text-center text-gray-900 dark:text-white mb-8"
        >
          Mosaic Photo Generator
        </h1>

        <HeadlessDisclosure as="div" class="mb-8" v-slot="{ open }">
          <HeadlessDisclosureButton
            class="flex justify-between w-full px-4 py-2 text-sm font-medium text-left text-gray-900 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus-visible:ring focus-visible:ring-gray-500 focus-visible:ring-opacity-75 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
          >
            <span>Important Information</span>
            <ChevronUpIcon
              :class="open ? 'transform rotate-180' : ''"
              class="w-5 h-5 text-gray-500"
            />
          </HeadlessDisclosureButton>
          <HeadlessDisclosurePanel
            class="px-4 pt-4 pb-2 text-sm text-gray-500 dark:text-gray-400"
          >
            <ul class="list-disc list-inside">
              <li>
                Sign in with Shoebox and share one gallery. Every photo in it
                becomes a tile in the pool.
              </li>
              <li>The target photo is one of those gallery photos.</li>
              <li>
                A diverse pool of images will create more interesting mosaics.
              </li>
              <li>
                Smaller tile sizes create more detailed mosaics but take longer
                to generate.
              </li>
              <li>
                The color adjustment slider balances between original colors and
                mosaic tiles.
              </li>
              <li>
                Generation time increases with larger images and smaller tile
                sizes.
              </li>
            </ul>
          </HeadlessDisclosurePanel>
        </HeadlessDisclosure>

        <div class="flex flex-col lg:flex-row">
          <div class="lg:w-1/4 lg:pr-8">
            <div
              class="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-8"
            >
              <h2
                class="text-xl font-semibold mb-4 text-gray-900 dark:text-white"
              >
                1. Sign in with Shoebox
              </h2>
              <template v-if="!gallery">
                <button
                  @click="signInWithShoebox"
                  :disabled="isLoadingGallery"
                  class="w-full bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-200 text-white dark:text-gray-900 font-bold py-2 px-4 rounded disabled:opacity-50"
                >
                  {{
                    isLoadingGallery ? "Loading gallery..." : "Sign in with Shoebox"
                  }}
                </button>
                <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  Share one gallery; its photos become the mosaic tiles.
                </p>
              </template>
              <template v-else>
                <p class="text-gray-700 dark:text-gray-300">
                  Gallery
                  <span class="font-semibold">{{ gallery.name }}</span>
                  with {{ gallery.photos.length }} photos
                </p>
                <button
                  @click="signOut"
                  class="mt-2 text-sm text-gray-500 dark:text-gray-400 underline"
                >
                  Sign out
                </button>
              </template>
            </div>

            <div
              v-if="gallery"
              class="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-8"
            >
              <h2
                class="text-xl font-semibold mb-4 text-gray-900 dark:text-white"
              >
                2. Select Target Photo
              </h2>
              <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
                Click the photo to rebuild. All gallery photos are the pool.
              </p>
              <div class="grid grid-cols-4 gap-2">
                <button
                  v-for="photo in gallery.photos"
                  :key="photo.id"
                  @click="targetPhoto = photo.url"
                  :aria-pressed="targetPhoto === photo.url"
                  :aria-label="`Use ${photo.name} as target`"
                  :class="
                    targetPhoto === photo.url
                      ? 'ring-2 ring-blue-500'
                      : 'opacity-75 hover:opacity-100'
                  "
                  class="rounded"
                >
                  <img
                    :src="photo.url"
                    :alt="photo.name"
                    class="w-16 h-16 object-cover rounded"
                  />
                </button>
              </div>
              <div v-if="targetPhoto" class="mt-4 flex justify-center">
                <img
                  :src="targetPhoto"
                  alt="Target Photo"
                  class="max-w-full h-auto max-h-64 object-contain"
                />
              </div>
            </div>

            <div
              class="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-8"
            >
              <h2
                class="text-xl font-semibold mb-4 text-gray-900 dark:text-white"
              >
                3. Mosaic Parameters
              </h2>
              <div class="mb-4">
                <label
                  for="tileSize"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Tile Size
                  <button
                    @click="toggleTooltip('tileSize')"
                    class="ml-1 text-gray-500 dark:text-gray-400 focus:outline-none"
                    aria-label="Tile size information"
                  >
                    ?
                  </button>
                </label>
                <input
                  type="range"
                  id="tileSize"
                  v-model="tileSize"
                  min="5"
                  max="50"
                  class="w-full"
                />
                <span class="text-sm text-gray-500 dark:text-gray-400"
                  >{{ tileSize }}px</span
                >
                <div
                  v-if="activeTooltip === 'tileSize'"
                  class="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300"
                >
                  Determines the size of each mosaic tile. Smaller values create
                  more detailed mosaics but take longer to generate.
                </div>
              </div>
              <div class="mb-4">
                <label
                  for="colorAdjustment"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Color Adjustment
                  <button
                    @click="toggleTooltip('colorAdjustment')"
                    class="ml-1 text-gray-500 dark:text-gray-400 focus:outline-none"
                    aria-label="Color adjustment information"
                  >
                    ?
                  </button>
                </label>
                <input
                  type="range"
                  id="colorAdjustment"
                  v-model="colorAdjustment"
                  min="0"
                  max="100"
                  class="w-full"
                />
                <span class="text-sm text-gray-500 dark:text-gray-400"
                  >{{ colorAdjustment }}%</span
                >
                <div
                  v-if="activeTooltip === 'colorAdjustment'"
                  class="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300"
                >
                  Controls the balance between the original image colors and the
                  mosaic tile colors. Higher values result in a mosaic that's
                  closer to the original image colors.
                </div>
              </div>
            </div>

            <div
              class="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-8"
            >
              <h2
                class="text-xl font-semibold mb-4 text-gray-900 dark:text-white"
              >
                4. Generate Mosaic
              </h2>
              <button
                @click="generateMosaic"
                class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                :disabled="
                  !targetPhoto || poolPhotos.length === 0 || isGenerating
                "
                aria-live="polite"
              >
                {{ isGenerating ? "Generating..." : "Generate Mosaic" }}
              </button>
            </div>
          </div>

          <div class="lg:w-3/4 lg:pl-8">
            <main
              class="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 h-full"
            >
              <h2
                class="text-xl font-semibold mb-4 text-gray-900 dark:text-white"
              >
                Result
              </h2>
              <div v-if="mosaicImage" class="mb-4 flex flex-col items-center">
                <img
                  :src="mosaicImage"
                  alt="Mosaic Result"
                  class="max-w-full h-auto mb-4"
                />
                <button
                  @click="downloadMosaic"
                  class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
                >
                  Download Mosaic
                </button>
              </div>
              <div v-else-if="error" class="text-red-600 dark:text-red-400">
                {{ error }}
              </div>
              <div
                v-else
                class="text-gray-600 dark:text-gray-400 h-64 flex items-center justify-center"
              >
                The generated mosaic will appear here.
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>

    <!-- Cancel Button -->
    <button
      v-if="isGenerating"
      @click="cancelGeneration"
      class="fixed bottom-4 right-4 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded z-50"
      aria-live="polite"
    >
      Cancel Generation
    </button>

    <!-- Loading Overlay -->
    <div
      v-if="isGenerating"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg p-8 flex flex-col items-center"
      >
        <div class="loader mb-4" aria-hidden="true"></div>
        <p class="text-lg font-semibold text-gray-900 dark:text-white">
          Generating Mosaic...
        </p>
        <p v-if="progress" class="mt-2 text-gray-600 dark:text-gray-400">
          {{ progress }}
        </p>
        <p class="mt-2 text-gray-600 dark:text-gray-400">
          Progress: {{ percentProgress }}%
        </p>
        <p class="mt-2 text-gray-600 dark:text-gray-400">
          Time elapsed: {{ elapsedTime }}s
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useHead } from "#imports";
import { useRuntimeConfig } from "#app";
import { ChevronUpIcon } from "@heroicons/vue/24/solid";
import {
  Disclosure as HeadlessDisclosure,
  DisclosureButton as HeadlessDisclosureButton,
  DisclosurePanel as HeadlessDisclosurePanel,
} from "@headlessui/vue";
import {
  completeSignIn,
  loadGallery,
  signInWithShoebox,
  signOutOfShoebox,
} from "~/utils/shoebox";

// The Shoebox gallery the user shared: { id, name, photos: [{ id, name, url }] }
const gallery = ref(null);
const isLoadingGallery = ref(false);
// URL of the gallery photo to rebuild; every gallery photo is a pool tile
const targetPhoto = ref(null);
const poolPhotos = computed(() => gallery.value?.photos.map((p) => p.url) ?? []);
const mosaicImage = ref(null);
const isGenerating = ref(false);
const progress = ref("");
const isDarkMode = ref(false);
const tileSize = ref(20);
const colorAdjustment = ref(50);
const error = ref(null);
const percentProgress = ref(0);
const elapsedTime = ref(0);
const config = useRuntimeConfig();
const activeTooltip = ref(null);
const isSidebarOpen = ref(false);
let worker = null;
let generationTimeout = null;
let elapsedTimeInterval = null;

useHead({
  title: "Mosaic Photo Generator",
  htmlAttrs: {
    lang: "en",
  },
});

onMounted(() => {
  console.log("Component mounted");
  initializeWorker();

  // Back from Shoebox with ?code=…? Finish the sign-in, then load the shared gallery.
  isLoadingGallery.value = true;
  completeSignIn()
    .then((token) => token && loadGallery(token))
    .then((shared) => (gallery.value = shared || null))
    .catch((e) => alert(e.message))
    .finally(() => (isLoadingGallery.value = false));

  // Initialize dark mode based on user preference
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    isDarkMode.value = true;
  }
});

onUnmounted(() => {
  if (worker) {
    worker.terminate();
  }
  if (generationTimeout) {
    clearTimeout(generationTimeout);
  }
  if (elapsedTimeInterval) {
    clearInterval(elapsedTimeInterval);
  }
});

watch(isDarkMode, (newValue) => {
  if (newValue) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
});

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value;
};

const closeSidebar = () => {
  isSidebarOpen.value = false;
};

const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value;
};

const signOut = () => {
  signOutOfShoebox();
  gallery.value = null;
  targetPhoto.value = null;
};

const initializeWorker = () => {
  console.log("Initializing worker");
  worker = new Worker("/mosaic-worker.js");
  worker.onmessage = (e) => {
    console.log("Worker message received:", e.data);
    if (e.data.error) {
      console.error("Error from worker:", e.data.error);
      handleError(e.data.error);
    } else if (e.data.progress) {
      progress.value = e.data.progress;
      if (e.data.percentage !== undefined) {
        percentProgress.value = e.data.percentage;
      }
    } else if (e.data.mosaicImage) {
      console.log("Mosaic image received");
      mosaicImage.value = e.data.mosaicImage;
      isGenerating.value = false;
      progress.value = "";
      percentProgress.value = 100;
      clearTimeout(generationTimeout);
      clearInterval(elapsedTimeInterval);
      // Clear worker buffers
      worker.postMessage({ action: "clear" });
    }
  };
  worker.onerror = (err) => {
    console.error("Worker error:", err);
    handleError(`Worker error: ${err.message}`);
  };
};

const handleError = (errorMessage) => {
  console.error("Error in mosaic generation:", errorMessage);
  error.value = errorMessage.includes("Failed to process")
    ? errorMessage
    : "An error occurred during mosaic generation. Please try again with different images or settings.";
  isGenerating.value = false;
  progress.value = "";
  percentProgress.value = 0;
  elapsedTime.value = 0;
  clearTimeout(generationTimeout);
  clearInterval(elapsedTimeInterval);
};

const generateMosaic = async () => {
  if (!targetPhoto.value || poolPhotos.value.length === 0 || !worker) return;

  isGenerating.value = true;
  progress.value = "Preparing images...";
  error.value = null;
  percentProgress.value = 0;
  elapsedTime.value = 0;

  console.log("Starting mosaic generation with tile size:", tileSize.value);

  const startTime = Date.now();
  elapsedTimeInterval = setInterval(() => {
    elapsedTime.value = Math.floor((Date.now() - startTime) / 1000);
  }, 1000);

  try {
    // Download the photos (presigned Shoebox URLs) as ArrayBuffers
    const targetBuffer = await fetch(targetPhoto.value).then((r) =>
      r.arrayBuffer()
    );
    const poolBuffers = await Promise.all(
      poolPhotos.value.map((photo) => fetch(photo).then((r) => r.arrayBuffer()))
    );

    console.log("Images prepared, sending to worker");

    // Send data in chunks
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
    const sendChunk = (data, isTarget) => {
      for (let start = 0; start < data.byteLength; start += CHUNK_SIZE) {
        const end = Math.min(start + CHUNK_SIZE, data.byteLength);
        worker.postMessage(
          {
            chunk: data.slice(start, end),
            start,
            end,
            total: data.byteLength,
            isTarget,
          },
          [data.slice(start, end)]
        );
      }
    };

    worker.postMessage({
      action: "start",
      tileSize: Number(tileSize.value),
      colorAdjustment: colorAdjustment.value / 100,
    });
    sendChunk(targetBuffer, true);
    for (const buffer of poolBuffers) {
      sendChunk(buffer, false);
    }
    worker.postMessage({ action: "process" });

    // Set a timeout to check if the generation is taking too long
    generationTimeout = setTimeout(() => {
      if (isGenerating.value) {
        handleError(
          "Generation is taking longer than expected. Please try again with smaller images or fewer pool photos."
        );
      }
    }, 3600000); // 60 minutes timeout
  } catch (error) {
    handleError(`Error in generateMosaic: ${error.message}`);
  }
};

const cancelGeneration = () => {
  console.log("Cancelling mosaic generation");
  if (worker) {
    worker.postMessage({ action: "clear" });
    worker.terminate();
    initializeWorker();
  }
  isGenerating.value = false;
  progress.value = "";
  percentProgress.value = 0;
  elapsedTime.value = 0;
  clearTimeout(generationTimeout);
  clearInterval(elapsedTimeInterval);
};

const downloadMosaic = () => {
  if (mosaicImage.value) {
    const link = document.createElement("a");
    link.href = mosaicImage.value;
    link.download = "mosaic.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

const toggleTooltip = (tooltipName) => {
  if (activeTooltip.value === tooltipName) {
    activeTooltip.value = null;
  } else {
    activeTooltip.value = tooltipName;
  }
};
</script>

<style>
.loader {
  border: 5px solid #f3f3f3;
  border-top: 5px solid #3498db;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Dark mode styles */
.dark .loader {
  border-color: #4a5568;
  border-top-color: #63b3ed;
}
.dark {
  @apply bg-gray-900 text-white;
}
</style>
