# Commercial Deployment Scorecard

Date: 2026-06-04

Purpose: assess CAATH readiness for first pilot customer, first paying customer, and commercial deployment.

## Score Summary

| Category | Score | Status | Notes |
|---|---:|---|---|
| Deployment readiness | 70 / 100 | PARTIAL PASS | Internal pilot can begin; external pilot needs P0/P1 closure evidence |
| Support readiness | 64 / 100 | PARTIAL | Support guide exists; real ticket handling must be tested |
| Onboarding readiness | 72 / 100 | PARTIAL PASS | Firm onboarding and first-run guidance exist; needs live rehearsal |
| Operational maturity | 68 / 100 | PARTIAL | Core workflows exist, but daily usage proof is pending |
| Customer readiness | 62 / 100 | PARTIAL | Customer-facing claims must be constrained, especially for GST upload |

Overall Commercial Deployment Score: **67 / 100**

## Readiness Levels

| Level | Definition | Current Fit |
|---|---|---|
| Internal pilot | Team uses CAATH for real work and logs defects/friction | READY |
| Controlled external pilot | Friendly customer uses constrained workflows with support oversight | PARTIAL |
| First paying customer | Customer can operate for 30 days without broken core workflow or misleading feature claim | NOT YET |
| Scaled SaaS | Repeatable onboarding, support, billing, monitoring, and tenant governance | NOT YET |

## Category Detail

### Deployment Readiness

| Requirement | Status | Evidence Needed |
|---|---|---|
| Stable login/logout | Partial | Repeat across hostnames and roles |
| Tenant isolation | Partial | Two-firm runtime proof |
| Core workflow persistence | Partial | Client, task, compliance, document refresh tests |
| GST controlled pilot flow | Partial pass | Persisted-data GST test evidence |
| Production monitoring | Partial | Bug and observation registry usage |

### Support Readiness

| Requirement | Status | Evidence Needed |
|---|---|---|
| Support ticket intake | Partial | Internal ticket lifecycle test |
| Escalation process | Partial | P0/P1 routing proof |
| Error reporting | Partial | Real error capture from pilot usage |
| Customer feedback loop | Partial | Observation review cadence |

### Onboarding Readiness

| Requirement | Status | Evidence Needed |
|---|---|---|
| Firm setup | Partial pass | Rehearsed firm provisioning |
| User invitation | Partial | Role assignment proof |
| First client creation | Partial pass | First-run user test |
| First task creation | Partial pass | First-run user test |
| First GST workflow | Partial | Persisted-data setup required |

### Operational Maturity

| Requirement | Status | Evidence Needed |
|---|---|---|
| Daily manager workflow | Pending | Five-day internal pilot |
| Staff execution workflow | Pending | Task lifecycle completion metrics |
| Compliance operations | Pending | Due/overdue status transition proof |
| Document operations | Pending | Upload and retrieval proof |
| Feature usage insight | Pending | Usage report populated after pilot |

### Customer Readiness

| Requirement | Status | Evidence Needed |
|---|---|---|
| Clear product positioning | Partial | Avoid overclaiming GST raw ingestion |
| Training-light first use | Pending | New staff first-use audit |
| Executive reporting | Partial | Pilot review evidence |
| Commercial confidence | Partial | Zero P0 and contained P1 list |

## Commercial Risks

| Risk | Severity | Commercial Impact | Required Action |
|---|---|---|---|
| Overstating GST upload certification | P0 | Customer trust risk | Position GST as controlled persisted-data pilot |
| Hidden workflow setup | P1 | Onboarding friction | Run first-user pilot and document setup |
| Unmeasured feature usage | P1 | Clutter and support burden | Populate feature usage report |
| Untested support loop | P1 | Slow customer response | Run internal support simulation |
| Tenant isolation not runtime-proven | P1 | Enterprise blocker | Complete two-firm test |

## Go / No-Go Decision

| Milestone | Decision |
|---|---|
| Internal pilot operations | GO |
| First external pilot customer | CONDITIONAL GO after P0 closure and five-day internal run |
| First paying customer | NO-GO until 30-day reliability evidence exists |
| Scaled commercial launch | NO-GO until onboarding, support, usage analytics, and tenant validation are repeatable |

## Next Commercial Gate

CAATH should be reconsidered for external pilot once:

1. Internal pilot runs for five business days.
2. Production bug registry has zero open P0 items.
3. Feature usage report identifies keep/remove/merge decisions.
4. Executive pilot review score reaches at least 75 / 100.
5. Commercial deployment score reaches at least 80 / 100.
