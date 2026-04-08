import { createTheme } from "@mui/material/styles";

export const appTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#c62828"
    },
    secondary: {
      main: "#d4af37"
    },
    background: {
      default: "#121212",
      paper: "#1e1e1e"
    }
  },
  typography: {
    fontFamily: "'Noto Sans', 'Roboto', 'Arial', sans-serif",
    h4: {
      fontWeight: 700
    }
  },
  shape: {
    borderRadius: 8
  }
});
