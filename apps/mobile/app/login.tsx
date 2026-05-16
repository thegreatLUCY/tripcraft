import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { supabase } from '../lib/supabase'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  async function handleSubmit() {
    setLoading(true)
    setError(null)

    const fn = mode === 'login'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password })

    const { error } = await fn

    if (error) {
      setError(error.message)
      setLoading(false)
    }
    // On success the _layout auth listener handles navigation automatically
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white dark:bg-neutral-950"
    >
      <ScrollView
        contentContainerClassName="flex-1 items-center justify-center px-6"
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View className="mb-8 items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-teal-500">
            <Text className="text-lg font-bold text-white">T</Text>
          </View>
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </Text>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">
            {mode === 'login' ? 'Sign in to TripCraft' : 'Start planning your trips'}
          </Text>
        </View>

        {/* Form */}
        <View className="w-full gap-3">
          <TextInput
            placeholder="Email"
            placeholderTextColor="#a1a1aa"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor="#a1a1aa"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          />

          {error && (
            <View className="rounded-xl bg-red-50 px-4 py-3 dark:bg-red-950">
              <Text className="text-sm text-red-600 dark:text-red-400">{error}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            className="mt-1 items-center rounded-xl bg-teal-500 py-3.5"
            style={{ opacity: loading ? 0.5 : 1 }}
          >
            <Text className="text-sm font-semibold text-white">
              {loading
                ? mode === 'login' ? 'Signing in...' : 'Creating account...'
                : mode === 'login' ? 'Sign in' : 'Create account'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Toggle mode */}
        <TouchableOpacity
          onPress={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(null) }}
          className="mt-6"
        >
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">
            {mode === 'login' ? "No account? " : "Already have one? "}
            <Text className="font-medium text-neutral-900 dark:text-white">
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
