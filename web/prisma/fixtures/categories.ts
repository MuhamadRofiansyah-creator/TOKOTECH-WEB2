import type { Category } from "@/lib/types"

type CategoryInput = Omit<Category, "position" | "parentId">

const input: CategoryInput[] = [
  {
    id: "c-desktop",
    slug: "desktop-pc",
    name: "Desktop PC",
    tagline: "Gaming rigs & workstations",
    description: "Prebuilt gaming PCs, creator workstations and compact office desktops.",
    art: "desktop",
    heroTitle: "Built to\nPerform",
    heroSubtitle: "Prebuilt rigs tuned and tested",
    facets: [
      { key: "useCase", label: "Use case", type: "chips", order: ["Gaming", "Creator", "Office"] },
      { key: "cpu", label: "Processor", type: "checkbox" },
      { key: "gpu", label: "Graphics", type: "checkbox" },
      { key: "ram", label: "Memory", type: "chips", order: ["8GB", "16GB", "32GB", "64GB"] },
      { key: "storage", label: "Storage", type: "chips", order: ["512GB", "1TB", "2TB"] },
    ],
  },
  {
    id: "c-laptop",
    slug: "laptops",
    name: "Laptops",
    tagline: "Power that travels",
    description: "Gaming laptops, ultrabooks and business notebooks.",
    art: "laptop",
    heroTitle: "Power\nThat Travels",
    heroSubtitle: "Thin, light and seriously fast",
    facets: [
      { key: "screen", label: "Screen size", type: "chips", order: ['13"', '14"', '15.6"', '16"', '17"'] },
      { key: "cpu", label: "Processor", type: "checkbox" },
      { key: "gpu", label: "Graphics", type: "checkbox" },
      { key: "ram", label: "Memory", type: "chips", order: ["8GB", "16GB", "32GB"] },
      { key: "storage", label: "Storage", type: "chips", order: ["512GB", "1TB", "2TB"] },
    ],
  },
  {
    id: "c-monitor",
    slug: "monitors",
    name: "Monitors",
    tagline: "See every frame",
    description: "High refresh gaming monitors, 4K creator displays and ultrawides.",
    art: "monitor",
    heroTitle: "See Every\nFrame",
    heroSubtitle: "Up to 360Hz. Down to 0.03ms.",
    facets: [
      { key: "size", label: "Screen size", type: "chips", order: ['24"', '27"', '32"', '34"', '49"'] },
      { key: "resolution", label: "Resolution", type: "checkbox", order: ["FHD 1080p", "QHD 1440p", "UWQHD", "4K UHD", "DQHD"] },
      { key: "refresh", label: "Refresh rate", type: "chips", order: ["60Hz", "75Hz", "144Hz", "165Hz", "240Hz", "360Hz"] },
      { key: "panel", label: "Panel type", type: "chips", order: ["IPS", "VA", "OLED"] },
    ],
  },
  {
    id: "c-keyboard",
    slug: "keyboards",
    name: "Keyboards",
    tagline: "Every keystroke counts",
    description: "Mechanical, low-profile and wireless keyboards for work and play.",
    art: "keyboard",
    heroTitle: "Every\nKeystroke",
    heroSubtitle: "Mechanical feel, your way",
    facets: [
      { key: "layout", label: "Layout", type: "chips", order: ["Full", "TKL", "75%", "65%", "60%"] },
      { key: "switch", label: "Switch type", type: "checkbox" },
      { key: "connectivity", label: "Connectivity", type: "checkbox", order: ["Wired", "Wireless", "Tri-mode"] },
    ],
  },
  {
    id: "c-mouse",
    slug: "mouse",
    name: "Mouse",
    tagline: "Precision in your palm",
    description: "Ultralight esports mouse, ergonomic productivity mouse and more.",
    art: "mouse",
    heroTitle: "Precision\nIn Your Palm",
    heroSubtitle: "Ultralight. Ultra fast.",
    facets: [
      { key: "connectivity", label: "Connectivity", type: "checkbox", order: ["Wired", "Wireless"] },
      { key: "weight", label: "Weight", type: "chips", order: ["< 60g", "60–80g", "80–100g", "> 100g"] },
      { key: "dpi", label: "Max DPI", type: "chips", order: ["8K", "16K", "26K", "30K+"] },
    ],
  },
  {
    id: "c-headset",
    slug: "headsets",
    name: "Headsets",
    tagline: "Hear them first",
    description: "Gaming headsets and studio-grade headphones.",
    art: "headset",
    heroTitle: "Hear\nThem First",
    heroSubtitle: "Spatial audio for every footstep",
    facets: [
      { key: "connectivity", label: "Connectivity", type: "checkbox", order: ["Wired", "Wireless"] },
      { key: "surround", label: "Audio", type: "chips", order: ["Stereo", "7.1 Surround", "Spatial"] },
    ],
  },
  {
    id: "c-components",
    slug: "components",
    name: "Components",
    tagline: "Upgrade your build",
    description: "Graphics cards and the parts to build your own PC.",
    art: "gpu",
    heroTitle: "Upgrade\nYour Build",
    heroSubtitle: "Next-gen graphics, in stock",
    facets: [
      { key: "type", label: "Type", type: "chips" },
      { key: "memory", label: "Memory", type: "chips", order: ["8GB", "12GB", "16GB", "24GB", "32GB"] },
    ],
  },
]

// Flat tree for now (parentId null); position follows the menu order.
export const categories: Category[] = input.map((c, i) => ({ ...c, position: i, parentId: null }))

export const categoryBySlug = new Map(categories.map((c) => [c.slug, c]))
export const categoryById = new Map(categories.map((c) => [c.id, c]))
