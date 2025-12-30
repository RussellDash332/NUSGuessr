
"use client";

import { useState, useEffect, memo, useRef } from "react";
import Link from 'next/link';
import { GameLayout } from "@/components/game-layout";
import { NUSLogo } from "@/components/nus-logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar, BrainCircuit, Play, ClipboardCopy, PlusSquare, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { RoundScore, SavedProgress, FinalResults } from "@/components/game-layout";

type GameMode = "daily" | "practice";

const getTodayDateString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const formatDate = (date: Date): string => {
    // Use UTC methods to avoid timezone issues when creating the string
    const dateObj = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    return `${dateObj.getUTCDate()} ${dateObj.toLocaleString('default', { month: 'long' })} ${dateObj.getUTCFullYear()}`;
};

const HeaderContent = memo(function HeaderContent({ gameMode, onReturnToLanding }: { gameMode: GameMode | null, onReturnToLanding: () => void}) {
  return (
    <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
      <button
        onClick={onReturnToLanding}
        className={cn("flex items-center gap-2 md:gap-4 group")}
        >
        <NUSLogo className="h-8 w-8 md:h-10 md:w-10" />
        <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">
          <span className={cn(
            "bg-gradient-to-r from-blue-500 to-orange-500 text-transparent bg-clip-text",
            "bg-[length:200%_auto] animate-gradient",
            !gameMode && "group-hover:underline"
            )}>
            NUSGuessr
          </span>
        </h1>
      </button>
      {gameMode === null && (
        <Link href="/contribute">
          <Button variant="outline">
              <PlusSquare className="mr-2 h-4 w-4"/>
              Contribute
          </Button>
        </Link>
      )}
    </div>
  );
});


export default function Home() {
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [pendingMode, setPendingMode] = useState<GameMode | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmingExit, setIsConfirmingExit] = useState(false);
  const [dailyChallengeCompleted, setDailyChallengeCompleted] = useState(false);
  const [dailyProgress, setDailyProgress] = useState<SavedProgress | null>(null);
  const [dailyResults, setDailyResults] = useState<FinalResults | null>(null);
  const [countdown, setCountdown] = useState("");
  const { toast } = useToast();
  const gameLayoutRef = useRef<{ getCurrentState: () => SavedProgress }>(null);


  const checkDailyStatus = () => {
    const today = getTodayDateString();
    const lastPlayed = localStorage.getItem('nusguessr_daily_last_played');

    if (lastPlayed === today) {
      setDailyChallengeCompleted(true);
      setDailyProgress(null);
      localStorage.removeItem('nusguessr_daily_progress');

      const resultsRaw = localStorage.getItem('nusguessr_daily_results');
      if (resultsRaw) {
        try {
          const results = JSON.parse(resultsRaw);
          if (results.date === today) {
            setDailyResults(results);
          } else {
            localStorage.removeItem('nusguessr_daily_results');
            setDailyResults(null);
          }
        } catch {
          localStorage.removeItem('nusguessr_daily_results');
          setDailyResults(null);
        }
      } else {
        setDailyResults(null);
      }
    } else {
      setDailyChallengeCompleted(false);
      setDailyResults(null);
      const progressRaw = localStorage.getItem('nusguessr_daily_progress');
      if (progressRaw) {
          try {
              const progress = JSON.parse(progressRaw);
              if (progress.date === today) {
                  setDailyProgress(progress.data);
              } else {
                  localStorage.removeItem('nusguessr_daily_progress');
                  setDailyProgress(null);
              }
          } catch {
              localStorage.removeItem('nusguessr_daily_progress');
              setDailyProgress(null);
          }
      } else {
        setDailyProgress(null);
      }
    }
  };

  useEffect(() => {
    checkDailyStatus();
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (dailyChallengeCompleted) {
      const updateCountdown = () => {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const diff = tomorrow.getTime() - now.getTime();

        if (diff <= 0) {
          setDailyChallengeCompleted(false);
          localStorage.removeItem('nusguessr_daily_last_played');
          localStorage.removeItem('nusguessr_daily_results');
          setCountdown("");
          checkDailyStatus(); // Re-check status
          return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      };
      updateCountdown();
      timer = setInterval(updateCountdown, 1000);
    }
    return () => clearInterval(timer);
  }, [dailyChallengeCompleted]);


  const handleModeSelect = (mode: GameMode) => {
    if (mode === 'daily' && dailyChallengeCompleted) return;
    setPendingMode(mode);
    setIsConfirming(true);
  };

  const handleConfirmStart = () => {
    if (pendingMode === 'daily' && !dailyProgress) {
        // Clear any old progress if starting a fresh daily
        localStorage.removeItem('nusguessr_daily_progress');
    }
    setGameMode(pendingMode);
    setIsConfirming(false);
  };

  const handleCancelStart = () => {
    setPendingMode(null);
    setIsConfirming(false);
  };

  const handleExitGame = (results?: FinalResults) => {
    if(results && results.gameMode === 'daily') {
      const today = getTodayDateString();
      const resultsToSave = { ...results, date: today };
      localStorage.setItem('nusguessr_daily_last_played', today);
      localStorage.setItem('nusguessr_daily_results', JSON.stringify(resultsToSave));
      localStorage.removeItem('nusguessr_daily_progress');
      setDailyResults(resultsToSave);
      setDailyChallengeCompleted(true);
    }
    setGameMode(null);
  };

  const returnToLanding = () => {
    if (gameMode) {
        setIsConfirmingExit(true);
    } else {
        toast({
            description: "You're already here! 😉",
            duration: 2000,
        });
    }
  }

  const handleConfirmExit = () => {
    if (gameMode === 'daily' && gameLayoutRef.current) {
        const currentState = gameLayoutRef.current.getCurrentState();
        if (currentState.round <= 10) { // Assuming 10 rounds max
            const progressToSave = {
                date: getTodayDateString(),
                data: {
                    round: currentState.round,
                    totalScore: currentState.totalScore,
                    roundScores: currentState.roundScores.map(({ score, time }) => ({ score, time })),
                    elapsedTime: currentState.elapsedTime,
                }
            };
            localStorage.setItem('nusguessr_daily_progress', JSON.stringify(progressToSave));
        }
    }
    setGameMode(null);
    setIsConfirmingExit(false);
    checkDailyStatus();
  }

  const handleCopyDailyResults = () => {
    if (!dailyResults) return;

    const { totalScore, roundScores, date } = dailyResults;
    const dateObj = new Date(date);
    // Add timezone offset to get correct UTC date
    const correctedDate = new Date(dateObj.getTime() + dateObj.getTimezoneOffset() * 60000);
    const dateString = formatDate(correctedDate);
    const title = `NUSGuessr Daily - ${dateString} - Final Score: ${totalScore.toLocaleString()}`;

    const summary = roundScores.map(
      (r, index) => `Round ${index + 1}: ${r.score.toLocaleString()} pts (${(r.time / 1000).toFixed(1)}s)`
    ).join('\n');

    const url = 'https://russelldash332.github.io/NUSGuessr';

    const textToCopy = `${title}\n\n${summary}\n\nPlay here: ${url}`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      toast({
        title: "Copied to clipboard!",
        description: "Your daily results have been copied.",
      });
    }).catch(err => {
      console.error('Failed to copy results: ', err);
      toast({
        variant: 'destructive',
        title: "Oops!",
        description: "Could not copy results to clipboard.",
      });
    });
  };

  const isResumingDaily = pendingMode === 'daily' && dailyProgress;

  return (
    <div className="flex flex-col h-screen w-full bg-background">
      <header className="p-4 border-b shrink-0 bg-background/95 backdrop-blur-sm z-10 sticky top-0">
        <HeaderContent gameMode={gameMode} onReturnToLanding={returnToLanding} />
      </header>

      <main className="flex-grow relative overflow-y-auto">
        {!gameMode ? (
          <div className="flex flex-col items-center justify-center min-h-full p-4">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold font-headline tracking-tight mb-2">Welcome to NUSGuessr!</h2>
              <p className="text-lg text-muted-foreground">Choose a game mode to start playing.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <Calendar className="h-10 w-10 text-primary" />
                    <div>
                      <CardTitle className="text-2xl font-headline">Daily Challenge</CardTitle>
                      {dailyChallengeCompleted ? (
                         <CardDescription>Next challenge in {countdown}</CardDescription>
                      ) : dailyProgress ? (
                        <CardDescription>Resume your game! Round {dailyProgress.round} of 10.</CardDescription>
                      ) : (
                        <CardDescription>A new set of 10 locations every day.</CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {dailyChallengeCompleted ? (
                    <Button className="w-full" onClick={handleCopyDailyResults} disabled={!dailyResults}>
                      <ClipboardCopy className="mr-2 h-4 w-4" />
                      Copy Results
                    </Button>
                  ) : (
                    <Button className="w-full" onClick={() => handleModeSelect("daily")}>
                      {dailyProgress ? (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Resume Daily
                        </>
                      ) : (
                        "Play Daily"
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <BrainCircuit className="h-10 w-10 text-accent" />
                    <div>
                      <CardTitle className="text-2xl font-headline">Practice</CardTitle>
                      <CardDescription>5 random locations to test your skills.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => handleModeSelect("practice")}>
                    Start Practice
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <GameLayout
            ref={gameLayoutRef}
            gameMode={gameMode}
            onExit={handleExitGame}
            savedProgress={gameMode === 'daily' ? dailyProgress : null}
          />
        )}
      </main>

      <footer className="text-center p-4 border-t text-sm text-muted-foreground shrink-0 bg-background z-10 sticky bottom-0">
        <p>Challenge your knowledge of the National University of Singapore campus!</p>
        <p className="text-xs mt-1">
          <a
            href="https://russelldash332.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            RussellDash332
          </a> © 2026
        </p>
      </footer>

      <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isResumingDaily ? "Resume game?" : "Are you ready?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isResumingDaily
                ? "You are about to continue the Daily Challenge."
                : `You are about to start the ${pendingMode === 'daily' ? 'Daily Challenge' : 'Practice round'}.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelStart}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmStart}>
              {isResumingDaily ? "Resume" : "Start"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isConfirmingExit} onOpenChange={setIsConfirmingExit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {gameMode === 'daily' ? 'Return to menu?' : 'Are you sure you want to quit?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {gameMode === 'daily'
                ? 'Your progress will be saved. You can resume the Daily Challenge later.'
                : 'Your current progress in this practice round will be lost.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExit}>
              {gameMode === 'daily' ? 'Return' : 'Quit'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
