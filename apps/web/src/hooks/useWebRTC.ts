import { useEffect, useRef, useCallback, useState } from 'react';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function useBroadcaster(
  send: (msg: object) => void,
  onMessage: (handler: (msg: Record<string, unknown>) => void) => () => void,
) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startBroadcast = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: true,
      });
      streamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setIsLive(true);
      setError(null);
    } catch (e) {
      setError('Camera/microphone access denied. Please allow permissions.');
      console.error(e);
    }
  }, []);

  const stopBroadcast = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    setIsLive(false);
  }, []);

  const createPeerConnection = useCallback((viewerId: string) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    streamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, streamRef.current!);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        send({ type: 'ice_candidate', candidate: event.candidate, viewerId });
      }
    };

    peersRef.current.set(viewerId, pc);
    return pc;
  }, [send]);

  useEffect(() => {
    const unsub = onMessage(async (msg) => {
      if (msg.type === 'viewer_joined' && isLive) {
        const viewerId = msg.viewerId as string;
        const pc = createPeerConnection(viewerId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        send({ type: 'offer', offer, targetViewerId: viewerId });
      }

      if (msg.type === 'answer') {
        const viewerId = msg.viewerId as string;
        const pc = peersRef.current.get(viewerId);
        if (pc) await pc.setRemoteDescription(msg.answer as RTCSessionDescriptionInit);
      }

      if (msg.type === 'ice_candidate') {
        const viewerId = msg.viewerId as string;
        const pc = peersRef.current.get(viewerId);
        if (pc && msg.candidate) {
          await pc.addIceCandidate(msg.candidate as RTCIceCandidateInit);
        }
      }

      if (msg.type === 'viewer_left') {
        const viewerId = msg.viewerId as string;
        const pc = peersRef.current.get(viewerId);
        pc?.close();
        peersRef.current.delete(viewerId);
      }
    });
    return unsub;
  }, [onMessage, send, isLive, createPeerConnection]);

  return { localVideoRef, isLive, error, startBroadcast, stopBroadcast };
}

export function useViewer(
  send: (msg: object) => void,
  onMessage: (handler: (msg: Record<string, unknown>) => void) => () => void,
) {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [hasStream, setHasStream] = useState(false);
  const [streamEnded, setStreamEnded] = useState(false);

  useEffect(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setHasStream(true);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        send({ type: 'ice_candidate', candidate: event.candidate });
      }
    };

    const unsub = onMessage(async (msg) => {
      if (msg.type === 'offer') {
        await pc.setRemoteDescription(msg.offer as RTCSessionDescriptionInit);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        send({ type: 'answer', answer });
      }

      if (msg.type === 'ice_candidate' && msg.candidate) {
        await pc.addIceCandidate(msg.candidate as RTCIceCandidateInit);
      }

      if (msg.type === 'stream_ended') {
        setStreamEnded(true);
        setHasStream(false);
      }
    });

    return () => {
      unsub();
      pc.close();
      pcRef.current = null;
    };
  }, [send, onMessage]);

  return { remoteVideoRef, hasStream, streamEnded };
}
