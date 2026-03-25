"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type WebSocketMessage = {
  type: "message" | "typing" | "online" | "offline" | "read" | "delivered";
  payload: Record<string, unknown>;
};

export type UseWebSocketOptions = {
  url: string;
  onMessage?: (message: WebSocketMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnect?: boolean;
  reconnectInterval?: number;
};

export function useWebSocket({
  url,
  onMessage,
  onOpen,
  onClose,
  onError,
  reconnect = true,
  reconnectInterval = 3000,
}: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectRef = useRef<() => void>(() => {});

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setIsConnected(true);
        onOpen?.();
      };

      ws.onclose = () => {
        setIsConnected(false);
        onClose?.();

        if (reconnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectRef.current();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        onError?.(error);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          onMessage?.(message);
        } catch {
          console.error("Failed to parse WebSocket message");
        }
      };

      wsRef.current = ws;
    } catch {
      console.error("Failed to create WebSocket connection");
    }
  }, [url, onMessage, onOpen, onClose, onError, reconnect, reconnectInterval]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    send,
    disconnect,
    reconnect: connect,
  };
}

export type ChatWebSocketMessage = {
  type: "new_message" | "typing_start" | "typing_stop" | "mark_read" | "user_online" | "user_offline";
  conversationId?: string;
  messageId?: string;
  userId?: string;
  body?: string;
  timestamp?: string;
};

export function useChatWebSocket(conversationId: string | null, userId: string) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
  const wsUrl = backendUrl.replace(/^http/, "ws") + "/ws/chat";

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<ChatWebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectRef = useRef<() => void>(() => {});

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!conversationId) return;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(`${wsUrl}?conversationId=${conversationId}&userId=${userId}`);

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimeoutRef.current = setTimeout(() => {
          connectRef.current();
        }, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as ChatWebSocketMessage;
          setLastMessage(message);
        } catch {
          console.error("Failed to parse WebSocket message");
        }
      };

      wsRef.current = ws;
    } catch {
      reconnectTimeoutRef.current = setTimeout(() => {
        connectRef.current();
      }, 3000);
    }
  }, [conversationId, userId, wsUrl]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    if (!conversationId) return;

    connect();

    return () => {
      disconnect();
    };
  }, [conversationId, connect, disconnect]);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: isTyping ? "typing_start" : "typing_stop",
        conversationId,
        userId,
      }));
    }
  }, [conversationId, userId]);

  const sendMarkRead = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "mark_read",
        conversationId,
        userId,
      }));
    }
  }, [conversationId, userId]);

  return {
    isConnected,
    lastMessage,
    sendTyping,
    sendMarkRead,
  };
}
