import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { LayoutNode } from 'textura'
import { handleComputeLayout } from './tools/compute-layout.js'
import { handleAnalyzeLayout } from './tools/analyze-layout.js'
import { handleValidateResponsive } from './tools/validate-responsive.js'
import { handleFixLayout } from './tools/fix-layout.js'

// We pass the tree as a loose JSON object and cast to LayoutNode.
// Textura validates at runtime; the AI agent is responsible for
// producing valid trees from the user's component code.
const LayoutTreeSchema = z.record(z.string(), z.unknown()).describe(
  'A Textura LayoutNode tree. BoxNode: { flexDirection, gap, padding, children: [...] }. TextNode: { text, font, lineHeight }. Both accept all CSS flexbox properties.'
)

const OptionsSchema = z.object({
  width: z.number().optional().describe('Available width in pixels for the root container'),
  height: z.number().optional().describe('Available height in pixels'),
  direction: z.enum(['ltr', 'rtl']).optional().describe('Text direction (default: ltr)'),
}).optional()

export function createServer(): McpServer {
  const server = new McpServer(
    { name: 'textura', version: '0.1.0' },
    { capabilities: { tools: {} } },
  )

  // ── compute_layout ───────────────────────────────────────────
  server.tool(
    'compute_layout',
    `Compute exact pixel geometry for a UI layout tree. Returns positions (x, y), sizes (width, height), and text line counts for every node.

The AI agent should translate the user's component code (React, Vue, Svelte, HTML/CSS, Tailwind, etc.) into a Textura tree:
- Box nodes: { flexDirection: 'row', gap: 8, padding: 16, children: [...] }
- Text nodes: { text: 'Hello', font: '16px Inter', lineHeight: 24 }
- Both support all CSS flexbox properties: flexGrow, flexShrink, flexWrap, alignItems, justifyContent, margin, width, height, etc.

Map Tailwind classes to properties: flex → flexDirection:'row', gap-4 → gap:16, p-4 → padding:16, text-lg → font:'18px Inter', etc.`,
    {
      tree: LayoutTreeSchema,
      options: OptionsSchema,
    },
    async ({ tree, options }) => {
      const result = handleComputeLayout({ tree: tree as unknown as LayoutNode, options })
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
    }
  )

  // ── analyze_layout ──────────────────────────────────────────
  server.tool(
    'analyze_layout',
    `Analyze a UI layout tree for issues: text overflow, elements overlapping, touch targets below 44px, cramped line heights, tight spacing. Returns the computed layout plus a list of issues with severity, type, path, and details.

Use this after generating or modifying UI code to check for visual problems before the user sees them. Works with any framework — translate the component's layout structure into a Textura tree.`,
    {
      tree: LayoutTreeSchema,
      options: OptionsSchema,
      minTouchTarget: z.number().optional().describe('Minimum touch target size in px (default: 44)'),
    },
    async ({ tree, options, minTouchTarget }) => {
      const result = handleAnalyzeLayout({
        tree: tree as unknown as LayoutNode,
        options,
        minTouchTarget: minTouchTarget ?? undefined,
      })
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
    }
  )

  // ── validate_responsive ─────────────────────────────────────
  server.tool(
    'validate_responsive',
    `Validate a layout at multiple breakpoints simultaneously. Checks mobile (375px), tablet (768px), desktop (1024px), and wide (1440px) by default. Returns per-breakpoint issues, heights, and a pass/fail for each.

Use this to ensure a layout works across screen sizes. Custom breakpoints can be provided. All breakpoints are checked in a single call — typically <5ms total.`,
    {
      tree: LayoutTreeSchema,
      breakpoints: z.array(z.object({
        name: z.string(),
        width: z.number(),
        height: z.number().optional(),
      })).optional().describe('Custom breakpoints (default: mobile/tablet/desktop/wide)'),
      direction: z.enum(['ltr', 'rtl']).optional(),
      minTouchTarget: z.number().optional(),
    },
    async ({ tree, breakpoints, direction, minTouchTarget }) => {
      const result = handleValidateResponsive({
        tree: tree as unknown as LayoutNode,
        breakpoints: breakpoints ?? undefined,
        direction: direction ?? undefined,
        minTouchTarget: minTouchTarget ?? undefined,
      })
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
    }
  )

  // ── fix_layout ──────────────────────────────────────────────
  server.tool(
    'fix_layout',
    `Analyze a layout tree for issues and automatically fix what can be fixed: expand touch targets to 44px, increase cramped line heights to 1.4x, widen tight gaps, add flexShrink for overflow, add flexWrap for overlapping children.

Returns the fixed tree, a list of applied fixes, and before/after issue counts. The AI agent can then translate the fixes back into the user's framework code.`,
    {
      tree: LayoutTreeSchema,
      options: OptionsSchema,
      minTouchTarget: z.number().optional(),
    },
    async ({ tree, options, minTouchTarget }) => {
      const result = handleFixLayout({
        tree: tree as unknown as LayoutNode,
        options,
        minTouchTarget: minTouchTarget ?? undefined,
      })
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
    }
  )

  return server
}
