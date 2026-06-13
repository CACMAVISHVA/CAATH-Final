import { createStore } from '../core/createStore';

type RealtimeState = {
  connected: boolean;
  lastHeartbeatAt: string | null;
};

export const realtimeStore = createStore<RealtimeState>({
  connected: false,
  lastHeartbeatAt: null,
});
