import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'

export default function NewTripScreen() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!title.trim()) return
    setLoading(true)
    setError(null)

    if (startDate && endDate && endDate < startDate) {
      setError('End date cannot be before start date')
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('trips').insert({
      title: title.trim(),
      start_date: startDate || null,
      end_date: endDate || null,
      user_id: user!.id,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.replace('/')
  }

  const inputClass = 'rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white'

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView
        contentContainerClassName="px-6 py-8 gap-5"
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text className="mb-1 text-sm font-medium text-neutral-900 dark:text-white">
            Trip name <Text className="text-red-500">*</Text>
          </Text>
          <TextInput
            placeholder="e.g. Summer in Japan"
            placeholderTextColor="#a1a1aa"
            value={title}
            onChangeText={setTitle}
            className={inputClass}
          />
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text className="mb-1 text-sm font-medium text-neutral-900 dark:text-white">Start date</Text>
            <TextInput
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#a1a1aa"
              value={startDate}
              onChangeText={setStartDate}
              className={inputClass}
            />
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-sm font-medium text-neutral-900 dark:text-white">End date</Text>
            <TextInput
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#a1a1aa"
              value={endDate}
              onChangeText={setEndDate}
              className={inputClass}
            />
          </View>
        </View>

        {error && (
          <View className="rounded-xl bg-red-50 px-4 py-3 dark:bg-red-950">
            <Text className="text-sm text-red-600 dark:text-red-400">{error}</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading || !title.trim()}
          className="items-center rounded-xl bg-teal-500 py-3.5"
          style={{ opacity: loading || !title.trim() ? 0.5 : 1 }}
        >
          <Text className="text-sm font-semibold text-white">
            {loading ? 'Creating...' : 'Create Trip'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
