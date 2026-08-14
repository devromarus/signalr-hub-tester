import { useEffect, useState } from 'react';
import { MessageType } from '@microsoft/signalr';
import type { HubMessage } from '@microsoft/signalr';
import { Button } from '@alfalab/core-components/button';
import { Divider } from '@alfalab/core-components/divider';
import { Input } from '@alfalab/core-components/input';
import { Select } from '@alfalab/core-components/select';
import { Textarea } from '@alfalab/core-components/textarea';
import { Typography } from '@alfalab/core-components/typography';
import { useMethodConfig } from '../../hooks/useMethodConfig';
import { parseArguments, validateJson } from '../../utils/json-validator';
import { signalrService } from '../../services/signalr.service';
import type { HubEvent, InvokeResult } from '../../types/signalr.types';
import styles from './MethodInvoker.module.css';

// Вызов методов хаба (FR-11…FR-16).
// Валидация JSON перед отправкой (FR-13, C-14), отображение результата и времени (FR-14, FR-15).
// Отображение входящих server-to-client вызовов (например, AddOrUpdateEntities),
// которые хаб присылает вслед за completion-сообщением вызова, но сами таковым
// не являются (FR-18, FR-24).
// Сохранение методов и тел запросов в localStorage (по аналогии с сохранёнными
// подключениями, FR-02).

interface MethodInvokerProps {
  isConnected: boolean;
  onInvoke: (methodName: string, args: unknown[]) => Promise<InvokeResult>;
  onEvent: (event: HubEvent) => void;
}

export function MethodInvoker({ isConnected, onInvoke, onEvent }: MethodInvokerProps) {
  const [methodName, setMethodName] = useState('');
  const [params, setParams] = useState('');
  const [result, setResult] = useState<InvokeResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [invoking, setInvoking] = useState(false);
  const [events, setEvents] = useState<HubEvent[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const { methods, save: saveMethod, remove: removeMethod } = useMethodConfig();

  // Накопление входящих server-to-client вызовов для отображения в реальном
  // времени (FR-18). completion-сообщения (result вызова) сюда не попадают —
  // они обрабатываются отдельно через onInvoke/result.
  useEffect(() => {
    const handleMessage = (message: HubMessage) => {
      if (message.type !== MessageType.Invocation) {
        return;
      }
      const event: HubEvent = {
        id: crypto.randomUUID(),
        eventName: message.target,
        data: message.arguments.length === 1 ? message.arguments[0] : message.arguments,
        timestamp: new Date().toISOString(),
      };
      setEvents((prev) => [...prev, event]);
      onEvent(event);
    };
    signalrService.onMessage(handleMessage);
    return () => signalrService.offMessage(handleMessage);
  }, [onEvent]);

  const handleInvoke = async () => {
    if (!methodName.trim() || !isConnected) {
      return;
    }

    // Валидация JSON (FR-13, ER-03, C-21)
    const validation = validateJson(params);
    if (!validation.valid) {
      setValidationError(
        validation.position !== undefined
          ? `Ошибка JSON на позиции ${validation.position}: ${validation.error}`
          : `Ошибка JSON: ${validation.error}`,
      );
      return;
    }
    setValidationError(null);

    setInvoking(true);
    try {
      const args = parseArguments(params);
      const res = await onInvoke(methodName.trim(), args);
      setResult(res);
    } finally {
      setInvoking(false);
    }
  };

  const handleSaveMethod = async () => {
    if (!methodName.trim()) {
      return;
    }
    await saveMethod(methodName.trim(), params);
  };

  const handleDeleteMethod = async () => {
    if (!selectedMethodId) {
      return;
    }
    await removeMethod(selectedMethodId);
    setSelectedMethodId(null);
  };

  const savedMethodOptions = methods.map((m) => {
    const paramsPreview = m.params.length > 60 ? `${m.params.slice(0, 60)}…` : m.params;
    return {
      key: m.id,
      content: paramsPreview ? `${m.methodName} — ${paramsPreview}` : m.methodName,
    };
  });

  return (
    <div className={styles.invoker}>
      <Typography.Title tag="h3" view="small">
        Вызов метода
      </Typography.Title>

      <Typography.Text view="primary-medium">Сохранённые методы</Typography.Text>
      {savedMethodOptions.length > 0 ? (
        <div className={styles.savedRow}>
          <Select
            options={savedMethodOptions}
            selected={selectedMethodId ?? undefined}
            placeholder="Выберите метод"
            onChange={(payload) => {
              const key = payload.selected?.key ?? null;
              setSelectedMethodId(key);
              const selected = methods.find((m) => m.id === key);
              if (selected) {
                setMethodName(selected.methodName);
                setParams(selected.params);
              }
            }}
            block
          />
          <Button
            view="secondary"
            onClick={handleDeleteMethod}
            disabled={!selectedMethodId}
          >
            Удалить
          </Button>
        </div>
      ) : (
        <Typography.Text view="secondary-medium">Нет сохранённых методов</Typography.Text>
      )}

      <Divider />

      <Input
        label="Имя метода"
        value={methodName}
        onChange={(e) => setMethodName(e.target.value)}
        placeholder="MyMethod"
        block
      />

      <Textarea
        label="Параметры (JSON)"
        value={params}
        onChange={(e) => setParams(e.target.value)}
        placeholder='[{"key": "value"}] или {"key": "value"}'
        minRows={4}
        block
      />

      {validationError && (
        <Typography.Text view="primary-medium" color="negative">
          {validationError}
        </Typography.Text>
      )}

      <div className={styles.actions}>
        <Button
          view="primary"
          onClick={handleInvoke}
          disabled={!isConnected || !methodName.trim() || invoking}
          loading={invoking}
        >
          Вызвать
        </Button>
        <Button view="secondary" onClick={handleSaveMethod} disabled={!methodName.trim()}>
          Сохранить
        </Button>
      </div>

      {result && (
        <div className={styles.result}>
          <Typography.Text view="primary-medium">
            {result.success ? 'Успех' : 'Ошибка'} · {result.durationMs.toFixed(2)} мс
          </Typography.Text>
          <pre className={styles.pre}>
            {result.success
              ? result.result === undefined || result.result === null
                ? 'Метод выполнен без возвращаемого значения'
                : JSON.stringify(result.result, null, 2)
              : result.error}
          </pre>
        </div>
      )}

      {events.length > 0 && (
        <div className={styles.result}>
          <Typography.Title tag="h4" view="xsmall">
            Входящие события
          </Typography.Title>
          {events.map((event) => (
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
          ))}
        </div>
      )}
    </div>
  );
}
