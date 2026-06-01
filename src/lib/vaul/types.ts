export type DrawerDirection = "top" | "bottom" | "left" | "right"
export interface SnapPoint {
  fraction: number
  height: number
}

export type AnyFunction = (...args: unknown[]) => unknown
