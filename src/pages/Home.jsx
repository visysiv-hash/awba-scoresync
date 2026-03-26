import { useState } from "react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScoreEntry from "../components/ScoreEntry";
import GameSearch from "../components/GameSearch";

export default function Home() {
  const [activeTab, setActiveTab] = useState("entry");
  const [prefilledGame, setPrefilledGame] = useState(null);

  const handleSelectGame = (game) => {
    setPrefilledGame(game);
    setActiveTab("entry");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <Trophy className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
          <h1 className="text-3xl font-bold text-white">Score Entry</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="entry" className="flex-1">Enter Score</TabsTrigger>
            <TabsTrigger value="search" className="flex-1">Search Games</TabsTrigger>
          </TabsList>
          <TabsContent value="entry">
            <ScoreEntry prefilledGame={prefilledGame} onPrefilledUsed={() => setPrefilledGame(null)} />
          </TabsContent>
          <TabsContent value="search">
            <GameSearch onSelectGame={handleSelectGame} />
          </TabsContent>
        </Tabs>

        <div className="mt-4 text-center">
          <Link to="/dashboard">
            <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10 gap-2">
              <BarChart2 className="w-4 h-4" /> View Results Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}