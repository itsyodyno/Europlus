import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import WorkCommand from "../app/page";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WorkCommand />
  </StrictMode>,
);
