import { Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export const LoginPage = () => (
  <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
    <Card sx={{ width: "100%", maxWidth: 460 }}>
      <CardContent>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          Hệ thống thi Hán ngữ
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, opacity: 0.85 }}>
          Phiên đăng nhập đã hết hạn hoặc chưa xác thực. Vui lòng chọn khu vực đăng nhập.
        </Typography>
        <Stack spacing={1.5}>
          <Button component={RouterLink} to="/admin" variant="contained">
            Đăng nhập quản trị
          </Button>
          <Button component={RouterLink} to="/contestant" variant="outlined">
            Đăng nhập thí sinh
          </Button>
          <Button component={RouterLink} to="/led" variant="text">
            Màn hình LED
          </Button>
        </Stack>
      </CardContent>
    </Card>
  </Box>
);
