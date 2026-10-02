import { createRoot } from "react-dom/client";
import "../sketch/tokens.css";
import "./styles.css";
import { App } from "./App";
import { installRichKeys } from "../sketch/rich";

installRichKeys();

createRoot(document.getElementById("root")!).render(<App />);
