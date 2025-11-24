import * as React from "react";

export function NUSLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      {...props}
    >
      <rect width="100" height="100" fill="#003D7C" className="rounded-sm" />
      <path
        d="M20 80V20H35V50L50 35L65 50V20H80V80H65V50L50 65L35 50V80H20Z"
        fill="#EF7C00"
      />
    </svg>
  );
}
