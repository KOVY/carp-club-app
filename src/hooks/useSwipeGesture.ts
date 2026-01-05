'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export interface SwipeGestureOptions {
  /** Minimum distance in pixels to trigger a swipe */
  threshold?: number
  /** Maximum time in ms for a swipe gesture */
  maxTime?: number
  /** Callback when swiping left */
  onSwipeLeft?: () => void
  /** Callback when swiping right */
  onSwipeRight?: () => void
  /** Callback when swiping up */
  onSwipeUp?: () => void
  /** Callback when swiping down */
  onSwipeDown?: () => void
  /** Whether swipe gestures are enabled */
  enabled?: boolean
}

export interface SwipeState {
  /** Whether a swipe is currently in progress */
  isSwiping: boolean
  /** Current swipe direction */
  direction: 'left' | 'right' | 'up' | 'down' | null
  /** Current swipe distance in pixels */
  distance: number
}

export interface UseSwipeGestureReturn {
  /** Ref to attach to the swipeable element */
  ref: React.RefObject<HTMLDivElement | null>
  /** Current swipe state */
  state: SwipeState
  /** Touch event handlers to spread on the element */
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: (e: React.TouchEvent) => void
  }
}

/**
 * Hook for detecting swipe gestures on touch devices
 * Requirements: 8.2 - Implement swipe gestures for navigation
 */
export function useSwipeGesture(options: SwipeGestureOptions = {}): UseSwipeGestureReturn {
  const {
    threshold = 50,
    maxTime = 300,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    enabled = true,
  } = options

  const ref = useRef<HTMLDivElement>(null)
  const startX = useRef<number>(0)
  const startY = useRef<number>(0)
  const startTime = useRef<number>(0)

  const [state, setState] = useState<SwipeState>({
    isSwiping: false,
    direction: null,
    distance: 0,
  })

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return
    
    const touch = e.touches[0]
    startX.current = touch.clientX
    startY.current = touch.clientY
    startTime.current = Date.now()
    
    setState({
      isSwiping: true,
      direction: null,
      distance: 0,
    })
  }, [enabled])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || !state.isSwiping) return
    
    const touch = e.touches[0]
    const deltaX = touch.clientX - startX.current
    const deltaY = touch.clientY - startY.current
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)
    
    // Determine direction based on which axis has more movement
    let direction: SwipeState['direction'] = null
    let distance = 0
    
    if (absX > absY) {
      direction = deltaX > 0 ? 'right' : 'left'
      distance = absX
    } else {
      direction = deltaY > 0 ? 'down' : 'up'
      distance = absY
    }
    
    setState({
      isSwiping: true,
      direction,
      distance,
    })
  }, [enabled, state.isSwiping])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!enabled) return
    
    const endTime = Date.now()
    const duration = endTime - startTime.current
    
    // Only trigger if within time limit and above threshold
    if (duration <= maxTime && state.distance >= threshold) {
      switch (state.direction) {
        case 'left':
          onSwipeLeft?.()
          break
        case 'right':
          onSwipeRight?.()
          break
        case 'up':
          onSwipeUp?.()
          break
        case 'down':
          onSwipeDown?.()
          break
      }
    }
    
    setState({
      isSwiping: false,
      direction: null,
      distance: 0,
    })
  }, [enabled, maxTime, threshold, state.direction, state.distance, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown])

  return {
    ref,
    state,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  }
}
