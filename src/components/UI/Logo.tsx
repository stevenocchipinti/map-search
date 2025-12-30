interface LogoProps {
  /** Size of the logo (width and height) */
  size?: number
  /** CSS class name */
  className?: string
  /** 
   * Color mode: 
   * - "gradient" uses the brand gradient (teal -> blue -> indigo)
   * - any other string is used as a solid fill color (e.g., "white", "#fff", "currentColor")
   */
  color?: "gradient" | string
}

export function Logo({ 
  size = 64, 
  className = "",
  color = "gradient" 
}: LogoProps) {
  const useGradient = color === "gradient"
  const fillColor = useGradient ? undefined : color
  
  // Unique IDs for gradients to avoid conflicts when multiple logos on page
  const gradientId1 = "logo-gradient-pin"
  const gradientId2 = "logo-gradient-map"

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 512 512" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Pin/marker shape */}
      <path 
        d="M248.939 178.975C254.371 178.1 264.689 178.952 270.063 179.831C295.07 183.738 314.937 196.935 329.648 217.404C375.375 281.027 319.882 356.67 279.535 406.53C275.894 411.029 266.774 421.688 262.477 424.683C257.659 426.893 252.366 427.297 247.996 423.438C243.35 419.101 238.819 414.081 234.754 409.156C191.892 357.238 133.809 276.553 186.316 211.753C202.041 192.347 224.701 181.069 248.939 178.975ZM294.407 267.179C293.031 245.978 274.878 229.823 253.678 230.937C239.727 231.669 227.249 239.855 221.011 252.364C214.773 264.873 215.74 279.773 223.542 291.37C231.344 302.967 244.776 309.467 258.703 308.388C279.868 306.748 295.782 288.382 294.407 267.179Z" 
        fill={fillColor || `url(#${gradientId1})`}
      />
      {/* Folded map shape */}
      <path 
        d="M108.214 435.675C147.191 428.418 186.899 423.094 226.63 422.592C217.549 411.034 205.924 398.574 198.048 386.403C191.03 386.447 181.742 387.332 174.487 388.024L173.706 388.098C148.343 390.513 116.207 394.113 91.6647 400.725L91.5959 215.117C132.453 189.78 174.388 161.103 214.814 134.776L238.211 119.519C243.828 115.778 250.401 111.102 256.15 107.735C263.63 111.752 270.643 117.196 277.83 121.753C317.535 146.926 356.422 173.737 396.259 198.682C398.129 200.517 418.08 213.277 421.197 215.306L421.313 400.443C413.805 398.436 401.728 396.417 393.909 395.036C374.789 391.488 355.483 389.03 336.085 387.676C328.501 387.09 322.005 386.393 314.313 386.375L313.744 387.181C309.781 392.797 305.87 398.34 301.674 403.8C296.887 410.03 291.25 416.258 286.752 422.626C296.903 422.714 306.893 423.436 317.008 424.168L318.155 424.251C351.43 426.653 384.655 430.725 417.132 438.521C425.121 440.439 433.862 443.259 442.069 441.503C451.719 439.388 458.884 430.256 459.185 420.505C459.452 411.862 459.312 403.042 459.31 394.396L459.345 250.454C459.292 194.118 466.894 196.561 416.131 166.673C385.526 145.893 352.275 124.813 321.154 104.481L292.109 85.5305C279.182 77.1108 264.568 65.7526 248.578 70.1646C235.529 73.7662 218.519 86.9484 206.837 94.6361L157.156 126.832L104.441 161.242C92.3643 168.996 76.0533 178.958 64.5381 187.212C61.753 189.168 59.3555 191.625 57.4668 194.458C55.0981 198.026 53.4393 203.269 53.3191 207.516C52.8757 223.226 53.0525 239.286 53.0604 254.994L53.0125 394.826C53.0107 408.813 49.9825 429.56 63.4605 438.4C77.2991 447.477 93.6588 437.602 108.214 435.675Z" 
        fill={fillColor || `url(#${gradientId2})`}
      />
      
      {/* Gradient definitions - only rendered when using gradient mode */}
      {useGradient && (
        <defs>
          <linearGradient 
            id={gradientId1} 
            x1="165.458" 
            y1="178.608" 
            x2="401.627" 
            y2="351.522" 
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0.00961538" stopColor="#0CD2BE"/>
            <stop offset="0.504808" stopColor="#165C87"/>
            <stop offset="1" stopColor="#3C4CF9"/>
          </linearGradient>
          <linearGradient 
            id={gradientId2} 
            x1="52.7202" 
            y1="69.1799" 
            x2="424.305" 
            y2="474.636" 
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0.00961538" stopColor="#0CD2BE"/>
            <stop offset="0.504808" stopColor="#165C87"/>
            <stop offset="1" stopColor="#3C4CF9"/>
          </linearGradient>
        </defs>
      )}
    </svg>
  )
}
