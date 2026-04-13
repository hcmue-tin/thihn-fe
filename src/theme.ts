import { createTheme } from "@mui/material/styles";

export const appTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#d32f2f"
    },
    secondary: {
      main: "#d4af37"
    },
    background: {
      default: "#0c0b10",
      paper: "rgba(255,255,255,0.08)"
    }
  },
  typography: {
    fontFamily: "'Inter', 'Noto Sans SC', 'Roboto', 'Arial', sans-serif",
    h4: {
      fontWeight: 700
    },
    h3: {
      fontWeight: 800
    }
  },
  shape: {
    borderRadius: 14
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(255,255,255,0.14)",
          backdropFilter: "blur(10px)"
        }
      }
    }
  }
});

export const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976d2", // vibrant blue
    },
    secondary: {
      main: "#ed6c02", // vibrant orange
    },
    background: {
      default: "#f8fafc",
      paper: "rgba(255,255,255,0.9)", // bright translucent card
    }
  },
  typography: {
    fontFamily: "'Inter', 'Noto Sans SC', 'Roboto', 'Arial', sans-serif",
    h4: { fontWeight: 700 },
    h3: { fontWeight: 800 },
    h5: { fontWeight: 800 },
    h6: { fontWeight: 800 }
  },
  shape: { borderRadius: 14 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(0,0,0,0.08)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.05)"
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 700 }
      }
    }
  }
});
