"use client";
import { useEffect } from "react";

import Vditor from "vditor";
import "vditor/dist/index.css";

const App = ({
  initialValue,
  imageId,
  vd,
  setVd,
}: {
  initialValue: string;
  imageId: string;
  vd: Vditor | undefined;
  setVd: (vd: Vditor | undefined) => void;
}) => {
  useEffect(() => {
    const vditor = new Vditor(`vditor-${imageId}`, {
      //   toolbarConfig: {
      //     hide: true,
      //   },
      toolbar: [
        "headings",
        "bold",
        "strike",
        "italic",
        "|",
        "undo",
        "redo",
        "|",
        "edit-mode",
      ],
      counter: {
        enable: true,
      },
      height: window.innerHeight - 64 * 2,
      after: () => {
        vditor.setValue(initialValue);
        setVd(vditor);
      },
      preview: {
        math: {
          inlineDigit: true,
        },
      },
    });
    // Clear the effect
    return () => {
      vd?.destroy();
      setVd(undefined);
    };
  }, []);
  return <div id={`vditor-${imageId}`} className="vditor" />;
};

export default App;
