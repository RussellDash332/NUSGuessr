
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
import { MapPin, Trophy } from "lucide-react";
import type { LatLng, LatLngExpression, LeafletMouseEvent } from "leaflet";
import { useRouter } from 'next/navigation';

type GameState = "guessing" | "revealed";

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
  const [isGameOver, setIsGameOver] = useState(false);
  const router = useRouter();

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
              Here's your final score.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="text-6xl font-bold text-primary my-4 text-center">
            {totalScore.toLocaleString()}
          </div>
          <AlertDialogFooter className="flex-col gap-2">
            <AlertDialogAction onClick={resetGame} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              Play Again
            </AlertDialogAction>
             <p className="text-xs text-muted-foreground">RussellDash332 © 2025</p>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
