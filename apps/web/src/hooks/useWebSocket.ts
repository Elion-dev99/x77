import { useEffect, useRef, useCallback, useState } from 'react';
import { getWsUrl } from '../lib/api';

interface WsMessage {
  type: string;
  [key: string]: unknown;
}

type MessageHandler = (msg: WsMessage) => void;

export function useWebSocket(token: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Set<MessageHandler>>(new Set());
  const [connected, setConnected] = useState(false);
  const reconnectRef = useRef(0);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const connect = useCallback(() => {
    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectRef.current = 0;
      if (tokenRef.current) {
        ws.send(JSON.stringify({ type: 'auth', token: tokenRef.current }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handlersRef.current.forEach((h) => h(msg));
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      setConnected(false);
      const delay = Math.min(1000 * 2 ** reconnectRef.current, 10000);
      reconnectRef.current += 1;
      setTimeout(connect, delay);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  useEffect(() => {
    if (connected && token && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'auth', token }));
    }
  }, [token, connected]);

  const send = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const onMessage = useCallback((handler: MessageHandler) => {
    handlersRef.current.add(handler);
    return () => { handlersRef.current.delete(handler); };
  }, []);

  return { send, onMessage, connected };
}
