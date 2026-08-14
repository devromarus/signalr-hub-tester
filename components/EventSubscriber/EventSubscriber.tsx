import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@alfalab/core-components/button';
import { Input } from '@alfalab/core-components/input';
import { Typography } from '@alfalab/core-components/typography';
import { signalrService } from '../../services/signalr.service';
import type { HubEvent } from '../../types/signalr.types';
import styles from './EventSubscriber.module.css';

// Подписка на события хаба (FR-17…FR-21).
// Отображение входящих событий в реальном времени с временными метками (FR-18, FR-20).

interface EventSubscriberProps {
  isConnected: boolean;
  onEvent: (event: HubEvent) => void;
}

export function EventSubscriber({ isConnected, onEvent }: EventSubscriberProps) {
  const [eventName, setEventName] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [events, setEvents] = useState<HubEvent[]>([]);
  const handlerRef = useRef<((...args: unknown[]) => void) | null>(null);

  const handleEvent = useCallback(
    (...args: unknown[]) => {
      const event: HubEvent = {
        id: crypto.randomUUID(),
        eventName,
        data: args.length === 1 ? args[0] : args,
        timestamp: new Date().toISOString(),
      };
      setEvents((prev) => [...prev, event]);
      onEvent(event);
    },
    [eventName, onEvent],
  );

  const subscribe = () => {
    if (!eventName.trim() || !isConnected) {
      return;
    }
    handlerRef.current = handleEvent;
    signalrService.on(eventName.trim(), handleEvent);
    setSubscribed(true);
  };

  const unsubscribe = () => {
    if (handlerRef.current) {
      signalrService.off(eventName.trim(), handlerRef.current);
      handlerRef.current = null;
    }
    setSubscribed(false);
  };

  // Отписка при размонтировании
  useEffect(() => {
    return () => {
      if (handlerRef.current) {
        signalrService.off(eventName, handlerRef.current);
      }
    };
  }, [eventName]);

  const clearEvents = () => setEvents([]);

  return (
    <div className={styles.subscriber}>
      <Typography.Title tag="h3" view="small">
        События
      </Typography.Title>

      <div className={styles.controls}>
        <Input
          label="Имя события"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          placeholder="MyEvent"
          block
        />
        {subscribed ? (
          <Button view="secondary" onClick={unsubscribe}>
            Отписаться
          </Button>
        ) : (
          <Button
            view="primary"
            onClick={subscribe}
            disabled={!isConnected || !eventName.trim()}
          >
            Подписаться
          </Button>
        )}
        <Button view="secondary" onClick={clearEvents} disabled={events.length === 0}>
          Очистить
        </Button>
      </div>

      <div className={styles.list}>
        {events.length === 0 ? (
          <Typography.Text view="secondary-medium">Нет событий</Typography.Text>
        ) : (
          events.map((event) => (
            <div key={event.id} className={styles.event}>
              <Typography.Text view="secondary-medium" tag="span">
                {new Date(event.timestamp).toLocaleTimeString()}
              </Typography.Text>
              <Typography.Text view="primary-medium" tag="span">
                {event.eventName}
              </Typography.Text>
              <pre className={styles.pre}>
                {JSON.stringify(event.data, null, 2)}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}