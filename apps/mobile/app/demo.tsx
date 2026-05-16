import { View, Text } from 'react-native'
import { useColorScheme } from 'react-native'

export default function DemoScreen() {
  const isDark = useColorScheme() === 'dark'

  return (
    <View className={`flex-1 items-center justify-center px-6 ${isDark ? 'bg-neutral-900' : 'bg-white'}`}>
      <Text className={`text-2xl font-bold text-center mb-2 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
        Demo
      </Text>
      <Text className={`text-base text-center ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
        Coming soon — demo goes here.
      </Text>
    </View>
  )
}
