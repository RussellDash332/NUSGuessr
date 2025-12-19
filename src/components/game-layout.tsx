
"use client";

import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import Image from "next/image";
import dynamic from 'next/dynamic';
import { locations as allLocations, type Location } from "@/lib/locations";
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
import { MapPin, Trophy, ClipboardCopy, Eye, ArrowRight, BookX, ZoomIn, X, Minus, Plus, Clock, ImageOff } from "lucide-react";
import type { LatLng, LatLngExpression, LeafletMouseEvent } from "leaflet";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

type GameState = "guessing" | "revealed";
type GameMode = "daily" | "practice";

type RoundScore = {
  score: number;
  time: number;
  locationName: string;
};

type SavedProgress = {
    round: number;
    totalScore: number;
    roundScores: Omit<RoundScore, 'locationName'>[];
    elapsedTime: number;
}

const MapWrapper = dynamic(() => import('@/components/map-wrapper').then(mod => mod.MapWrapper), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center bg-muted rounded-lg"><p>Loading Map...</p></div>,
});


const GuessImage = React.memo(function GuessImage({
    obfuscatedImageUrl,
    imageError,
    onImageError,
    openZoomView,
    round,
    totalRounds,
    totalScore,
    elapsedTime
}: {
    obfuscatedImageUrl: string;
    imageError: boolean;
    onImageError: () => void;
    openZoomView: () => void;
    round: number;
    totalRounds: number;
    totalScore: number;
    elapsedTime: number;
}) {
    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Where is this?</CardTitle>
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
            <ScrollArea className="flex-grow">
                <CardContent>
                    <div
                        className="group relative aspect-[3/2] w-full overflow-hidden rounded-lg"
                        onClick={!imageError ? openZoomView : undefined}
                        onContextMenu={(e) => e.preventDefault()}
                        onDragStart={(e) => e.preventDefault()}
                    >
                        {imageError ? (
                            <div className="absolute inset-0 bg-muted text-muted-foreground flex flex-col items-center justify-center text-center p-4">
                                <ImageOff className="h-10 w-10 mb-2" />
                                <span>Image not available at the moment :(</span>
                            </div>
                        ) : (
                            <>
                                <Image
                                    src={obfuscatedImageUrl}
                                    alt="Location to guess"
                                    fill
                                    priority
                                    className="object-cover pointer-events-none"
                                    onError={onImageError}
                                />
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <ZoomIn className="h-12 w-12 text-white" />
                                </div>
                            </>
                        )}
                    </div>
                </CardContent>
            </ScrollArea>
        </Card>
    );
});


interface ImageCardProps {
  obfuscatedImageUrl: string;
  openZoomView: () => void;
  setShowImageInResults?: (show: boolean) => void;
  gameState: GameState;
  onImageError: () => void;
  imageError: boolean;
}

const ImageCard = React.memo(function ImageCard({
  obfuscatedImageUrl,
  openZoomView,
  setShowImageInResults,
  gameState,
  onImageError,
  imageError,
}: ImageCardProps) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">
          Where is this?
        </CardTitle>
      </CardHeader>
      <ScrollArea className="flex-grow">
        <CardContent>
          <div
            className="group relative aspect-[3/2] w-full overflow-hidden rounded-lg"
            onClick={!imageError ? openZoomView : undefined}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
          >
            {imageError ? (
                <div className="absolute inset-0 bg-muted text-muted-foreground flex flex-col items-center justify-center text-center p-4">
                  <ImageOff className="h-10 w-10 mb-2" />
                  <span>Image not available at the moment :(</span>
                </div>
            ) : (
              <>
                <Image
                  src={obfuscatedImageUrl}
                  alt="Location to guess"
                  fill
                  priority
                  className="object-cover pointer-events-none"
                  onError={onImageError}
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <ZoomIn className="h-12 w-12 text-white" />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </ScrollArea>
      {gameState === 'revealed' && setShowImageInResults && (
        <CardFooter className="pt-6">
          <Button variant="outline" className="w-full" onClick={() => setShowImageInResults(false)}>
            <BookX className="mr-2 h-4 w-4" />
            Show Score
          </Button>
        </CardFooter>
      )}
    </Card>
  );
});

// Simple seeded PRNG
const mulberry32 = (a: number) => {
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// Seeded shuffle
const seededShuffle = <T,>(array: T[], seed: number): T[] => {
  const newArray = [...array];
  const random = mulberry32(seed);
  let currentIndex = newArray.length;
  let randomIndex;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(random() * currentIndex);
    currentIndex--;
    [newArray[currentIndex], newArray[randomIndex]] = [newArray[randomIndex], newArray[currentIndex]];
  }

  return newArray;
};

const generateGameLocations = (mode: GameMode, allLocs: Location[]): Location[] => {
    const count = mode === 'daily' ? 10 : 5;
    if (allLocs.length === 0) return [];

    let result: Location[];
    if (mode === 'daily') {
        const today = new Date();
        const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
        result = seededShuffle(allLocs, seed);
    } else {
        result = [...allLocs].sort(() => 0.5 - Math.random());
    }

    if (result.length < count) {
      const randomFn = mode === 'daily' ? mulberry32(result.length + 1) : Math.random;
      while (result.length < count) {
        result.push(allLocs[Math.floor(randomFn() * allLocs.length)]);
      }
    }
  
    return result.slice(0, count);
};


interface GameLayoutProps {
    gameMode: GameMode;
    onExit: (modeCompleted?: GameMode, state?: { round: number, totalScore: number, roundScores: RoundScore[], elapsedTime: number }) => void;
    savedProgress: SavedProgress | null;
}

const formatDate = (date: Date): string => {
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
};

const getTodayDateString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
};

export const GameLayout = forwardRef(function GameLayout({ gameMode, onExit, savedProgress }: GameLayoutProps, ref) {
  const [gameLocations, setGameLocations] = useState<Location[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [obfuscatedImageUrl, setObfuscatedImageUrl] = useState<string | null>(null);
  const [guess, setGuess] = useState<LatLng | null>(null);
  const [gameState, setGameState] = useState<GameState>("guessing");
  const [distance, setDistance] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [round, setRound] = useState<number>(1);
  const [roundScores, setRoundScores] = useState<RoundScore[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showImageInResults, setShowImageInResults] = useState(false);
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastPanPosition = useRef({ x: 0, y: 0 });
  const zoomContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const savedElapsedTimeRef = useRef<number>(0);

  const { toast } = useToast();

  const totalRounds = gameLocations.length;
  
  useImperativeHandle(ref, () => ({
    getCurrentState: () => ({
        round,
        totalScore,
        roundScores,
        elapsedTime,
    }),
  }));

  const startNewRound = useCallback((roundNum: number, locations: Location[], restoredElapsedTime: number = 0) => {
    if (roundNum > locations.length || locations.length === 0) {
      if (locations.length > 0) {
        setIsGameOver(true);
      }
      return;
    }

    const nextLocation = locations[roundNum - 1];
    setCurrentLocation(nextLocation);
    setObfuscatedImageUrl(nextLocation.imageUrl);
    setGuess(null);
    setGameState("guessing");
    setDistance(0);
    setScore(0);
    setShowImageInResults(false);
    setIsImageZoomed(false);
    setImageError(false);
    
    savedElapsedTimeRef.current = restoredElapsedTime;
    setElapsedTime(restoredElapsedTime);
    setStartTime(Date.now());
  }, []);

  // Initialize game
  useEffect(() => {
    const selectedLocations = generateGameLocations(gameMode, allLocations);
    setGameLocations(selectedLocations);
    setIsGameOver(false);
  
    if (savedProgress) {
      setRound(savedProgress.round);
      setTotalScore(savedProgress.totalScore);
      const scores = savedProgress.roundScores.map((rs, index) => ({
        ...rs,
        locationName: selectedLocations[index]?.name || '',
      }));
      setRoundScores(scores);
      startNewRound(savedProgress.round, selectedLocations, savedProgress.elapsedTime);
    } else {
      setRound(1);
      setTotalScore(0);
      setRoundScores([]);
      startNewRound(1, selectedLocations, 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMode]);


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
  
  // Master Timer Controller
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (gameState === 'guessing' && startTime > 0) {
        timer = setInterval(() => {
            const timeSinceStart = Date.now() - startTime;
            setElapsedTime(savedElapsedTimeRef.current + timeSinceStart);
        }, 100);
    }
    return () => {
        if (timer) {
            clearInterval(timer);
        }
    };
  }, [gameState, startTime]);


  // Save progress on tab/browser close for daily challenge
  useEffect(() => {
    const handleBeforeUnload = () => {
        if (gameMode === 'daily' && gameState === 'guessing' && !isGameOver) {
            const finalElapsedTime = elapsedTime;

            const currentProgress = {
                date: getTodayDateString(),
                data: {
                    round: round,
                    totalScore: totalScore,
                    roundScores: roundScores.map(({ score, time }) => ({ score, time })),
                    elapsedTime: finalElapsedTime,
                }
            };
            localStorage.setItem('nusguessr_daily_progress', JSON.stringify(currentProgress));
        }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [gameMode, gameState, isGameOver, round, totalScore, roundScores, elapsedTime]);

  const handleMapClick = useCallback((e: LeafletMouseEvent) => {
    if (gameState === "guessing") {
      setGuess(e.latlng);
    }
  }, [gameState]);

  const handleGuess = () => {
    if (!guess || !currentLocation) return;
    
    setGameState("revealed");

    const finalElapsedTime = elapsedTime;

    const dist = calculateDistance(
      guess.lat,
      guess.lng,
      currentLocation.coordinates.lat,
      currentLocation.coordinates.lng
    );
    const newScore = calculateScore(dist);
    const newTotalScore = totalScore + newScore;
    const newRoundScores = [...roundScores, { locationName: currentLocation.name, score: newScore, time: finalElapsedTime }];

    setDistance(dist);
    setScore(newScore);
    setTotalScore(newTotalScore);
    setRoundScores(newRoundScores);
    setShowImageInResults(false);

    if (gameMode === 'daily') {
        const isGameFinished = round >= totalRounds;
        if (!isGameFinished) {
            const nextRoundProgress = {
                date: getTodayDateString(),
                data: {
                    round: round + 1,
                    totalScore: newTotalScore,
                    roundScores: newRoundScores.map(({ score, time }) => ({ score, time })),
                    elapsedTime: 0, // Reset elapsed time for next round
                }
            };
            localStorage.setItem('nusguessr_daily_progress', JSON.stringify(nextRoundProgress));
        } else {
            localStorage.setItem('nusguessr_daily_last_played', getTodayDateString());
            localStorage.removeItem('nusguessr_daily_progress');
        }
    }
  };

  const handleNextRound = () => {
    const nextRound = round + 1;
    if (nextRound <= totalRounds) {
      setRound(nextRound);
      startNewRound(nextRound, gameLocations);
    } else {
      setIsGameOver(true);
    }
  };

  const handleCopyResults = () => {
    const today = new Date();
    const dateString = formatDate(today);
    const modeTitle = gameMode === 'daily' ? `NUSGuessr Daily - ${dateString}` : `NUSGuessr Practice`;
    const title = `${modeTitle} - Final Score: ${totalScore.toLocaleString()}`;
    
    const summary = finalRoundScoresForDisplay.map(
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
    if (imageError) return;
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
            {distance < 1 
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
        <Button variant="outline" className="w-full" onClick={() => setShowImageInResults(true)}>
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

  // Re-hydrate location names for game over screen
  const finalRoundScoresForDisplay = roundScores.map((rs, index) => {
    const locationName = gameLocations[index]?.name || "Unknown Location";
    return { ...rs, locationName };
  });

  return (
    <div className="h-full w-full relative">
       <div className={cn(
        "h-full w-full grid md:grid-cols-2 space-y-2 md:gap-x-8 px-4 md:p-8 max-w-7xl mx-auto",
        isImageZoomed ? 'overflow-hidden' : 'overflow-y-auto'
      )}>
        <div className="flex flex-col gap-4 md:min-h-[450px]">
          {gameState === 'guessing' ? (
             <GuessImage
                obfuscatedImageUrl={obfuscatedImageUrl}
                imageError={imageError}
                onImageError={() => setImageError(true)}
                openZoomView={openZoomView}
                round={round}
                totalRounds={totalRounds}
                totalScore={totalScore}
                elapsedTime={elapsedTime}
            />
          ) : (
            showImageInResults ? (
              <ImageCard 
                obfuscatedImageUrl={obfuscatedImageUrl}
                openZoomView={openZoomView}
                setShowImageInResults={setShowImageInResults}
                gameState={gameState}
                onImageError={() => setImageError(true)}
                imageError={imageError}
              />
            ) : <ResultsCard />
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
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`, objectFit: 'cover' }}
              className="will-change-transform"
            >
              {imageError ? (
                  <div className="bg-muted text-muted-foreground flex flex-col items-center justify-center text-center p-8 rounded-lg">
                      <ImageOff className="h-12 w-12 mb-4" />
                      <p>Image not available at the moment :(</p>
                  </div>
              ) : (
                <Image
                  src={obfuscatedImageUrl}
                  alt="Zoomed location"
                  width={1920}
                  height={1080}
                  className="w-auto h-auto max-w-[90vw] max-h-[80vh] object-cover pointer-events-none"
                  onError={() => setImageError(true)}
                />
              )}
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

          {!imageError && (
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
          )}
        </div>
      )}

      <AlertDialog open={isGameOver} onOpenChange={(open) => {
        if (!open) {
            onExit(gameMode);
        }
        setIsGameOver(open);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center justify-center sm:justify-start gap-2">
              <Trophy className="text-yellow-500 h-6 w-6" />
              Game Over!
            </AlertDialogTitle>
            <AlertDialogDescription>
              {gameMode === 'daily' && `You've completed the Daily Challenge for ${formatDate(new Date())}.`}
              {gameMode === 'practice' && `You've completed your practice round.`}
              <br/>
              Here's your final score:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 text-center">
            <p className="text-4xl sm:text-5xl font-bold tracking-tight">{totalScore.toLocaleString()}</p>
            <p className="text-muted-foreground mt-1">Total Score</p>
          </div>
          <ScrollArea className="h-40">
            <div className="flex justify-between items-start font-medium text-muted-foreground px-2 py-1 border-b">
                <span className="flex-1 pr-2">Location</span>
                <span className="text-center">Time</span>
                <span className="text-right min-w-[80px]">Score</span>
            </div>
            <div className="space-y-1 mt-1">
            {finalRoundScoresForDisplay.map((r, i) => (
                <div key={i} className="flex justify-between items-start bg-muted/30 p-2 rounded-md">
                    <span className="flex-1 pr-2">{i+1}. {r.locationName}</span>
                    <span className="text-center text-muted-foreground">{`${((r.time || 0) / 1000).toFixed(1)}s`}</span>
                    <span className="text-right font-medium min-w-[80px]">{r.score.toLocaleString()} pts</span>
                </div>
            ))}
            </div>
          </ScrollArea>
          <AlertDialogFooter>
              <Button onClick={handleCopyResults} variant="outline" className="w-full sm:w-auto">
                <ClipboardCopy className="mr-2 h-4 w-4" />
                Copy Results
              </Button>
              <AlertDialogAction asChild>
                  <Button onClick={() => onExit(gameMode)} className="w-full sm:w-auto">
                      Back to Menu
                  </Button>
              </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
})
