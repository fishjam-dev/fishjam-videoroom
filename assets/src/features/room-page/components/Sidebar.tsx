import clsx from "clsx";
import { FC } from "react";
import Button from "../../shared/components/Button";
import ChevronDown from "../icons/ChevronDown";
import PeopleComponent from "./PeopleComponent";
import { useSelector } from "../../../fishjam";

type SidebarProps = {
  onClose?: () => void;
};

const Sidebar: FC<SidebarProps> = ({ onClose }) => {
  const peoples = useSelector((s) => Object.values(s.remote || {}).length + 1);

  return (
    <div
      className={clsx(
        "border-brand-dark-blue-300 bg-brand-white md:border",
        "rounded-t-2xl md:rounded-xl",
        "md:grid-wrapper h-full w-full flex-col md:relative md:z-auto md:flex md:w-[300px]",
        "whitespace-nowrap font-aktivGrotesk"
      )}
    >
      {/* close button should be replaced with swipe down feature in the future */}
      <Button className="w-full pt-2 md:hidden" onClick={onClose}>
        <ChevronDown />
      </Button>
      <div className={clsx("flex w-full gap-x-3 p-3 rounded-md py-2.5 text-center font-semibold justify-center")}>
        {`People (${peoples})`}
      </div>

      <div className="w-full border-[0.5px] border-brand-dark-blue-300"></div>

      <div className={clsx("w-full overflow-y-auto p-3 pt-6")}><PeopleComponent /></div>
    </div>
  );
};

export default Sidebar;
