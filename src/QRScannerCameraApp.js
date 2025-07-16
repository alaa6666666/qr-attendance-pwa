import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

// Google Script URL is now ONLY in the Vercel API handler, not here!

export default function QRScannerCameraApp() {
  const [status, setStatus] = useState("");
  const [log, setLog] = useState([]);
  const [feedbackIcon, setFeedbackIcon] = useState(null);
  const qrCodeRegionId = "reader";
  const html5QrCodeRef = useRef(null);
  const isProcessingRef = useRef(false);

  // Util: Validate QR value
  const isValidQR = (qrValue) => {
    const match = /^EVENT2025-(\d{3})$/.exec(qrValue);
    if (!match) return false;
    const num = parseInt(match[1], 10);
    return num >= 1 && num <= 200;
  };

  const handleScanSuccess = async (decodedText) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    // 1. Validate QR Code Format
    if (!isValidQR(decodedText)) {
      setFeedbackIcon("❌");
      setStatus("Invalid QR Code");
      isProcessingRef.current = false;
      return;
    }

    // 2. Check for session duplicates (already scanned in this browser)
    if (log.some((entry) => entry.id === decodedText)) {
      setFeedbackIcon("⚠️");
      setStatus("Already Scanned (Session)");
      isProcessingRef.current = false;
      return;
    }

    try {
      // 3. Check with backend for true duplicates and submit
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scannedId: decodedText }),
      });

      const result = await response.json();

      const feedback =
        result.status === "success"
          ? { icon: "✅", message: "Submitted" }
          : result.message === "Already scanned"
          ? { icon: "⚠️", message: "Already Scanned" }
          : { icon: "❌", message: result.message || "Invalid QR" };

      setFeedbackIcon(feedback.icon);
      setStatus(feedback.message);

      const newLog = {
        id: decodedText,
        result: feedback.message,
        time: new Date().toLocaleTimeString(),
      };
      setLog((prev) => [...prev, newLog]);

      // Pause scanner for 3 seconds
      await html5QrCodeRef.current.stop();
      await html5QrCodeRef.current.clear();

      setTimeout(() => {
        setFeedbackIcon(null);
        setStatus("");
        isProcessingRef.current = false;
        Html5Qrcode.getCameras().then((devices) => {
          if (devices && devices.length) {
            html5QrCodeRef.current.start(
              { facingMode: "environment" },
              { fps: 10, qrbox: 250 },
              handleScanSuccess
            );
          }
        });
      }, 3000);
    } catch (error) {
      console.error("Error during scan:", error);
      setFeedbackIcon("❌");
      setStatus("Error");
      isProcessingRef.current = false;
    }
  };

  useEffect(() => {
    html5QrCodeRef.current = new Html5Qrcode(qrCodeRegionId);
    Html5Qrcode.getCameras().then((devices) => {
      if (devices && devices.length) {
        html5QrCodeRef.current.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          handleScanSuccess
        );
      }
    });

    return () => {
      html5QrCodeRef.current?.stop().then(() => {
        html5QrCodeRef.current.clear();
      });
    };
  }, []);

  return (
    <div style={{ textAlign: "center" }}>
      <h2>Scan QR Code</h2>
      <div id={qrCodeRegionId} style={{ width: "100%", maxWidth: 400, margin: "auto" }}></div>

      {feedbackIcon && (
        <div
          style={{
            marginTop: 20,
            fontSize: "4rem",
            animation: "pop 0.4s ease-out",
          }}
        >
          {feedbackIcon}
        </div>
      )}

      <p>Status: {status}</p>
      <ul>
        {log.map((entry, i) => (
          <li key={i}>
            {entry.time} - {entry.id} - {entry.result}
          </li>
        ))}
      </ul>

      <style>
        {`
          @keyframes pop {
            0% { transform: scale(0.5); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}
      </style>
    </div>
  );
}
