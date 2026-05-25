"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StoryItem } from "@/lib/social/server";
import { StoryViewer } from "./story-viewer";

/**
 * Lucas (2026-05-24): "As posições e o jeito que o social vai funcionar
 * vai ser exatamente igual ao insta, no topo aparecem os stories e na
 * tela principal aparece o feed, o + abaixo é para postar foto no feed
 * e o + acima é para postar story"
 *
 * Bandeja horizontal de stories. Primeiro item = avatar do user com +
 * sobreposto (cria story). Itens seguintes = amigos com story ativo.
 * Tap em qualquer story → StoryViewer fullscreen.
 */
export function StoriesBar({
  stories,
  myFirstName,
  hasMyStory,
  onCreateStory,
}: {
  stories: StoryItem[];
  myFirstName: string;
  hasMyStory: boolean;
  onCreateStory: () => void;
}) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // Ordena: meu story primeiro (se tem), depois amigos
  const myStories = stories.filter((s) => s.isMine);
  const friendStories = stories.filter((s) => !s.isMine);
  const orderedStories = [...myStories, ...friendStories];

  return (
    <>
      {/*
        Lucas (2026-05-25): "o circulo do story ta levemente cortado".
        Bug: `overflow-x-auto` no spec do CSS clipa overflow-y também
        (mesmo quando overflow-y é "visible"). O ring zinc-200 do avatar
        + o botão `+` que sai 4px abaixo (-bottom-1) precisam de espaço
        ao redor — sem isso, ficam cortados nas bordas.
        Fix: padding mais generoso (px-2 py-2) + margin negativa do mesmo
        valor pra não criar offset visual.
      */}
      <div className="mb-4 -mx-2 overflow-x-auto px-2 py-2">
        <ul className="flex gap-3 sm:gap-4">
          {/* Slot do user: SEMPRE mostra avatar grande com + sobreposto */}
          <li>
            <button
              type="button"
              onClick={hasMyStory ? () => setViewerIndex(0) : onCreateStory}
              className="group flex flex-col items-center gap-1.5"
              aria-label={hasMyStory ? "Ver seu story" : "Criar story"}
            >
              <div className="relative">
                {hasMyStory ? (
                  /* Avatar com ring gradient quando tem story ativo */
                  <span className="grid h-[72px] w-[72px] place-items-center rounded-full bg-gradient-to-tr from-orange-400 via-pink-500 to-fuchsia-600 p-0.5">
                    <span className="grid h-full w-full place-items-center rounded-full bg-white p-0.5">
                      <span className="grid h-full w-full place-items-center rounded-full bg-brand-50 text-[22px] font-semibold text-brand-700">
                        {myFirstName[0]?.toUpperCase() ?? "?"}
                      </span>
                    </span>
                  </span>
                ) : (
                  /* Avatar simples + ícone + sobreposto pra criar */
                  <span className="grid h-[72px] w-[72px] place-items-center rounded-full bg-brand-50 text-[22px] font-semibold text-brand-700 ring-1 ring-zinc-200">
                    {myFirstName[0]?.toUpperCase() ?? "?"}
                  </span>
                )}
                {/* Botão + flutuante — Lucas (2026-05-24): "+ acima é
                    para postar story" */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateStory();
                  }}
                  aria-label="Criar story"
                  className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-brand-700 text-white shadow-md ring-2 ring-white transition hover:bg-brand-800"
                >
                  <Plus className="h-4 w-4" strokeWidth={3} />
                </button>
              </div>
              <span className="max-w-[72px] truncate text-[11px] font-medium text-zinc-700">
                {hasMyStory ? "Seu story" : "Seu story"}
              </span>
            </button>
          </li>

          {/* Stories de amigos */}
          {friendStories.map((story, idx) => {
            const orderedIdx = myStories.length + idx;
            return (
              <li key={story.id}>
                <button
                  type="button"
                  onClick={() => setViewerIndex(orderedIdx)}
                  className="group flex flex-col items-center gap-1.5"
                  aria-label={`Story de ${story.firstName}`}
                >
                  <span
                    className={cn(
                      "grid h-[72px] w-[72px] place-items-center rounded-full p-0.5",
                      "bg-gradient-to-tr from-orange-400 via-pink-500 to-fuchsia-600",
                    )}
                  >
                    <span className="grid h-full w-full place-items-center rounded-full bg-white p-0.5">
                      <span className="grid h-full w-full place-items-center rounded-full bg-zinc-100 text-[22px] font-semibold text-zinc-700">
                        {story.firstName[0]?.toUpperCase() ?? "?"}
                      </span>
                    </span>
                  </span>
                  <span className="max-w-[72px] truncate text-[11px] font-medium text-zinc-700">
                    {story.firstName}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {viewerIndex !== null && (
        <StoryViewer
          stories={orderedStories}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </>
  );
}
