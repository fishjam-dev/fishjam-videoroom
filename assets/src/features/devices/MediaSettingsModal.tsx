import React, { useEffect, useState } from "react";
import { DeviceSelector } from "./DeviceSelector";
import { useModal } from "../../contexts/ModalContext";
import { useLocalPeer } from "./LocalPeerMediaContext";
import { Modal } from "../shared/components/modal/Modal";
import { Checkbox } from "../shared/components/Checkbox";

export const MediaSettingsModal: React.FC = () => {
  const { setOpen, isOpen } = useModal();
  const { video, audio, blur, setBlur } = useLocalPeer();
  const [videoInput, setVideoInput] = useState<string | null>(null);
  const [audioInput, setAudioInput] = useState<string | null>(null);
  const [blurInput, setBlurInput] = useState(blur);

  useEffect(() => {
    if (video.devices && video.deviceInfo?.deviceId) {
      setVideoInput(video.deviceInfo?.deviceId);
    }
  }, [video.devices, video.deviceInfo?.deviceId]);

  useEffect(() => {
    if (audio.devices && audio.deviceInfo?.deviceId) {
      setAudioInput(audio.deviceInfo.deviceId);
    }
  }, [audio.devices, audio.deviceInfo?.deviceId]);

  const handleClose = () => {
    setOpen(false);
    setAudioInput(audio.deviceInfo?.deviceId ?? null);
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
        audio.start(audioInput || undefined);
        setBlur(blurInput);
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
        devices={audio.devices}
        setInput={setAudioInput}
        inputValue={audioInput}
      />
    </Modal>
  );
};
