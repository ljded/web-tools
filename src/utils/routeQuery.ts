import { watch, type Ref } from 'vue'
import { useRoute, type LocationQueryValue } from 'vue-router'

export function getQueryValue(value: LocationQueryValue | LocationQueryValue[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

export function useRouteQueryValue<T extends string>(key: string, target: Ref<T>, values: readonly T[]) {
  const route = useRoute()

  watch(
    () => getQueryValue(route.query[key]),
    (value) => {
      if (values.includes(value as T)) target.value = value as T
    },
    { immediate: true },
  )
}
