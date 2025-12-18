import { GameLayout } from "@/components/game-layout";
import { NUSLogo } from "@/components/nus-logo";

export default function Home() {
  return (
    <div className="flex flex-col h-screen w-full bg-background">
      <header className="p-4 border-b shrink-0 bg-background/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4 max-w-7xl mx-auto">
          <NUSLogo className="h-10 w-10" />
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            <span className="bg-gradient-to-r from-blue-500 to-orange-500 text-transparent bg-clip-text">
              NUSGuessr
            </span>
          </h1>
        </div>
      </header>
      <main className="flex-grow relative overflow-y-auto">
        <GameLayout />
      </main>
      <footer className="text-center p-4 border-t text-sm text-muted-foreground shrink-0 z-10 bg-background">
        <p>Challenge your knowledge of the National University of Singapore campus!</p>
        <p className="text-xs mt-1">RussellDash332 © 2025</p>
      </footer>
    </div>
  );
}
