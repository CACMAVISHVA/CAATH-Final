import {
  EnterpriseObjective,
  ObjectiveConflict,
  OperationalIntentSignal,
  OrganizationalSignal,
  StrategicSimulationScenario,
} from './types';

interface StrategicReasoningInput {
  objectives: EnterpriseObjective[];
  conflicts: ObjectiveConflict[];
  frictionSignals: OrganizationalSignal[];
  intentDriftSignals: OperationalIntentSignal[];
  prioritizedScenarios: StrategicSimulationScenario[];
}

export class StrategicReasoningEngine {
  summarize(input: StrategicReasoningInput): string {
    const objectivePressure = input.objectives.filter((objective) => objective.status !== 'on-track').length;
    const conflictPressure = input.conflicts.length;
    const frictionPressure = input.frictionSignals.length;
    const intentPressure = input.intentDriftSignals.length;
    const topScenario = input.prioritizedScenarios[0]?.name ?? 'no simulation-backed initiative';

    return [
      `${objectivePressure} objectives require intervention with ${conflictPressure} active strategic conflicts.`,
      `${frictionPressure} organizational friction signals and ${intentPressure} intent drift signals are influencing execution quality.`,
      `Top planning pathway: ${topScenario}.`,
    ].join(' ');
  }
}
