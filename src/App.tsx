import { useEffect, useRef, useState } from "react";
import "./App.css";

type TCallStatus = "idle" | "calling" | "connected";

// const websocket = new WebSocket(
//   "ws://telephone-app-414305781523.us-east1.run.app/"
// );

const websocket = new WebSocket("ws://7bc9-41-217-45-97.ngrok-free.app/");

const generateRandomId = () => {
  return Math.random().toString(36).substring(2, 15);
};

function App() {
  const [callStatus, setCallStatus] = useState<TCallStatus>("idle");
  const [stream, setStream] = useState<MediaStream | undefined>(undefined);
  const [streamState, setStreamState] = useState<"video" | "audio">("video");
  const myVideo = useRef<HTMLVideoElement>(null);
  const audioRecorderRef = useRef<MediaRecorder | undefined>(undefined);
  const sessionIdRef = useRef<string>("");

  useEffect(() => {
    websocket.onopen = () => {
      console.log("WebSocket connection established");
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Received message from server:", data);
      handleSocketTypes(data);
    };

    websocket.onclose = () => {
      console.log("WebSocket connection closed");
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    startAudioCapture();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSocketTypes = (data: any) => {
    switch (data.type) {
      case "session_initialized":
        console.log("Session initialized:", data.session_id);
        // Start the conversation
        startConversation();
        break;

      case "transcript":
        console.log("User said:", data.text);
        break;

      case "ai_audio":
        console.log("AI response received");
        stopGettingAudio(); // Start getting audio after response
        playAudioResponse(data.audio);
        if (data.is_greeting) {
          console.log("This is the initial greeting");
        }
        startGettingAudio(); // Restart audio capture after response
        break;

      case "session_ended":
        console.log("Session ended:", data.session_id);
        cleanup();
        break;

      case "error":
        console.error("Server error:", data.message);
        break;
    }
  };

  const initSessions = () => {
    try {
      const id = generateRandomId();

      const data = {
        type: "init_session",
        session_id: id,
        user_id: "user_123",
      };
      websocket.send(JSON.stringify(data));
      sessionIdRef.current = id;
      setCallStatus("calling");
      console.log("Session initialized with ID:", id);
    } catch (error) {
      console.error("Error starting call:", error);
    }
  };

  const startAudioCapture = async () => {
    console.log("Starting audio capture...");
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: "user",
        },
      });

      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      const mediaRecorder = new MediaRecorder(audioStream, {
        mimeType: "audio/webm;codecs=opus",
      });

      setStream(videoStream);

      if (myVideo.current) {
        myVideo.current.srcObject = videoStream;
      }

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          console.log("Audio chunk available, sending to server...");
          await sendAudioChunk(event.data);
        }
      };

      audioRecorderRef.current = mediaRecorder;
    } catch (error) {
      console.error("Error accessing audio devices:", error);
    }
  };

  async function sendAudioChunk(audioBlob: Blob) {
    console.log("Sending audio chunk to server...");
    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64Audio = btoa(
      String.fromCharCode(...Array.from(new Uint8Array(arrayBuffer)))
    );

    console.log(base64Audio);

    const data = {
      type: "audio_data",
      session_id: sessionIdRef.current,
      user_id: "user_123",
      audio: base64Audio,
    };

    websocket.send(JSON.stringify(data));
  }

  async function playAudioResponse(base64Audio: string) {
    console.log("Playing audio response from server...");
    try {
      // Decode base64 to binary
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create audio blob and play
      const audioBlob = new Blob([bytes], { type: "audio/webm" });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.play();

      // Clean up URL after playing
      audio.addEventListener("ended", () => {
        URL.revokeObjectURL(audioUrl);
      });
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  }

  const startGettingAudio = () => {
    console.log("Starting to get audio from the server...");
    if (
      audioRecorderRef.current &&
      audioRecorderRef.current.state === "inactive"
    ) {
      audioRecorderRef.current.start(15000); // Start recording and send chunks every 10 seconds
      console.log("Audio recording started");
    } else {
      alert("Audio recorder is not initialized");
    }
  };

  const stopGettingAudio = () => {
    console.log("Stopping audio capture...");
    if (
      audioRecorderRef.current &&
      audioRecorderRef.current.state === "recording"
    ) {
      audioRecorderRef.current.stop();
      console.log("Audio recording stopped");
    } else {
      console.error("Audio recorder is not initialized");
    }
  };

  const startConversation = () => {
    console.log("Starting conversation with session ID:", sessionIdRef.current);
    setCallStatus("connected");

    const data = {
      type: "start_conversation",
      session_id: sessionIdRef.current,
      user_id: "user_123",
    };
    websocket.send(JSON.stringify(data));
  };

  const endConversation = () => {
    console.log("Ending conversation with session ID:", sessionIdRef.current);
    const data = {
      type: "end_session",
      session_id: sessionIdRef.current,
      user_id: "user_123",
    };
    websocket.send(JSON.stringify(data));
  };

  const cleanup = () => {
    console.log("Cleaning up resources...");
    stopGettingAudio();
    setCallStatus("idle");
  };

  return (
    <div className="App">
      <p>Call status: {callStatus}</p>
      <button onClick={() => initSessions()}>Start Call</button>
      <button onClick={() => endConversation()}>End Call</button>
      {streamState === "video" ? (
        <button onClick={() => setStreamState && setStreamState("audio")}>
          Switch to Audio
        </button>
      ) : (
        <button onClick={() => setStreamState && setStreamState("video")}>
          Switch to Video
        </button>
      )}
      {streamState === "video" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            width: "100vw",
          }}
        >
          {stream && (
            <div
              style={{
                width: "600px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <div style={{ width: "100%", height: "100%" }}>
                <video
                  playsInline
                  muted
                  ref={myVideo}
                  autoPlay
                  style={{
                    width: "100%",
                    height: "100%",
                    backgroundColor: "black",
                    borderRadius: "12px",
                    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
