import type { LayoutNode } from 'textura'
import { handleAnalyzeLayout } from './analyze-layout.js'
import type { LayoutIssue } from './analyze-layout.js'

export interface Breakpoint {
  name: string
  width: number
  height?: number
}

export interface ValidateResponsiveInput {
  tree: LayoutNode
  breakpoints?: Breakpoint[]
  direction?: 'ltr' | 'rtl'
  minTouchTarget?: number
}

export interface BreakpointResult {
  name: string
  width: number
  totalHeight: number
  nodeCount: number
  issues: LayoutIssue[]
  pass: boolean
}

export interface ValidateResponsiveResult {
  results: BreakpointResult[]
  passAll: boolean
  totalIssues: number
  analysisTimeMs: number
}

const DEFAULT_BREAKPOINTS: Breakpoint[] = [
  { name: 'mobile', width: 375 },
  { name: 'tablet', width: 768 },
  { name: 'desktop', width: 1024 },
  { name: 'wide', width: 1440 },
]

export function handleValidateResponsive(input: ValidateResponsiveInput): ValidateResponsiveResult {
  const breakpoints = input.breakpoints ?? DEFAULT_BREAKPOINTS
  const t0 = performance.now()

  const results: BreakpointResult[] = breakpoints.map(bp => {
    const result = handleAnalyzeLayout({
      tree: input.tree,
      options: { width: bp.width, height: bp.height, direction: input.direction },
      minTouchTarget: input.minTouchTarget,
    })

    const errors = result.issues.filter(i => i.severity === 'error')
    return {
      name: bp.name,
      width: bp.width,
      totalHeight: result.totalHeight,
      nodeCount: result.nodeCount,
      issues: result.issues,
      pass: errors.length === 0,
    }
  })

  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0)
  const analysisTimeMs = +(performance.now() - t0).toFixed(2)

  return {
    results,
    passAll: results.every(r => r.pass),
    totalIssues,
    analysisTimeMs,
  }
}
