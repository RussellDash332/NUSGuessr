
"use client";

import { useState, useCallback, useRef } from "react";
import dynamic from 'next/dynamic';
import type { LatLng, LeafletMouseEvent } from "leaflet";
import Link from 'next/link';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { NUSLogo } from "@/components/nus-logo";
import { ArrowLeft, UploadCloud, MapPin, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Image from "next/image";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const MapWrapper = dynamic(() => import('@/components/map-wrapper').then(mod => mod.MapWrapper), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center bg-muted rounded-lg"><p>Loading Map...</p></div>,
});

const submissionSchema = z.object({
  locationName: z.string().min(3, { message: "Location name must be at least 3 characters." }),
  coordinates: z.custom<LatLng>((val) => val && typeof (val as any).lat === 'number' && typeof (val as any).lng === 'number', { message: "Please select a location on the map." }),
  imageFile: z.instanceof(File, { message: "Please upload an image." })
    .refine((file) => file.size < 4 * 1024 * 1024, "Image must be smaller than 4MB."),
  imageBase64: z.string().min(1, { message: "Image processing failed." }),
});

type SubmissionFormValues = z.infer<typeof submissionSchema>;

export default function ContributePage() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      locationName: "",
    },
  });

  const handleMapClick = useCallback((e: { latlng: LatLng }) => {
    form.setValue("coordinates", e.latlng, { shouldValidate: true });
  }, [form]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit
        toast({
          variant: "destructive",
          title: "Image too large",
          description: "Please upload an image smaller than 4MB.",
        });
        form.setValue("imageFile", undefined, { shouldValidate: true });
        setImagePreview(null);
        return;
      }
      form.setValue("imageFile", file, { shouldValidate: true });
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        form.setValue("imageBase64", base64String, { shouldValidate: true });
      };
      reader.onerror = () => {
        toast({
          variant: "destructive",
          title: "Image Read Error",
          description: "Could not process the selected image file.",
        });
        form.setValue("imageBase64", "", { shouldValidate: true });
      }
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: SubmissionFormValues) => {
    setIsSubmitting(true);
    const formspreeUrl = process.env.NEXT_PUBLIC_FORMSPREE_URL;

    if (!formspreeUrl) {
        toast({
            variant: "destructive",
            title: "Configuration Error",
            description: "The submission form is not configured. Please contact the site administrator.",
        });
        setIsSubmitting(false);
        return;
    }

    const submissionData = {
        message: `New NUSGuessr submission: ${data.locationName}`,
        jsonData: JSON.stringify({
            id: `new_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            name: data.locationName,
            coordinates: {
                lat: data.coordinates.lat,
                lng: data.coordinates.lng,
            },
            imageUrl: data.imageBase64,
        }, null, 2),
    };

    try {
      const response = await fetch(formspreeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        throw new Error('Form submission failed');
      }

      toast({
        title: "Submission Successful!",
        description: "Thank you for contributing to NUSGuessr!",
      });
      setSubmissionSuccess(true);
    } catch (error) {
      console.error("Submission failed:", error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "Could not send your submission. Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerFileSelect = () => fileInputRef.current?.click();
  const coordinates = form.watch('coordinates');

  if (submissionSuccess) {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <header className="p-4 border-b shrink-0 bg-background/95 backdrop-blur-sm z-10 sticky top-0">
                <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
                    <Link href="/" className="flex items-center gap-2 md:gap-4 group">
                        <NUSLogo className="h-8 w-8 md:h-10 md:w-10" />
                        <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">
                            <span className="bg-gradient-to-r from-blue-500 to-orange-500 text-transparent bg-clip-text bg-[length:200%_auto] animate-gradient group-hover:underline">
                                NUSGuessr
                            </span>
                        </h1>
                    </Link>
                    <Link href="/">
                        <Button variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Game
                        </Button>
                    </Link>
                </div>
            </header>
            <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
                <Card className="max-w-lg w-full text-center animate-in fade-in">
                    <CardHeader>
                        <CardTitle className="text-2xl">Thank You!</CardTitle>
                        <CardDescription>Your location has been submitted for review.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="mb-4">Your contribution helps make the game better for everyone.</p>
                        <Link href="/">
                            <Button>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Game
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </main>
             <footer className="text-center p-4 border-t text-sm text-muted-foreground shrink-0 bg-background z-10 sticky bottom-0">
                <p>Thank you for helping to make NUSGuessr better!</p>
                <p className="text-xs mt-1">
                <a
                    href="https://russelldash332.github.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                >
                    RussellDash332
                </a> © 2025
                </p>
            </footer>
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="p-4 border-b shrink-0 bg-background/95 backdrop-blur-sm z-10 sticky top-0">
         <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
            <Link href="/" className="flex items-center gap-2 md:gap-4 group">
                <NUSLogo className="h-8 w-8 md:h-10 md:w-10" />
                <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">
                    <span className="bg-gradient-to-r from-blue-500 to-orange-500 text-transparent bg-clip-text bg-[length:200%_auto] animate-gradient group-hover:underline">
                        NUSGuessr
                    </span>
                </h1>
            </Link>
            <Link href="/">
                <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Game
                </Button>
            </Link>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold font-headline tracking-tight mb-2">Contribute a Location</h2>
            <p className="text-lg text-muted-foreground">Help expand NUSGuessr by submitting a new location!</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="locationName"
                render={({ field }) => (
                  <FormItem>
                    <Card>
                      <CardHeader>
                          <CardTitle>1. Location Name</CardTitle>
                          <CardDescription>Give the location a clear and recognizable name.</CardDescription>
                      </CardHeader>
                      <CardContent>
                          <FormControl>
                              <Input placeholder="e.g., Central Library Entrance" {...field} className="max-w-md"/>
                          </FormControl>
                          <FormMessage className="mt-2" />
                      </CardContent>
                    </Card>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageFile"
                render={({ field }) => (
                  <FormItem>
                    <Card>
                      <CardHeader>
                          <CardTitle>2. Upload an Image</CardTitle>
                          <CardDescription>Choose a high-quality, landscape-oriented image. Max size: 4MB.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <FormControl>
                            <Input
                                type="file"
                                accept="image/png, image/jpeg, image/webp"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </FormControl>
                        <div
                            onClick={triggerFileSelect}
                            className="group relative w-full aspect-video border-2 border-dashed border-muted-foreground/50 rounded-lg flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary transition-colors"
                        >
                            {imagePreview ? (
                                <Image src={imagePreview} alt="Image preview" fill className="object-contain rounded-lg p-1"/>
                            ) : (
                                <>
                                    <UploadCloud className="h-12 w-12 text-muted-foreground/80 group-hover:text-primary" />
                                    <p className="mt-2 text-sm text-muted-foreground">Click to upload or drag & drop</p>
                                    <p className="text-xs text-muted-foreground/70">PNG, JPG, or WEBP (Max 4MB)</p>
                                </>
                            )}
                        </div>
                        <FormMessage className="mt-2" />
                      </CardContent>
                    </Card>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="coordinates"
                render={({ field }) => (
                  <FormItem>
                    <Card>
                      <CardHeader>
                          <CardTitle>3. Pinpoint the Location</CardTitle>
                          <CardDescription>Click on the map to set the exact coordinates for the image you uploaded.</CardDescription>
                      </CardHeader>
                      <CardContent>
                          <div className="h-96 w-full rounded-lg bg-muted">
                              <MapWrapper
                              center={[1.2991, 103.7764]}
                              zoom={15}
                              guessPosition={field.value}
                              actualPosition={null}
                              onMapClick={handleMapClick}
                              onMapReady={() => {}}
                              isRevealed={false}
                              />
                          </div>
                          {coordinates && (
                              <p className="mt-2 text-sm text-muted-foreground text-center">
                                  <MapPin className="inline h-4 w-4 mr-1"/>
                                  Location selected: {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)}
                              </p>
                          )}
                          <FormMessage className="mt-2 text-center"/>
                      </CardContent>
                    </Card>
                  </FormItem>
                )}
              />
                <div className="flex justify-center">
                    <Button type="submit" size="lg" className="w-full max-w-xs" disabled={isSubmitting || !form.formState.isValid}>
                        {isSubmitting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Submitting...</>
                        ) : (
                            "Submit Location for Review"
                        )}
                    </Button>
                </div>

            </form>
          </Form>
        </div>
      </main>

      <footer className="text-center p-4 border-t text-sm text-muted-foreground shrink-0 bg-background z-10 sticky bottom-0">
        <p>Thank you for helping to make NUSGuessr better!</p>
        <p className="text-xs mt-1">
          <a
            href="https://russelldash332.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            RussellDash332
          </a> © 2025
        </p>
      </footer>
    </div>
  );
