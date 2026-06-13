# Scaling Strategy

## Near-Term
- Migrate high-traffic flows to repository + API client pattern.
- Move heavy calculations to worker jobs.
- Expand lazy loading by route and major dashboard modules.

## Mid-Term
- Introduce backend queue processor and durable event stream.
- Move selected modules to dedicated microservices (GST, documents, AI).
- Add distributed tracing and central log aggregation.

## Long-Term
- Multi-region API edge and tenant data partition strategy.
- Public API platform and webhook delivery system.
- React Native/mobile app consuming shared API contracts.
