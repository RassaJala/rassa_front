export interface ThemeColors {
  readonly fg: string;
  readonly muted: string;
  readonly border: string;
  readonly surface: string;
  readonly bg: string;
  readonly brand: string;
  readonly coral: string;
  readonly sidebarBg: string;
  readonly activeBg: string;
}

const light: ThemeColors = {
  fg: "#2D3328",
  muted: "#5E6B5E",
  border: "#D6DAD4",
  surface: "#FFFFFF",
  bg: "#F5F7F0",
  brand: "#24563C",
  coral: "#DE393A",
  sidebarBg: "#F5F7F0",
  activeBg: "#E2F0E6",
};

const dark: ThemeColors = {
  fg: "#E8EAE4",
  muted: "#9DA89D",
  border: "#2A332A",
  surface: "#263028",
  bg: "#1A211B",
  brand: "#4A8A63",
  coral: "#DE393A",
  sidebarBg: "#161B17",
  activeBg: "#1C2D22",
};

export function getColors(isDark: boolean): ThemeColors {
  return isDark ? dark : light;
}
