import MembraneLogo from "../../shared/components/MembraneLogo";
import PlainLink from "../../shared/components/PlainLink";
import { FC } from "react";

const Navbar: FC = () => {
  return (
    <PlainLink href="/" name="home-page" reload className="self-start">
      <MembraneLogo className="text-5xl" />
    </PlainLink>
  );
};

export default Navbar;
