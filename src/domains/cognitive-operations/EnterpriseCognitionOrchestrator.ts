import { AIRecommendationEngine } from './AIRecommendationEngine';
import { CognitiveGovernanceLayer } from './CognitiveGovernanceLayer';
import { CognitiveOperationalMemory } from './CognitiveOperationalMemory';
import { CognitiveRuntimeSafetyController } from './CognitiveRuntimeSafetyController';
import { EnterpriseObjectiveEngine } from './EnterpriseObjectiveEngine';
import { OperationalIntentAnalysisEngine } from './OperationalIntentAnalysisEngine';
import { OrganizationalIntelligenceLayer } from './OrganizationalIntelligenceLayer';
import { StrategicPlanningIntelligence } from './StrategicPlanningIntelligence';
import { StrategicReasoningEngine } from './StrategicReasoningEngine';
import { EnterpriseCognitiveInput, EnterpriseCognitiveOutput, StrategicRecommendation } from './types';

export class EnterpriseCognitionOrchestrator {
  private readonly objectiveEngine = new EnterpriseObjectiveEngine();
  private readonly intentEngine = new OperationalIntentAnalysisEngine();
  private readonly intelligenceLayer = new OrganizationalIntelligenceLayer();
  private readonly planningIntelligence = new StrategicPlanningIntelligence();
  private readonly recommendationEngine = new AIRecommendationEngine();
  private readonly governanceLayer = new CognitiveGovernanceLayer();
  private readonly operationalMemory = new CognitiveOperationalMemory();
  private readonly runtimeSafety = new CognitiveRuntimeSafetyController();
  private readonly strategicReasoningEngine = new StrategicReasoningEngine();

  evaluate(input: EnterpriseCognitiveInput): EnterpriseCognitiveOutput {
    const cached = this.runtimeSafety.getCached(input.tenantId);
    const objectiveAlignmentScore = this.objectiveEngine.scoreAlignment(input.objectives);
    const objectiveConflicts = this.objectiveEngine.detectConflicts(input.objectives);
    const frictionSignals = this.intelligenceLayer.detectCriticalFriction(input.workloadSignals);
    const intentDriftSignals = this.intentEngine.detectIntentDrift(input.intentSignals);
    const prioritizedScenarios = this.planningIntelligence.prioritizeScenarios(input.simulationScenarios);

    const recommendations = cached ?? this.runtimeSafety.throttleRecommendations(
      this.recommendationEngine.generate({
        conflicts: objectiveConflicts,
        frictionSignals,
        intentDriftSignals,
        prioritizedScenarios,
      }),
    );

    const enrichedRecommendations = this.attachReasoningSummary(
      recommendations,
      this.strategicReasoningEngine.summarize({
        objectives: input.objectives,
        conflicts: objectiveConflicts,
        frictionSignals,
        intentDriftSignals,
        prioritizedScenarios,
      }),
    );

    this.runtimeSafety.cacheRecommendations(input.tenantId, enrichedRecommendations);
    const governanceAuditTrail = this.governanceLayer.auditRecommendations(enrichedRecommendations);
    const memoryUpdates = this.operationalMemory.recordRecommendations(enrichedRecommendations);

    return {
      generatedAt: new Date().toISOString(),
      objectiveAlignmentScore,
      objectiveConflicts,
      recommendations: enrichedRecommendations,
      governanceAuditTrail,
      memoryUpdates,
    };
  }

  private attachReasoningSummary(
    recommendations: StrategicRecommendation[],
    strategicSummary: string,
  ): StrategicRecommendation[] {
    return recommendations.map((recommendation) => ({
      ...recommendation,
      operationalContext: `${recommendation.operationalContext} ${strategicSummary}`.trim(),
    }));
  }
}

export const enterpriseCognitionOrchestrator = new EnterpriseCognitionOrchestrator();
