import Image, { type ImageProps } from "next/image";

type ZencourtLogoProps = Omit<ImageProps, "src" | "alt"> & {
  alt?: string;
};

export function ZencourtLogo({
  alt = "Zencourt Logo",
  width = 24,
  height = 24,
  ...props
}: ZencourtLogoProps) {
  return (
    <Image
      src="/zencourt-logo.svg"
      alt={alt}
      width={width}
      height={height}
      {...props}
    />
  );
}
