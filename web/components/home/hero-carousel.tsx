"use client"

import Link from "@/components/i18n/link"
import { useEffect, useState } from "react"
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel"
import { ProductArt } from "@/components/product/product-art"
import type { ArtKind } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useDict } from "@/components/i18n/provider"
import { fmt } from "@/lib/i18n/config"

type Slide = {
  href: string
  art: ArtKind
  accent: string
  bg: string
}

const SLIDES: Slide[] = [
  {
    href: "/c/desktop-pc",
    art: "desktop",
    accent: "#14b8c4",
    bg: "from-slate-600 via-slate-500 to-slate-400",
  },
  {
    href: "/c/monitors",
    art: "monitor",
    accent: "#8b5cf6",
    bg: "from-[#3b3552] via-[#5b5577] to-[#8a87a3]",
  },
  {
    href: "/c/keyboards",
    art: "keyboard",
    accent: "#f97316",
    bg: "from-[#5a4a3f] via-[#857264] to-[#b3a395]",
  },
  {
    href: "/c/laptops",
    art: "laptop",
    accent: "#3b82f6",
    bg: "from-[#1e3a5f] via-[#35587e] to-[#6b8bb0]",
  },
]

const SIDE = [
  { href: "/#flash-sale", art: "headset" as ArtKind, accent: "#ef4444", bg: "bg-[#f3e8e6] dark:bg-[#2a1d1f]" },
  { href: "/c/mouse", art: "mouse" as ArtKind, accent: "#14b8c4", bg: "bg-[#e3f1f1] dark:bg-[#132a2d]" },
]

/** Compact hero: a contained slide carousel plus two promo tiles on desktop. */
export function HeroCarousel() {
  const t = useDict()
  const [api, setApi] = useState<CarouselApi>()
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    if (!api) return
    const onSelect = () => setIndex(api.selectedScrollSnap())
    api.on("select", onSelect)
    return () => {
      api.off("select", onSelect)
    }
  }, [api])

  useEffect(() => {
    if (!api || !playing || hovered) return
    const t = setInterval(() => api.scrollNext(), 5500)
    return () => clearInterval(t)
  }, [api, playing, hovered])

  return (
    <section className="container-page pt-4 sm:pt-6" aria-label={t.home.featured}>
      <div className="grid gap-3 lg:grid-cols-[1fr_300px] lg:gap-4">
        <div
          className="group/hero relative overflow-hidden rounded-2xl"
          aria-roledescription="carousel"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setHovered(true)}
          onBlur={() => setHovered(false)}
        >
          <Carousel setApi={setApi} opts={{ loop: true }}>
            <CarouselContent className="ml-0">
              {SLIDES.map((s, i) => (
                <CarouselItem
                  key={s.href}
                  className="pl-0"
                  role="group"
                  aria-roledescription="slide"
                  aria-label={fmt(t.home.slideOf, { i: i + 1, n: SLIDES.length })}
                >
                  <div className={cn("relative isolate h-[220px] overflow-hidden bg-gradient-to-br text-white sm:h-[280px] lg:h-[304px]", s.bg)}>
                    <div className="absolute inset-0 -z-10 opacity-30 [background:radial-gradient(55%_80%_at_72%_45%,white,transparent)]" />
                    <div className="relative z-10 flex h-full flex-col justify-center px-6 sm:px-10">
                      <p className="text-[10px] tracking-[0.2em] uppercase opacity-90 sm:text-xs">{t.home.slides[i].kicker}</p>
                      <h2 className="mt-2 text-4xl leading-[1.02] font-light tracking-tight sm:text-5xl lg:text-6xl">
                        <span className="block">{t.home.slides[i].title[0]}</span>
                        <span className="block pl-[0.9em]">{t.home.slides[i].title[1]}</span>
                      </h2>
                      <Link
                        href={s.href}
                        className="mt-4 inline-flex h-9 w-fit items-center gap-1.5 rounded-lg bg-white px-3.5 text-sm font-medium text-slate-900 transition-colors hover:bg-white/90 sm:mt-6 sm:h-10 sm:px-4"
                      >
                        {t.home.slides[i].cta} <ArrowRight className="size-4" />
                      </Link>
                    </div>
                    <div className="pointer-events-none absolute right-[-14%] bottom-[-10%] w-[62%] max-w-[380px] opacity-95 sm:right-[4%] sm:w-[42%]">
                      <ProductArt kind={s.art} accent={s.accent} body="#0f172a" variant={i} />
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          {/* Controls */}
          <button
            type="button"
            onClick={() => api?.scrollPrev()}
            aria-label={t.home.prevSlide}
            className="absolute top-1/2 left-3 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-slate-900 opacity-0 shadow transition-opacity group-hover/hero:opacity-100 focus-visible:opacity-100 sm:flex"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => api?.scrollNext()}
            aria-label={t.home.nextSlide}
            className="absolute top-1/2 right-3 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-slate-900 opacity-0 shadow transition-opacity group-hover/hero:opacity-100 focus-visible:opacity-100 sm:flex"
          >
            <ChevronRight className="size-5" />
          </button>
          <div className="absolute bottom-3 left-6 flex items-center gap-2 sm:left-10">
            <div className="flex gap-1.5" role="tablist" aria-label={t.home.chooseSlide}>
              {SLIDES.map((s, i) => (
                <button
                  key={s.href}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={t.home.slides[i].cta}
                  onClick={() => api?.scrollTo(i)}
                  className={cn("h-1.5 rounded-full bg-white/50 transition-all", i === index ? "w-7 bg-white" : "w-2.5 hover:bg-white/80")}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? t.home.pause : t.home.play}
              className="ml-1 inline-flex size-6 items-center justify-center rounded-full text-white/80 hover:bg-white/15 hover:text-white"
            >
              {playing ? <Pause className="size-3" /> : <Play className="size-3" />}
            </button>
          </div>
          <span className="absolute right-4 bottom-3 text-[11px] text-white/80 tabular-nums">
            {String(index + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
          </span>
        </div>

        {/* Side promos: stacked on desktop, side by side on mobile */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-4">
          {SIDE.map((p, i) => (
            <Link
              key={p.href}
              href={p.href}
              className={cn("group relative flex h-[120px] overflow-hidden rounded-2xl p-4 sm:h-[136px] lg:h-[144px] lg:p-5", p.bg)}
            >
              <div className="relative z-10">
                <p className="text-[10px] font-medium tracking-wider text-primary uppercase">{t.home.side[i].kicker}</p>
                <p className="mt-1 max-w-[9rem] text-base leading-tight font-medium sm:text-lg">{t.home.side[i].title}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground transition-all group-hover:gap-1.5 group-hover:text-foreground">
                  {t.home.shopNow} <ArrowRight className="size-3" />
                </span>
              </div>
              <div className="absolute right-[-8%] bottom-[-14%] w-[52%] max-w-[150px] transition-transform duration-500 group-hover:scale-105">
                <ProductArt kind={p.art} accent={p.accent} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
