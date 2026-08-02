import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getNote } from "@/lib/data";
import { NoteEditor } from "@/components/notes/note-editor";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const note = await getNote(id);
  return { title: note?.title ?? "Technique" };
}

export default async function NotePage({ params }: Props) {
  const { id } = await params;
  const note = await getNote(id);
  if (!note) notFound();

  return <NoteEditor note={note} />;
}
