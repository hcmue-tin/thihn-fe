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
