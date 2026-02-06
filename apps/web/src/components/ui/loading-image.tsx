"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "./utils";

type LoadingImageProps = React.ComponentProps<typeof Image> & {
  blurClassName?: string;
};

export function LoadingImage({
  className,
  blurClassName = "blur-sm",
  onLoad,
  src,
  alt = "",
  ...props
}: LoadingImageProps) {
  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    setIsLoaded(false);
  }, [src]);

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      className={cn(className, !isLoaded && blurClassName)}
      onError={() => setIsLoaded(true)}
      onLoad={(image) => {
        setIsLoaded(true);
        onLoad?.(image);
      }}
    />
  );
}
