# Execution Ledger Diagrams

These diagrams describe the current implementation in this repository as of April 30, 2026.

## User Flow

```mermaid
flowchart TD
    A[Trader opens Execution Ledger] --> B[Home page loads existing setups]
    B --> C{Choose working mode}

    C --> D[Log view]
    C --> E[Calendar view]

    D --> F[Review grouped trading days]
    F --> G[Update day context]
    F --> H[Open setup card]
    H --> I[Create or edit setup plan]
    H --> J[Add, edit, or delete executions]
    H --> K[Move executions between setups]
    H --> L[Review session chart]

    E --> M[Scan monthly calendar]
    M --> N[Select a trading day]
    N --> O[Open daily drill-down]
    O --> G
    O --> H

    B --> P[Detect setups]
    P --> Q[Enter symbol and date]
    Q --> R[System loads market session data]
    R --> S[Rule-based setup detection returns suggestions]
    S --> T{User decision}
    T --> U[Save as ideal setup]
    T --> V[Skip suggestion]
    U --> H
```

## Data Flow

```mermaid
flowchart LR
    subgraph UI[Client UI]
        A[app/page.tsx]
        B[SetupForm / SetupCard / ExecutionForm]
        C[CalendarView / DailyDrillDown / DayContextCard]
        D[DetectSetupsModal]
        E[SetupSessionChart / SessionChart]
    end

    subgraph API[Next Route Handlers]
        F["GET/POST/DELETE /api/setups"]
        G["PUT/DELETE /api/setups/[id]"]
        H["POST /api/setups/[id]/executions"]
        I["PUT/DELETE /api/setups/[id]/executions/[execId]"]
        J["POST /api/setups/[id]/executions/move"]
        K["GET/PUT /api/day-context/[date]"]
        L["GET /api/chart-data"]
        M["POST /api/setups/detect"]
    end

    subgraph Domain[Server Domain Logic]
        N[lib/mappers.ts]
        O[lib/setupPayload.ts]
        P[lib/marketSession.ts]
        Q[lib/detectSetups.ts]
    end

    subgraph DB[Postgres via Prisma]
        R[(TradeSetup)]
        S[(Execution)]
        T[(DayContext)]
        U[(ChartMarker)]
    end

    subgraph Files[Local Filesystem Data]
        V["data/market/{symbol}/{date}.json"]
        W["data/trades/... csv/json"]
    end

    A --> F
    B --> F
    B --> G
    B --> H
    B --> I
    B --> J
    C --> K
    D --> M
    E --> L

    F --> O
    F --> N
    G --> O
    G --> N
    H --> N
    I --> N
    J --> N
    K --> N
    L --> P
    L --> N
    M --> P
    M --> Q

    F <--> R
    F <--> S
    F <--> T
    G <--> R
    G <--> S
    G <--> T
    H <--> S
    I <--> S
    J <--> S
    J <--> U
    K <--> T
    L <--> U
    L <--> R

    P --> V
    W -. imported by scripts .-> U
```

## Architecture

```mermaid
flowchart TB
    subgraph Presentation[Presentation Layer]
        A1[Home page client]
        A2[Log and calendar workflows]
        A3[Charts and detection modal]
    end

    subgraph Application[Application Layer]
        B1[Route handlers under app/api]
        B2[Validation and payload normalization]
        B3[Mapping DB rows to frontend shapes]
    end

    subgraph DomainServices[Domain Services]
        C1[Setup lifecycle management]
        C2[Execution lifecycle and reassignment]
        C3[Day context classification]
        C4[Chart session loading]
        C5[Deterministic setup detection]
        C6[PnL and filtering utilities]
    end

    subgraph Persistence[Persistence Layer]
        D1[Prisma client]
        D2[(Postgres)]
    end

    subgraph ExternalData[Project-owned data sources]
        E1["Market session JSON files"]
        E2["Imported trade marker csv/json files"]
    end

    Presentation --> Application
    Application --> DomainServices
    DomainServices --> Persistence
    Persistence --> D2
    DomainServices --> E1
    DomainServices --> E2

    D2 --> F1[TradeSetup records]
    D2 --> F2[Execution records]
    D2 --> F3[DayContext records]
    D2 --> F4[ChartMarker records]
```

## Notes

- The main source of truth for journaled data is Postgres through Prisma.
- Chart rendering and setup detection also depend on session files under `data/market/`.
- Imported broker marker data is linked back to `Execution` and `TradeSetup` through `ChartMarker`.
- Setup detection is rule-based, not ML-based, and only writes data after user confirmation.
