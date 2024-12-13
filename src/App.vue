<script setup lang="ts">
import StyledQRCode from '@/components/StyledQRCode.vue'
import {
  copyImageToClipboard,
  downloadPngElement,
  downloadSvgElement,
  getPngElement,
  getSvgString,
  IS_COPY_IMAGE_TO_CLIPBOARD_SUPPORTED
} from '@/utils/convertToImage'
import JSZip from 'jszip'
import { type ErrorCorrectionLevel, type Options as StyledQRCodeProps } from 'qr-code-styling'
import { computed, onMounted, ref, watch } from 'vue'
import 'vue-i18n'
import { useI18n } from 'vue-i18n'
import { getNumericCSSValue } from './utils/formatting'
import { allPresets } from './utils/presets'
//#region /** locale */
const { t } = useI18n()

//#endregion
//#region /** styling states and computed properties */
const defaultPreset = allPresets[0]
const data = ref()
const image = ref()
const width = ref()
const height = ref()
const margin = ref()
const imageMargin = ref()
const qrCodeContainer = ref()

const dotsOptionsColor = ref()
const dotsOptionsType = ref()
const cornersSquareOptionsColor = ref()
const cornersSquareOptionsType = ref()
const cornersDotOptionsColor = ref()
const cornersDotOptionsType = ref()
const styleBorderRadius = ref()
const styledBorderRadiusFormatted = computed(() => `${styleBorderRadius.value}px`)
const styleBackground = ref(defaultPreset.style.background)
const lastBackground = ref(defaultPreset.style.background)

const includeBackground = ref(true)
watch(
  includeBackground,
  (newIncludeBackground) => {
    if (!newIncludeBackground) {
      lastBackground.value = styleBackground.value
      styleBackground.value = 'transparent'
    } else {
      styleBackground.value = lastBackground.value
    }
  },
  {
    immediate: true
  }
)

const dotsOptions = computed(() => ({
  color: dotsOptionsColor.value,
  type: dotsOptionsType.value
}))
const cornersSquareOptions = computed(() => ({
  color: cornersSquareOptionsColor.value,
  type: cornersSquareOptionsType.value
}))
const cornersDotOptions = computed(() => ({
  color: cornersDotOptionsColor.value,
  type: cornersDotOptionsType.value
}))
const style = computed(() => ({
  borderRadius: styledBorderRadiusFormatted.value,
  background: styleBackground.value
}))
const imageOptions = computed(() => ({
  margin: imageMargin.value
}))
const qrOptions = computed(() => ({
  errorCorrectionLevel: errorCorrectionLevel.value
}))

const qrCodeProps = computed<StyledQRCodeProps>(() => ({
  data: data.value,
  image: image.value,
  width: width.value,
  height: height.value,
  margin: margin.value,
  dotsOptions: dotsOptions.value,
  cornersSquareOptions: cornersSquareOptions.value,
  cornersDotOptions: cornersDotOptions.value,
  imageOptions: imageOptions.value,
  qrOptions: qrOptions.value
}))

const selectedPreset = ref<Preset & { key?: string }>(defaultPreset)
watch(selectedPreset, () => {
  data.value = selectedPreset.value.data
  image.value = selectedPreset.value.image
  width.value = selectedPreset.value.width
  height.value = selectedPreset.value.height
  margin.value = selectedPreset.value.margin
  imageMargin.value = selectedPreset.value.imageOptions.margin
  dotsOptionsColor.value = selectedPreset.value.dotsOptions.color
  dotsOptionsType.value = selectedPreset.value.dotsOptions.type
  cornersSquareOptionsColor.value = selectedPreset.value.cornersSquareOptions.color
  cornersSquareOptionsType.value = selectedPreset.value.cornersSquareOptions.type
  cornersDotOptionsColor.value = selectedPreset.value.cornersDotOptions.color
  cornersDotOptionsType.value = selectedPreset.value.cornersDotOptions.type
  styleBorderRadius.value = getNumericCSSValue(selectedPreset.value.style.borderRadius as string)
  styleBackground.value = selectedPreset.value.style.background
  includeBackground.value = selectedPreset.value.style.background !== 'transparent'
  errorCorrectionLevel.value = selectedPreset.value.qrOptions
    ? selectedPreset.value.qrOptions.errorCorrectionLevel
    : 'Q'
})
const LAST_LOADED_LOCALLY_PRESET_KEY = 'Last saved locally'
const LOADED_FROM_FILE_PRESET_KEY = 'Loaded from file'
const CUSTOM_LOADED_PRESET_KEYS = [LAST_LOADED_LOCALLY_PRESET_KEY, LOADED_FROM_FILE_PRESET_KEY]
const selectedPresetKey = ref<string>(LAST_LOADED_LOCALLY_PRESET_KEY)
const lastCustomLoadedPreset = ref<Preset>()
watch(
  selectedPresetKey,
  (newKey, prevKey) => {
    if (newKey === prevKey || !newKey) return

    if (CUSTOM_LOADED_PRESET_KEYS.includes(newKey) && lastCustomLoadedPreset.value) {
      selectedPreset.value = lastCustomLoadedPreset.value
      return
    }

    const updatedPreset = allPresets.find((preset) => preset.name === newKey)
    if (updatedPreset) {
      selectedPreset.value = updatedPreset
    }
  },
  { immediate: true }
)
//#endregion

//#region /* error correction level */
const errorCorrectionLevels: ErrorCorrectionLevel[] = ['L', 'M', 'Q', 'H']
const errorCorrectionLevel = ref<ErrorCorrectionLevel>('Q')
const ERROR_CORRECTION_LEVEL_LABELS: Record<ErrorCorrectionLevel, string> = {
  L: `Low (7%)`,
  M: `Medium (15%)`,
  Q: `High (25%)`,
  H: `Highest (30%)`
}
const recommendedErrorCorrectionLevel = computed<ErrorCorrectionLevel | null>(() => {
  if (!data.value) return null
  if (data.value.length <= 50) {
    return 'H'
  } else if (data.value.length <= 150) {
    return 'Q'
  } else if (data.value.length <= 500) {
    return 'M'
  } else {
    return 'L'
  }
})
//#endregion

//#region /* export image utils */
const options = computed(() => ({
  width: width.value,
  height: height.value
}))

async function copyQRToClipboard() {
  console.debug('Copying image to clipboard')
  // const qrCode = document.querySelector('#qr-code-container')
  if (qrCodeContainer?.value) {
    await copyImageToClipboard(qrCodeContainer?.value as HTMLElement, options.value)
  }
}

function downloadQRImageAsPng() {
  if (exportMode.value === ExportMode.Single) {
    // const qrCode = document.querySelector('#qr-code-container')
    if (qrCodeContainer?.value) {
      downloadPngElement(
        qrCodeContainer?.value as HTMLElement,
        'qr-code.png',
        options.value,
        styledBorderRadiusFormatted.value
      )
    }
  } else {
    generateBatchQRCodes('png')
  }
}

function downloadQRImageAsSvg() {
  if (exportMode.value === ExportMode.Single) {
    // const qrCode = document.querySelector('#qr-code-container')
    if (qrCodeContainer?.value) {
      downloadSvgElement(
        qrCodeContainer?.value as HTMLElement,
        'qr-code.svg',
        options.value,
        styledBorderRadiusFormatted.value
      )
    }
  } else {
    generateBatchQRCodes('svg')
  }
}

function uploadImage() {
  console.debug('Uploading image')
  const imageInput = document.createElement('input')
  imageInput.type = 'file'
  imageInput.accept = 'image/*'
  imageInput.onchange = (event: Event) => {
    const target = event.target as HTMLInputElement
    if (target.files) {
      const file = target.files[0]
      const reader = new FileReader()
      reader.onload = (event: ProgressEvent<FileReader>) => {
        const target = event.target as FileReader
        const result = target.result as string
        image.value = result
      }
      reader.readAsDataURL(file)
    }
  }
  imageInput.click()
}

//#endregion

//#region /* QR Config Utils */
function createQrConfig() {
  return {
    props: qrCodeProps.value,
    style: style.value
  }
}

function downloadQRConfig() {
  console.debug('Downloading QR code config')
  const qrCodeConfig = createQrConfig()
  const qrCodeConfigString = JSON.stringify(qrCodeConfig)
  const qrCodeConfigBlob = new Blob([qrCodeConfigString], { type: 'application/json' })
  const qrCodeConfigUrl = URL.createObjectURL(qrCodeConfigBlob)
  const qrCodeConfigLink = document.createElement('a')
  qrCodeConfigLink.href = qrCodeConfigUrl
  qrCodeConfigLink.download = 'qr-code-config.json'
  qrCodeConfigLink.click()
}

function saveQRConfigToLocalStorage() {
  const qrCodeConfig = createQrConfig()
  const qrCodeConfigString = JSON.stringify(qrCodeConfig)
  localStorage.setItem('qrCodeConfig', qrCodeConfigString)
}

function loadQRConfig(jsonString: string, key?: string) {
  const qrCodeConfig = JSON.parse(jsonString)
  const qrCodeProps = qrCodeConfig.props
  const qrCodeStyle = qrCodeConfig.style
  const preset = {
    ...qrCodeProps,
    style: qrCodeStyle
  }

  if (key) {
    preset.name = key
    lastCustomLoadedPreset.value = preset
  }

  selectedPreset.value = preset
}

function loadQrConfigFromFile() {
  console.debug('Loading QR code config')
  const qrCodeConfigInput = document.createElement('input')
  qrCodeConfigInput.type = 'file'
  qrCodeConfigInput.accept = 'application/json'
  qrCodeConfigInput.onchange = (event: Event) => {
    const target = event.target as HTMLInputElement
    if (target.files) {
      const file = target.files[0]
      const reader = new FileReader()
      reader.onload = (event: ProgressEvent<FileReader>) => {
        const target = event.target as FileReader
        const result = target.result as string
        loadQRConfig(result, LOADED_FROM_FILE_PRESET_KEY)
      }
      reader.readAsText(file)
    }
  }
  qrCodeConfigInput.click()
}

function loadQRConfigFromLocalStorage() {
  const qrCodeConfigString = localStorage.getItem('qrCodeConfig')
  if (qrCodeConfigString) {
    console.debug('Loading QR code config from local storage')
    loadQRConfig(qrCodeConfigString, LAST_LOADED_LOCALLY_PRESET_KEY)
  } else {
    selectedPreset.value = { ...defaultPreset }
  }
}

watch(
  [qrCodeProps, style],
  () => {
    saveQRConfigToLocalStorage()
  },
  {
    deep: true
  }
)

onMounted(() => {
  loadQRConfigFromLocalStorage()
})
//#endregion

//#region /* Batch QR Code Generation */
enum ExportMode {
  Single = 'single',
  Batch = 'batch'
}

const exportMode = ref(ExportMode.Single)
const dataStringsFromCsv = ref<string[]>([])
const filteredDataStringsFromCsv = computed(() =>
  ignoreHeaderRow.value ? dataStringsFromCsv.value.slice(1) : dataStringsFromCsv.value
)

const csvFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement>()
const isValidCsv = ref(true)
const ignoreHeaderRow = ref(false)

const isExportingBatchQRs = ref(false)
const isBatchExportSuccess = ref(false)
const currentExportedQrCodeIndex = ref<number | null>(null)

const resetBatchExportProgress = () => {
  isExportingBatchQRs.value = false
  currentExportedQrCodeIndex.value = null
  usedFilenames.clear()
}

const resetData = () => {
  data.value = ''
  csvFile.value = null
  dataStringsFromCsv.value = []
  isValidCsv.value = true
  resetBatchExportProgress()
  isBatchExportSuccess.value = false
}

watch(exportMode, () => {
  resetData()
})

const getFileFromInputEvent = (event: InputEvent) => {
  const inputElement = event.target as HTMLInputElement
  if (inputElement.files && inputElement.files.length > 0) {
    return inputElement.files[0]
  }
  return null
}

const onCsvFileUpload = (event: Event) => {
  isBatchExportSuccess.value = false
  let file: File | null = getFileFromInputEvent(event as InputEvent)

  // If it is not input event, then it might be a drag and drop event
  if (file == null) {
    const dt = (event as DragEvent).dataTransfer
    if (!dt || !dt.files || dt.files.length === 0) {
      return
    }
    file = dt.files[0]
  }

  // Early return if file is not a CSV
  if (file.type !== 'text/csv') {
    isValidCsv.value = false
    return
  }

  csvFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result
    if (typeof content !== 'string') {
      isValidCsv.value = false
      return
    }
    let links = content.split('\n').filter((link) => link.trim() !== '')
    links = links.map((link) => link.replace('\r', ''))
    if (ignoreHeaderRow.value && links.length > 0) {
      links.shift()
    }
    console.log('links', links)
    dataStringsFromCsv.value = links
    isValidCsv.value = true
  }

  reader.readAsText(file)
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const usedFilenames = new Set() // zip folders cannot have duplicate filenames, otherwise they override each other
const createZipFile = (
  zip: typeof JSZip,
  dataUrl: string,
  index: number,
  format: 'png' | 'svg'
) => {
  const dataString = filteredDataStringsFromCsv.value[index]
  let fileName = dataString.trim()
  if (dataString.startsWith('http')) {
    const pathSegments = dataString.split('/')
    const lastPathSegment = pathSegments[pathSegments.length - 1]
    // Check if lastPathSegment is only alphanumeric or underscores
    const isValidFileName = /^[a-zA-Z0-9_]+$/.test(lastPathSegment)
    if (!isValidFileName) {
      fileName = pathSegments[pathSegments.length - 2] || `qr_code_${index}`
    }
  }

  if (usedFilenames.has(fileName)) {
    fileName = `${fileName}-${index}`
  }

  usedFilenames.add(fileName)

  if (format === 'png') {
    zip.file(`${fileName}.${format}`, dataUrl.split(',')[1], { base64: true })
  } else {
    // For SVG, we don't need to split and use base64
    zip.file(`${fileName}.${format}`, dataUrl)
  }
}
async function generateBatchQRCodes(format: 'png' | 'svg') {
  isExportingBatchQRs.value = true
  const qrCode = qrCodeContainer?.value;
  const zip = new JSZip()
  let numQrCodesCreated = 0

  try {
    for (let index = 0; index < filteredDataStringsFromCsv.value.length; index++) {
      currentExportedQrCodeIndex.value = index
      const url = filteredDataStringsFromCsv.value[index]
      data.value = url
      await sleep(1000)
      let dataUrl: string = ''
      if (format === 'png') {
        dataUrl = await getPngElement(
          qrCode as HTMLElement,
          options.value,
          styledBorderRadiusFormatted.value
        )
      } else {
        dataUrl = await getSvgString(
          qrCode as HTMLElement,
          options.value,
          styledBorderRadiusFormatted.value
        )
      }
      createZipFile(zip, dataUrl, index, format)
      numQrCodesCreated++
    }

    while (numQrCodesCreated !== filteredDataStringsFromCsv.value.length) {
      await sleep(100)
    }

    zip.generateAsync({ type: 'blob' }).then((content) => {
      const link = document.createElement('a')
      link.href = URL.createObjectURL(content)
      link.download = `qr-codes.zip`
      link.click()
      isBatchExportSuccess.value = true
    })
  } catch (error) {
    console.error('Error generating batch QR codes', error)
    isBatchExportSuccess.value = false
  } finally {
    resetBatchExportProgress()
  }
}
//#endregion
</script>

<template>
  <main>
    <div class="relative grid place-items-center bg-white p-8 md:px-6 dark:bg-zinc-900">
      <div class="w-full md:w-5/6">
        <div class="flex flex-col-reverse items-start justify-center gap-4 md:flex-row md:gap-12">
          <div
            id="main-content"
            class="sticky top-0 flex w-full shrink-0 flex-col items-center justify-center p-4 md:w-fit"
          >
            <div id="qr-code-container" ref="qrCodeContainer">
              <div
                class="grid place-items-center overflow-hidden"
                :style="[
                  style,
                  {
                    width: '200px',
                    height: '200px'
                  }
                ]"
              >
                <StyledQRCode
                  v-if="data"
                  v-bind="{ ...qrCodeProps, width: 200, height: 200 }"
                  role="img"
                  aria-label="QR code"
                />
                <p v-else>{{ t('No data!') }}</p>
              </div>
            </div>
            <div class="mt-4 flex flex-col items-center gap-2">
              <div class="flex flex-col items-center justify-center gap-3">
                <button
                  v-if="IS_COPY_IMAGE_TO_CLIPBOARD_SUPPORTED"
                  id="copy-qr-image-button"
                  class="button flex w-fit max-w-[200px] flex-row items-center gap-1"
                  @click="copyQRToClipboard"
                  :disabled="exportMode === ExportMode.Batch"
                  :title="
                    t(
                      'There are too many QR codes to be copied to the clipboard at once. Please download them as SVG or PNG instead.'
                    )
                  "
                  :aria-label="t('Copy QR Code to clipboard')"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                  >
                    <g
                      fill="none"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    >
                      <path
                        d="M8 10a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2z"
                      />
                      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
                    </g>
                  </svg>
                  <p>{{ t('Copy QR Code to clipboard') }}</p>
                </button>
                <button
                  id="save-qr-code-config-button"
                  class="button flex w-fit max-w-[200px] flex-row items-center gap-1"
                  @click="downloadQRConfig"
                  :aria-label="t('Save QR Code configuration')"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                  >
                    <g
                      fill="none"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    >
                      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                      <path
                        d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2zm-5-4v-6"
                      />
                      <path d="M9.5 14.5L12 17l2.5-2.5" />
                    </g>
                  </svg>
                  <p>{{ t('Save QR Code configuration') }}</p>
                </button>
                <button
                  id="load-qr-code-config-button"
                  class="button flex w-fit max-w-[200px] flex-row items-center gap-1"
                  @click="loadQrConfigFromFile"
                  :aria-label="t('Load QR Code configuration')"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                  >
                    <g
                      fill="none"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    >
                      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                      <path
                        d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2zm-5-10v6"
                      />
                      <path d="M9.5 13.5L12 11l2.5 2.5" />
                    </g>
                  </svg>
                  <p>{{ t('Load QR Code configuration') }}</p>
                </button>
              </div>
              <div id="export-options" class="pt-4">
                <p class="pb-2 text-zinc-900 dark:text-zinc-100">{{ t('Export as') }}</p>
                <div class="flex flex-row items-center justify-center gap-2">
                  <button
                    id="download-qr-image-button-png"
                    class="button"
                    @click="downloadQRImageAsPng"
                    :aria-label="t('Download QR Code as PNG')"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                    >
                      <g
                        fill="none"
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                      >
                        <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                        <path
                          d="M5 12V5a2 2 0 0 1 2-2h7l5 5v4m1 3h-1a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h1v-3M5 18h1.5a1.5 1.5 0 0 0 0-3H5v6m6 0v-6l3 6v-6"
                        />
                      </g>
                    </svg>
                  </button>
                  <button
                    id="download-qr-image-button-svg"
                    class="button"
                    @click="downloadQRImageAsSvg"
                    :aria-label="t('Download QR Code as SVG')"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                    >
                      <g
                        fill="none"
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                      >
                        <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                        <path
                          d="M5 12V5a2 2 0 0 1 2-2h7l5 5v4M4 20.25c0 .414.336.75.75.75H6a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1H5a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1h1.25a.75.75 0 0 1 .75.75m3-.75l2 6l2-6m6 0h-1a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h1v-3"
                        />
                      </g>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div class="mt-16 flex-1 dark:text-zinc-100">
              Forked from <a href="https://github.com/lyqht/mini-qr">Github</a>
            </div>
          </div>
          <div id="settings" class="flex w-full grow flex-col items-start gap-8 text-start">
            <div class="w-full">
              <div class="mb-2 flex items-center gap-4">
                <label for="data">
                  {{ t('Data to encode') }}
                </label>
                <div class="flex grow items-center gap-2">
                  <button
                    :class="[
                      'secondary-button',
                      { 'opacity-50': exportMode !== ExportMode.Single }
                    ]"
                    @click="exportMode = ExportMode.Single"
                  >
                    {{ $t('Single export') }}
                  </button>
                  <button
                    :class="['secondary-button', { 'opacity-50': exportMode !== ExportMode.Batch }]"
                    @click="exportMode = ExportMode.Batch"
                  >
                    {{ $t('Batch export') }}
                  </button>
                  <div
                    v-if="exportMode === ExportMode.Batch"
                    :class="[
                      'flex grow items-center justify-end',
                      dataStringsFromCsv.length > 0 && 'opacity-80'
                    ]"
                  >
                    <input
                      id="ignore-header"
                      type="checkbox"
                      class="checkbox mr-2"
                      v-model="ignoreHeaderRow"
                      @change="onCsvFileUpload($event)"
                    />
                    <label for="ignore-header" class="!text-sm !font-normal">
                      {{ $t('Ignore header row') }}
                    </label>
                  </div>
                </div>
              </div>
              <textarea
                v-if="exportMode === ExportMode.Single"
                name="data"
                class="text-input"
                id="data"
                rows="2"
                :placeholder="t('data to encode e.g. a URL or a string')"
                v-model="data"
              />
              <template v-else>
                <button
                  v-if="!csvFile"
                  class="w-full rounded-lg border-2 border-dashed border-gray-300 p-8 text-center"
                  :aria-label="t('Click to select and upload a CSV file')"
                  @click="fileInput.click()"
                  @keyup.enter="fileInput.click()"
                  @keyup.space="fileInput.click()"
                  @dragover.prevent
                  @drop.prevent="onCsvFileUpload"
                >
                  <p aria-hidden="true">
                    {{ $t('Drag and drop a CSV file here or click to select') }}
                  </p>
                  <input
                    ref="fileInput"
                    type="file"
                    accept=".csv"
                    class="hidden"
                    @change="onCsvFileUpload"
                  />
                </button>
                <div v-else-if="isValidCsv" class="p-4 text-center">
                  <div v-if="isBatchExportSuccess">
                    <p>{{ $t('QR codes have been successfully exported.') }}</p>
                    <button class="button mt-4" @click="csvFile = null">
                      {{ $t('Start new batch export') }}
                    </button>
                  </div>
                  <p v-else-if="currentExportedQrCodeIndex == null && !isExportingBatchQRs">
                    {{
                      $t('{count} piece(s) of data detected', {
                        count: filteredDataStringsFromCsv.length
                      })
                    }}
                  </p>
                  <div v-else-if="currentExportedQrCodeIndex != null">
                    <p>{{ $t('Creating QR codes... This may take a while.') }}</p>
                    <p>
                      {{
                        $t('{index} / {count} QR codes have been created.', {
                          index: currentExportedQrCodeIndex + 1,
                          count: filteredDataStringsFromCsv.length
                        })
                      }}
                    </p>
                  </div>
                </div>
                <div v-else class="p-4 text-center text-red-500">
                  <p>{{ $t('Invalid CSV') }}</p>
                </div>
              </template>
            </div>
            <fieldset class="flex-1" role="radiogroup" tabindex="0">
              <div class="flex flex-row items-center gap-2">
                <legend>{{ t('Error correction level') }}</legend>
                <a
                  href="https://docs.uniqode.com/en/articles/7219782-what-is-the-recommended-error-correction-level-for-printing-a-qr-code"
                  target="_blank"
                  class="icon-button flex flex-row items-center"
                  :aria-label="t('What is error correction level?')"
                >
                  <svg
                    class="me-1"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="#888888"
                      d="M11.95 18q.525 0 .888-.363t.362-.887t-.362-.888t-.888-.362t-.887.363t-.363.887t.363.888t.887.362m.05 4q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m0-2q3.35 0 5.675-2.325T20 12t-2.325-5.675T12 4T6.325 6.325T4 12t2.325 5.675T12 20m.1-12.3q.625 0 1.088.4t.462 1q0 .55-.337.975t-.763.8q-.575.5-1.012 1.1t-.438 1.35q0 .35.263.588t.612.237q.375 0 .638-.25t.337-.625q.1-.525.45-.937t.75-.788q.575-.55.988-1.2t.412-1.45q0-1.275-1.037-2.087T12.1 6q-.95 0-1.812.4T8.975 7.625q-.175.3-.112.638t.337.512q.35.2.725.125t.625-.425q.275-.375.688-.575t.862-.2"
                    />
                  </svg>
                  <span class="text-sm text-gray-500">{{ t('What is this?') }}</span>
                </a>
              </div>
              <div v-for="level in errorCorrectionLevels" class="radiogroup" :key="level">
                <input
                  :id="'errorCorrectionLevel-' + level"
                  type="radio"
                  v-model="errorCorrectionLevel"
                  :value="level"
                  :aria-describedby="
                    level === recommendedErrorCorrectionLevel ? 'recommended-text' : undefined
                  "
                />
                <div class="flex items-center gap-2">
                  <label :for="'errorCorrectionLevel-' + level">{{
                    t(ERROR_CORRECTION_LEVEL_LABELS[level])
                  }}</label>
                  <span
                    v-if="level === recommendedErrorCorrectionLevel"
                    class="text-sm text-gray-500"
                  >
                    <span :aria-hidden="true" class="me-1">✓</span>
                    <span id="recommended-text">
                      {{ t('Recommended') }}
                    </span>
                  </span>
                </div>
              </div>
            </fieldset>
            <div class="w-full">
              <div class="mb-2 flex flex-row items-center gap-2">
                <label for="image-url">
                  {{ t('Logo image URL') }}
                </label>
                <button class="icon-button flex flex-row items-center" @click="uploadImage">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                  >
                    <g
                      fill="none"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    >
                      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                      <path
                        d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2zm-5-10v6"
                      />
                      <path d="M9.5 13.5L12 11l2.5 2.5" />
                    </g>
                  </svg>
                  <span>{{ t('Upload image') }}</span>
                </button>
              </div>
              <textarea
                name="image-url"
                class="text-input"
                id="image-url"
                rows="1"
                :placeholder="t('Logo image URL')"
                v-model="image"
              />
            </div>
            <div class="flex flex-row items-center gap-2">
              <label for="with-background">
                {{ t('With background') }}
              </label>
              <input
                id="with-background"
                type="checkbox"
                class="checkbox"
                v-model="includeBackground"
              />
            </div>
            <div id="color-settings" :class="'flex w-full flex-row flex-wrap gap-4'">
              <div
                :inert="!includeBackground"
                :class="[!includeBackground && 'opacity-30', 'flex flex-row items-center gap-2']"
              >
                <label for="background-color">{{ t('Background color') }}</label>
                <input
                  id="background-color"
                  type="color"
                  class="color-input"
                  v-model="styleBackground"
                />
              </div>
              <div class="flex flex-row items-center gap-2">
                <label for="dots-color">{{ t('Dots color') }}</label>
                <input
                  id="dots-color"
                  type="color"
                  class="color-input"
                  v-model="dotsOptionsColor"
                />
              </div>
              <div class="flex flex-row items-center gap-2">
                <label for="corners-square-color">{{ t('Corners Square color') }}</label>
                <input
                  id="corners-square-color"
                  type="color"
                  class="color-input"
                  v-model="cornersSquareOptionsColor"
                />
              </div>
              <div class="flex flex-row items-center gap-2">
                <label for="corners-dot-color">{{ t('Corners Dot color') }}</label>
                <input
                  id="corners-dot-color"
                  type="color"
                  class="color-input"
                  v-model="cornersDotOptionsColor"
                />
              </div>
            </div>
            <div class="w-full">
              <label for="width">
                {{ t('Width (px)') }}
              </label>
              <input
                class="text-input"
                id="width"
                type="number"
                placeholder="width in pixels"
                v-model="width"
              />
            </div>
            <div class="w-full">
              <label for="height">
                {{ t('Height (px)') }}
              </label>
              <input
                class="text-input"
                id="height"
                type="number"
                placeholder="height in pixels"
                v-model="height"
              />
            </div>
            <div class="w-full">
              <label for="margin">
                {{ t('Margin (px)') }}
              </label>
              <input
                class="text-input"
                id="margin"
                type="number"
                placeholder="0"
                v-model="margin"
              />
            </div>
            <div class="w-full">
              <label for="image-margin">
                {{ t('Image margin (px)') }}
              </label>
              <input
                class="text-input"
                id="image-margin"
                type="number"
                placeholder="0"
                v-model="imageMargin"
              />
            </div>
            <div class="w-full">
              <label for="border-radius">
                {{ t('Border radius (px)') }}
              </label>
              <input
                class="text-input"
                id="border-radius"
                type="number"
                placeholder="24"
                v-model="styleBorderRadius"
              />
            </div>
            <div
              id="dots-squares-settings"
              class="mb-4 flex w-full flex-col flex-wrap gap-6 md:flex-row"
            >
              <fieldset class="flex-1" role="radiogroup" tabindex="0">
                <legend>{{ t('Dots type') }}</legend>
                <div
                  class="radiogroup"
                  v-for="type in [
                    'dots',
                    'rounded',
                    'classy',
                    'classy-rounded',
                    'square',
                    'extra-rounded'
                  ]"
                  :key="type"
                >
                  <input
                    :id="'dotsOptionsType-' + type"
                    type="radio"
                    v-model="dotsOptionsType"
                    :value="type"
                  />
                  <label :for="'dotsOptionsType-' + type">{{ t(type) }}</label>
                </div>
              </fieldset>
              <fieldset class="flex-1" role="radiogroup" tabindex="0">
                <legend>{{ t('Corners Square type') }}</legend>
                <div
                  class="radiogroup"
                  v-for="type in ['dot', 'square', 'extra-rounded']"
                  :key="type"
                >
                  <input
                    :id="'cornersSquareOptionsType-' + type"
                    type="radio"
                    v-model="cornersSquareOptionsType"
                    :value="type"
                  />
                  <label :for="'cornersSquareOptionsType-' + type">{{ t(type) }}</label>
                </div>
              </fieldset>
              <fieldset class="flex-1" role="radiogroup" tabindex="0">
                <legend>{{ t('Corners Dot type') }}</legend>
                <div class="radiogroup" v-for="type in ['dot', 'square']" :key="type">
                  <input
                    :id="'cornersDotOptionsType-' + type"
                    type="radio"
                    v-model="cornersDotOptionsType"
                    :value="type"
                  />
                  <label :for="'cornersDotOptionsType-' + type">{{ t(type) }}</label>
                </div>
              </fieldset>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style lang="postcss" scoped>
p {
  @apply !font-normal;
}

p,
label,
legend {
  @apply text-gray-700 dark:text-gray-100 text-lg font-semibold;
}

.text-input {
  @apply bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100;
  @apply shadow hover:shadow-md transition-shadow rounded-lg;
  @apply outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 dark:focus-visible:ring-zinc-200;
  @apply resize-none appearance-none ms-1 p-4 rounded w-full;
}

input[type='color'] {
  @apply outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 dark:focus-visible:ring-zinc-200;
  @apply bg-transparent shadow p-0 border rounded box-border text-zinc-700 dark:text-zinc-100 focus-visible:shadow;
}

input[type='radio'] {
  @apply outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 dark:focus-visible:ring-zinc-200;
  @apply m-3;
}

.button {
  @apply bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-200;
  @apply shadow-sm hover:shadow p-2 focus-visible:shadow-md rounded-lg;
  @apply outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 dark:focus-visible:ring-zinc-200;
}

.secondary-button {
  @apply bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100;
  @apply shadow hover:shadow-md transition-shadow rounded-lg;
  @apply outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 dark:focus-visible:ring-zinc-200;
  @apply outline-none p-1.5;
}

.icon-button {
  @apply p-1;
  @apply outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 dark:focus-visible:ring-zinc-200 hover:shadow rounded-sm;
  @apply text-zinc-900 dark:text-zinc-100 dark:bg-zinc-800;
}

.vertical-border {
  @apply h-8 bg-slate-300 dark:bg-slate-700 w-1;
}

.radiogroup {
  @apply flex flex-row items-center gap-1;
}

.radiogroup > * > label,
.radiogroup > label {
  @apply font-normal;
}
</style>
