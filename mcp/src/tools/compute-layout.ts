import { computeLayout } from 'textura'
import type { LayoutNode, ComputedLayout } from 'textura'

export interface ComputeLayoutInput {
  tree: LayoutNode
  options?: {
    width?: number
    height?: number
    direction?: 'ltr' | 'rtl'
  }
}

export function handleComputeLayout(input: ComputeLayoutInput): ComputedLayout {
  return computeLayout(input.tree, input.options)
}
