'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export interface PullToRefreshOptions {
  /** Callback when refresh is triggered */
  onRefresh: () => Promise<void>
  /** Minimum pull distance to trigger refresh (default: 80px) */
  threshold?: number
  /** Maximum pull distance (default: 150px) */
  maxPull?: number
  /** Whether pull-to-refresh is enabled (default: true) */
  enabled?: boolean
}

export interface PullToRefreshState {
  /** Whether currently pulling */
  isPulling: boolean
  /** Whether refresh is in progress */
  isRefreshing: boolean
  /** Current pull distance in pixels */
  pullDistance: number
  /** Pull progress (0-1) */
  progress: number
}

export interface UsePullToRefreshReturn {
  /** Ref to attach to the scrollable container */
  containerRef: React.RefObject<HTMLDivElement | null>
  /** Current state */
  state: PullToRefreshState
  /** Touch event handlers */
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: (e: React.TouchEvent) => void
  }
}

/**
 * Hook for implementing pull-to-refresh gesture
 * Requirements: 8.6 - Support pull-to-refresh for data updates
 */
export function usePullToRefresh(options: PullToRefreshOptions): UsePullToRefreshReturn {
  const {
    onRefresh,
    threshold = 80,
    maxPull = 150,
    enabled = true,
  } = options

  const containerRef = useRef<HTMLDivElement>(null)
  const startY = useRef<number>(0)
  const currentY = useRef<number>(0)
  const isAtTop = useRef<boolean>(false)

  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
    progress: 0,
  })

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled || state.isRefreshing) return
    
    // Check if we're at the top of the scroll container
    const container = containerRef.current
    if (container) {
      isAtTop.current = container.scrollTop <= 0
    } else {
      isAtTop.current = window.scrollY <= 0
    }
    
    if (isAtTop.current) {
      startY.current = e.touches[0].clientY
      currentY.current = startY.current
    }
  }, [enabled, state.isRefreshing])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || state.isRefreshing || !isAtTop.current) return
    
    currentY.current = e.touches[0].clientY
    const pullDistance = Math.max(0, Math.min(currentY.current - startY.current, maxPull))
    
    if (pullDistance > 0) {
      // Apply resistance to make it feel more natural
      const resistedDistance = pullDistance * 0.5
      const progress = Math.min(resistedDistance / threshold, 1)
      
      setState(prev => ({
        ...prev,
        isPulling: true,
        pullDistance: resistedDistance,
        progress,
      }))
    }
  }, [enabled, state.isRefreshing, maxPull, threshold])

  const handleTouchEnd = useCallback(async (e: React.TouchEvent) => {
    if (!enabled || state.isRefreshing || !state.isPulling) return
    
    const shouldRefresh = state.pullDistance >= threshold * 0.5
    
    if (shouldRefresh) {
      setState(prev => ({
        ...prev,
        isPulling: false,
        isRefreshing: true,
        pullDistance: threshold * 0.5, // Keep indicator visible during refresh
        progress: 1,
      }))
      
      try {
        await onRefresh()
      } finally {
        setState({
          isPulling: false,
          isRefreshing: false,
          pullDistance: 0,
          progress: 0,
        })
      }
    } else {
      setState({
        isPulling: false,
        isRefreshing: false,
        pullDistance: 0,
        progress: 0,
      })
    }
    
    startY.current = 0
    currentY.current = 0
    isAtTop.current = false
  }, [enabled, state.isRefreshing, state.isPulling, state.pullDistance, threshold, onRefresh])

  return {
    containerRef,
    state,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  }
}
