import { Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import SportsEsportsRoundedIcon from "@mui/icons-material/SportsEsportsRounded";
import TvRoundedIcon from "@mui/icons-material/TvRounded";
import type { AdminView } from "../../../types/admin";

type Props = {
  activeView: AdminView;
  isConnected: boolean;
  onChangeView: (view: AdminView) => void;
  onOpenLedScreen: () => void;
};

export const AdminSidebar = ({ activeView, isConnected, onChangeView, onOpenLedScreen }: Props) => {
  const sidebarButtonSx = (view: AdminView) => ({
    justifyContent: "flex-start",
    px: 2.25,
    py: 1.5,
    borderRadius: 2.5,
    fontWeight: 700,
    textTransform: "none",
    color: activeView === view ? "#FFFFFF" : "#1A3A4A",
    bgcolor: activeView === view ? "#1A8C8E" : "transparent",
    border: activeView === view ? "1px solid #1A8C8E" : "1px solid rgba(184,217,236,0.3)",
    boxShadow: "none",
    "&:hover": {
      bgcolor: activeView === view ? "#0F6B6D" : "rgba(26,140,142,0.06)",
      boxShadow: "none"
    }
  });

  return (
    <Card
      sx={{
        width: { xs: "100%", lg: 280 },
        flexShrink: 0,
        borderRadius: 4,
        background: "rgba(255,255,255,0.95)",
        borderLeft: "4px solid #1A8C8E",
        border: "1px solid rgba(184,217,236,0.3)"
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 900, mb: 2, color: "#0F6B6D", fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>
          Bảng điều khiển
        </Typography>
        <Stack spacing={1.25}>
          <Button variant="text" startIcon={<HomeRoundedIcon />} onClick={() => onChangeView("welcome")} sx={sidebarButtonSx("welcome")}>
            Trang chủ
          </Button>
          <Button variant="text" startIcon={<GroupsRoundedIcon />} onClick={() => onChangeView("teams")} sx={sidebarButtonSx("teams")}>
            Quản lý đội thi
          </Button>
          <Button variant="text" startIcon={<PersonRoundedIcon />} onClick={() => onChangeView("contestants")} sx={sidebarButtonSx("contestants")}>
            Quản lý thí sinh
          </Button>
          <Button variant="text" startIcon={<DescriptionRoundedIcon />} onClick={() => onChangeView("exam_mgmt")} sx={sidebarButtonSx("exam_mgmt")}>
            Quản lý đề thi
          </Button>
          <Button variant="text" onClick={() => onChangeView("rules")} sx={sidebarButtonSx("rules")}>
            <DescriptionRoundedIcon sx={{ mr: 1 }} /> Thể lệ cuộc thi
          </Button>
          <Button variant="text" startIcon={<TvRoundedIcon />} onClick={() => onChangeView("backgrounds")} sx={sidebarButtonSx("backgrounds")}>
            Hình nền LED / Thí sinh
          </Button>
          <Button variant="text" startIcon={<SportsEsportsRoundedIcon />} onClick={() => onChangeView("control")} sx={sidebarButtonSx("control")}>
            Phòng điều khiển
          </Button>
          <Box sx={{ mt: 1, pt: 1, borderTop: "1px solid rgba(184,217,236,0.3)" }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={onOpenLedScreen}
              sx={{ justifyContent: "flex-start", px: 2.25, py: 1, borderRadius: 2.5, fontWeight: 700, textTransform: "none", color: "#E88B3A", borderColor: "rgba(232,139,58,0.3)", "&:hover": { borderColor: "#E88B3A", bgcolor: "rgba(232,139,58,0.06)" } }}
            >
              <TvRoundedIcon sx={{ mr: 1 }} /> Mở màn hình LED
            </Button>
          </Box>
        </Stack>

        <Box sx={{ mt: 3, p: 2, borderRadius: 3, bgcolor: isConnected ? "rgba(21,128,61,0.06)" : "rgba(232,139,58,0.06)", border: isConnected ? "1px solid rgba(21,128,61,0.15)" : "1px solid rgba(232,139,58,0.2)" }}>
          <Typography variant="body2" sx={{ color: "#4A7A8A" }}>
            Trạng thái kết nối
          </Typography>
          <Typography variant="h6" sx={{ mt: 0.75, fontWeight: 800, color: isConnected ? "#15803D" : "#E88B3A" }}>
            {isConnected ? "Đã kết nối" : "Mất kết nối"}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};
