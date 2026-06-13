import { useCallback, useRef, useState } from 'react';
import { CommandAction } from '../../services/commandPaletteService';
import { getRegisteredAction } from './actionRegistry';
import { recordInteractionTelemetry } from './actionTelemetry';
import { OperationalActionContext, OperationalActionResult, OperationalActionStatus } from './types';

type ExecuteOptions = {
  run: () => void | Promise<void>;
  undo?: () => void;
};

export const useOperationalActionExecutor = (userId: string, role?: OperationalActionContext['role']) => {
  const inFlight = useRef(new Set<string>());
  const lastRunAt = useRef(new Map<string, number>());
  const undoStack = useRef<Array<{ label: string; undo: () => void }>>([]);
  const [statusByAction, setStatusByAction] = useState<Record<string, OperationalActionStatus>>({});
  const [lastResult, setLastResult] = useState<OperationalActionResult | null>(null);

  const setStatus = (action: string, status: OperationalActionStatus) => {
    setStatusByAction((prev) => ({ ...prev, [action]: status }));
  };

  const executeAction = useCallback(async (
    action: CommandAction | string,
    label: string,
    source: string,
    options: ExecuteOptions,
  ): Promise<OperationalActionResult> => {
    const definition = getRegisteredAction(action);
    const id = String(action);
    const now = Date.now();
    const cooldownMs = definition.cooldownMs || 650;
    const telemetrySource = `${source}:${userId}`;

    if (definition.allowedRoles && role && !definition.allowedRoles.includes(role)) {
      const result = { status: 'permission-denied' as const, message: `${label} requires elevated permission.` };
      setStatus(id, result.status);
      setLastResult(result);
      recordInteractionTelemetry({ id: `${id}:${now}`, action: id, label, source: telemetrySource, status: result.status, startedAt: now, completedAt: Date.now() });
      return result;
    }

    if (inFlight.current.has(id) || now - (lastRunAt.current.get(id) || 0) < cooldownMs) {
      const result = { status: 'disabled' as const, message: `${label} is already being processed.` };
      setStatus(id, result.status);
      setLastResult(result);
      recordInteractionTelemetry({ id: `${id}:${now}`, action: id, label, source: telemetrySource, status: result.status, startedAt: now, completedAt: Date.now() });
      return result;
    }

    inFlight.current.add(id);
    lastRunAt.current.set(id, now);
    setStatus(id, 'loading');
    recordInteractionTelemetry({ id: `${id}:${now}`, action: id, label, source: telemetrySource, status: 'loading', startedAt: now });

    try {
      await options.run();
      if (options.undo) undoStack.current.unshift({ label, undo: options.undo });
      const result = { status: 'success' as const, message: definition.label || `${label} completed.`, undo: options.undo };
      setStatus(id, result.status);
      setLastResult(result);
      recordInteractionTelemetry({ id: `${id}:${now}`, action: id, label, source: telemetrySource, status: result.status, startedAt: now, completedAt: Date.now() });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : `${label} failed.`;
      const result = { status: 'failure' as const, message };
      setStatus(id, result.status);
      setLastResult(result);
      recordInteractionTelemetry({ id: `${id}:${now}`, action: id, label, source: telemetrySource, status: result.status, startedAt: now, completedAt: Date.now(), error: message });
      return result;
    } finally {
      inFlight.current.delete(id);
    }
  }, [role]);

  const undoLastAction = useCallback(() => {
    const next = undoStack.current.shift();
    if (!next) return null;
    next.undo();
    const result = { status: 'success' as const, message: `${next.label} undone.` };
    setLastResult(result);
    return result;
  }, []);

  return {
    executeAction,
    lastResult,
    statusByAction,
    undoLastAction,
  };
};
