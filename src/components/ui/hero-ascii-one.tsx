import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'

function SisyphusIllustration() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg
        viewBox="0 0 500 650"
        className="w-full h-full max-w-[420px] max-h-[560px]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="halftone" patternUnits="userSpaceOnUse" width="4" height="4">
            <circle cx="2" cy="2" r="1" fill="white" opacity="0.6" />
          </pattern>
          <pattern id="halftone-dense" patternUnits="userSpaceOnUse" width="3" height="3">
            <circle cx="1.5" cy="1.5" r="1" fill="white" opacity="0.5" />
          </pattern>
          <mask id="boulder-mask">
            <circle cx="270" cy="160" r="130" fill="white" />
          </mask>
          <mask id="figure-mask">
            <path d="M180 380 C180 340 200 310 220 290 L240 270 C250 260 255 250 250 240 L245 230 C240 220 230 215 225 220 L200 250 C190 262 175 270 165 285 L150 310 C140 328 135 350 140 370 L145 400 C148 420 155 440 150 460 L140 510 C135 530 140 545 155 550 L175 555 C185 558 192 550 190 540 L185 500 C182 475 190 455 200 440 L215 420 C222 410 225 395 220 385 L210 395 C200 408 185 405 180 395 Z M250 240 C255 235 265 230 275 235 L285 242 C292 248 295 260 290 270 L280 290 C275 300 265 305 255 310 L240 320 C230 328 220 338 215 350 L210 365 C205 380 210 395 220 385 L230 370 C240 358 255 345 265 330 L280 310 C290 295 295 278 290 260 Z M155 550 L145 580 C140 600 148 620 165 618 L178 615 M190 540 L200 575 C205 595 198 615 185 618" stroke="url(#halftone)" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round" />
          </mask>
          <radialGradient id="boulder-gradient" cx="40%" cy="35%">
            <stop offset="0%" stopColor="white" stopOpacity="0.15" />
            <stop offset="60%" stopColor="white" stopOpacity="0.06" />
            <stop offset="100%" stopColor="white" stopOpacity="0.02" />
          </radialGradient>
        </defs>

        {/* Grid frame */}
        <motion.rect
          x="100" y="220" width="300" height="380"
          stroke="white" strokeOpacity="0.12" strokeWidth="1" fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2, delay: 0.5 }}
        />
        {/* Horizontal grid line */}
        <motion.line
          x1="100" y1="220" x2="400" y2="220"
          stroke="white" strokeOpacity="0.15" strokeWidth="0.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, delay: 0.8 }}
        />
        {/* Vertical grid line */}
        <motion.line
          x1="340" y1="220" x2="340" y2="600"
          stroke="white" strokeOpacity="0.1" strokeWidth="0.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, delay: 1 }}
        />

        {/* Boulder — large circle with halftone fill */}
        <motion.circle
          cx="270" cy="160" r="130"
          fill="url(#boulder-gradient)"
          stroke="white" strokeOpacity="0.2" strokeWidth="1"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
        {/* Boulder halftone dot overlay */}
        <circle cx="270" cy="160" r="128" fill="url(#halftone-dense)" mask="url(#boulder-mask)" />

        {/* Rotating orbital ellipse — the key animated element */}
        <motion.g
          style={{ originX: '270px', originY: '160px' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        >
          <ellipse
            cx="270" cy="160" rx="155" ry="60"
            stroke="white" strokeOpacity="0.2" strokeWidth="0.8" fill="none"
            transform="rotate(-25 270 160)"
          />
        </motion.g>

        {/* Second orbital — slower, opposite tilt */}
        <motion.g
          style={{ originX: '270px', originY: '160px' }}
          animate={{ rotate: -360 }}
          transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
        >
          <ellipse
            cx="270" cy="160" rx="145" ry="45"
            stroke="white" strokeOpacity="0.08" strokeWidth="0.5" fill="none"
            transform="rotate(40 270 160)"
          />
        </motion.g>

        {/* Figure body — stylized Sisyphus/Atlas pushing the boulder */}
        <motion.g
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          {/* Torso */}
          <path
            d="M205 290 C215 275 230 265 240 255 L248 245 C252 240 250 232 244 228 C238 224 230 228 226 234 L200 268 C188 282 178 298 172 315 L160 350 C155 368 158 388 165 400"
            stroke="url(#halftone)" strokeWidth="28" strokeLinecap="round" fill="none"
          />
          {/* Arms pushing up */}
          <path
            d="M244 228 C255 222 268 225 275 235 L282 248 C288 260 285 275 278 285 L260 310 C250 325 238 335 228 348"
            stroke="url(#halftone)" strokeWidth="22" strokeLinecap="round" fill="none"
          />
          {/* Left leg */}
          <path
            d="M165 400 L155 440 C150 458 145 478 148 498 L152 530 C154 545 160 555 170 558"
            stroke="url(#halftone)" strokeWidth="24" strokeLinecap="round" fill="none"
          />
          {/* Right leg */}
          <path
            d="M185 395 L198 430 C205 450 208 472 205 492 L200 530 C198 548 192 558 185 560"
            stroke="url(#halftone)" strokeWidth="24" strokeLinecap="round" fill="none"
          />
          {/* Head */}
          <circle cx="235" cy="218" r="14" fill="url(#halftone-dense)" stroke="white" strokeOpacity="0.15" strokeWidth="0.5" />
          {/* Feet */}
          <path d="M170 558 L155 570 C148 575 150 582 158 582 L175 578" stroke="url(#halftone)" strokeWidth="12" strokeLinecap="round" fill="none" />
          <path d="M185 560 L195 572 C200 578 196 584 188 582 L178 578" stroke="url(#halftone)" strokeWidth="12" strokeLinecap="round" fill="none" />
        </motion.g>

        {/* Golden ratio circle — bottom right */}
        <motion.g
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
        >
          <circle cx="365" cy="530" r="40" stroke="white" strokeOpacity="0.15" strokeWidth="0.8" fill="none" />
          <circle cx="365" cy="530" r="25" stroke="white" strokeOpacity="0.1" strokeWidth="0.5" fill="none" />
          {/* Crosshair */}
          <line x1="345" y1="530" x2="385" y2="530" stroke="white" strokeOpacity="0.12" strokeWidth="0.5" />
          <line x1="365" y1="510" x2="365" y2="550" stroke="white" strokeOpacity="0.12" strokeWidth="0.5" />
          {/* Hash marks */}
          <line x1="355" y1="525" x2="355" y2="535" stroke="white" strokeOpacity="0.1" strokeWidth="0.5" />
          <line x1="375" y1="525" x2="375" y2="535" stroke="white" strokeOpacity="0.1" strokeWidth="0.5" />
          <line x1="360" y1="520" x2="370" y2="520" stroke="white" strokeOpacity="0.1" strokeWidth="0.5" />
          <line x1="360" y1="540" x2="370" y2="540" stroke="white" strokeOpacity="0.1" strokeWidth="0.5" />
        </motion.g>

        {/* Small rotating accent circle on the boulder */}
        <motion.g
          style={{ originX: '270px', originY: '160px' }}
          animate={{ rotate: -360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        >
          <circle cx="400" cy="160" r="3" fill="white" fillOpacity="0.3" />
        </motion.g>

        {/* Fibonacci spiral hint */}
        <motion.path
          d="M365 530 C365 510 350 495 330 495 C310 495 295 510 295 530 C295 560 320 580 350 580"
          stroke="white" strokeOpacity="0.08" strokeWidth="0.5" fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, delay: 2 }}
        />
      </svg>
    </div>
  )
}

const barHeights = [7, 12, 5, 14, 8, 10, 6, 16]

export default function HeroAsciiOne() {
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      .dither-pattern {
        background-image:
          repeating-linear-gradient(0deg, transparent 0px, transparent 1px, white 1px, white 2px),
          repeating-linear-gradient(90deg, transparent 0px, transparent 1px, white 1px, white 2px);
        background-size: 3px 3px;
      }
      .stars-bg {
        background-image:
          radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.8), transparent),
          radial-gradient(1px 1px at 25% 45%, rgba(255,255,255,0.6), transparent),
          radial-gradient(1px 1px at 40% 15%, rgba(255,255,255,0.5), transparent),
          radial-gradient(1px 1px at 55% 65%, rgba(255,255,255,0.7), transparent),
          radial-gradient(1px 1px at 70% 30%, rgba(255,255,255,0.4), transparent),
          radial-gradient(1px 1px at 85% 75%, rgba(255,255,255,0.6), transparent),
          radial-gradient(1px 1px at 15% 80%, rgba(255,255,255,0.5), transparent),
          radial-gradient(1px 1px at 60% 90%, rgba(255,255,255,0.3), transparent),
          radial-gradient(1.5px 1.5px at 30% 60%, rgba(255,255,255,0.7), transparent),
          radial-gradient(1px 1px at 90% 10%, rgba(255,255,255,0.5), transparent),
          radial-gradient(1px 1px at 5% 55%, rgba(255,255,255,0.4), transparent),
          radial-gradient(1.5px 1.5px at 75% 50%, rgba(255,255,255,0.6), transparent),
          radial-gradient(1px 1px at 45% 35%, rgba(255,255,255,0.3), transparent),
          radial-gradient(1px 1px at 95% 45%, rgba(255,255,255,0.5), transparent),
          radial-gradient(1px 1px at 20% 95%, rgba(255,255,255,0.4), transparent),
          radial-gradient(1px 1px at 50% 5%, rgba(255,255,255,0.6), transparent);
        background-size: 200px 200px, 250px 250px, 180px 180px, 220px 220px, 190px 190px, 240px 240px, 210px 210px, 230px 230px, 260px 260px, 170px 170px, 200px 200px, 240px 240px, 180px 180px, 220px 220px, 250px 250px, 190px 190px;
        opacity: 0.5;
      }
    `
    document.head.appendChild(style)
    return () => { document.head.removeChild(style) }
  }, [])

  const dots = useMemo(() => Array.from({ length: 40 }), [])

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-black">
      {/* Stars background */}
      <div className="absolute inset-0 w-full h-full stars-bg" />

      {/* Top Header */}
      <div className="absolute top-0 left-0 right-0 z-20 border-b border-white/20">
        <div className="container mx-auto px-4 lg:px-8 py-3 lg:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 lg:gap-4">
            <div className="font-mono text-white text-xl lg:text-2xl font-bold tracking-widest italic transform -skew-x-12">
              XPNSE
            </div>
            <div className="h-3 lg:h-4 w-px bg-white/40" />
            <span className="text-white/60 text-[8px] lg:text-[10px] font-mono">EST. 2025</span>
          </div>
          <div className="hidden lg:flex items-center gap-3 text-[10px] font-mono text-white/60">
            <span>TRACK</span>
            <div className="w-1 h-1 bg-white/40 rounded-full" />
            <span>ANALYZE</span>
            <div className="w-1 h-1 bg-white/40 rounded-full" />
            <span>OPTIMIZE</span>
          </div>
        </div>
      </div>

      {/* Corner Frame Accents */}
      <div className="absolute top-0 left-0 w-8 h-8 lg:w-12 lg:h-12 border-t-2 border-l-2 border-white/30 z-20" />
      <div className="absolute top-0 right-0 w-8 h-8 lg:w-12 lg:h-12 border-t-2 border-r-2 border-white/30 z-20" />
      <div className="absolute bottom-0 left-0 w-8 h-8 lg:w-12 lg:h-12 border-b-2 border-l-2 border-white/30 z-20" />
      <div className="absolute bottom-0 right-0 w-8 h-8 lg:w-12 lg:h-12 border-b-2 border-r-2 border-white/30 z-20" />

      {/* Main content — illustration + text */}
      <div className="relative z-10 flex h-full items-center">
        <div className="w-full px-6 lg:px-12 flex flex-col items-center">
          {/* Sisyphus illustration with animated circles */}
          <motion.div
            className="w-full max-w-[380px] aspect-[5/7] mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
          >
            <SisyphusIllustration />
          </motion.div>

          {/* Text content below */}
          <div className="max-w-md w-full">
            <div className="flex items-center gap-2 mb-3 opacity-60">
              <div className="w-8 h-px bg-white" />
              <span className="text-white text-[10px] font-mono tracking-wider">∞</span>
              <div className="flex-1 h-px bg-white" />
            </div>

            <div className="relative">
              <div className="hidden lg:block absolute -right-3 top-0 bottom-0 w-1 dither-pattern opacity-40" />
              <h1 className="text-2xl lg:text-4xl font-bold text-white mb-3 leading-tight font-mono tracking-wider" style={{ letterSpacing: '0.1em' }}>
                EVERY RUPEE<br />ACCOUNTED
              </h1>
            </div>

            <div className="hidden lg:flex gap-1 mb-3 opacity-40">
              {dots.map((_, i) => (
                <div key={i} className="w-0.5 h-0.5 bg-white rounded-full" />
              ))}
            </div>

            <p className="text-xs lg:text-sm text-gray-300 leading-relaxed font-mono opacity-70">
              Track expenses with precision. Analyze patterns. Take control — one transaction at a time.
            </p>

            <div className="hidden lg:flex items-center gap-2 mt-5 opacity-40">
              <span className="text-white text-[9px] font-mono">∞</span>
              <div className="flex-1 h-px bg-white" />
              <span className="text-white text-[9px] font-mono">EXPENSE.PROTOCOL</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="absolute left-0 right-0 bottom-0 z-20 border-t border-white/20 bg-black/40 backdrop-blur-sm">
        <div className="container mx-auto px-4 lg:px-8 py-2 lg:py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 lg:gap-6 text-[8px] lg:text-[9px] font-mono text-white/50">
            <span className="hidden lg:inline">SYSTEM.ACTIVE</span>
            <span className="lg:hidden">SYS.ACT</span>
            <div className="hidden lg:flex gap-1">
              {barHeights.map((h, i) => (
                <div key={i} className="w-1 bg-white/30" style={{ height: `${h}px` }} />
              ))}
            </div>
            <span>V1.0.0</span>
          </div>
          <div className="flex items-center gap-2 lg:gap-4 text-[8px] lg:text-[9px] font-mono text-white/50">
            <span className="hidden lg:inline">◐ RENDERING</span>
            <div className="flex gap-1">
              <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse" />
              <div className="w-1 h-1 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
              <div className="w-1 h-1 bg-white/20 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
            <span className="hidden lg:inline">FRAME: ∞</span>
          </div>
        </div>
      </div>
    </div>
  )
}
