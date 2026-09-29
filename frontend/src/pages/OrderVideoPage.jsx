import { Link, useNavigate } from "react-router";
import useOrderVideoPage from "../hooks/useOrderVideoPage";
import { OrderVideoSkeleton } from "../components/LoadingSkeletons";
import { PageError } from "../components/PageError";
import {
  ArrowLeftIcon,
  HeadphonesIcon,
  VideoIcon,
  ShieldCheckIcon,
} from "lucide-react";

import {
  CallControls,
  StreamVideo,
  StreamCall,
  StreamTheme,
  SpeakerLayout,
} from "@stream-io/video-react-sdk";

import "@stream-io/video-react-sdk/dist/css/styles.css";

function OrderVideoPage() {
  const navigate = useNavigate();

  const {
    id,
    order,
    paid,
    isLoading,
    loadError,
    client,
    call,
    error,
  } = useOrderVideoPage();

  if (isLoading) {
    return <OrderVideoSkeleton />;
  }

  if (loadError || !order) {
    return (
      <PageError
        message="Order not found or you don't have access."
        action={{
          to: "/orders",
          label: "Back to orders",
        }}
      />
    );
  }

  if (!paid) {
    return (
      <div
        role="alert"
        className="alert alert-info"
      >
        <span>
          This order must be paid before you can join video support.
        </span>
      </div>
    );
  }

  if (error) {
    return <PageError message={error} />;
  }

  if (!client || !call) {
    return (
      <div className="flex min-h-120 items-center justify-center rounded-2xl border border-base-300 bg-base-100">
        <div className="flex flex-col items-center gap-3">
          <span className="loading loading-spinner loading-lg text-primary" />

          <p className="text-sm text-base-content/60">
            Connecting to video support...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-left">

      {/* Back */}
      <Link
        to={`/orders/${id}/chat`}
        className="btn btn-ghost btn-sm gap-2 px-0 text-base-content/70 hover:text-primary"
      >
        <ArrowLeftIcon
          className="size-4"
          aria-hidden
        />

        Back to support chat
      </Link>

      {/* Header */}
      <div className="overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-md">
        <div className="bg-linear-to-br from-secondary/10 via-base-100 to-base-200/80 px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-start gap-4">

              {/* Icon */}
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
                <VideoIcon
                  className="size-6"
                  aria-hidden
                />
              </div>

              {/* Title */}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-base-content sm:text-2xl">
                    Video Support
                  </h1>

                  <span className="badge badge-success badge-sm gap-1">
                    <span className="size-1.5 rounded-full bg-current" />
                    Live
                  </span>
                </div>

                <p className="mt-1 text-sm text-base-content/65">
                  Connect with our support team about your order.
                </p>

                <p className="mt-2 font-mono text-xs text-base-content/45">
                  Order #{order.id.slice(0, 8)}
                </p>
              </div>
            </div>

            {/* Security */}
            <div className="flex items-center gap-2 text-xs text-base-content/55">
              <ShieldCheckIcon
                className="size-4 text-success"
                aria-hidden
              />

              Secure support call
            </div>
          </div>
        </div>

        {/* Info bar */}
        <div className="border-t border-base-300 bg-base-200/40 px-5 py-4 sm:px-7">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-base-content/65">
            <span className="flex items-center gap-2">
              <HeadphonesIcon
                className="size-4 text-primary"
                aria-hidden
              />

              Customer Support
            </span>

            <span className="hidden text-base-content/30 sm:inline">
              •
            </span>

            <span>
              Allow camera and microphone access when your browser asks.
            </span>
          </div>
        </div>
      </div>

      {/* Video Call */}
      <div className="overflow-hidden rounded-2xl border border-base-300 bg-neutral-950 shadow-xl">

        <StreamVideo client={client}>
          <StreamCall call={call}>
            <StreamTheme className="str-video__theme-custom">

              <div className="flex min-h-140 flex-col">

                {/* Video area */}
                <div className="relative min-h-110 flex-1 bg-neutral text-neutral-content sm:min-h-125">
                  <SpeakerLayout />
                </div>

                {/* Controls */}
                <div className="shrink-0 border-t border-white/10 bg-neutral-950/95 px-3 py-4 sm:px-5">
                  <div className="flex justify-center">
                    <CallControls
                      onLeave={() =>
                        navigate(`/orders/${id}/chat`)
                      }
                    />
                  </div>
                </div>

              </div>

            </StreamTheme>
          </StreamCall>
        </StreamVideo>
      </div>

      {/* Bottom Help */}
      <div className="rounded-xl border border-base-300 bg-base-100 px-4 py-3">
        <p className="text-center text-xs text-base-content/55">
          Having trouble with your camera or microphone? Check your browser
          permissions and try again.
        </p>
      </div>

    </div>
  );
}

export default OrderVideoPage;