import { GameLayout } from "@/components/game-layout";
import { NUSLogo } from "@/components/nus-logo";

export default function Home() {
  return (
    <main className="min-h-screen w-full bg-background">
      <header className="p-4 border-b">
        <div className="flex items-center gap-4 max-w-7xl mx-auto">
          <NUSLogo className="h-10 w-10" />
          <h1 className="text-3xl font-bold font-headline tracking-tight text-primary">
            NUSGuessr
          </h1>
        </div>
      </header>
      <GameLayout />
      <footer className="text-center p-4 border-t text-sm text-muted-foreground">
        <p>Challenge your knowledge of the National University of Singapore campus!</p>
        <p className="text-xs mt-1">RussellDash332 © 2025</p>
      </footer>
    </main>
  );
}
