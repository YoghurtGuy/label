"use client";
import { useEffect } from "react";

import Vditor from "vditor";
import "vditor/dist/index.css";
import 'katex/dist/contrib/mhchem';

const App = ({
  initialValue,
  // imageId,
  vd,
  setVd,
}: {
  initialValue: string;
  imageId: string;
  vd: Vditor | undefined;
  setVd: (vd: Vditor | undefined) => void;
}) => {
  useEffect(() => {
    const vditor = new Vditor(`vditor`, {
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
          engine: "KaTeX",
        },
      },
      cache:{
        enable: false
      }
    });
    // Clear the effect
    return () => {
      vd?.destroy();
      setVd(undefined);
    };
  }, []);
  return <div id={`vditor`} className="vditor" />;
};

export default App;
