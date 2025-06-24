import { useContext } from "react";
import "./App.css";
import Audio from "./components/Audio";
import Video from "./components/Video";
import { SocketContext } from "./Context";

function App() {
  const { streamState, setStreamState, startCall } = useContext(SocketContext);

  return (
    <div className="App">
      <button onClick={() => startCall("test")}> Start Call</button>
      {streamState === "video" ? (
        <button onClick={() => setStreamState && setStreamState("audio")}>
          Switch to Audio
        </button>
      ) : (
        <button onClick={() => setStreamState && setStreamState("video")}>
          Switch to Video
        </button>
      )}
      {streamState === "video" && <Video />}
      {streamState === "audio" && <Audio />}
    </div>
  );
}

export default App;
