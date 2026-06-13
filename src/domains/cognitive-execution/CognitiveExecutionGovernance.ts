import { GovernedHandoffAction } from './types';

export class CognitiveExecutionGovernance {
  enforce(actions: GovernedHandoffAction[]): GovernedHandoffAction[] {
    return actions.map((action) => {
      if (action.governanceStatus === 'blocked') return action;
      if (action.requiresHumanOverride) {
        return { ...action, governanceStatus: 'needs-review' };
      }
      return action;
    });
  }
}
