import React, { useEffect, useState } from "react";
import { DeviceSelector } from "./DeviceSelector";
import { useModal } from "../../contexts/ModalContext";
import { useLocalPeer } from "./LocalPeerMediaContext";
import { Modal } from "../shared/components/modal/Modal";

export const MediaSettingsModal: React.FC = () => {
  const { setOpen, isOpen } = useModal();
  const { video, audio } = useLocalPeer();
  const [videoInput, setVideoInput] = useState<string | null>(null);
  const [audioInput, setAudioInput] = useState<string | null>(null);

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
        setOpen(false);
      }}
      onCancel={handleClose}
      maxWidth="max-w-md"
      isOpen={isOpen}
    >
      <DeviceSelector name="Select camera" devices={video.devices} setInput={setVideoInput} inputValue={videoInput} />
      <DeviceSelector
        name="Select microphone"
        devices={audio.devices}
        setInput={setAudioInput}
        inputValue={audioInput}
      />
    </Modal>
  );
};
