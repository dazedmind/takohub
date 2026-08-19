"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { Branch } from "@/lib/types";

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  branches?: Branch[];
}

export function CameraModal({
  isOpen,
  onClose,
  onSuccess,
  branches: initialBranches = [],
}: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [selectedBranchId, setSelectedBranchId] = useState<number | "">("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingShift, setIsStartingShift] = useState(false);

  // Prevent background scrolling when full screen camera is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/branches")
        .then((res) => res.json())
        .then((data) => {
          if (data.branches && data.branches.length > 0) {
            setBranches(data.branches);
            if (!selectedBranchId) {
              setSelectedBranchId(data.branches[0].branchId);
            }
          }
        })
        .catch(console.error);
    }
  }, [isOpen, selectedBranchId]);

  useEffect(() => {
    let activeStream: MediaStream | null = null;

    if (isOpen && !capturedImage) {
      setCameraError(null);
      navigator.mediaDevices
        ?.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        })
        .then((mediaStream) => {
          activeStream = mediaStream;
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.play().catch(console.error);
          }
        })
        .catch((err) => {
          console.error("Camera access error:", err);
          setCameraError(
            "Camera permission denied or camera device not found. Live selfie capture is required to start your shift."
          );
        });
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, capturedImage]);

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCapturedImage(null);
    setCameraError(null);
    onClose();
  };

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(dataUrl);

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleSubmitShift = async () => {
    if (!selectedBranchId) {
      toast.error("Please select the branch where you are working today");
      return;
    }

    if (!capturedImage) {
      toast.error("Please capture your attendance selfie photo");
      return;
    }

    setIsStartingShift(true);
    try {
      const response = await fetch("/api/attendance/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: Number(selectedBranchId),
          selfieDataUrl: capturedImage,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to start shift");
      }

      toast.success("Shift started successfully!");
      handleClose();
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error starting shift");
    } finally {
      setIsStartingShift(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 text-zinc-100 flex flex-col justify-between overflow-hidden">
      {/* Top Navbar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white">
            Start Shift & Attendance
          </h1>
          <p className="text-xs text-zinc-400">
            Confirm your branch and capture your check-in selfie.
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          disabled={isStartingShift}
          className="h-10 w-10 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto max-w-lg mx-auto w-full space-y-6">
        {/* Branch Selection Panel */}
        <div className="w-full">
          <label className="text-xs font-semibold text-zinc-300 block mb-1.5 uppercase tracking-wider">
            Assigned Branch Location
          </label>
          <select
            className="flex h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 text-white px-3.5 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4D671] focus-visible:border-transparent transition-all"
            value={selectedBranchId}
            onChange={(e) =>
              setSelectedBranchId(
                e.target.value ? Number(e.target.value) : ""
              )
            }
            disabled={isStartingShift}
          >
            <option value="">-- Choose Branch Location --</option>
            {branches.map((b) => (
              <option key={b.branchId} value={b.branchId} className="text-zinc-900 bg-white">
                {b.branchName} {b.address ? `(${b.address})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Viewfinder Frame */}
        <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-zinc-700 bg-black shadow-2xl flex items-center justify-center group">
          {cameraError ? (
            <div className="p-6 text-center text-red-400 space-y-2 max-w-xs">
              <Camera className="mx-auto h-8 w-8 text-red-500 mb-1" />
              <p className="text-sm font-semibold">{cameraError}</p>
            </div>
          ) : capturedImage ? (
            <div className="relative w-full h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={capturedImage}
                alt="Selfie Preview"
                className="w-full h-full object-cover"
              />
              {/* Retake Button overlay */}
              <div className="absolute inset-x-0 bottom-4 flex justify-center">
                <Button
                  type="button"
                  variant="tertiary"
                  onClick={handleRetake}
                  disabled={isStartingShift}
                  className="shadow-lg h-9 gap-1.5 bg-black/60 text-white hover:bg-black/80 font-bold border border-zinc-700 rounded-full px-5 text-xs uppercase tracking-wider"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Retake</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />
              {/* Circular Big Camera capture button */}
              <div className="absolute inset-x-0 bottom-6 flex justify-center">
                <button
                  type="button"
                  onClick={handleCapture}
                  className="w-16 h-16 rounded-full bg-white text-zinc-900 hover:bg-zinc-200 active:scale-95 transition-all flex items-center justify-center shadow-2xl border-4 border-zinc-300 dark:border-zinc-800"
                >
                  <Camera className="w-8 h-8" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Actions Frame */}
      <footer className="px-6 py-5 border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-md">
        <div className="max-w-lg mx-auto w-full flex gap-3">
          <Button
            type="button"
            variant="tertiary"
            onClick={handleClose}
            disabled={isStartingShift}
            className="flex-1 h-11 text-sm font-semibold rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleSubmitShift}
            disabled={!capturedImage || !selectedBranchId || isStartingShift}
            className="flex-2 h-11 text-sm font-bold rounded-lg bg-[#F4D671] text-[#1C1C1C] hover:bg-[#ebd060] disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {isStartingShift ? "Recording..." : "Start Shift Now"}
          </Button>
        </div>
      </footer>
    </div>
  );
}
