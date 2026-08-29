import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Smile } from 'lucide-react';
import clsx from 'clsx';

interface ChatMsg {
  id: string;
  userId?: string;
  username: string;
  content: string;
  type: 'message' | 'gift' | 'system' | 'reaction';
  timestamp?: string;
  emoji?: string;
}

interface ChatPanelProps {
  messages: ChatMsg[];
  onSend: (content: string) => void;
  onReaction: (emoji: string) => void;
  disabled?: boolean;
}

const quickEmojis = ['❤️', '🔥', '👏', '😂', '🎉', '💯', '😮', '🌟', '👍', '💎'];
const pickerEmojis = ['😀', '😍', '🥳', '😎', '🤔', '👋', '🙏', '💪', '🎵', '🎮'];

export function ChatPanel({ messages, onSend, onReaction, disabled }: ChatPanelProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-surface-800 rounded-xl overflow-hidden">
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.map((msg) => (
          <div key={msg.id} className={clsx('text-sm', msg.type === 'system' && 'text-center text-zinc-500 text-xs')}>
            {msg.type === 'gift' ? (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-brand-500/10 border border-brand-500/20">
                <span className="text-lg">{JSON.parse(msg.content).icon}</span>
                <span>
                  <span className="font-medium text-brand-300">{msg.username}</span>
                  <span className="text-zinc-400"> sent {JSON.parse(msg.content).name}</span>
                </span>
              </div>
            ) : msg.type === 'reaction' ? (
              <div className="text-center animate-float-up">
                <span className="text-2xl">{msg.emoji}</span>
                <span className="text-xs text-zinc-500 ml-1">{msg.username}</span>
              </div>
            ) : msg.type === 'message' ? (
              <div>
                <span className="font-medium text-brand-300/80">{msg.username}: </span>
                <span className="text-zinc-300">{msg.content}</span>
              </div>
            ) : (
              <span>{msg.content}</span>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-2 border-t border-white/5">
        <div className="flex gap-1 mb-2">
          {quickEmojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onReaction(emoji)}
              disabled={disabled}
              className="px-2 py-1 rounded hover:bg-surface-600 transition-colors text-sm disabled:opacity-50"
            >
              {emoji}
            </button>
          ))}
        </div>
        {showEmojis && (
          <div className="flex flex-wrap gap-1 mb-2 p-2 rounded-lg bg-surface-700">
            {pickerEmojis.map((emoji) => (
              <button key={emoji} onClick={() => { onReaction(emoji); setShowEmojis(false); }}
                className="text-lg hover:scale-125 transition-transform">{emoji}</button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => setShowEmojis(!showEmojis)}
            className="p-2 rounded-lg hover:bg-surface-600 transition-colors text-zinc-400"
          >
            <Smile className="w-4 h-4" />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t('chat_placeholder')}
            disabled={disabled}
            className="flex-1 px-3 py-2 rounded-lg bg-surface-700 border border-white/5 text-sm focus:outline-none focus:border-brand-500/50 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={disabled || !input.trim()}
            className="p-2 rounded-lg bg-brand-500/20 text-brand-300 hover:bg-brand-500/30 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
