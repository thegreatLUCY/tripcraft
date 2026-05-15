import '../global.css'

import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useColorScheme } from 'react-native'

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: isDark ? '#111111' : '#ffffff',
          },
          headerTintColor: isDark ? '#ffffff' : '#111111',
          headerShadowVisible: false,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 16,
          },
          contentStyle: {
            backgroundColor: isDark ? '#111111' : '#f9fafb',
          },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'TripCraft' }} />
        <Stack.Screen name="trips/new" options={{ title: 'New Trip', presentation: 'modal' }} />
      </Stack>
    </>
  )
}
