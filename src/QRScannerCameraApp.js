import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxLjjl1OC7etF5yZK_IMj0_U3q_HHQ54kBNKMvSfDN72HvYzMVzB3s7TwydWKtyUHz_Jg/exec";

export default function QRScannerCameraApp() {
  const [status, setStatus] = useState("");
  const [log, setLog] = useState([]);
  const [feedbackIcon, setFeedbackIcon] = useState(null);
  const qrCodeRegionId = "reader";
  const html5QrCodeRef = useRef(null);
  const isProcessingRef = useRef(false);

  const handleScanSuccess = async (decodedText) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
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
