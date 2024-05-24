import { TrackEncoding } from "@fishjam-dev/react-client";
import { useEffect, useState } from "react";

export const useStoreFirstNonNullValue = (variable: TrackEncoding | null) => {
  const [value, setValue] = useState<TrackEncoding | null>(variable);
  useEffect(() => {
    if (value === null && variable) {
      setValue(variable);
    }
  }, [value, variable]);

  return value;
};
