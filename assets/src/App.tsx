import { FC } from "react";
import { RouterProvider } from "react-router-dom";
import { DeveloperInfoProvider } from "./contexts/DeveloperInfoContext";
import { router } from "./Routes";
import { UserProvider } from "./contexts/UserContext";
import { ToastProvider } from "./features/shared/context/ToastContext";
import { ModalProvider } from "./contexts/ModalContext";
import { LocalMediaMessagesBoundary } from "./features/devices/LocalMediaMessagesBoundary";
import { LocalPeerMediaProvider } from "./features/devices/LocalPeerMediaContext";
import { MediaSettingsModal } from "./features/devices/MediaSettingsModal";
import { disableSafariCache } from "./features/devices/disableSafariCache";
import ReactModal from "react-modal";
import "./index.css";

import { StreamingProvider } from "./features/streaming/StreamingContext";
import { StreamingErrorBoundary } from "./features/streaming/StreamingErrorBoundary";
import { JellyfishContextProvider } from "./jellyfish.types";

// When returning to the videoroom page from another domain using the 'Back' button on the Safari browser,
// the page is served from the cache, which prevents lifecycle events from being triggered.
// As a result, the camera and microphone do not start. To resolve this issue, one simple solution is to disable the cache.
disableSafariCache();
ReactModal.setAppElement("#root");

const App: FC = () => {
  return (
    <UserProvider>
      <DeveloperInfoProvider>
        <JellyfishContextProvider>
          <LocalPeerMediaProvider>
            <ToastProvider>
              <ModalProvider>
                <LocalMediaMessagesBoundary>
                  <StreamingErrorBoundary>
                    <StreamingProvider>
                      <RouterProvider router={router} />
                      <MediaSettingsModal />
                    </StreamingProvider>
                  </StreamingErrorBoundary>
                </LocalMediaMessagesBoundary>
              </ModalProvider>
            </ToastProvider>
          </LocalPeerMediaProvider>
        </JellyfishContextProvider>
      </DeveloperInfoProvider>
    </UserProvider>
  );
};

export default App;
