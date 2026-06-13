import { EnterpriseObjective, ObjectiveConflict } from './types';

export class EnterpriseObjectiveEngine {
  scoreAlignment(objectives: EnterpriseObjective[]): number {
    if (objectives.length === 0) return 0;

    const weightedScore = objectives.reduce((acc, objective) => {
      const progress = Math.min(1, Math.max(0, objective.currentValue / Math.max(1, objective.targetValue)));
      return acc + progress * objective.weight;
    }, 0);

    const totalWeight = objectives.reduce((acc, objective) => acc + objective.weight, 0);
    return totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;
  }

  detectConflicts(objectives: EnterpriseObjective[]): ObjectiveConflict[] {
    const conflicts: ObjectiveConflict[] = [];

    for (let i = 0; i < objectives.length; i += 1) {
      for (let j = i + 1; j < objectives.length; j += 1) {
        const left = objectives[i];
        const right = objectives[j];
        const divergingStates =
          (left.status === 'off-track' && right.status === 'on-track') ||
          (left.status === 'on-track' && right.status === 'off-track');

        if (left.domain === right.domain && divergingStates) {
          conflicts.push({
            id: `${left.id}:${right.id}`,
            objectiveA: left.name,
            objectiveB: right.name,
            description: `${left.name} is diverging from ${right.name} in ${left.domain}.`,
            severity: 'high',
          });
        }
      }
    }

    return conflicts;
  }
}
