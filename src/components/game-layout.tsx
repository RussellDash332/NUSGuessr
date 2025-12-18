
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { MapPin, Trophy, ClipboardCopy, Eye, ArrowRight, BookX, ZoomIn, X, Minus, Plus, Clock } from "lucide-react";
import type { LatLng, LatLngExpression, LeafletMouseEvent } from "leaflet";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

type GameState = "guessing" | "revealed";
type RoundScore = {
  locationName: string;
  score: number;
  time: number;
};

const MapWrapper = dynamic(() => import('@/components/map-wrapper').then(mod => mod.MapWrapper), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center bg-muted rounded-lg"><p>Loading Map...</p></div>,
});

const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function GameLayout() {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [obfuscatedImageUrl, setObfuscatedImageUrl] = useState<string | null>(null);
  const [guess, setGuess] = useState<LatLng | null>(null);
  const [gameState, setGameState] = useState<GameState>("guessing");
  const [distance, setDistance] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [round, setRound] = useState<number>(1);
  const [usedLocations, setUsedLocations] = useState<string[]>([]);
  const [roundScores, setRoundScores] = useState<RoundScore[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showImageInResults, setShowImageInResults] = useState(false);
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastPanPosition = useRef({ x: 0, y: 0 });
  const zoomContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const timerRef = useRef<number | null>(null);


  const { toast } = useToast();
  
  const totalRounds = locations.length;

  useEffect(() => {
    if (isImageZoomed) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isImageZoomed]);
  
  useEffect(() => {
    if (gameState === 'guessing' && startTime > 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      const id = window.setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 100);
      timerRef.current = id;
    } else if (gameState === 'revealed' && timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, startTime]);

  const startNewRound = useCallback((isReset = false) => {
    let newUsedLocations = isReset ? [] : usedLocations;
    let availableLocations = locations.filter(loc => !newUsedLocations.includes(loc.id));
    
    if (availableLocations.length === 0) {
      availableLocations = locations;
      newUsedLocations = [];
    }

    const nextLocation = getRandomItem(availableLocations);
    setCurrentLocation(nextLocation);
    setObfuscatedImageUrl(null); // Reset image while new one loads
    setUsedLocations([...newUsedLocations, nextLocation.id]);
    setGuess(null);
    setGameState("guessing");
    setDistance(0);
    setScore(0);
    setShowImageInResults(false);
    setIsImageZoomed(false);
    setStartTime(Date.now());
    setElapsedTime(0);
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
    if (!currentLocation) {
        startNewRound(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentLocation?.image.imageUrl) {
      let isCancelled = false;
      
      const fetchAndEncode = async () => {
        try {
          const response = await fetch(currentLocation.image.imageUrl);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            if (!isCancelled) {
              setObfuscatedImageUrl(reader.result as string);
            }
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error("Failed to fetch and encode image:", error);
          if (!isCancelled) {
            setObfuscatedImageUrl(currentLocation.image.imageUrl);
          }
        }
      };

      fetchAndEncode();

      return () => {
        isCancelled = true;
      };
    }
  }, [currentLocation]);

  const handleMapClick = useCallback((e: LeafletMouseEvent) => {
    if (gameState === "guessing") {
      setGuess(e.latlng);
    }
  }, [gameState]);

  const handleGuess = () => {
    if (!guess || !currentLocation) return;
    
    const finalElapsedTime = Date.now() - startTime;
    setElapsedTime(finalElapsedTime);

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
    setRoundScores(prev => [...prev, { locationName: currentLocation.name, score: newScore, time: finalElapsedTime }]);
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
      (r, index) => `Round ${index + 1}: ${r.locationName} - ${r.score.toLocaleString()} pts (${(r.time / 1000).toFixed(1)}s)`
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

  const openZoomView = () => {
    setIsImageZoomed(true);
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
  }

  const closeZoomView = () => {
    setIsImageZoomed(false);
  }

  const handleZoom = (direction: 'in' | 'out') => {
    setZoomLevel(prev => {
      const newZoom = direction === 'in' ? prev * 1.2 : prev / 1.2;
      return Math.max(1, newZoom);
    });
  };
  
  const clampPan = useCallback((x: number, y: number, currentZoom: number) => {
    if (!imageRef.current || !zoomContainerRef.current) return { x, y };

    const containerRect = zoomContainerRef.current.getBoundingClientRect();
    const imageWidth = imageRef.current.offsetWidth * currentZoom;
    const imageHeight = imageRef.current.offsetHeight * currentZoom;

    const maxPanX = Math.max(0, (imageWidth - containerRect.width) / 2);
    const maxPanY = Math.max(0, (imageHeight - containerRect.height) / 2);

    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, x)),
      y: Math.max(-maxPanY, Math.min(maxPanY, y)),
    };
  }, []);

  const handlePanStart = (clientX: number, clientY: number) => {
    if (zoomLevel > 1) {
      isPanning.current = true;
      lastPanPosition.current = { x: clientX, y: clientY };
      if (zoomContainerRef.current) {
        zoomContainerRef.current.classList.add('cursor-grabbing');
      }
    }
  };
  
  const handlePanMove = (clientX: number, clientY: number) => {
    if (isPanning.current) {
      const dx = clientX - lastPanPosition.current.x;
      const dy = clientY - lastPanPosition.current.y;
      
      setPan(prev => {
        const newPan = { x: prev.x + dx, y: prev.y + dy };
        return clampPan(newPan.x, newPan.y, zoomLevel);
      });
  
      lastPanPosition.current = { x: clientX, y: clientY };
    }
  };
  
  const handlePanEnd = () => {
    if (isPanning.current) {
        isPanning.current = false;
        if (zoomContainerRef.current) {
            zoomContainerRef.current.classList.remove('cursor-grabbing');
        }
    }
  };

  useEffect(() => {
    setPan(prev => clampPan(prev.x, prev.y, zoomLevel));
  }, [zoomLevel, clampPan]);

  const ImageCard = () => (
    <Card className="overflow-hidden flex flex-col">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">
          Where is this?
        </CardTitle>
        <div className="flex justify-between items-center">
            <CardDescription>
                Round {round} / {totalRounds} | Total Score: {totalScore.toLocaleString()}
            </CardDescription>
            <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="mr-1 h-4 w-4" />
                <span>{(elapsedTime / 1000).toFixed(1)}s</span>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
          <div 
            className="relative aspect-[3/2] w-full group overflow-hidden rounded-lg"
            onClick={openZoomView}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
          >
            <Image
              src={obfuscatedImageUrl!}
              alt="Location to guess"
              fill
              priority
              className="object-cover pointer-events-none"
            />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <ZoomIn className="h-12 w-12 text-white" />
            </div>
          </div>
      </CardContent>
       {gameState === 'revealed' && (
        <CardFooter>
          <Button variant="outline" className="w-full" onClick={() => setShowImageInResults(prev => !prev)}>
            <BookX className="mr-2 h-4 w-4" />
            Show Score
          </Button>
        </CardFooter>
      )}
    </Card>
  );

  const ResultsCard = () => (
    <Card className="animate-in fade-in-50 flex flex-col">
      <CardHeader>
        <CardTitle className="font-headline text-xl">
          Results for: {currentLocation!.name}
        </CardTitle>
        <CardDescription>
          Round {round} / {totalRounds} | Total Score: {totalScore.toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 flex-grow">
        <div className="flex justify-between items-center text-lg">
          <span>Distance:</span>
          <span className="font-bold">
            {distance < 10 
              ? `${(distance * 1000).toFixed(0)} m` 
              : `${distance.toFixed(2)} km`}
          </span>
        </div>
        <div className="flex justify-between items-center text-lg">
          <span>Time:</span>
          <span className="font-bold">{(elapsedTime / 1000).toFixed(1)}s</span>
        </div>
        <Separator />
        <div className="flex justify-between items-center text-lg">
          <span>Round Score:</span>
          <span className="font-bold text-primary">{score.toLocaleString()} pts</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" onClick={() => setShowImageInResults(prev => !prev)}>
          <Eye className="mr-2 h-4 w-4" />
          Show Image
        </Button>
      </CardFooter>
    </Card>
  );
  
  if (!currentLocation || !obfuscatedImageUrl) {
    return (
      <div className="flex h-full items-center justify-center">
        <p>Loading game...</p>
      </div>
    );
  }
  
  const mapCenter: LatLngExpression = [1.2991, 103.7764]; // Center of NUS
  const actualPosition: LatLng | null = currentLocation ? { lat: currentLocation.coordinates.lat, lng: currentLocation.coordinates.lng } : null;

  return (
    <div className="h-full w-full relative">
       <div className={cn(
        "h-full w-full grid md:grid-cols-2 space-y-2 md:space-y-0 md:gap-x-8 px-4 md:p-8 max-w-7xl mx-auto",
        isImageZoomed ? 'overflow-hidden' : 'overflow-y-auto'
      )}>
        <div className="flex flex-col gap-4 min-h-[450px]">
          {gameState === 'guessing' ? (
            <ImageCard />
          ) : (
            showImageInResults ? <ImageCard /> : <ResultsCard />
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
            {gameState === 'guessing' ? 'Click on the map to place your guess.' : 'Here are the results for this round.'}
          </p>
          {gameState === 'guessing' ? (
            <Button onClick={handleGuess} disabled={!guess} size="lg">
              <MapPin className="mr-2 h-5 w-5" />
              Make Guess
            </Button>
          ) : (
            <Button onClick={handleNextRound} size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {round === totalRounds ? 'View Final Score' : 'Next Round'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
      
      {isImageZoomed && (
        <div
          className="absolute inset-0 z-[1001] bg-black/80 flex flex-col items-center justify-center overflow-hidden"
          onClick={(e) => e.target === e.currentTarget && closeZoomView()}
        >
          <div
            ref={zoomContainerRef}
            className={cn(
              "relative flex items-center justify-center w-full h-full p-4",
              zoomLevel > 1 ? 'cursor-grab' : 'cursor-default'
            )}
            onMouseDown={(e) => handlePanStart(e.clientX, e.clientY)}
            onMouseMove={(e) => handlePanMove(e.clientX, e.clientY)}
            onMouseUp={handlePanEnd}
            onMouseLeave={handlePanEnd}
            onTouchStart={(e) => handlePanStart(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={(e) => handlePanMove(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={handlePanEnd}
          >
            <div
              ref={imageRef}
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})` }}
              className="will-change-transform"
            >
              <Image
                src={obfuscatedImageUrl!}
                alt="Zoomed location"
                width={1920}
                height={1080}
                className="w-full h-auto max-w-[90vw] max-h-[80vh] object-contain pointer-events-none"
              />
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={closeZoomView}
            className="absolute top-4 left-4 z-[1002] text-white bg-black/50 hover:bg-black/75 hover:text-white"
          >
            <X className="h-6 w-6" />
          </Button>

          <div className="absolute bottom-4 right-4 z-[1002] flex flex-col gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleZoom('in')}
              className="text-white bg-black/50 hover:bg-black/75 hover:text-white"
            >
              <Plus className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleZoom('out')}
              className="text-white bg-black/50 hover:bg-black/75 hover:text-white"
            >
              <Minus className="h-6 w-6" />
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={isGameOver} onOpenChange={setIsGameOver}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center justify-center sm:justify-start gap-2">
              <Trophy className="text-yellow-500 h-6 w-6" />
              Game Over!
            </AlertDialogTitle>
            <AlertDialogDescription>
              You've completed all {totalRounds} rounds. Here's your final score:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 text-center">
            <p className="text-4xl sm:text-5xl font-bold tracking-tight">{totalScore.toLocaleString()}</p>
            <p className="text-muted-foreground mt-1">Total Score</p>
          </div>
          <div className="text-sm">
            <h3 className="font-semibold mb-2">Round Summary:</h3>
            <ScrollArea className="h-40">
              <div className="flex justify-between font-medium text-muted-foreground px-2 py-1 border-b">
                  <span className="flex-1 pr-2">Location</span>
                  <span className="text-center">Time</span>
                  <span className="text-right min-w-[80px]">Score</span>
              </div>
              <div className="space-y-1 mt-1">
              {roundScores.map((r, i) => (
                  <div key={i} className="flex justify-between items-start bg-muted/30 p-2 rounded-md">
                      <span className="flex-1 pr-2">{i+1}. {r.locationName}</span>
                      <span className="text-center text-muted-foreground">{`${((r.time || 0) / 1000).toFixed(1)}s`}</span>
                      <span className="text-right font-medium min-w-[80px]">{r.score.toLocaleString()} pts</span>
                  </div>
              ))}
              </div>
            </ScrollArea>
          </div>
          <AlertDialogFooter>
              <Button onClick={handleCopyResults} variant="outline" className="w-full sm:w-auto">
                <ClipboardCopy className="mr-2 h-4 w-4" />
                Copy Results
              </Button>
              <AlertDialogAction asChild>
                  <Button onClick={resetGame} className="w-full sm:w-auto">
                      Play Again
                  </Button>
              </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
