import { Alert, Box, Card, CardContent, Stack, Typography } from "@mui/material";

type Props = {
  teamsCount: number;
  contestantsCount: number;
  examSetsCount: number;
  isConnected: boolean;
  hasFullState: boolean;
  screen: string;
};

export const AdminWelcomeView = ({ teamsCount, contestantsCount, examSetsCount, isConnected, hasFullState, screen }: Props) => (
  <Card
    sx={{
      borderRadius: 4,
      background: "rgba(255,255,255,0.95)",
      border: "1px solid rgba(184,217,236,0.3)",
      minHeight: { xs: "auto", md: 420 }
    }}
  >
    <CardContent sx={{ p: { xs: 3, md: 5 } }}>
      <Stack spacing={2.5}>
        <Typography variant="h6" sx={{ color: "#4A7A8A", maxWidth: 760, fontWeight: 400, fontSize: { xs: "0.98rem", sm: "1.05rem", md: "1.25rem" } }}>
          Mọi thứ đã sẵn sàng. Chọn chức năng ở sidebar bên trái để quản lý đội thi, thí sinh hoặc chuyển sang phòng điều khiển thi.
        </Typography>
        <Box
          sx={{
            display: "grid",
            gap: 2,
            pt: 2,
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }
          }}
        >
          <Card sx={{ borderRadius: 3, background: "linear-gradient(135deg, rgba(26,140,142,0.06), rgba(26,140,142,0.02))", border: "1px solid rgba(26,140,142,0.12)" }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: "#4A7A8A" }}>Đội thi</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: "#1A8C8E" }}>{teamsCount}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: 3, background: "linear-gradient(135deg, rgba(212,167,65,0.06), rgba(212,167,65,0.02))", border: "1px solid rgba(212,167,65,0.15)" }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: "#4A7A8A" }}>Thí sinh</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: "#D4A741" }}>{contestantsCount}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: 3, background: "linear-gradient(135deg, rgba(232,139,58,0.06), rgba(232,139,58,0.02))", border: "1px solid rgba(232,139,58,0.12)" }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: "#4A7A8A" }}>Bộ đề</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: "#E88B3A" }}>{examSetsCount}</Typography>
            </CardContent>
          </Card>
        </Box>
        <Alert severity={isConnected ? "success" : "warning"} sx={{ borderRadius: 3 }}>
          {isConnected ? "Realtime đang kết nối ổn định." : "Realtime đang mất kết nối, vui lòng kiểm tra lại."}
        </Alert>
        <Typography variant="body2" sx={{ color: "#4A7A8A" }}>
          Snapshot realtime: {hasFullState ? "Đã có dữ liệu trạng thái" : "Chưa có dữ liệu trạng thái"} | Màn hình hiện tại: {screen}
        </Typography>
      </Stack>
    </CardContent>
  </Card>
);
