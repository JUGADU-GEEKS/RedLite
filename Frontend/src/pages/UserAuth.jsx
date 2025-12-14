import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, User, Phone, Car, MapPin, ArrowLeft } from 'lucide-react'
import { login as authLogin, signup as authSignup } from '../services/auth'

const Input = ({ icon: Icon, ...props }) => (
  <div className="relative">
    {Icon && <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />}
    <input className="w-full pl-12 pr-4 py-4 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300" {...props} />
  </div>
)

export default function UserAuth() {
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)

  // login
  const [identifier, setIdentifier] = useState('')
  const [pwd, setPwd] = useState('')
  const [loginError, setLoginError] = useState('')

  // signup
  const [fullName, setFullName] = useState('')
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [vehicle, setVehicle] = useState('')
  const [chassisLast4, setChassisLast4] = useState('')
  const [city, setCity] = useState('')
  const [signupError, setSignupError] = useState('')

  const validateSignup = () => {
    if (!fullName.trim() || !mobile.trim() || !email.trim() || !password.trim() || !vehicle.trim() || !chassisLast4.trim()) {
      setSignupError('All fields except City/District are required.')
      return false
    }
    if (chassisLast4.trim().length !== 4) {
      setSignupError('Last 4 digits must be exactly 4 characters.')
      return false
    }
    setSignupError('')
    return true
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    if (!validateSignup()) return
    setLoading(true)
    try {
      // Always register as a normal user from this route
      const payload = { name: fullName, email, password, mobile, role: 'user' }

      await authSignup(payload)
      setSignupError('')
      setMode('login')
    } catch (err) {
      setSignupError(err.message || 'Signup failed')
    } finally { setLoading(false) }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    if (!identifier.trim() || !pwd.trim()) {
      setLoginError('Mobile/Email and Password required')
      return
    }
    setLoading(true)
    try {
      await authLogin(identifier, pwd)
      // If a redirect was provided (e.g., from the role-selection page), use it
      const redirectTo = location.state && location.state.redirectTo ? location.state.redirectTo : '/home'
      navigate(redirectTo)
    } catch (err) {
      setLoginError(err.message || 'Invalid credentials')
    } finally { setLoading(false) }
  }

  const handleBack = () => navigate('/')

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 w-96 h-96 bg-gradient-to-br from-amber-200/20 to-orange-200/20 rounded-full blur-3xl"></div>
        <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-br from-yellow-200/20 to-amber-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-1/4 w-72 h-72 bg-gradient-to-br from-orange-200/20 to-red-200/20 rounded-full blur-3xl"></div>
      </div>

      <motion.button onClick={handleBack} className="absolute top-8 left-8 z-20 flex items-center space-x-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-xl hover:bg-white/80 transition-all duration-300 text-gray-700 font-medium">
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </motion.button>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full mx-auto">
          <motion.div className="text-center mb-8" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="bg-white/30 backdrop-blur-sm rounded-2xl p-6 border border-white/40">
              <h3 className="font-semibold text-gray-700 mb-2">Citizen Access</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Signup or login to report emergencies and request assistance.</p>
            </div>
          </motion.div>

          <motion.div className="bg-white/40 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 p-8 md:p-10" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}>
            <div className="flex items-center justify-center mb-6">
              <button onClick={() => setMode('login')} className={`px-6 py-2 rounded-full font-semibold ${mode==='login' ? 'bg-amber-500 text-white' : 'bg-white text-gray-700 border'}`}>Login</button>
              <button onClick={() => setMode('signup')} className={`ml-4 px-6 py-2 rounded-full font-semibold ${mode==='signup' ? 'bg-amber-500 text-white' : 'bg-white text-gray-700 border'}`}>Signup</button>
            </div>

            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Mobile or Email</label>
                  <Input icon={Mail} type="text" value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder="+919876543210 or you@example.com" />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Password</label>
                  <Input icon={Lock} type="password" value={pwd} onChange={e=>setPwd(e.target.value)} placeholder="Enter your password" />
                </div>
                {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
                <button type="submit" disabled={loading} className={`w-full px-8 py-4 rounded-2xl font-semibold shadow-2xl transition-all duration-300 border border-white/20 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white hover:shadow-orange-500/40 transform hover:scale-[1.02]'}`}>{loading ? 'Please wait...' : 'Login →'}</button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Full Name</label>
                  <Input icon={User} type="text" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="As on your ID" />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Mobile Number</label>
                  <Input icon={Phone} type="text" value={mobile} onChange={e=>setMobile(e.target.value)} placeholder="e.g., +919876543210" />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Email ID</label>
                  <Input icon={Mail} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Password</label>
                  <Input icon={Lock} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Choose a strong password" />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Vehicle Registration Number</label>
                  <Input icon={Car} type="text" value={vehicle} onChange={e=>setVehicle(e.target.value)} placeholder="e.g., OD02 AB 4321" />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Last 4 digits of Chassis/Engine</label>
                  <Input icon={MapPin} type="text" value={chassisLast4} onChange={e=>setChassisLast4(e.target.value)} placeholder="e.g., 1A2B" />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">City / District (optional)</label>
                  <Input type="text" value={city} onChange={e=>setCity(e.target.value)} placeholder="e.g., Bhubaneswar" />
                </div>
                {signupError && <p className="text-red-500 text-sm">{signupError}</p>}
                <div className="flex items-center justify-between">
                  <button type="submit" disabled={loading} className={`px-6 py-3 rounded-2xl font-semibold shadow-2xl ${loading ? 'bg-gray-400' : 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white'}`}>{loading ? 'Please wait...' : 'Create Account'}</button>
                  <button type="button" className="text-sm text-gray-500" onClick={()=>setMode('login')}>Already have an account?</button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
