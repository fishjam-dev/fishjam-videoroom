import React, { useEffect, useState } from "react";
import { DeviceSelector } from "./DeviceSelector";
import { useModal } from "../../contexts/ModalContext";
import { useLocalPeer } from "./LocalPeerMediaContext";
import { Modal } from "../shared/components/modal/Modal";
import { Checkbox } from "../shared/components/Checkbox";
import { useRecording } from "../recording/useRecording";
import Button from "../shared/components/Button";
import { useCamera, useMicrophone } from "../../fishjam.ts";

export const MediaSettingsModal: React.FC = () => {
  const { setOpen, isOpen } = useModal();
  const { setDevice } = useLocalPeer();

  const camera = useCamera();
  const microphone = useMicrophone();

  const [videoInput, setVideoInput] = useState<string | null>(null);
  const [audioInput, setAudioInput] = useState<string | null>(null);
  const { canStartRecording, startRecording } = useRecording();
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
        setDevice(videoInput, audioInput, blurInput);
        setOpen(false);
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
      <div className="flex justify-center mt-4">
        {canStartRecording && <Button onClick={startRecording} variant="light" disabled={!canStartRecording}>
          Start recording (experimental)
        </Button>}
      </div>
    </Modal>
  );
};
