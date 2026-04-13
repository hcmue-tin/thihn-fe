import { Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";
import { lightTheme } from "../../theme";

export const LoginPage = () => (
  <ThemeProvider theme={lightTheme}>
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
      <Card sx={{ width: "100%", maxWidth: 420, backgroundColor: "rgba(255, 255, 255, 0.9)", backdropFilter: "blur(10px)", boxShadow: 24, border: "1px solid rgba(255,255,255,0.4)" }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: "#004282", textAlign: "center" }}>
            Hệ thống thi Hán ngữ
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, opacity: 0.85, color: "rgba(0, 0, 0, 0.7)", textAlign: "center", lineHeight: 1.6 }}>
            Vui lòng chọn khu vực đăng nhập
          </Typography>
          <Stack spacing={1.5}>
            <Button component={RouterLink} to="/admin" variant="contained" size="large" sx={{ fontWeight: 'bold' }}>
              Đăng nhập quản trị
            </Button>
            <Button component={RouterLink} to="/contestant" variant="outlined" size="large" sx={{ fontWeight: 'bold', color: "#004282", borderColor: "rgba(0,66,130,0.3)", '&:hover': { borderColor: "#004282", backgroundColor: "rgba(0,66,130,0.05)" } }}>
              Đăng nhập thí sinh
            </Button>
            <Button component={RouterLink} to="/led" variant="text" size="large" sx={{ fontWeight: 'bold', color: "rgba(0,66,130,0.7)", '&:hover': { color: "#004282" } }}>
              Màn hình LED
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  </ThemeProvider>
);
