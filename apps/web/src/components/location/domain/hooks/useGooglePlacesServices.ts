import * as React from "react";

const GOOGLE_MAPS_SCRIPT_ID = "zencourt-google-maps-places-script";

export const useGooglePlacesServices = (apiKey: string) => {
  const [isScriptLoaded, setIsScriptLoaded] = React.useState(false);
  const autocompleteService =
    React.useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = React.useRef<google.maps.places.PlacesService | null>(
    null
  );

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.google?.maps?.places) {
      setIsScriptLoaded(true);
      return;
    }

    const existingScript = document.getElementById(
      GOOGLE_MAPS_SCRIPT_ID
    ) as HTMLScriptElement | null;

    const handleLoad = () => setIsScriptLoaded(true);

    if (existingScript) {
      existingScript.addEventListener("load", handleLoad);
      return () => {
        existingScript.removeEventListener("load", handleLoad);
      };
    }

    const script = document.createElement("script");
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", handleLoad);
    document.head.appendChild(script);

    return () => {
      script.removeEventListener("load", handleLoad);
    };
  }, [apiKey]);

  React.useEffect(() => {
    if (!isScriptLoaded || !window.google?.maps?.places) {
      return;
    }

    autocompleteService.current =
      new window.google.maps.places.AutocompleteService();

    const mapDiv = document.createElement("div");
    placesService.current = new window.google.maps.places.PlacesService(mapDiv);
  }, [isScriptLoaded]);

  return {
    isScriptLoaded,
    autocompleteService,
    placesService
  };
};
