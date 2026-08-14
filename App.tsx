import { useCallback, useState } from 'react';
import { Tabs, Tab } from '@alfalab/core-components/tabs';
import { Typography } from '@alfalab/core-components/typography';
import { Toast } from '@alfalab/core-components/toast';
import { Divider } from '@alfalab/core-components/divider';
import { NavigationBar } from '@alfalab/core-components/navigation-bar';
import { AlfaBankLIcon } from '@alfalab/icons-logotype/AlfaBankLIcon';
import { ConnectionPanel } from './components/ConnectionPanel/ConnectionPanel';
import { StatusBar } from './components/StatusBar/StatusBar';
import { MethodInvoker } from './components/MethodInvoker/MethodInvoker';
import { EventSubscriber } from './components/EventSubscriber/EventSubscriber';
import { StreamViewer } from './components/StreamViewer/StreamViewer';
import { ActivityLog } from './components/ActivityLog/ActivityLog';
import { useSignalRConnection } from './hooks/useSignalRConnection';
import { useConnectionConfig } from './hooks/useConnectionConfig';
import { useActivityLog } from './hooks/useActivityLog';
import { useResizableSidebar } from './hooks/useResizableSidebar';
import { signalrService } from './services/signalr.service';
import type { HubEvent, InvokeResult, LogEntry, StreamItem } from './types/signalr.types';
import styles from './App.module.css';

// Корневой компонент приложения (TR-06, C-01).
// Интеграция всех компонентов, журналирование (FR-24), обработка ошибок (ER-01…ER-04).

const ALFA_BRAND_RED = '#ef3124';

type TabId = 'invoke' | 'events' | 'stream' | 'log';

function createLogEntry(type: LogEntry['type'], message: string, data?: unknown): LogEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    type,
    message,
    data,
  };
}

export function App() {
  const { status, connect, disconnect, error, clearError } = useSignalRConnection();
  const { configs, save } = useConnectionConfig();
  const { entries: logEntries, append: appendLog, clear: clearLog } = useActivityLog();
  const { width: sidebarWidth, isResizing, startResizing } = useResizableSidebar();
  const [activeTab, setActiveTab] = useState<TabId>('invoke');
  const [toast, setToast] = useState<{ title: string; content: string } | null>(null);
  const [selectedHubUrl, setSelectedHubUrl] = useState('');

  const handleConnect = useCallback(
    async (hubUrl: string, token?: string) => {
      try {
        await connect(hubUrl, token);
        appendLog(createLogEntry('info', `Подключено к ${hubUrl}`));
        setToast({ title: 'Успех', content: 'Подключение установлено' });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        appendLog(createLogEntry('error', `Ошибка подключения: ${message}`));
        setToast({ title: 'Ошибка', content: message });
      }
    },
    [connect, appendLog],
  );

  const handleDisconnect = useCallback(async () => {
    await disconnect();
    appendLog(createLogEntry('info', 'Отключено от хаба'));
  }, [disconnect, appendLog]);

  const handleInvoke = useCallback(
    async (methodName: string, args: unknown[]): Promise<InvokeResult> => {
      const result = await signalrService.invoke(methodName, args);
      // Тело запроса: имя метода и аргументы (FR-24)
      const requestBody = { method: methodName, args };
      if (result.success) {
        appendLog(
          createLogEntry('info', `Вызов ${methodName}`, {
            request: requestBody,
            response: result.result,
          }),
        );
      } else {
        appendLog(
          createLogEntry('error', `Ошибка вызова ${methodName}: ${result.error}`, {
            request: requestBody,
          }),
        );
      }
      return result;
    },
    [appendLog],
  );

  const handleEvent = useCallback(
    (event: HubEvent) => {
      appendLog(createLogEntry('event', `Событие ${event.eventName}`, event.data));
    },
    [appendLog],
  );

  const handleStreamItem = useCallback(
    (item: StreamItem) => {
      appendLog(createLogEntry('event', 'Элемент потока', item.data));
    },
    [appendLog],
  );

  const handleSave = useCallback(
    async (hubUrl: string) => {
      try {
        await save(hubUrl);
        appendLog(createLogEntry('info', `Сохранена конфигурация ${hubUrl}`));
        setToast({ title: 'Успех', content: 'Конфигурация сохранена' });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        appendLog(createLogEntry('error', `Ошибка сохранения: ${message}`));
        setToast({ title: 'Ошибка', content: message });
      }
    },
    [save, appendLog],
  );

  const handleSelectConfig = useCallback((config: { hubUrl: string }) => {
    // Выбор сохранённого подключения (FR-02): заполняем URL в панели подключения
    setSelectedHubUrl(config.hubUrl);
  }, []);

  const isConnected = status === 'connected';

  return (
    <div className={styles.app}>
      <NavigationBar
        className={styles.header}
        align="left"
        backgroundColor="#fff"
        border
        rightAddons={<StatusBar status={status} />}
      >
        <div className={styles.headerBrand}>
          <AlfaBankLIcon width={36} height={36} style={{ color: ALFA_BRAND_RED }} />
          <Typography.Title tag="h1" view="small">
            SignalR Hub Tester
          </Typography.Title>
        </div>
      </NavigationBar>

      <div className={styles.layout}>
        <aside className={styles.sidebar} style={{ width: sidebarWidth }}>
          <ConnectionPanel
            status={status}
            configs={configs}
            selectedHubUrl={selectedHubUrl}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onSave={handleSave}
            onSelectConfig={handleSelectConfig}
          />
        </aside>

        <div
          className={`${styles.resizeHandle} ${isResizing ? styles.resizeHandleActive : ''}`}
          onPointerDown={startResizing}
          role="separator"
          aria-orientation="vertical"
          aria-label="Изменить ширину панели подключения"
        />

        <main className={styles.main}>
          <Tabs
            size="m"
            view="secondary"
            selectedId={activeTab}
            onChange={(_event, payload) => setActiveTab(payload.selectedId as TabId)}
          >
            <Tab id="invoke" title="Вызов" />
            <Tab id="events" title="События" />
            <Tab id="stream" title="Поток" />
            <Tab id="log" title="Журнал" />
          </Tabs>

          <div className={styles.content}>
            {/* Все вкладки остаются смонтированными, неактивные скрываются через CSS,
                чтобы сохранять состояние полей при переключении (FR-11, UI-02) */}
            <div className={activeTab === 'invoke' ? undefined : styles.hidden}>
              <MethodInvoker
                isConnected={isConnected}
                onInvoke={handleInvoke}
                onEvent={handleEvent}
              />
            </div>
            <div className={activeTab === 'events' ? undefined : styles.hidden}>
              <EventSubscriber isConnected={isConnected} onEvent={handleEvent} />
            </div>
            <div className={activeTab === 'stream' ? undefined : styles.hidden}>
              <StreamViewer isConnected={isConnected} onStreamItem={handleStreamItem} />
            </div>
            <div className={activeTab === 'log' ? undefined : styles.hidden}>
              <ActivityLog entries={logEntries} onClear={clearLog} />
            </div>
          </div>
        </main>
      </div>

      <footer className={styles.footer}>
        <Divider />
        <div className={styles.footerContent}>
          <Typography.Text view="secondary-medium" color="tertiary">
            © {new Date().getFullYear()} АО «Альфа-Банк» · SignalR Hub Tester
          </Typography.Text>
          <Typography.Text view="secondary-medium" color="tertiary">
            Внутренний инструмент для тестирования SignalR-хабов
          </Typography.Text>
        </div>
      </footer>

      {toast && (
        <Toast
          open
          title={toast.title}
          badge="positive-checkmark"
          onClose={() => setToast(null)}
        >
          {toast.content}
        </Toast>
      )}

      {error && (
        <Toast open title="Ошибка" badge="negative-cross" onClose={clearError}>
          {error}
        </Toast>
      )}
    </div>
  );
}