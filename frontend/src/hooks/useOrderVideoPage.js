import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { apiFetch } from "../lib/api";
import { StreamVideoClient } from "@stream-io/video-react-sdk";

function useOrderVideoPage() {
  const { id } = useParams();
  const { getToken, isSignedIn } = useAuth();

  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [error, setError] = useState(null);

  const {
    data,
    isLoading,
    error: loadError,
  } = useQuery({
    queryKey: ["order", id],
    queryFn: () => apiFetch(`/api/orders/${id}`, { getToken }),
    enabled: Boolean(id) && isSignedIn,
  });

  const order = data?.order;
  const paid = order?.status === "paid";

  useEffect(() => {
    if (!paid || !id || !isSignedIn) {
      return undefined;
    }

    let videoClient;
    let activeCall;

    async function connectOrderVideo() {
      try {
        const token = await apiFetch("/api/stream/token", {
          getToken,
          method: "POST",
        });

        videoClient = new StreamVideoClient({
          apiKey: token.apiKey,
          user: {
            id: token.userId,
            name: token.name,
          },
          token: token.token,
        });

        activeCall = videoClient.call(
          "default",
          `order-${id}`,
        );

        // Join the order video room
        await activeCall.join({
          create: true,
        });

        // Enable camera and microphone
        await activeCall.camera.enable();
        await activeCall.microphone.enable();

        setClient(videoClient);
        setCall(activeCall);
      } catch (e) {
        console.error("VIDEO CALL ERROR:", e);

        setError(
          e instanceof Error
            ? e.message
            : "Video failed to start",
        );
      }
    }

    connectOrderVideo();

    return () => {
      activeCall?.leave().catch(() => {});
      videoClient?.disconnectUser().catch(() => {});
    };
  }, [paid, id, getToken, isSignedIn]);

  return {
    id,
    order,
    paid,
    isLoading,
    loadError,
    client,
    call,
    error,
  };
}

export default useOrderVideoPage;