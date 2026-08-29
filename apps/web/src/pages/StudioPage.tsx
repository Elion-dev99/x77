import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Video, Mic, MicOff, VideoOff, Radio, Lock } from 'lucide-react';
import { Header } from '../components/Header';
import { MobileNav } from '../components/MobileNav';
import { ChatPanel } from '../components/ChatPanel';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { useBroadcaster } from '../hooks/useWebRTC';
import { api, type Stream } from '../lib/api';

interface ChatMsg {
  id: string;
  username: string;
  content: string;
  type: 'message' | 'gift' | 'system' | 'reaction';
}

export function StudioPage() {
  const { t } = useTranslation();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { send, onMessage, connected } = useWebSocket(token);
  const { localVideoRef, error, startBroadcast, stopBroadcast, toggleAudio, toggleVideo } = useBroadcaster(send, onMessage);

  const [stream, setStream] = useState<Stream | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [pendingJoin, setPendingJoin] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', category: 'talk', price_per_minute: 0,
    is_private: false, private_password: '', scheduled_at: '',
  });
  const [step, setStep] = useState<'setup' | 'live'>('setup');

  useEffect(() => {
    if (user && user.role !== 'streamer' && user.role !== 'admin') navigate('/');
  }, [user, navigate]);

  useEffect(() => {
    if (connected && pendingJoin) {
      send({ type: 'join', streamId: pendingJoin, role: 'broadcaster' });
      setPendingJoin(null);
    }
  }, [connected, pendingJoin, send]);

  useEffect(() => {
    const unsub = onMessage((msg) => {
      if (msg.type === 'chat') {
        setMessages((prev) => [...prev, {
          id: msg.id as string, username: msg.username as string,
          content: msg.content as string, type: 'message',
        }]);
      }
      if (msg.type === 'viewer_count') setViewerCount(msg.count as number);
      if (msg.type === 'gift_animation') {
        const gift = msg.gift as { icon: string; name: string };
        setMessages((prev) => [...prev, {
          id: `gift-${Date.now()}`, username: msg.username as string,
          content: JSON.stringify(gift), type: 'gift',
        }]);
      }
    });
    return unsub;
  }, [onMessage]);

  const handleCreateAndGoLive = async () => {
    if (!form.title.trim()) return;
    try {
      const payload = {
        ...form,
        is_private: form.is_private,
        private_password: form.is_private ? form.private_password : null,
        scheduled_at: form.scheduled_at || null,
      };
      const { stream: s } = await api.createStream(payload);
      const { stream: live } = await api.goLive(s.id);
      setStream(live);
      await startBroadcast();
      setPendingJoin(s.id);
      if (connected) send({ type: 'join', streamId: s.id, role: 'broadcaster' });
      setStep('live');
      toast(t('go_live'), 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed', 'error');
    }
  };

  const handleEndStream = async () => {
    if (stream) await api.endStream(stream.id);
    stopBroadcast();
    setStep('setup');
    setStream(null);
    setMessages([]);
    setViewerCount(0);
    toast(t('stream_ended'), 'info');
  };

  const handleSendChat = useCallback((content: string) => send({ type: 'chat', content }), [send]);
  const handleReaction = useCallback((emoji: string) => send({ type: 'reaction', emoji }), [send]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-surface-900 pb-20 md:pb-0">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Video className="w-6 h-6 text-brand-400" /> {t('studio')}
        </h1>

        {step === 'setup' ? (
          <div className="max-w-xl glass rounded-2xl p-8">
            <h2 className="text-lg font-semibold mb-6">{t('create_stream')}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">{t('title')}</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface-700 border border-white/5 text-sm" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">{t('description')}</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface-700 border border-white/5 text-sm resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">{t('category')}</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-700 border border-white/5 text-sm">
                    <option value="talk">{t('talk')}</option>
                    <option value="music">{t('music')}</option>
                    <option value="gaming">{t('gaming')}</option>
                    <option value="premium">{t('premium')}</option>
                    <option value="multi_angle">{t('multi_angle')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">{t('price')}</label>
                  <input type="number" min={0} value={form.price_per_minute}
                    onChange={(e) => setForm({ ...form, price_per_minute: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-700 border border-white/5 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">{t('scheduled')}</label>
                <input type="datetime-local" value={form.scheduled_at}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface-700 border border-white/5 text-sm" />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.is_private}
                  onChange={(e) => setForm({ ...form, is_private: e.target.checked })} />
                <Lock className="w-4 h-4 text-zinc-400" /> {t('private_room')}
              </label>
              {form.is_private && (
                <input value={form.private_password} onChange={(e) => setForm({ ...form, private_password: e.target.value })}
                  placeholder={t('enter_password')} className="w-full px-3 py-2.5 rounded-lg bg-surface-700 border border-white/5 text-sm" />
              )}
              {error && <div className="p-3 rounded-lg bg-red-500/10 text-red-300 text-sm">{error}</div>}
              <button onClick={handleCreateAndGoLive} disabled={!form.title.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-brand-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                <Radio className="w-5 h-5" /> {t('start_broadcast')}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/90 text-white text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse-live" /> LIVE
                  </span>
                  <span className="px-2 py-1 rounded-md bg-black/60 text-white text-xs">{viewerCount} {t('viewers')}</span>
                </div>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-3">
                  <button onClick={() => { const v = !audioEnabled; setAudioEnabled(v); toggleAudio(v); }}
                    className={`p-3 rounded-full ${audioEnabled ? 'bg-surface-600/80' : 'bg-red-500/80'} text-white`}>
                    {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  </button>
                  <button onClick={() => { const v = !videoEnabled; setVideoEnabled(v); toggleVideo(v); }}
                    className={`p-3 rounded-full ${videoEnabled ? 'bg-surface-600/80' : 'bg-red-500/80'} text-white`}>
                    {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  </button>
                  <button onClick={handleEndStream} className="px-6 py-3 rounded-full bg-red-600 text-white font-semibold text-sm">
                    {t('end_stream')}
                  </button>
                </div>
              </div>
              <div className="glass rounded-xl p-4">
                <h2 className="font-semibold">{stream?.title}</h2>
                <p className="text-sm text-zinc-400 mt-1">{stream?.description}</p>
              </div>
            </div>
            <div className="h-[50vh] lg:h-[500px]">
              <ChatPanel messages={messages} onSend={handleSendChat} onReaction={handleReaction} />
            </div>
          </div>
        )}
      </div>
      <MobileNav />
    </div>
  );
}
