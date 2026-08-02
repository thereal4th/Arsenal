import type { Metadata } from "next";
import { EditorClient } from "./editor-client";

export const metadata: Metadata = {
  title: "Technique editor",
  description:
    "Pose two 3D mannequins, capture the position, and file it into your notes.",
};

export default function EditorPage() {
  return <EditorClient />;
}
