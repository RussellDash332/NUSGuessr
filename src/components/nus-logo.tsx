import Image from "next/image";

export function NUSLogo({ className }: { className?: string }) {
  return (
    <Image
      src="./favicon.ico"
      alt="NUSGuessr Logo"
      width={40}
      height={40}
      className={className}
    />
  );
}
