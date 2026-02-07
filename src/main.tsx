import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initInjectedBadgeBlocker } from "./lib/injectedBadgeBlocker";

initInjectedBadgeBlocker();

createRoot(document.getElementById("root")!).render(<App />);
