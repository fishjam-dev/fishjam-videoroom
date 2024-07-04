import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import {
  getWebInstrumentations,
  initializeFaro,
} from '@grafana/faro-web-sdk';

const alloy_host = import.meta.env.VITE_ALLOY_HOST || "localhost"
console.log(alloy_host)
initializeFaro({
  url: `http://${alloy_host}:8027/collect`,
  app: {
    name: 'Your App Name',
    version: '1.0.0',
  },
  instrumentations: [
    ...getWebInstrumentations({
      captureConsole: false,
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
