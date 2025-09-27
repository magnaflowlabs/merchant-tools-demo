import { useAppStore } from '@/stores';
import { Notification } from './notification';

export function NotificationContainer() {
  const { notifications, removeNotification } = useAppStore();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          {...notification}
          onClose={removeNotification}
        />
      ))}
    </div>
  );
}
