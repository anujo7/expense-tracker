import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'

export function AuthForm() {
  const { signIn, signUp } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

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
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full mix-blend-normal blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-normal blur-[128px] animate-pulse" style={{ animationDelay: '700ms' }} />
      </div>

      <motion.div
        className="w-full max-w-sm space-y-8 relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/15 mb-4">
            <Wallet size={32} className="text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white/90 to-white/50">
            Expense Tracker
          </h1>
          <p className="text-sm text-white/30 mt-1">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>

        <motion.div
          className="backdrop-blur-2xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6"
          initial={{ scale: 0.98 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
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
  )
}
