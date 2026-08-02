import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSystem, listNotes } from "@/lib/data";
import { SystemCanvas } from "@/components/systems/system-canvas";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const system = await getSystem(id);
  return { title: system?.title ?? "System" };
}

export default async function SystemPage({ params }: Props) {
  const { id } = await params;
  const [system, notes] = await Promise.all([getSystem(id), listNotes()]);
  if (!system) notFound();

  return <SystemCanvas system={system} notes={notes} />;
}
