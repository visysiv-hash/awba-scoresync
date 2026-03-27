import { useState } from "react";
import TodaysResults from "../components/TodaysResults";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import ScoreEntry from "../components/ScoreEntry";
import GameSearch from "../components/GameSearch";

export default function Home() {
  const [activeTab, setActiveTab] = useState("search");
  const [prefilledGame, setPrefilledGame] = useState(null);

  const handleSelectGame = (game) => {
    setPrefilledGame(game);
    setActiveTab("entry");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <img src="https://media.base44.com/images/public/69c519111fbf9fefe3d69538/38fc332c7_image.png" alt="Albury Wodonga Badminton" className="mx-auto mb-2 h-16 object-contain" />
          <h1 className="text-3xl font-bold text-white">Score Entry</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="search" className="flex-1">Search Games</TabsTrigger>
            <TabsTrigger value="entry" className="flex-1">Enter Score</TabsTrigger>
          </TabsList>
          <TabsContent value="search">
            <GameSearch onSelectGame={handleSelectGame} />
          </TabsContent>
          <TabsContent value="entry">
            <ScoreEntry prefilledGame={prefilledGame} onPrefilledUsed={() => setPrefilledGame(null)} />
          </TabsContent>
        </Tabs>

        <TodaysResults />
      </div>
    </div>
  );
}