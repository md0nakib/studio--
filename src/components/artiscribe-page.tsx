"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { provideStylisticGuidance } from '@/ai/flows/provide-stylistic-guidance';
import { suggestFilterStrength } from '@/ai/flows/suggest-filter-strength';
import { applySketchFilter } from '@/lib/sketch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Upload, Download, Share2, Wand2, ImageIcon, Paintbrush, Flame, Pencil } from 'lucide-react';

type FilterType = 'pencil' | 'charcoal';

export function ArtiscribePage() {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('pencil');
  const [intensity, setIntensity] = useState(0.5);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiGuidance, setAiGuidance] = useState<{ title: string; description: string } | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [canShare, setCanShare] = useState(false);
  
  useEffect(() => {
    if (navigator.share) {
      setCanShare(true);
    }
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload an image file.",
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
        setAiGuidance(null);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const processImage = useCallback(() => {
    if (!uploadedImage || !canvasRef.current) return;
    setIsProcessing(true);
    if (!imageRef.current) {
        imageRef.current = new Image();
    }
    imageRef.current.src = uploadedImage;
    imageRef.current.onload = () => {
      applySketchFilter(canvasRef.current!, imageRef.current!, filter, intensity);
      setIsProcessing(false);
    };
    imageRef.current.onerror = () => {
        toast({
            variant: "destructive",
            title: "Image Error",
            description: "Could not load the uploaded image.",
        });
        setIsProcessing(false);
    }
  }, [uploadedImage, filter, intensity, toast]);


  useEffect(() => {
    processImage();
  }, [processImage]);

  const handleGetStylisticGuidance = async () => {
    if (!uploadedImage) return;
    setIsAiLoading(true);
    setAiGuidance(null);
    try {
      const result = await provideStylisticGuidance({ photoDataUri: uploadedImage });
      setAiGuidance({
        title: `Suggested Filter: ${result.suggestedFilter}`,
        description: result.guidance,
      });
      const suggestedFilterType = result.suggestedFilter.toLowerCase().includes('charcoal') ? 'charcoal' : 'pencil';
      setFilter(suggestedFilterType);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "AI Error",
        description: "Failed to get stylistic guidance.",
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSuggestStrength = async () => {
    if (!uploadedImage) return;
    setIsAiLoading(true);
    setAiGuidance(null);
    try {
      const result = await suggestFilterStrength({ photoDataUri: uploadedImage, filterType: filter });
      setIntensity(result.suggestedStrength);
      setAiGuidance({
        title: "AI Suggestion",
        description: result.stylisticGuidance,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "AI Error",
        description: "Failed to suggest filter strength.",
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSaveImage = () => {
    if (!canvasRef.current) return;
    setIsSaving(true);
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `artiscribe-sketch.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsSaving(false);
    toast({ title: "Image Saved!" });
  };

  const handleShareImage = async () => {
    if (!canvasRef.current || !canShare) return;
    setIsSharing(true);
    canvasRef.current.toBlob(async (blob) => {
      if (blob) {
        const file = new File([blob], 'artiscribe-sketch.png', { type: 'image/png' });
        try {
          await navigator.share({
            files: [file],
            title: 'My Sketch by Artiscribe',
            text: 'Check out this sketch I created with Artiscribe!',
          });
        } catch (error) {
          if ((error as Error).name !== 'AbortError') {
             toast({
              variant: "destructive",
              title: "Share Error",
              description: "Could not share the image.",
            });
          }
        }
      }
      setIsSharing(false);
    }, 'image/png');
  };

  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground font-body">
      <header className="flex items-center gap-4 p-4 border-b border-border/50">
        <Paintbrush className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold font-headline text-primary">Artiscribe</h1>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 sm:p-6">
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>1. Upload Image</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                ref={fileInputRef}
                className="hidden"
              />
              <Button onClick={triggerFileUpload} className="w-full" variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Choose an Image
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>2. Adjust Sketch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Filter Style</Label>
                <Tabs value={filter} onValueChange={(value) => setFilter(value as FilterType)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="pencil"><Pencil className="mr-2 h-4 w-4"/>Pencil</TabsTrigger>
                    <TabsTrigger value="charcoal"><Flame className="mr-2 h-4 w-4"/>Charcoal</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="space-y-2">
                <Label htmlFor="intensity">Filter Intensity: {Math.round(intensity * 100)}%</Label>
                <Slider
                  id="intensity"
                  min={0}
                  max={1}
                  step={0.01}
                  value={[intensity]}
                  onValueChange={(value) => setIntensity(value[0])}
                  disabled={!uploadedImage}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleGetStylisticGuidance} disabled={!uploadedImage || isAiLoading} className="flex-1 bg-accent hover:bg-accent/90">
                  {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  Suggest Style
                </Button>
                <Button onClick={handleSuggestStrength} disabled={!uploadedImage || isAiLoading} className="flex-1 bg-accent hover:bg-accent/90">
                  {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  Suggest Intensity
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {aiGuidance && (
            <Alert>
              <Wand2 className="h-4 w-4" />
              <AlertTitle>{aiGuidance.title}</AlertTitle>
              <AlertDescription>{aiGuidance.description}</AlertDescription>
            </Alert>
          )}

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>3. Finish</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleSaveImage} disabled={!uploadedImage || isSaving} className="flex-1">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Save
              </Button>
              {canShare && <Button onClick={handleShareImage} disabled={!uploadedImage || isSharing} variant="secondary" className="flex-1">
                {isSharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
                Share
              </Button>}
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-2 flex items-center justify-center bg-muted/50 rounded-lg border-2 border-dashed border-border p-4 relative aspect-video transition-all duration-300">
          {!uploadedImage && (
            <div className="text-center text-muted-foreground">
              <ImageIcon className="mx-auto h-12 w-12" />
              <p className="mt-2 font-semibold">Image Preview</p>
              <p className="text-sm">Your sketch will appear here.</p>
            </div>
          )}
          <canvas ref={canvasRef} className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${isProcessing ? 'opacity-50' : 'opacity-100'}`} />
          {isProcessing && <Loader2 className="absolute h-8 w-8 animate-spin text-primary" />}
        </div>
      </main>
    </div>
  );
}
