"use client";

import { useState, useRef, useEffect } from "react";
import { Microphone } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface MicButtonProps {
  onTranscript: (text: string) => void;
}

export function MicButton({ onTranscript }: MicButtonProps) {
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      setSupported(true);
      const recognition = new SR();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = navigator.language || "en-US";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        onTranscript(" " + transcript);
        setRecording(false);
      };
      recognition.onerror = () => setRecording(false);
      recognition.onend = () => setRecording(false);
      recognitionRef.current = recognition;
    }
  }, [onTranscript]);

  if (!supported) return null;

  function toggle() {
    if (recording) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setRecording(true);
    }
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        "w-[42px] h-[42px] rounded-full grid place-items-center shrink-0 transition-all",
        recording
          ? "bg-accent text-bg animate-pulse"
          : "bg-accent-soft text-accent"
      )}
      aria-pressed={recording}
      aria-label={recording ? "Stop recording" : "Start voice input"}
    >
      <Microphone size={20} weight="thin" />
    </button>
  );
}
