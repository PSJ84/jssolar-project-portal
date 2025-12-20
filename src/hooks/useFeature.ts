'use client'

import { useState, useEffect } from 'react'
import { Feature } from '@prisma/client'

interface UseFeatureResult {
  hasAccess: boolean
  isLoading: boolean
}

interface UseFeaturesResult {
  features: Feature[]
  isLoading: boolean
  hasFeature: (feature: Feature) => boolean
}

// 캐시된 features (세션 동안 유지)
let cachedFeatures: Feature[] | null = null
let fetchPromise: Promise<Feature[]> | null = null

async function fetchFeatures(): Promise<Feature[]> {
  if (cachedFeatures !== null) {
    return cachedFeatures
  }

  if (fetchPromise !== null) {
    return fetchPromise
  }

  fetchPromise = fetch('/api/features')
    .then((res) => {
      if (!res.ok) throw new Error('Failed to fetch features')
      return res.json()
    })
    .then((data: { features: Feature[] }) => {
      cachedFeatures = data.features
      return data.features
    })
    .finally(() => {
      fetchPromise = null
    })

  return fetchPromise
}

/**
 * 단일 Feature 접근 권한 확인
 */
export function useFeature(feature: Feature): UseFeatureResult {
  const [hasAccess, setHasAccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    fetchFeatures()
      .then((features) => {
        if (mounted) {
          setHasAccess(features.includes(feature))
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (mounted) {
          setHasAccess(false)
          setIsLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [feature])

  return { hasAccess, isLoading }
}

/**
 * 모든 Feature 목록 가져오기
 */
export function useFeatures(): UseFeaturesResult {
  const [features, setFeatures] = useState<Feature[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    fetchFeatures()
      .then((data) => {
        if (mounted) {
          setFeatures(data)
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (mounted) {
          setFeatures([])
          setIsLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  const hasFeature = (feature: Feature): boolean => {
    return features.includes(feature)
  }

  return { features, isLoading, hasFeature }
}

/**
 * Feature 캐시 초기화 (로그아웃 시 호출)
 */
export function clearFeatureCache(): void {
  cachedFeatures = null
  fetchPromise = null
}
