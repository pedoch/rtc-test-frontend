import { useContext } from "react";
import { SocketContext } from "../Context";

const Video = () => {
  const { myVideo, stream } = useContext(SocketContext);

  return (
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
  );
};
export default Video;
