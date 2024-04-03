import { FC, SyntheticEvent } from "react";
import Button from "../../shared/components/Button";
import HomePageLayout from "./HomePageLayout";
import { useNavigate } from "react-router-dom";

interface Props {
  roomId: string;
  wasCameraDisabled: boolean;
  wasMicrophoneDisabled: boolean;
}

const LeavingRoomScreen: FC<Props> = ({ roomId, wasCameraDisabled, wasMicrophoneDisabled }) => {
  const navigate = useNavigate();

  const rejoinHref = `/room/${roomId}`;

  const onRejoin = (e: SyntheticEvent) => {
    e.preventDefault();
    // todo remove { state: { wasCameraDisabled, wasMicrophoneDisabled}}
    navigate(rejoinHref, { state: { wasCameraDisabled, wasMicrophoneDisabled}});
  }

  return (
    <HomePageLayout>
      <section className="flex h-full w-full flex-col items-center justify-center gap-y-14 sm:gap-y-20">
        <div className="flex flex-col items-center gap-y-2 text-center sm:gap-y-6">
          <h2 className="text-2xl font-medium sm:text-5xl">You&apos;ve left the meeting.</h2>
          <p className="font-aktivGrotesk text-base sm:text-xl">What would you like to do next?</p>
        </div>

        <div className="flex w-full flex-col justify-center gap-6 text-center sm:flex-row">
          <Button onClick={onRejoin} href={rejoinHref} name="rejoin-meeting" variant="light">
            Rejoin the meeting
          </Button>
          <Button href="/" name="main-page" variant="normal">
            Main page
          </Button>
        </div>
      </section>
    </HomePageLayout>
  );
};

export default LeavingRoomScreen;
