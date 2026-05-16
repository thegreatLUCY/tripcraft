import '../global.css'

import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useColorScheme } from 'react-native'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    // Get the current session on app start; clear stale tokens if refresh fails
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        supabase.auth.signOut()
        setSession(null)
      } else {
        setSession(data.session)
      }
    })

    // Keep session in sync when the user logs in or out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session === undefined) return // still loading, don't navigate yet

    const onLoginScreen = segments[0] === 'login'

    if (!session && !onLoginScreen) router.replace('/login')
    if (session && onLoginScreen) router.replace('/')
  }, [session, segments])

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: isDark ? '#111111' : '#ffffff' },
          headerTintColor: isDark ? '#ffffff' : '#111111',
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '600', fontSize: 16 },
          contentStyle: { backgroundColor: isDark ? '#111111' : '#f9fafb' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="trips/new" options={{ title: 'New Trip', presentation: 'modal' }} />
        <Stack.Screen name="trips/[id]" options={{ headerShown: false }} />
      </Stack>
    </>
  )
}
