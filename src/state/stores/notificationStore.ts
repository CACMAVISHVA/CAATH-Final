import { createStore } from '../core/createStore';

type NotificationState = {
  unreadCount: number;
};

export const notificationStore = createStore<NotificationState>({
  unreadCount: 0,
});
