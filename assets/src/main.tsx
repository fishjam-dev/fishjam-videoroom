import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import {
  // InternalLoggerLevel,
  // LogLevel,
  // allLogLevels,
  getWebInstrumentations,
  initializeFaro,
} from '@grafana/faro-web-sdk';

const faro = initializeFaro({
  url: 'http://localhost:8027/collect',
  app: {
    name: 'Your App Name',
    version: '1.0.0',
  },
  instrumentations: [
    ...getWebInstrumentations({
      captureConsole: false,
      // captureConsoleDisabledLevels: allLogLevels
    }),
  ],
  // internalLoggerLevel: InternalLoggerLevel.OFF
});

faro.api.pushLog(["Example logs"])

faro.api.pushMeasurement({
  type: "test_measurement",
  values: {
    random_number: 120,
    random_float: 0.5
  }
},
  {
    context: {
      hello: 'world'
    }
  }
)

faro.api.pushEvent('Example event')




ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
