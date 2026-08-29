import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Eye, Gift as GiftIcon, BadgeCheck, Users, Flag, PictureInPicture2,
  MessageCircle, Coins, ArrowLeft, UserPlus, Video, WifiOff,
} from 'lucide-react';
import { Header } from '../components/Header';
import { MobileNav } from '../components/MobileNav';
import { ChatPanel } from '../components/ChatPanel';
import { GiftPanel, GiftOverlay } from '../components/GiftPanel';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
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
  const { toast } = useToast();
  const { send, onMessage, connected } = useWebSocket(token);
  const { remoteVideoRef, hasStream, streamEnded } = useViewer(send, onMessage);

  const [stream, setStream] = useState<Stream | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [gifts, setGifts] = useState<GiftType[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [showGifts, setShowGifts] = useState(false);
  const [giftOverlay, setGiftOverlay] = useState<{ icon: string; username: string; animation: string } | null>(null);
  const [joined, setJoined] = useState(false);
  const [following, setFollowing] = useState(false);
  const [passwordGate, setPasswordGate] = useState(false);
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [billingActive, setBillingActive] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoadError(false);
    api.getStream(id)
      .then(({ stream: s }) => {
        setStream(s);
        setViewerCount(s.viewer_count);
        setPasswordGate(!!s.is_private);
        setUnlocked(!s.is_private);
        if (user) {
          api.getFollowingStatus(s.streamer_id).then(({ following: f }) => setFollowing(f)).catch(() => {});
        }
      })
      .catch(() => setLoadError(true));
    api.getGifts().then(({ gifts: g }) => setGifts(g)).catch(() => {});
    api.getChat(id).then(({ messages: m }) => {
      setMessages(m.map((msg: ChatMessage) => ({
        id: msg.id, userId: msg.user_id, username: msg.username,
        content: msg.content, type: msg.type as ChatMsg['type'],
      })));
    }).catch(() => {});
  }, [id, user]);

  useEffect(() => {
    if (connected && id && unlocked && !joined) {
      send({ type: 'join', streamId: id, role: 'viewer' });
      setJoined(true);
    }
  }, [connected, id, joined, send, unlocked]);

  useEffect(() => {
    if (!id || !user || !unlocked || !stream?.price_per_minute) return;
    api.startWatch(id).catch(() => {});
    setBillingActive(true);
    const interval = setInterval(async () => {
      try {
        const res = await api.billWatch(id);
        updatePoints(res.points);
      } catch {
        setBillingActive(false);
        toast(t('insufficient_points'), 'error');
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [id, user, unlocked, stream?.price_per_minute, updatePoints, toast, t]);

  useEffect(() => {
    const unsub = onMessage((msg) => {
      if (msg.type === 'chat') {
        setMessages((prev) => [...prev, {
          id: msg.id as string, userId: msg.userId as string,
          username: msg.username as string, content: msg.content as string, type: 'message',
        }]);
      }
      if (msg.type === 'viewer_count') setViewerCount(msg.count as number);
      if (msg.type === 'gift_animation') {
        const gift = msg.gift as GiftType;
        setGiftOverlay({ icon: gift.icon, username: msg.username as string, animation: gift.animation });
        setTimeout(() => setGiftOverlay(null), 3000);
      }
      if (msg.type === 'reaction') {
        setMessages((prev) => [...prev, {
          id: `reaction-${Date.now()}`, username: msg.username as string,
          content: '', type: 'reaction', emoji: msg.emoji as string,
        }]);
      }
      if (msg.type === 'stream_ended') setStream((prev) => prev ? { ...prev, is_live: 0 } : null);
    });
    return unsub;
  }, [onMessage]);

  const verifyPassword = async () => {
    if (!id) return;
    try {
      await api.verifyStreamPassword(id, password);
      setUnlocked(true);
      setPasswordGate(false);
    } catch {
      toast(t('invalid_password'), 'error');
    }
  };

  const toggleFollow = async () => {
    if (!stream || !user) return;
    try {
      if (following) {
        await api.unfollow(stream.streamer_id);
        setFollowing(false);
      } else {
        await api.follow(stream.streamer_id);
        setFollowing(true);
        toast(t('following'), 'success');
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Error', 'error');
    }
  };

  const requestTwoShot = async () => {
    if (!stream || !user) return;
    try {
      await api.requestTwoShot(stream.streamer_id);
      toast(t('two_shot_requested'), 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Error', 'error');
    }
  };

  const handleSendChat = useCallback((content: string) => send({ type: 'chat', content }), [send]);
  const handleReaction = useCallback((emoji: string) => send({ type: 'reaction', emoji }), [send]);

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
      toast(t('gift_sent'), 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : t('insufficient_points'), 'error');
    }
  };

  const handleReport = async () => {
    if (!id) return;
    const reason = window.prompt(t('report_reason'));
    if (!reason) return;
    await api.report({ stream_id: id, target_user_id: stream?.streamer_id, reason });
    toast(t('report_sent'), 'success');
  };

  const togglePiP = async () => {
    if (remoteVideoRef.current && document.pictureInPictureEnabled) {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await remoteVideoRef.current.requestPictureInPicture();
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-surface-900 flex flex-col items-center justify-center gap-4">
        <Header />
        <p className="text-zinc-400">{t('not_found')}</p>
        <Link to="/" className="text-brand-400 hover:underline">{t('home')}</Link>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="min-h-screen bg-surface-900">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="w-10 h-10 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (passwordGate && !unlocked) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center px-4">
        <div className="glass rounded-2xl p-8 max-w-sm w-full">
          <h2 className="text-lg font-bold mb-4">{t('private_room')}</h2>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder={t('enter_password')} className="w-full px-3 py-2.5 rounded-lg bg-surface-700 border border-white/5 mb-4 text-sm" />
          <button onClick={verifyPassword} className="w-full py-3 rounded-xl bg-brand-500 text-white font-semibold">{t('confirm')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-900 pb-20 md:pb-0">
      <Header />
      {!connected && (
        <div className="bg-amber-500/10 text-amber-300 text-xs text-center py-1.5 flex items-center justify-center gap-1">
          <WifiOff className="w-3 h-3" /> {t('reconnecting')}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-4">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> {t('home')}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
              {stream.is_live && !streamEnded ? (
                <>
                  <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  {!hasStream && (
                    <div className="absolute inset-0 flex items-center justify-center bg-surface-800">
                      <div className="w-12 h-12 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-surface-800">
                  <p className="text-zinc-400">{t('stream_ended')}</p>
                </div>
              )}
              {giftOverlay && <GiftOverlay {...giftOverlay} />}
              <div className="absolute top-3 left-3 flex items-center gap-2 flex-wrap">
                {stream.is_live && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/90 text-white text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse-live" /> LIVE
                  </span>
                )}
                {billingActive && stream.price_per_minute > 0 && (
                  <span className="px-2 py-1 rounded-md bg-amber-500/80 text-white text-xs">{stream.price_per_minute} {t('per_minute')}</span>
                )}
                <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-black/60 text-white text-xs">
                  <Eye className="w-3 h-3" /> {viewerCount.toLocaleString()}
                </span>
              </div>
              {hasStream && (
                <button onClick={togglePiP} className="absolute top-3 right-3 p-2 rounded-lg bg-black/60 text-white">
                  <PictureInPicture2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="glass rounded-xl p-5">
              <h1 className="text-xl font-bold mb-2">{stream.title}</h1>
              <p className="text-sm text-zinc-400 mb-4">{stream.description}</p>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <Link to={`/u/${stream.streamer_username}`} className="flex items-center gap-3 hover:opacity-80">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-400 to-purple-500 flex items-center justify-center text-white font-bold">
                    {stream.streamer_name?.[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold">{stream.streamer_name}</span>
                      {stream.streamer_verified ? <BadgeCheck className="w-4 h-4 text-brand-400" /> : null}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Users className="w-3 h-3" /> {(stream.streamer_followers || 0).toLocaleString()} {t('followers')}
                    </div>
                  </div>
                </Link>
                <div className="flex flex-wrap gap-2">
                  {user && (
                    <>
                      <button onClick={toggleFollow} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-600 text-sm">
                        <UserPlus className="w-4 h-4" /> {following ? t('following') : t('follow')}
                      </button>
                      <button onClick={requestTwoShot} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-500/20 text-purple-300 text-sm">
                        <Video className="w-4 h-4" /> {t('two_shot_request')}
                      </button>
                      <button onClick={() => setShowGifts(!showGifts)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-500/20 text-brand-300 text-sm">
                        <GiftIcon className="w-4 h-4" /> {t('send_gift')}
                      </button>
                      <Link to="/wallet" className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 text-sm">
                        <Coins className="w-4 h-4" /> {t('charge_points')}
                      </Link>
                      <button onClick={handleReport} className="p-2 rounded-lg bg-surface-600 text-zinc-400 hover:text-red-400">
                        <Flag className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            {showGifts && user && (
              <GiftPanel gifts={gifts} userPoints={user.points} onSendGift={handleSendGift} onClose={() => setShowGifts(false)} />
            )}
          </div>

          <div className="h-[50vh] lg:h-auto lg:min-h-[500px]">
            <div className="flex items-center gap-2 mb-2 px-1">
              <MessageCircle className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-medium">{t('chat')}</span>
            </div>
            <ChatPanel messages={messages} onSend={handleSendChat} onReaction={handleReaction} disabled={!user || !connected} />
            {!user && (
              <p className="text-xs text-zinc-500 text-center mt-2">
                <Link to="/login" className="text-brand-400">{t('login')}</Link>
              </p>
            )}
          </div>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
