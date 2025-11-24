
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import dynamic from 'next/dynamic';
import { locations, type Location } from "@/lib/locations";
import { calculateDistance, calculateScore } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MapPin, Trophy, ClipboardCopy } from "lucide-react";
import type { LatLng, LatLngExpression, LeafletMouseEvent } from "leaflet";
import { useRouter } from 'next/navigation';
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

type GameState = "guessing" | "revealed";
type RoundScore = {
  locationName: string;
  score: number;
};

const MapWrapper = dynamic(() => import('@/components/map-wrapper').then(mod => mod.MapWrapper), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center bg-muted rounded-lg"><p>Loading Map...</p></div>,
});

const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function GameLayout() {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [guess, setGuess] = useState<LatLng | null>(null);
  const [gameState, setGameState] = useState<GameState>("guessing");
  const [distance, setDistance] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [round, setRound] = useState<number>(1);
  const [usedLocations, setUsedLocations] = useState<string[]>([]);
  const [roundScores, setRoundScores] = useState<RoundScore[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const startNewRound = useCallback((isReset = false) => {
    let newUsedLocations = isReset ? [] : usedLocations;
    let availableLocations = locations.filter(loc => !newUsedLocations.includes(loc.id));
    
    if (availableLocations.length === 0) {
      // All locations used, reset for a new game but keep score
      availableLocations = locations;
      newUsedLocations = [];
    }

    const nextLocation = getRandomItem(availableLocations);
    setCurrentLocation(nextLocation);
    setUsedLocations([...newUsedLocations, nextLocation.id]);
    setGuess(null);
    setGameState("guessing");
    setDistance(0);
    setScore(0);
  }, [usedLocations]);

  const resetGame = useCallback(() => {
    setTotalScore(0);
    setRound(1);
    setUsedLocations([]);
    setRoundScores([]);
    setIsGameOver(false);
    startNewRound(true);
  }, [startNewRound]);

  useEffect(() => {
    // This ensures random location selection only happens on the client after hydration
    if (!currentLocation) {
        startNewRound(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMapClick = useCallback((e: LeafletMouseEvent) => {
    if (gameState === "guessing") {
      setGuess(e.latlng);
    }
  }, [gameState]);

  const handleGuess = () => {
    if (!guess || !currentLocation) return;
    const dist = calculateDistance(
      guess.lat,
      guess.lng,
      currentLocation.coordinates.lat,
      currentLocation.coordinates.lng
    );
    const newScore = calculateScore(dist);
    setDistance(dist);
    setScore(newScore);
    setTotalScore(prev => prev + newScore);
    setRoundScores(prev => [...prev, { locationName: currentLocation.name, score: newScore }]);
    setGameState("revealed");
  };

  const handleNextRound = () => {
    if (round < locations.length) {
      setRound(prev => prev + 1);
      startNewRound();
    } else {
      setIsGameOver(true);
    }
  };

  const handleCopyResults = () => {
    const title = `NUSGuessr - Final Score: ${totalScore.toLocaleString()}`;
    const summary = roundScores.map(
      (r, index) => `Round ${index + 1}: ${r.locationName} - ${r.score.toLocaleString()} pts`
    ).join('\n');
    const url = 'https://russelldash332.github.io/NUSGuessr';
    
    const textToCopy = `${title}\n\n${summary}\n\nPlay here: ${url}`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      toast({
        title: "Copied to clipboard!",
        description: "Your game results have been copied.",
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

  if (!currentLocation) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <p>Loading game...</p>
      </div>
    );
  }
  
  const mapCenter: LatLngExpression = [1.2991, 103.7764]; // Center of NUS
  const actualPosition: LatLng | null = currentLocation ? { lat: currentLocation.coordinates.lat, lng: currentLocation.coordinates.lng } : null;
  const totalRounds = locations.length;

  return (
    <>
      <div className="grid md:grid-cols-2 gap-8 p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">
                Where is this?
              </CardTitle>
              <CardDescription>
                Round {round} / {totalRounds} | Total Score: {totalScore.toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className="relative aspect-[3/2] w-full"
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
              >
                <Image
                  src={currentLocation.image.imageUrl}
                  alt={currentLocation.image.description}
                  fill
                  priority
                  className="object-cover rounded-lg pointer-events-none"
                  data-ai-hint={currentLocation.image.imageHint}
                />
              </div>
            </CardContent>
          </Card>

          {gameState === 'revealed' && (
            <Card className="animate-in fade-in-50">
              <CardHeader>
                <CardTitle className="font-headline text-xl">
                  Results for: {currentLocation.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                <div className="flex justify-between items-center text-lg">
                  <span>Distance:</span>
                  <span className="font-bold">{distance.toFixed(2)} km</span>
                </div>
                <div className="flex justify-between items-center text-lg">
                  <span>Round Score:</span>
                  <span className="font-bold text-primary">{score.toLocaleString()} pts</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleNextRound} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                  {round === totalRounds ? 'View Final Score' : 'Next Round'}
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="h-[60vh] md:h-full w-full rounded-lg bg-muted">
            <MapWrapper
              key={round}
              center={mapCenter}
              zoom={15}
              guessPosition={guess}
              actualPosition={actualPosition}
              onMapClick={handleMapClick}
              isRevealed={gameState === 'revealed'}
              isInteractive={!isGameOver}
            />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Click on the map to place your guess.
          </p>
          <Button onClick={handleGuess} disabled={!guess || gameState === 'revealed'} size="lg">
            <MapPin className="mr-2 h-5 w-5" />
            Make Guess
          </Button>
        </div>
      </div>
      
      <AlertDialog open={isGameOver} onOpenChange={setIsGameOver}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
                <Trophy className="w-16 h-16 text-yellow-500" />
            </div>
            <AlertDialogTitle className="text-center text-3xl font-bold">Game Over!</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-lg">
              Here's your final score summary.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 space-y-2">
            <div className="max-h-40 overflow-y-auto pr-2 space-y-2 text-sm">
              {roundScores.map((r, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="truncate text-muted-foreground">{index + 1}. {r.locationName}</span>
                  <span className="font-medium text-primary">{r.score.toLocaleString()} pts</span>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex justify-between items-center text-xl font-bold pt-2">
              <span>Total Score:</span>
              <span className="text-primary">{totalScore.toLocaleString()}</span>
            </div>
          </div>
          <AlertDialogFooter className="sm:flex-row flex-col-reverse gap-2">
            <Button variant="outline" onClick={handleCopyResults} className="w-full sm:w-auto">
                <ClipboardCopy className="mr-2 h-4 w-4" />
                Copy Results
            </Button>
            <AlertDialogAction onClick={resetGame} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
              Play Again
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
