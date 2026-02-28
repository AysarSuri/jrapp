import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  if (reason instanceof Error) {
    console.error("[unhandled-rejection] Error:", reason.message, reason.stack);
  } else {
    console.error("[unhandled-rejection] Non-Error value:", typeof reason, JSON.stringify(reason));
    event.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
