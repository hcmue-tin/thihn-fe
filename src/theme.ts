import { createTheme } from "@mui/material/styles";

// Brand palette extracted from Chinese watercolor mountain backgrounds
// Contexts.png & Led.png — teal peaks, golden-orange accents, white clouds, sky blue
const brand = {
  teal: "#1A8C8E",
  tealDark: "#0F6B6D",
  gold: "#D4A741",
  goldLight: "#F5D98A",
  orange: "#E88B3A",
  sky: "#E8F4FA",
  skyDeep: "#B8D9EC",
  text: "#1A3A4A",
  textSecondary: "#4A7A8A",
  correct: "#15803D",
  wrong: "#DC2626"
};

// Admin panel — bright, functional workspace
export const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: brand.teal, dark: brand.tealDark, contrastText: "#FFFFFF" },
    secondary: { main: brand.gold, dark: "#B8922E", contrastText: "#FFFFFF" },
    warning: { main: brand.orange },
    error: { main: brand.wrong },
    success: { main: brand.correct },
    info: { main: "#3B82F6" },
    background: { default: "#F0F7FB", paper: "#FFFFFF" },
    text: { primary: brand.text, secondary: brand.textSecondary }
  },
  typography: {
    fontFamily: "'Inter', 'Noto Sans SC', 'Roboto', 'Arial', sans-serif",
    h3: { fontWeight: 900 },
    h4: { fontWeight: 800 },
    h5: { fontWeight: 800 },
    h6: { fontWeight: 700 }
  },
  shape: { borderRadius: 14 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(184,217,236,0.35)",
          boxShadow: "0 4px 24px rgba(26,140,142,0.06)"
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 700,
          borderRadius: 12
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: "1px solid rgba(184,217,236,0.3)",
          boxShadow: "0 4px 24px rgba(26,140,142,0.06)"
        }
      }
    }
  }
});

// Contestant & LED — lighter, glassmorphism-friendly
export const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: brand.teal, dark: brand.tealDark, contrastText: "#FFFFFF" },
    secondary: { main: brand.gold, dark: "#B8922E", contrastText: "#FFFFFF" },
    warning: { main: brand.orange },
    error: { main: brand.wrong },
    success: { main: brand.correct },
    background: { default: "#F0F7FB", paper: "rgba(255,255,255,0.92)" },
    text: { primary: brand.text, secondary: brand.textSecondary }
  },
  typography: {
    fontFamily: "'Inter', 'Noto Sans SC', 'Roboto', 'Arial', sans-serif",
    h3: { fontWeight: 900 },
    h4: { fontWeight: 800 },
    h5: { fontWeight: 800 },
    h6: { fontWeight: 700 }
  },
  shape: { borderRadius: 14 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(26,140,142,0.12)",
          backdropFilter: "blur(14px)",
          boxShadow: "0 8px 32px rgba(26,140,142,0.08)"
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 700, borderRadius: 12 }
      }
    }
  }
});
