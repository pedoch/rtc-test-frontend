import { createContext, useEffect, useRef, useState } from "react";
import Peer from "simple-peer";
import { io } from "socket.io-client";

type TCallStatus = "idle" | "calling" | "connected" | "ended";

type SocketContextType = {
  callStatus: TCallStatus;
  callDetails: {
    identifier: string;
    signal: Peer.SignalData | null;
  };
  myVideo: React.RefObject<HTMLVideoElement | null>;
  myAudio: React.RefObject<HTMLAudioElement | null>;
  stream: MediaStream | undefined;
  streamState: "video" | "audio";
  setStreamState?: React.Dispatch<React.SetStateAction<"video" | "audio">>;
  startCall: (id: string) => void;
  leaveCall: () => void;
};

const SocketContext = createContext<SocketContextType>({
  callStatus: "idle",
  callDetails: {
    identifier: "",
    signal: null,
  },
  myVideo: { current: null },
  myAudio: { current: null },
  stream: undefined,
  streamState: "video",
  setStreamState: undefined,
  startCall: (id: string) => {},
  leaveCall: () => {},
});
const socket = io("http://localhost:8080");

const ContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [callStatus, setCallStatus] = useState<TCallStatus>("idle");
  const [stream, setStream] = useState<MediaStream | undefined>(undefined);
  const [streamState, setStreamState] = useState<"video" | "audio">("video");
  const [call, setCall] = useState<{
    identifier: string;
    signal: Peer.SignalData | null;
  }>({
    identifier: "",
    signal: null,
  });
  const myVideo = useRef<HTMLVideoElement>(null);
  const myAudio = useRef<HTMLAudioElement>(null);
  const connectionRef = useRef<Peer.Instance>(null);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia(
        streamState === "video"
          ? { video: true, audio: false }
          : { video: false, audio: true }
      )
      .then((currentStream) => {
        setStream(currentStream);
        if (myVideo.current && streamState === "video") {
          myVideo.current.srcObject = currentStream;
        }
        if (myAudio.current && streamState === "audio") {
          myAudio.current.srcObject = currentStream;
        }
      });

    socket.on("callUser", ({ from, signal }) => {
      setCall({ identifier: from, signal });
    });
    socket.on("callEnded", () => {
      setCallStatus("ended");
      connectionRef.current?.destroy();
      window.location.reload();
    });

    return () => {
      socket.off("callUser");
      socket.off("callEnded");
      if (connectionRef.current) {
        connectionRef.current.destroy();
      }
    };
  }, [streamState]);

  const startCall = (id: string) => {
    try {
      setCallStatus("calling");
      const peer = new Peer({ initiator: true, trickle: false, stream });
      peer.on("signal", (data) => {
        socket.emit("startInterview", {
          signalData: data,
          to: id,
        });
      });
      peer.on("stream", (currentStream) => {});
      socket.on("callAccepted", (signal) => {
        setCallStatus("connected");
        peer.signal(signal);
      });
      connectionRef.current = peer;
    } catch (error) {
      console.error("Error starting call:", error);
      setCallStatus("ended");
    }
  };

  const leaveCall = () => {
    setCallStatus("ended");
    connectionRef.current?.destroy();
    window.location.reload();
  };

  return (
    <SocketContext.Provider
      value={{
        callStatus: callStatus,
        callDetails: call,
        myVideo,
        myAudio,
        stream,
        streamState,
        setStreamState,
        startCall,
        leaveCall,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
export { ContextProvider, SocketContext };
