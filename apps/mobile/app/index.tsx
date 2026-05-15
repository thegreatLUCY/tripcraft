import { View, Text, TouchableOpacity, useColorScheme } from 'react-native'
import { Link } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

export default function HomeScreen() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <View className={`flex-1 items-center justify-center px-6 ${isDark ? 'bg-neutral-900' : 'bg-white'}`}>
      {/* Logo mark */}
      <View className="mb-8 h-16 w-16 items-center justify-center rounded-2xl bg-teal-500">
        <Text className="text-2xl">🗺️</Text>
      </View>

      {/* Headline */}
      <Text className={`text-4xl font-bold tracking-tight text-center mb-3 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
        TripCraft
      </Text>
      <Text className={`text-base text-center mb-10 max-w-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
        Plan stress-free trips. Map-first, AI-powered, beautifully simple.
      </Text>

      {/* CTA buttons */}
      <View className="w-full max-w-xs gap-3">
        <Link href="/trips/new" asChild>
          <TouchableOpacity className="w-full items-center justify-center rounded-xl bg-teal-500 py-4">
            <Text className="text-base font-semibold text-white">Plan a Trip</Text>
          </TouchableOpacity>
        </Link>

        <TouchableOpacity
          className={`w-full items-center justify-center rounded-xl border py-4 ${
            isDark ? 'border-neutral-700' : 'border-neutral-200'
          }`}
        >
          <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
            See a Demo
          </Text>
        </TouchableOpacity>
      </View>

      {/* Feature row */}
      <View className="mt-12 flex-row flex-wrap items-center justify-center gap-2">
        {['Map-first', 'AI-powered', 'Collaborative'].map((label) => (
          <View
            key={label}
            className={`rounded-full border px-4 py-1.5 ${
              isDark ? 'border-neutral-700 bg-neutral-800' : 'border-neutral-200 bg-neutral-50'
            }`}
          >
            <Text className={`text-xs font-medium ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      <StatusBar style={isDark ? 'light' : 'dark'} />
    </View>
  )
}
