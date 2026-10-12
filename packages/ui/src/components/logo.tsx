import { type ComponentProps } from "solid-js"

// Kodine brand mark: bold geometric "K" on an amber rounded square.
const K_PATH =
  "M6.4 5h2.8v14H6.4zM10.19 12.99 17.63 5.53 15.65 3.55 8.21 11.01ZM8.21 12.99 15.65 20.45 17.63 18.47 10.19 11.01Z"

export const Mark = (props: { class?: string }) => {
  return (
    <svg
      data-component="logo-mark"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="24" height="24" rx="5.5" fill="#F5A623" />
      <path d={K_PATH} fill="#1B1813" />
    </svg>
  )
}

export const Splash = (props: Pick<ComponentProps<"svg">, "ref" | "class">) => {
  return (
    <svg
      ref={props.ref}
      data-component="logo-splash"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 80 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="8" y="18" width="64" height="64" rx="15" fill="#F5A623" />
      <g transform="translate(8 18) scale(2.6667)">
        <path d={K_PATH} fill="#1B1813" />
      </g>
    </svg>
  )
}

export const Logo = (props: { class?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 104 28"
      fill="none"
      classList={{ [props.class ?? ""]: !!props.class }}
    >
      <rect width="28" height="28" rx="6.5" fill="#F5A623" />
      <g transform="scale(1.1667)">
        <path d={K_PATH} fill="#1B1813" />
      </g>
      <text
        x="37"
        y="20.8"
        font-family="'Inter', sans-serif"
        font-size="19"
        font-weight="800"
        textLength="64"
        lengthAdjust="spacingAndGlyphs"
        fill="var(--icon-strong-base)"
      >
        Kodine
      </text>
    </svg>
  )
}
