1. Overview

Product Name

Execution Ledger — PRD

Product Type

Web-based trading journal and decision analysis system

Objective

Help traders:

Track trades (secondary)
Identify setup edge (primary)
Detect behavioral mistakes (critical)
Improve decision quality over time (core)
2. Problem Statement

Existing tools (e.g. TraderSync, Edgewonk):

Confirmed (multi-source)

Support trade logging
Provide basic analytics (PnL, win rate)
Allow tagging and journaling

Limitations

No setup-level edge analysis
No structured decision grading system
Weak behavior pattern detection
No discipline enforcement
3. Product Vision

This is not a trading journal.
This is a system to eliminate repeated bad decisions.

4. Target Users
Discretionary traders
Intraday / swing traders
Strategy-based traders (VWAP, ORB, breakout, etc.)
5. V1 Feature Scope
5.1 Dashboard
Purpose

Provide a fast overview of trading performance and behavior (within ~10 seconds)

UI Components
KPI Cards
Total PnL
Win Rate
Expectancy
Max Drawdown
Charts
Equity Curve (time series)
Setup Distribution (by setup or grade)
Tables
Recent Trades
Insight Panels
Mistake frequency
Emotion distribution
Behavior
Sidebar Filters
Strategy
Asset
Timeframe
Grade (A+ only toggle)
Interaction
Clicking a trade → opens Trade Detail
Filters update all dashboard components in real-time
5.2 Calendar
Purpose

Analyze trading performance and decision quality across time

Calendar View
Modes
Monthly (default)
Weekly (optional)
Calendar Cell Content

Each day displays:

Net PnL
Trade count
Decision grade (A+ / A / B / C)
Primary setup tag
Mistake indicator (dot)
Visual Rules
Color intensity = PnL magnitude
Green = positive PnL
Red = negative PnL
Grade badge = decision quality (independent of PnL)
Warning dot = rule violation occurred
Interactions
Hover (Desktop)
Show tooltip:
PnL
Top setup
Mistakes summary
Click Day
Opens Day Detail (drawer or full page)
5.3 Day Detail
Purpose

Deep analysis of a single trading day

Layout
Left Panel — Summary
Date
Daily PnL
Win / Loss count
Total trades
Best-performing setup
Daily grade
(Optional) Market regime
Center Panel — Trades List

Each trade includes:

Symbol
Setup
Side (Long / Short)
Entry / Exit
PnL
R multiple
Grade
Right Panel — Review
Notes (free text)
Mistakes (tags)
Emotions (tags)
Lessons learned
Filters
Winners only
Losers only
A+ trades only
Filter by setup
Interaction
Click trade → opens Trade Detail
5.4 Trade Detail
Purpose

Deep review of a single trade (core learning unit)

Layout
Section 1 — Header
Symbol
Date / Time
Setup
Side
PnL
R multiple
Grade
Playbook reference (optional)
Section 2 — Chart
Candlestick chart
Entry marker
Stop loss marker
Exit markers (support partial exits)
Target line
Optional Overlays
VWAP
ORH / ORL
PDH / PDL
Section 3 — Review Panel
Trade notes
Checklist result (optional V1.5)
Mistakes (tags)
Emotions (tags)
What went well
What to improve
Behavior
Chart is the primary visual focus
Tags are lightweight and selectable
Supports multiple exits (timeline or list)
5.5 Analytics
Purpose

Identify edge by setup and behavior

Modules
Setup Performance
PnL by setup
Win rate by setup
Expectancy by setup
Behavioral Analysis
Mistake frequency
Mistake → PnL correlation
Emotion → outcome correlation
Time-Based Analysis
Performance by weekday
Performance by session (optional)
Interaction
Click a setup → filter all related trades
Drill down into trade list
5.6 Playbook (Optional V1.5)
Purpose

Define and standardize high-quality setups

Each Playbook Entry
Setup name
Market condition
Entry criteria
Invalidation rules
Target logic
Example trades (linked)
Common mistakes
Behavior
Trades can be linked to a playbook setup
Enables comparison:
Expected vs actual execution
6. Core Data Model (Simplified)
Trade
Trade {
  id: string
  date: string
  symbol: string
  side: 'long' | 'short'
  setup: string
  entryPrice: number
  exitPrice: number
  pnl: number
  rMultiple: number
  grade: 'A+' | 'A' | 'B' | 'C'
  mistakes: string[]
  emotions: string[]
  notes: string
}
Day Summary
DaySummary {
  date: string
  pnl: number
  tradeCount: number
  grade: string
  setups: string[]
  hasMistake: boolean
}
Setup
Setup {
  name: string
  totalPnl: number
  winRate: number
  expectancy: number
}
7. Design Principles
1. Clarity over decoration
No visual noise
Minimal color usage
2. Color is semantic
Green = profit
Red = loss / violation
Blue = active / focus
Gray = neutral
3. Grade is core

A+ / A / B / C must appear in:

Calendar
Trade list
Trade detail
Analytics
4. Everything is drillable

All elements should be clickable:

Calendar → Day
Day → Trade
Setup → Trades
5. Tags over text

Mistakes and emotions must be:

Structured
Filterable
Analyzable
8. V1 Scope Definition
Must Have
Dashboard
Calendar (with PnL + grade)
Day Detail
Trade Detail
Setup tagging
Mistake tagging
Grade system
Basic analytics
Nice to Have
Regime tagging
Playbook
Screenshot support
Execution timeline
AI review (rule-based)
Out of Scope (V1)
Broker integration
Real-time data
Social features
Advanced AI
9. Success Criteria

User can:

Identify best-performing setup within 1 minute
Identify worst mistake pattern within 1 minute
Review a trade within 10–20 seconds
Understand weekly performance in <10 seconds
