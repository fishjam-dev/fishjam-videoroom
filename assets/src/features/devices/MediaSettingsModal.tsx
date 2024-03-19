import React, { useEffect, useState } from "react";
import { DeviceSelector } from "./DeviceSelector";
import { useModal } from "../../contexts/ModalContext";
import { useLocalPeer } from "./LocalPeerMediaContext";
import { Modal } from "../shared/components/modal/Modal";
import { Checkbox } from "../shared/components/Checkbox";
import { useCamera, useMicrophone } from "../../jellyfish.types.ts";

export const MediaSettingsModal: React.FC = () => {
  const { setOpen, isOpen } = useModal();
  const { setBlur } = useLocalPeer();

  const camera = useCamera();
  const microphone = useMicrophone();

  const [videoInput, setVideoInput] = useState<string | null>(null);
  const [audioInput, setAudioInput] = useState<string | null>(null);
  const [blurInput, setBlurInput] = useState(false);

  useEffect(() => {
    if (camera.devices && camera.deviceInfo?.deviceId) {
      setVideoInput(camera.deviceInfo?.deviceId);
    }
  }, [camera.devices, camera.deviceInfo?.deviceId]);

  useEffect(() => {
    if (microphone.devices && microphone.deviceInfo?.deviceId) {
      setAudioInput(microphone.deviceInfo.deviceId);
    }
  }, [microphone.devices, microphone.deviceInfo?.deviceId]);

  const handleClose = () => {
    setOpen(false);
    setAudioInput(microphone.deviceInfo?.deviceId ?? null);
    setVideoInput(camera.deviceInfo?.deviceId ?? null);
  };

  return (
    <Modal
      title="Settings"
      confirmText="Save"
      onRequestClose={handleClose}
      closable
      cancelClassName="!text-additional-red-100"
      onConfirm={() => {
        console.log({ name: "clicked", videoInput, audioInput, blurInput });

        // setBlur(blurInput, true);

        // if (video.deviceInfo?.deviceId !== videoInput) {
        // video.start(videoInput || undefined);
        console.log({ name: "clicked - setBlur" });
        setBlur(blurInput, true);
        // } else {
        //   setBlur(blurInput, true);
        // }

        console.log("Restarting video");
        camera.start(videoInput || undefined);

        // if (microphone.deviceInfo?.deviceId !== audioInput) {
        microphone.start(audioInput || undefined);
        // }
        setOpen(false);
        // setBlurInput(blurInput)
      }}
      onCancel={handleClose}
      maxWidth="max-w-md"
      isOpen={isOpen}
    >
      <div className="flex flex-col gap-2">
        <DeviceSelector name="Select camera" devices={camera.devices} setInput={setVideoInput}
                        inputValue={videoInput} />
        <Checkbox
          label="Blur background (experimental)"
          id="blur-background-checkbox"
          onChange={() => setBlurInput((prev) => !prev)}
          status={blurInput}
          textSize="base"
        />
      </div>
      <DeviceSelector
        name="Select microphone"
        devices={microphone.devices}
        setInput={setAudioInput}
        inputValue={audioInput}
      />
    </Modal>
  );
};
