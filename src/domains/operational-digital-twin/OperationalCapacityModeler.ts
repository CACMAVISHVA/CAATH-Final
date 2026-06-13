import { CapacityForecast, DigitalTwinStateModel, SimulationScenario } from './types';

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));

export class OperationalCapacityModeler {
  forecast(state: DigitalTwinStateModel, scenario: SimulationScenario): CapacityForecast {
    const availableStaff = Math.max(1, state.activeStaff + scenario.assumptions.staffAvailabilityDelta);
    const expectedVolume = state.workflowBacklog + scenario.assumptions.incomingWorkflowVolume;
    const requiredStaff = Math.ceil((expectedVolume * scenario.assumptions.averageHandleTimeMinutes) / 480);
    const utilization = clamp((requiredStaff / availableStaff) * 100);
    const queuePressure = clamp((state.queueDepth + expectedVolume * 0.35) / Math.max(1, availableStaff));
    const throughputForecast = clamp((availableStaff * (60 / Math.max(5, scenario.assumptions.averageHandleTimeMinutes))) * 10, 0, 10_000);
    const workloadImbalance = clamp(Math.abs(requiredStaff - availableStaff) * 9);

    return {
      utilization,
      requiredStaff,
      queuePressure,
      throughputForecast,
      workloadImbalance,
    };
  }
}
