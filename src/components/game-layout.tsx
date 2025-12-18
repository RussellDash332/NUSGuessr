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
import { MapPin, Trophy, ClipboardCopy, Eye, ArrowRight, BookX, ZoomIn, X, Minus, Plus } from "lucide-react";
import type { LatLng, LatLngExpression, LeafletMouseEvent } from "leaflet";
import { useRouter } from 'next/navigation';
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  const lastMousePosition = useRef({ x: 0, y: 0 });
  const zoomContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);


  const router = useRouter();
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
    const container = zoomContainerRef.current;
    const image = imageRef.current;
    if (!container || !image) return { x, y };

    const imageRect = image.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    const scaledImageWidth = imageRect.width * currentZoom;
    const scaledImageHeight = imageRect.height * currentZoom;
    
    const overflowX = Math.max(0, scaledImageWidth - containerRect.width);
    const overflowY = Math.max(0, scaledImageHeight - containerRect.height);

    const maxPanX = overflowX / 2 / currentZoom;
    const maxPanY = overflowY / 2 / currentZoom;
    
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, x)),
      y: Math.max(-maxPanY, Math.min(maxPanY, y)),
    };
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      isPanning.current = true;
      lastMousePosition.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.classList.add('cursor-grabbing');
    }
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (isPanning.current) {
        isPanning.current = false;
        e.currentTarget.classList.remove('cursor-grabbing');
        setPan(prev => clampPan(prev.x, prev.y, zoomLevel));
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (isPanning.current) {
      const dx = e.clientX - lastMousePosition.current.x;
      const dy = e.clientY - lastMousePosition.current.y;
      
      setPan(prev => {
        const newPan = { x: prev.x + dx / zoomLevel, y: prev.y + dy / zoomLevel };
        return clampPan(newPan.x, newPan.y, zoomLevel);
      });

      lastMousePosition.current = { x: e.clientX, y: e.clientY };
    }
  };

  const onMouseLeave = (e: React.MouseEvent) => {
    if(isPanning.current) {
      isPanning.current = false;
      e.currentTarget.classList.remove('cursor-grabbing');
      setPan(prev => clampPan(prev.x, prev.y, zoomLevel));
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
        <CardDescription>
          Round {round} / {totalRounds} | Total Score: {totalScore.toLocaleString()}
        </CardDescription>
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
        "h-full w-full grid md:grid-cols-2 gap-8 p-4 md:p-8 max-w-7xl mx-auto",
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
          ref={zoomContainerRef}
          className={cn(
            "absolute inset-0 z-[1001] bg-black/80 flex justify-center overflow-y-auto",
            zoomLevel > 1 ? 'cursor-grab' : 'cursor-default'
          )}
          onClick={(e) => e.target === e.currentTarget && closeZoomView()}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
        >
          <div className="flex items-center justify-center w-full h-full p-4">
            <div style={{ transform: `scale(${zoomLevel}) translate(${pan.x}px, ${pan.y}px)` }}>
              <Image
                ref={imageRef}
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
            className="absolute top-4 right-4 z-[1002] text-white bg-black/50 hover:bg-black/75 hover:text-white"
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
          <div>
            <h3 className="font-semibold mb-2">Round Summary:</h3>
            <div className="space-y-2 text-sm">
            {roundScores.map((r, i) => (
                <div key={i} className="flex justify-between items-center bg-muted/50 p-2 rounded-md">
                    <span className="truncate pr-2">{i+1}. {r.locationName}</span>
                    <span className="font-medium">{r.score.toLocaleString()} pts</span>
                </div>
            ))}
            </div>
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
