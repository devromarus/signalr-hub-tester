import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  JsonHubProtocol,
  LogLevel,
} from '@microsoft/signalr';
import type { HubMessage, IHubProtocol, ILogger, TransferFormat } from '@microsoft/signalr';
import { Subject } from 'rxjs';
import type { InvokeResult } from '../types/signalr.types';

// Сервис управления подключением к SignalR-хабу (FR-03, FR-04).
// Использует @microsoft/signalr (TR-08, C-06).

/**
 * Протокол-обёртка над JsonHubProtocol, перехватывающая КАЖДОЕ входящее
 * сообщение хаба (включая server-to-client вызовы вроде AddOrUpdateEntities,
 * которые приходят без явной подписки через connection.on(), а не только
 * completion-сообщения инвокаций) до его внутренней маршрутизации внутри
 * HubConnection. В отличие от отсутствующего в публичном API
 * `connection.onreceive`, используется официально поддерживаемый механизм
 * `withHubProtocol` (FR-18, FR-24).
 */
class MessageSpyHubProtocol implements IHubProtocol {
  constructor(
    private readonly inner: IHubProtocol,
    private readonly onMessages: (messages: HubMessage[]) => void,
  ) {}

  get name(): string {
    return this.inner.name;
  }

  get version(): number {
    return this.inner.version;
  }

  get transferFormat(): TransferFormat {
    return this.inner.transferFormat;
  }

  parseMessages(input: string | ArrayBuffer, logger: ILogger): HubMessage[] {
    const messages = this.inner.parseMessages(input, logger);
    if (messages.length > 0) {
      this.onMessages(messages);
    }
    return messages;
  }

  writeMessage(message: HubMessage): string | ArrayBuffer {
    return this.inner.writeMessage(message);
  }
}

export class SignalRService {
  private connection: HubConnection | null = null;
  private reconnectingHandler: ((error?: Error) => void) | null = null;
  private reconnectedHandler: ((connectionId?: string) => void) | null = null;
  private closeHandler: ((error?: Error) => void) | null = null;
  private messageHandlers: ((message: HubMessage) => void)[] = [];

  get isConnected(): boolean {
    return this.connection?.state === HubConnectionState.Connected;
  }

  get state(): HubConnectionState | null {
    return this.connection?.state ?? null;
  }

  /**
   * Установка соединения с хабом (FR-03).
   * Токен передаётся через accessTokenFactory (FR-07, раздел 3.5).
   * Автоматическое переподключение (ER-01, C-19).
   */
  async connect(hubUrl: string, token?: string): Promise<void> {
    await this.disconnect();

    const protocol = new MessageSpyHubProtocol(new JsonHubProtocol(), (messages) => {
      messages.forEach((message) => {
        this.messageHandlers.forEach((handler) => handler(message));
      });
    });

    const builder = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token ?? '',
      })
      .withHubProtocol(protocol)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Information);

    this.connection = builder.build();
    // Переустанавливаем обработчики событий соединения на новом инстансе
    // (каждый connect() создаёт новый HubConnection) (ER-01, C-19).
    if (this.reconnectingHandler) {
      this.connection.onreconnecting(this.reconnectingHandler);
    }
    if (this.reconnectedHandler) {
      this.connection.onreconnected(this.reconnectedHandler);
    }
    if (this.closeHandler) {
      this.connection.onclose(this.closeHandler);
    }
    await this.connection.start();
  }

  /** Корректное отключение от хаба (FR-04). */
  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
  }

  /** Вызов метода хаба (FR-11…FR-16). */
  async invoke(methodName: string, args: unknown[]): Promise<InvokeResult> {
    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {
      return {
        success: false,
        error: 'Нет активного соединения',
        durationMs: 0,
      };
    }
    const start = performance.now();
    try {
      const result = await this.connection.invoke(methodName, ...args);
      return { success: true, result, durationMs: performance.now() - start };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e),
        durationMs: performance.now() - start,
      };
    }
  }

  /** Подписка на событие хаба (FR-17). */
  on(eventName: string, handler: (...args: unknown[]) => void): void {
    if (!this.connection) {
      throw new Error('Нет активного соединения');
    }
    this.connection.on(eventName, handler);
  }

  /** Отписка от события хаба (FR-19). */
  off(eventName: string, handler: (...args: unknown[]) => void): void {
    if (!this.connection) {
      return;
    }
    this.connection.off(eventName, handler);
  }

  /** Приём потоковых данных (Server-to-Client Streaming) (FR-22). */
  stream<T>(methodName: string, ...args: unknown[]): Subject<T> {
    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {
      throw new Error('Нет активного соединения');
    }
    const subject = new Subject<T>();
    this.connection.stream<T>(methodName, ...args).subscribe({
      next: (item) => subject.next(item),
      error: (err) => subject.error(err),
      complete: () => subject.complete(),
    });
    return subject;
  }

  /**
   * Регистрация обработчиков событий соединения. Обработчики сохраняются и
   * переустанавливаются при каждом новом подключении, т.к. connect() создаёт
   * новый экземпляр HubConnection (ER-01, C-19).
   */
  onReconnecting(handler: (error?: Error) => void): void {
    this.reconnectingHandler = handler;
    this.connection?.onreconnecting(handler);
  }

  onReconnected(handler: (connectionId?: string) => void): void {
    this.reconnectedHandler = handler;
    this.connection?.onreconnected(handler);
  }

  onClose(handler: (error?: Error) => void): void {
    this.closeHandler = handler;
    this.connection?.onclose(handler);
  }

  /**
   * Подписка на ВСЕ входящие сообщения хаба, включая server-to-client вызовы
   * без явной подписки через on() (например, AddOrUpdateEntities), которые
   * приходят вперемешку с completion-сообщениями инвокаций (FR-18, FR-24).
   * Список обработчиков не зависит от конкретного соединения и переживает
   * переподключения/новые connect().
   */
  onMessage(handler: (message: HubMessage) => void): void {
    if (!this.messageHandlers.includes(handler)) {
      this.messageHandlers.push(handler);
    }
  }

  /** Отписка от перехвата входящих сообщений. */
  offMessage(handler: (message: HubMessage) => void): void {
    this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
  }
}

// Единственный экземпляр сервиса (singleton).
export const signalrService = new SignalRService();