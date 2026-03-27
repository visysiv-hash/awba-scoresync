import { useState } from "react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart2, Trophy, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
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
          <img src="https://media.base44.com/images/public/69c519111fbf9fefe3d69538/14724ad56_image.png" alt="Albury Wodonga Badminton" className="mx-auto mb-2 h-16 object-contain" />
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

        <div className="mt-4 text-center flex flex-col gap-2 items-center">
          <Link to="/dashboard">
            <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10 gap-2">
              <BarChart2 className="w-4 h-4" /> View Results Dashboard
            </Button>
          </Link>
          <Link to="/leaderboard">
            <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10 gap-2">
              <Trophy className="w-4 h-4" /> League Leaderboard
            </Button>
          </Link>
          <Link to="/manual">
            <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10 gap-2">
              <BookOpen className="w-4 h-4" /> User Manual
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}