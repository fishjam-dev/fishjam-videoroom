import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import {
  getWebInstrumentations,
  initializeFaro,
} from '@grafana/faro-web-sdk';



initializeFaro({
  url: `${window.location.origin}/collect`,
  apiKey: import.meta.env.VITE_ALLOY_API_KEY,
  app: {
    name: 'Videoroom',
    version: '1.0.0',
  },
  instrumentations: [
    ...getWebInstrumentations({
      captureConsole: true,
    }),
  ],
  beforeSend: (item) => {
    return item
  }
});



ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
