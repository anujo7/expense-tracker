import { useState, useEffect, useMemo } from 'react'
import { Wallet } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'

declare global {
  interface Window {
    UnicornStudio?: { isInitialized: boolean; init: () => void }
  }
}

const barHeights = [7, 12, 5, 14, 8, 10, 6, 16]

export function AuthForm() {
  const { signIn, signUp } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const dots = useMemo(() => Array.from({ length: 40 }), [])

  useEffect(() => {
    const embedScript = document.createElement('script')
    embedScript.type = 'text/javascript'
    embedScript.textContent = `
      !function(){
        if(!window.UnicornStudio){
          window.UnicornStudio={isInitialized:!1};
          var i=document.createElement("script");
          i.src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.33/dist/unicornStudio.umd.js";
          i.onload=function(){
            window.UnicornStudio.isInitialized||(UnicornStudio.init(),window.UnicornStudio.isInitialized=!0)
          };
          (document.head || document.body).appendChild(i)
        }
      }();
    `
    document.head.appendChild(embedScript)

    const style = document.createElement('style')
    style.textContent = `
      [data-us-project] {
        position: relative !important;
        overflow: hidden !important;
      }
      [data-us-project] canvas {
        clip-path: inset(0 0 10% 0) !important;
      }
      [data-us-project] * {
        pointer-events: none !important;
      }
      [data-us-project] a[href*="unicorn"],
      [data-us-project] button[title*="unicorn"],
      [data-us-project] div[title*="Made with"],
      [data-us-project] .unicorn-brand,
      [data-us-project] [class*="brand"],
      [data-us-project] [class*="credit"],
      [data-us-project] [class*="watermark"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        position: absolute !important;
        left: -9999px !important;
        top: -9999px !important;
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
          radial-gradient(1.5px 1.5px at 75% 50%, rgba(255,255,255,0.6), transparent);
        background-size: 200px 200px, 250px 250px, 180px 180px, 220px 220px, 190px 190px, 240px 240px, 210px 210px, 230px 230px, 260px 260px, 170px 170px, 200px 200px, 240px 240px;
        opacity: 0.5;
      }
      .dither-pattern {
        background-image:
          repeating-linear-gradient(0deg, transparent 0px, transparent 1px, white 1px, white 2px),
          repeating-linear-gradient(90deg, transparent 0px, transparent 1px, white 1px, white 2px);
        background-size: 3px 3px;
      }
    `
    document.head.appendChild(style)

    const hideBranding = () => {
      document.querySelectorAll('[data-us-project] *').forEach(el => {
        const text = (el.textContent || '').toLowerCase()
        const title = (el.getAttribute('title') || '').toLowerCase()
        const href = (el.getAttribute('href') || '').toLowerCase()
        if (
          text.includes('made with') ||
          text.includes('unicorn') ||
          title.includes('unicorn') ||
          href.includes('unicorn.studio')
        ) {
          try { el.remove() } catch {}
        }
      })
    }

    hideBranding()
    const interval = setInterval(hideBranding, 100)
    const timeouts = [500, 1000, 2000, 5000].map(ms => setTimeout(hideBranding, ms))

    return () => {
      clearInterval(interval)
      timeouts.forEach(clearTimeout)
      document.head.removeChild(embedScript)
      document.head.removeChild(style)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please fill in all fields')
      return
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password)

    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else if (isSignUp) {
      toast.success('Account created! Check your email to confirm.')
    }
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* UnicornStudio canvas animation — desktop */}
      <div className="absolute inset-0 w-full h-full hidden lg:block">
        <div
          data-us-project="OMzqyUv6M3kSnv0JeAtC"
          style={{ width: '100%', height: '100%', minHeight: '100vh' }}
        />
      </div>

      {/* Stars fallback — mobile */}
      <div className="absolute inset-0 w-full h-full lg:hidden stars-bg" />

      {/* Subtle violet ambient glow blended over the animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] right-[5%] w-[500px] h-[500px] bg-violet-500/[0.04] rounded-full mix-blend-normal blur-[150px] animate-pulse" />
        <div className="absolute bottom-[15%] left-[10%] w-[400px] h-[400px] bg-indigo-500/[0.03] rounded-full mix-blend-normal blur-[120px] animate-pulse" style={{ animationDelay: '700ms' }} />
      </div>

      {/* Corner Frame Accents */}
      <div className="absolute top-0 left-0 w-8 h-8 lg:w-12 lg:h-12 border-t-2 border-l-2 border-white/30 z-20" />
      <div className="absolute top-0 right-0 w-8 h-8 lg:w-12 lg:h-12 border-t-2 border-r-2 border-white/30 z-20" />
      <div className="absolute left-0 w-8 h-8 lg:w-12 lg:h-12 border-b-2 border-l-2 border-white/30 z-20" style={{ bottom: '5vh' }} />
      <div className="absolute right-0 w-8 h-8 lg:w-12 lg:h-12 border-b-2 border-r-2 border-white/30 z-20" style={{ bottom: '5vh' }} />

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

      {/* Main content layer */}
      <div className="relative z-10 flex min-h-screen items-center pt-16 lg:pt-0" style={{ marginBottom: '5vh' }}>
        {/* Left side — hero text overlaying the animation */}
        <div className="hidden lg:flex w-1/2 px-8 xl:px-16 items-end pb-[12vh]">
          <motion.div
            className="max-w-lg"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-3 opacity-60">
              <div className="w-8 h-px bg-white" />
              <span className="text-white text-[10px] font-mono tracking-wider">∞</span>
              <div className="flex-1 h-px bg-white" />
            </div>

            <div className="relative">
              <div className="absolute -right-3 top-0 bottom-0 w-1 dither-pattern opacity-40" />
              <h1 className="text-5xl xl:text-6xl font-bold text-white mb-4 leading-[1.1] font-mono tracking-wider" style={{ letterSpacing: '0.1em' }}>
                EVERY RUPEE<br />ACCOUNTED
              </h1>
            </div>

            <div className="flex gap-1 mb-3 opacity-40">
              {dots.map((_, i) => (
                <div key={i} className="w-0.5 h-0.5 bg-white rounded-full" />
              ))}
            </div>

            <p className="text-base text-gray-300 leading-relaxed font-mono opacity-80">
              Track expenses with precision. Analyze patterns.
              <br />Take control — one transaction at a time.
            </p>

            <div className="flex items-center gap-2 mt-6 opacity-40">
              <span className="text-white text-[9px] font-mono">∞</span>
              <div className="flex-1 h-px bg-white" />
              <span className="text-white text-[9px] font-mono">EXPENSE.PROTOCOL</span>
            </div>
          </motion.div>
        </div>

        {/* Right side — login form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-6 lg:px-12 xl:px-16">
          <motion.div
            className="w-full max-w-sm space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="text-center">
              <motion.div
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/15 border border-violet-500/20 mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
              >
                <Wallet size={32} className="text-violet-400" />
              </motion.div>
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white/90 to-white/50">
                Expense Tracker
              </h2>
              <p className="text-sm text-white/30 mt-1">
                {isSignUp ? 'Create your account' : 'Sign in to your account'}
              </p>
            </div>

            <motion.div
              className="backdrop-blur-2xl bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 shadow-2xl shadow-black/50"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.5 }}
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                />
                <Button type="submit" loading={loading} className="w-full" size="lg">
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </Button>
              </form>
            </motion.div>

            <p className="text-center text-sm text-white/30">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-violet-400 hover:text-violet-300 transition-colors font-medium"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </motion.div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="absolute left-0 right-0 z-20 border-t border-white/20 bg-black/40 backdrop-blur-sm" style={{ bottom: '5vh' }}>
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
