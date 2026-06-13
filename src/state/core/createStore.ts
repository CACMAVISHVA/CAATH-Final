import { useSyncExternalStore } from 'react';

type Listener = () => void;

export const createStore = <TState>(initialState: TState) => {
  let state = initialState;
  const listeners = new Set<Listener>();

  return {
    getState: () => state,
    setState: (next: TState | ((prev: TState) => TState)) => {
      state = typeof next === 'function' ? (next as (prev: TState) => TState)(state) : next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener: Listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

export const useStoreSelector = <TState, TSelected>(
  store: { getState: () => TState; subscribe: (listener: Listener) => () => void },
  selector: (state: TState) => TSelected,
) => useSyncExternalStore(store.subscribe, () => selector(store.getState()));
