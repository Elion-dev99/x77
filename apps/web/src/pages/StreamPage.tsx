import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Eye, Gift as GiftIcon, BadgeCheck, Users, Flag, PictureInPicture2,
  MessageCircle, Coins, ArrowLeft,
} from 'lucide-react';
import { Header } from '../components/Header';
import { ChatPanel } from '../components/ChatPanel';
import { GiftPanel, GiftOverlay } from '../components/GiftPanel';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { useViewer } from '../hooks/useWebRTC';
import { api, type Stream, type Gift as GiftType, type ChatMessage } from '../lib/api';

interface ChatMsg {
  id: string;
  userId?: string;
  username: string;
  content: string;
  type: 'message' | 'gift' | 'system' | 'reaction';
  emoji?: string;
}

export function StreamPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { user, token, updatePoints } = useAuth();
  const { send, onMessage, connected } = useWebSocket(token);
  const { remoteVideoRef, hasStream, streamEnded } = useViewer(send, onMessage);

  const [stream, setStream] = useState<Stream | null>(null);
  const [gifts, setGifts] = useState<GiftType[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [showGifts, setShowGifts] = useState(false);
  const [giftOverlay, setGiftOverlay] = useState<{ icon: string; username: string; animation: string } | null>(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getStream(id).then(({ stream: s }) => {
      setStream(s);
      setViewerCount(s.viewer_count);
    });
    api.getGifts().then(({ gifts: g }) => setGifts(g));
    api.getChat(id).then(({ messages: m }) => {
      setMessages(m.map((msg: ChatMessage) => ({
        id: msg.id,
        userId: msg.user_id,
        username: msg.username,
        content: msg.content,
        type: msg.type as ChatMsg['type'],
      })));
    });
  }, [id]);

  useEffect(() => {
    if (connected && id && !joined) {
      send({ type: 'join', streamId: id, role: 'viewer' });
      setJoined(true);
    }
  }, [connected, id, joined, send]);

  useEffect(() => {
    const unsub = onMessage((msg) => {
      if (msg.type === 'chat') {
        setMessages((prev) => [...prev, {
          id: msg.id as string,
          userId: msg.userId as string,
          username: msg.username as string,
          content: msg.content as string,
          type: 'message',
        }]);
      }
      if (msg.type === 'viewer_count') {
        setViewerCount(msg.count as number);
      }
      if (msg.type === 'gift_animation') {
        const gift = msg.gift as GiftType;
        setGiftOverlay({ icon: gift.icon, username: msg.username as string, animation: gift.animation });
        setTimeout(() => setGiftOverlay(null), 3000);
      }
      if (msg.type === 'reaction') {
        setMessages((prev) => [...prev, {
          id: `reaction-${Date.now()}`,
          username: msg.username as string,
          content: '',
          type: 'reaction',
          emoji: msg.emoji as string,
        }]);
      }
      if (msg.type === 'stream_ended') {
        setStream((prev) => prev ? { ...prev, is_live: 0 } : null);
      }
    });
    return unsub;
  }, [onMessage]);

  const handleSendChat = useCallback((content: string) => {
    send({ type: 'chat', content });
  }, [send]);

  const handleReaction = useCallback((emoji: string) => {
    send({ type: 'reaction', emoji });
  }, [send]);

  const handleSendGift = async (giftId: string) => {
    if (!id || !user) return;
    try {
      const { remaining_points } = await api.sendGift(id, giftId);
      updatePoints(remaining_points);
      const gift = gifts.find((g) => g.id === giftId);
      if (gift) {
        send({ type: 'gift', gift, message: '' });
        setGiftOverlay({ icon: gift.icon, username: user.display_name, animation: gift.animation });
        setTimeout(() => setGiftOverlay(null), 3000);
      }
      setShowGifts(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : t('insufficient_points'));
    }
  };

  const handleChargePoints = async () => {
    try {
      const { points } = await api.chargePoints(5000);
      updatePoints(points);
    } catch { /* ignore */ }
  };

  const togglePiP = async () => {
    if (remoteVideoRef.current && document.pictureInPictureEnabled) {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await remoteVideoRef.current.requestPictureInPicture();
      }
    }
  };

  if (!stream) {
    return (
      <div className="min-h-screen bg-surface-900">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="animate-pulse text-zinc-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-900">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-4">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t('home')}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Video Player */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
              {stream.is_live && !streamEnded ? (
                <>
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {!hasStream && (
                    <div className="absolute inset-0 flex items-center justify-center bg-surface-800">
                      <div className="text-center">
                        <div className="w-12 h-12 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm text-zinc-400">Connecting to stream...</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-surface-800">
                  <p className="text-zinc-400">{t('stream_ended')}</p>
                </div>
              )}

              {giftOverlay && (
                <GiftOverlay {...giftOverlay} />
              )}

              <div className="absolute top-3 left-3 flex items-center gap-2">
                {stream.is_live ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/90 text-white text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse-live" /> LIVE
                  </span>
                ) : null}
                <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-black/60 text-white text-xs">
                  <Eye className="w-3 h-3" /> {viewerCount.toLocaleString()}
                </span>
              </div>

              <div className="absolute top-3 right-3 flex gap-2">
                {hasStream && (
                  <button onClick={togglePiP} className="p-2 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors">
                    <PictureInPicture2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Stream Info */}
            <div className="glass rounded-xl p-5">
              <h1 className="text-xl font-bold mb-2">{stream.title}</h1>
              <p className="text-sm text-zinc-400 mb-4">{stream.description}</p>

              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-400 to-purple-500 flex items-center justify-center text-white font-bold">
                    {stream.streamer_name?.[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold">{stream.streamer_name}</span>
                      {stream.streamer_verified ? <BadgeCheck className="w-4 h-4 text-brand-400" /> : null}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Users className="w-3 h-3" />
                      {(stream.streamer_followers || 0).toLocaleString()} followers
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {user && (
                    <>
                      <button
                        onClick={() => setShowGifts(!showGifts)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-500/20 text-brand-300 hover:bg-brand-500/30 text-sm font-medium transition-colors"
                      >
                        <GiftIcon className="w-4 h-4" /> {t('send_gift')}
                      </button>
                      <button
                        onClick={handleChargePoints}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-sm font-medium transition-colors"
                      >
                        <Coins className="w-4 h-4" /> {t('charge_points')}
                      </button>
                      <button
                        onClick={() => api.report({ stream_id: id, reason: 'Inappropriate content' })}
                        className="p-2 rounded-lg bg-surface-600 text-zinc-400 hover:text-red-400 transition-colors"
                        title={t('report')}
                      >
                        <Flag className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {showGifts && user && (
              <GiftPanel
                gifts={gifts}
                userPoints={user.points}
                onSendGift={handleSendGift}
                onClose={() => setShowGifts(false)}
              />
            )}
          </div>

          {/* Chat */}
          <div className="h-[600px] lg:h-auto lg:min-h-[500px]">
            <div className="flex items-center gap-2 mb-2 px-1">
              <MessageCircle className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-300">Chat</span>
            </div>
            <ChatPanel
              messages={messages}
              onSend={handleSendChat}
              onReaction={handleReaction}
              disabled={!user}
            />
            {!user && (
              <p className="text-xs text-zinc-500 text-center mt-2">
                <Link to="/login" className="text-brand-400 hover:underline">{t('login')}</Link> to chat
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
