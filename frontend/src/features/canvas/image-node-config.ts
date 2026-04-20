export type ImageModelVersion = {
  value: string
  label: string
  available: boolean
}

export type ImageModelOption = {
  value: string
  label: string
  available: boolean
  versions: ImageModelVersion[]
}

export type ImageRatioOption = {
  value: string
  label: string
  available: boolean
}

export const IMAGE_MODEL_OPTIONS: ImageModelOption[] = [
  {
    value: 'nano-banana',
    label: 'Nano-banana',
    available: true,
    versions: [
      { value: 'nano-banana-v1', label: 'V1', available: true },
      { value: 'nano-banana-v2', label: 'V2', available: true },
    ],
  },
  {
    value: 'midjourney',
    label: 'Midjourney',
    available: false,
    versions: [{ value: 'midjourney-v7', label: 'V7', available: false }],
  },
  {
    value: 'flux',
    label: 'FLUX',
    available: false,
    versions: [
      { value: 'flux-pro', label: 'Pro', available: false },
      { value: 'flux-ultra', label: 'Ultra', available: false },
    ],
  },
  {
    value: 'gpt-image',
    label: 'GPT',
    available: false,
    versions: [{ value: 'gpt-image-1', label: 'Image-1', available: false }],
  },
  {
    value: 'jimeng',
    label: '即梦',
    available: false,
    versions: [{ value: 'jimeng-v3', label: 'V3', available: false }],
  },
]

export const IMAGE_RATIO_OPTIONS: ImageRatioOption[] = [
  { value: '1:1', label: '1:1', available: true },
  { value: '4:3', label: '4:3', available: true },
  { value: '3:4', label: '3:4', available: true },
  { value: '16:9', label: '16:9', available: true },
  { value: '9:16', label: '9:16', available: true },
]

export const IMAGE_EDIT_MODE_OPTIONS = [
  { value: 'generate', labelZh: '生成', labelEn: 'Generate' },
  { value: 'expand', labelZh: '扩图', labelEn: 'Expand' },
  { value: 'repaint', labelZh: '重绘', labelEn: 'Repaint' },
  { value: 'split', labelZh: '拆分', labelEn: 'Split' },
] as const

export function getDefaultImageModel() {
  return IMAGE_MODEL_OPTIONS.find((item) => item.available) ?? IMAGE_MODEL_OPTIONS[0]
}

export function getImageModel(value?: string | null) {
  return IMAGE_MODEL_OPTIONS.find((item) => item.value === value) ?? getDefaultImageModel()
}

export function getImageVersion(modelValue?: string | null, versionValue?: string | null) {
  const model = getImageModel(modelValue)
  return model.versions.find((item) => item.value === versionValue) ?? model.versions[0]
}

export function ensureImageSettings(settings?: Record<string, string> | null) {
  const model = getImageModel(settings?.imageModel)
  const version = getImageVersion(model.value, settings?.imageModelVersion)
  const ratio =
    IMAGE_RATIO_OPTIONS.find((item) => item.value === settings?.imageRatio) ?? IMAGE_RATIO_OPTIONS.find((item) => item.value === '4:3')

  return {
    imageModel: model.value,
    imageModelVersion: version?.value ?? '',
    imageRatio: ratio?.value ?? '4:3',
    imageEditMode: settings?.imageEditMode ?? 'generate',
    quickSplit: settings?.quickSplit ?? '2x2',
  }
}

export function getImageModelLabel(value?: string | null) {
  return getImageModel(value).label
}

export function getImageVersionLabel(modelValue?: string | null, versionValue?: string | null) {
  return getImageVersion(modelValue, versionValue)?.label ?? 'V1'
}

export function getImageRatioLabel(value?: string | null) {
  return IMAGE_RATIO_OPTIONS.find((item) => item.value === value)?.label ?? '4:3'
}
