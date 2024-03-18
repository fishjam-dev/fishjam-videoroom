import React, { useEffect, useState } from "react";
import { DeviceSelector } from "./DeviceSelector";
import { useModal } from "../../contexts/ModalContext";
import { useLocalPeer } from "./LocalPeerMediaContext";
import { Modal } from "../shared/components/modal/Modal";
import { Checkbox } from "../shared/components/Checkbox";
import { useMicrophone } from "../../jellyfish.types.ts";

export const MediaSettingsModal: React.FC = () => {
  const { setOpen, isOpen } = useModal();
  const { video, blur, setBlur } = useLocalPeer();
  const microphone = useMicrophone()
  const [videoInput, setVideoInput] = useState<string | null>(null);
  const [audioInput, setAudioInput] = useState<string | null>(null);
  const [blurInput, setBlurInput] = useState(blur);

  useEffect(() => {
    if (video.devices && video.deviceInfo?.deviceId) {
      setVideoInput(video.deviceInfo?.deviceId);
    }
  }, [video.devices, video.deviceInfo?.deviceId]);

  useEffect(() => {
    if (microphone.devices && microphone.deviceInfo?.deviceId) {
      setAudioInput(microphone.deviceInfo.deviceId);
    }
  }, [microphone.devices, microphone.deviceInfo?.deviceId]);

  const handleClose = () => {
    setOpen(false);
    setAudioInput(microphone.deviceInfo?.deviceId ?? null);
    setVideoInput(video.deviceInfo?.deviceId ?? null);
  };

  return (
    <Modal
      title="Settings"
      confirmText="Save"
      onRequestClose={handleClose}
      closable
      cancelClassName="!text-additional-red-100"
      onConfirm={() => {
        video.start(videoInput || undefined);
        microphone.start(audioInput || undefined);
        setBlur(blurInput); //this function invokes every time someone apply new settings
        setOpen(false);
      }}
      onCancel={handleClose}
      maxWidth="max-w-md"
      isOpen={isOpen}
    >
      <div className="flex flex-col gap-2">
        <DeviceSelector name="Select camera" devices={video.devices} setInput={setVideoInput} inputValue={videoInput} />
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
